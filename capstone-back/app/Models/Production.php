<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Production extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'user_id',
        'product_id',
        'product_name',
        'date',
        'current_stage',
        'status',
        'quantity',
        'resources_used',
        'notes',
        'production_started_at',
        'estimated_completion_date',
        'actual_completion_date',
        'priority',
        'production_batch_number',
        'requires_tracking',
        'product_type',
        'overall_progress',
        'production_metrics',
    ];

    protected $casts = [
        'resources_used' => 'array',
        'production_metrics' => 'array',
        'date' => 'date:Y-m-d',
        'production_started_at' => 'datetime',
        'estimated_completion_date' => 'datetime',
        'actual_completion_date' => 'datetime',
        'requires_tracking' => 'boolean',
        'overall_progress' => 'decimal:2',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    // Each production belongs to a user
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Each production belongs to a product
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Optional: if linked to an order
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // Production has many processes
    public function processes()
    {
        return $this->hasMany(ProductionProcess::class);
    }

    // Production can have analytics
    public function analytics()
    {
        return $this->hasMany(ProductionAnalytics::class, 'product_id', 'product_id');
    }

    // Production has many stage logs
    public function stageLogs()
    {
        return $this->hasMany(ProductionStageLog::class);
    }

    // Get current stage log
    public function currentStageLog()
    {
        return $this->hasOne(ProductionStageLog::class)
            ->whereHas('productionStage', function ($query) {
                $query->where('name', $this->current_stage);
            })
            ->where('status', '!=', 'completed')
            ->latest();
    }

    // Get completed stage logs
    public function completedStageLogs()
    {
        return $this->hasMany(ProductionStageLog::class)
            ->where('status', 'completed')
            ->orderBy('completed_at');
    }

    /*
    |--------------------------------------------------------------------------
    | Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Initialize production stages for tracked products
     */
    public function initializeStages()
    {
        if (!$this->requires_tracking) {
            return;
        }

        $stages = ProductionStage::orderBy('order_sequence')->get();
        $startDate = $this->production_started_at ?? now();
        
        foreach ($stages as $stage) {
            $this->stageLogs()->create([
                'production_stage_id' => $stage->id,
                'status' => $stage->order_sequence === 1 ? 'pending' : 'pending',
                'estimated_completion_at' => $startDate->copy()->addHours(
                    $stages->where('order_sequence', '<=', $stage->order_sequence)
                        ->sum('duration_hours')
                ),
                'progress_percentage' => 0.00,
            ]);
        }
    }

    /**
     * Start next stage automatically
     */
    public function startNextStage()
    {
        if (!$this->requires_tracking) {
            return false;
        }

        $nextStage = $this->stageLogs()
            ->where('status', 'pending')
            ->whereHas('productionStage')
            ->orderBy(function($query) {
                $query->select('order_sequence')
                    ->from('production_stages')
                    ->whereColumn('production_stages.id', 'production_stage_logs.production_stage_id');
            })
            ->first();

        if ($nextStage) {
            $nextStage->update([
                'status' => 'in_progress',
                'started_at' => now(),
            ]);

            // Update current stage in production
            $this->update([
                'current_stage' => $nextStage->productionStage->name,
            ]);

            return true;
        }

        return false;
    }

    /**
     * Complete current stage
     */
    public function completeCurrentStage(array $data = [])
    {
        $currentLog = $this->currentStageLog;
        
        if ($currentLog) {
            $currentLog->update(array_merge([
                'status' => 'completed',
                'completed_at' => now(),
                'progress_percentage' => 100.00,
                'actual_duration_hours' => $currentLog->started_at ? 
                    $currentLog->started_at->diffInHours(now()) : null,
            ], $data));

            $this->updateOverallProgress();
            $this->startNextStage();

            return true;
        }

        return false;
    }

    /**
     * Update overall progress based on completed stages
     */
    public function updateOverallProgress()
    {
        if (!$this->requires_tracking) {
            $this->update(['overall_progress' => 100.00]);
            return;
        }

        $totalStages = $this->stageLogs()->count();
        $completedStages = $this->stageLogs()->where('status', 'completed')->count();
        
        $progress = $totalStages > 0 ? ($completedStages / $totalStages) * 100 : 0;
        
        $this->update(['overall_progress' => round($progress, 2)]);

        // Mark as completed if all stages are done
        if ($progress >= 100) {
            $this->update([
                'status' => 'Completed',
                'current_stage' => 'Completed',
                'actual_completion_date' => now(),
            ]);
        }
    }

    /**
     * Get stage progress for display
     */
    public function getStageProgressAttribute()
    {
        if (!$this->requires_tracking) {
            return [
                'current_stage' => 'Ready for Delivery',
                'progress' => 100,
                'stages' => [],
            ];
        }

        return [
            'current_stage' => $this->current_stage,
            'progress' => $this->overall_progress,
            'stages' => $this->stageLogs()->with('productionStage')
                ->orderBy(function($query) {
                    $query->select('order_sequence')
                        ->from('production_stages')
                        ->whereColumn('production_stages.id', 'production_stage_logs.production_stage_id');
                })
                ->get()
                ->map(function ($log) {
                    return [
                        'name' => $log->productionStage->name,
                        'status' => $log->status,
                        'progress' => $log->progress_percentage,
                        'started_at' => $log->started_at,
                        'completed_at' => $log->completed_at,
                        'estimated_completion_at' => $log->estimated_completion_at,
                    ];
                })
        ];
    }

    /**
     * Check if production is delayed
     */
    public function getIsDelayedAttribute()
    {
        if (!$this->estimated_completion_date) {
            return false;
        }

        return now()->gt($this->estimated_completion_date) && $this->status !== 'Completed';
    }

    /**
     * Get estimated delay in hours
     */
    public function getDelayHoursAttribute()
    {
        if (!$this->is_delayed) {
            return 0;
        }

        return now()->diffInHours($this->estimated_completion_date);
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    public function scopeRequiresTracking($query)
    {
        return $query->where('requires_tracking', true);
    }

    public function scopeNoTracking($query)
    {
        return $query->where('requires_tracking', false);
    }

    public function scopeByProductType($query, $type)
    {
        return $query->where('product_type', $type);
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'In Progress');
    }

    public function scopeDelayed($query)
    {
        return $query->where('estimated_completion_date', '<', now())
                    ->where('status', '!=', 'Completed');
    }
}

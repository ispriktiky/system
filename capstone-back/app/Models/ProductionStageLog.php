<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class ProductionStageLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'production_id',
        'production_stage_id',
        'status',
        'started_at',
        'completed_at',
        'estimated_completion_at',
        'actual_duration_hours',
        'notes',
        'resources_used',
        'issues',
        'assigned_worker_id',
        'progress_percentage',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'estimated_completion_at' => 'datetime',
        'resources_used' => 'array',
        'issues' => 'array',
        'progress_percentage' => 'decimal:2',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function production()
    {
        return $this->belongsTo(Production::class);
    }

    public function productionStage()
    {
        return $this->belongsTo(ProductionStage::class);
    }

    public function assignedWorker()
    {
        return $this->belongsTo(User::class, 'assigned_worker_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors & Mutators
    |--------------------------------------------------------------------------
    */

    public function getIsDelayedAttribute()
    {
        if (!$this->estimated_completion_at || $this->status === 'completed') {
            return false;
        }

        return now()->gt($this->estimated_completion_at);
    }

    public function getDelayHoursAttribute()
    {
        if (!$this->is_delayed) {
            return 0;
        }

        return now()->diffInHours($this->estimated_completion_at);
    }

    public function getEstimatedDurationAttribute()
    {
        return $this->productionStage ? $this->productionStage->duration_hours : 0;
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['pending', 'in_progress']);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeDelayed($query)
    {
        return $query->where('estimated_completion_at', '<', now())
                    ->where('status', '!=', 'completed');
    }

    /*
    |--------------------------------------------------------------------------
    | Methods
    |--------------------------------------------------------------------------
    */

    public function start($workerId = null)
    {
        $this->update([
            'status' => 'in_progress',
            'started_at' => now(),
            'assigned_worker_id' => $workerId,
        ]);
    }

    public function complete(array $data = [])
    {
        $this->update(array_merge([
            'status' => 'completed',
            'completed_at' => now(),
            'progress_percentage' => 100.00,
            'actual_duration_hours' => $this->started_at ? 
                $this->started_at->diffInHours(now()) : null,
        ], $data));
    }

    public function updateProgress($percentage, $notes = null)
    {
        $this->update([
            'progress_percentage' => min(100, max(0, $percentage)),
            'notes' => $notes ?: $this->notes,
        ]);
    }
}

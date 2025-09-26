<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderTracking extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'tracking_type',
        'current_stage',
        'status',
        'estimated_start_date',
        'estimated_completion_date',
        'actual_start_date',
        'actual_completion_date',
        'process_timeline',
        'production_updates',
        'customer_notes',
        'internal_notes',
    ];

    protected $casts = [
        'estimated_start_date' => 'datetime',
        'estimated_completion_date' => 'datetime',
        'actual_start_date' => 'datetime',
        'actual_completion_date' => 'datetime',
        'process_timeline' => 'array',
        'production_updates' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Helper method to get progress percentage
    public function getProgressPercentageAttribute()
    {
        if ($this->tracking_type === 'alkansya') {
            // For Alkansya, progress is based on 6 processes
            $stages = ['Design', 'Preparation', 'Cutting', 'Assembly', 'Finishing', 'Quality Control'];
            $currentIndex = array_search($this->current_stage, $stages);
            return $currentIndex !== false ? round((($currentIndex + 1) / count($stages)) * 100, 2) : 0;
        } else {
            // For custom products, use timeline data
            if ($this->process_timeline) {
                $completed = collect($this->process_timeline)->where('status', 'completed')->count();
                $total = count($this->process_timeline);
                return $total > 0 ? round(($completed / $total) * 100, 2) : 0;
            }
            return 0;
        }
    }
}

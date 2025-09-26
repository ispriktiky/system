<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductionAnalytics extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'date',
        'target_output',
        'actual_output',
        'efficiency_percentage',
        'total_duration_minutes',
        'avg_process_duration_minutes',
        'process_breakdown',
        'bottleneck_analysis',
        'predictive_forecast',
        'resource_utilization',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'process_breakdown' => 'array',
        'bottleneck_analysis' => 'array',
        'predictive_forecast' => 'array',
        'resource_utilization' => 'array',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Helper method to calculate efficiency
    public function getEfficiencyAttribute()
    {
        if ($this->target_output > 0) {
            return round(($this->actual_output / $this->target_output) * 100, 2);
        }
        return 0;
    }
}

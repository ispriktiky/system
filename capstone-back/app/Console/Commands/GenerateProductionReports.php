<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Production;
use App\Models\ProductionStageLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class GenerateProductionReports extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'production:generate-reports 
                            {--period=daily : Report period (daily, weekly, monthly)}
                            {--format=json : Output format (json, csv, txt)}
                            {--save : Save report to storage}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate automated production performance reports';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $period = $this->option('period');
        $format = $this->option('format');
        $save = $this->option('save');
        
        $this->info("Generating {$period} production report...");
        
        // Get date range based on period
        $dateRange = $this->getDateRange($period);
        
        // Generate comprehensive report
        $report = $this->generateReport($dateRange['start'], $dateRange['end'], $period);
        
        // Output report
        $this->displayReport($report, $format);
        
        // Save if requested
        if ($save) {
            $this->saveReport($report, $period, $format);
        }
        
        return Command::SUCCESS;
    }
    
    private function getDateRange($period)
    {
        switch ($period) {
            case 'daily':
                return [
                    'start' => now()->startOfDay(),
                    'end' => now()->endOfDay()
                ];
            case 'weekly':
                return [
                    'start' => now()->startOfWeek(),
                    'end' => now()->endOfWeek()
                ];
            case 'monthly':
                return [
                    'start' => now()->startOfMonth(),
                    'end' => now()->endOfMonth()
                ];
            default:
                return [
                    'start' => now()->startOfDay(),
                    'end' => now()->endOfDay()
                ];
        }
    }
    
    private function generateReport($startDate, $endDate, $period)
    {
        // Get productions in the date range
        $productions = Production::whereBetween('created_at', [$startDate, $endDate])
            ->with(['product', 'stageLogs.productionStage'])
            ->get();
            
        // Basic metrics
        $totalProductions = $productions->count();
        $completedProductions = $productions->where('status', 'Completed');
        $inProgressProductions = $productions->where('status', 'In Progress');
        $delayedProductions = $productions->filter(function ($prod) {
            return $prod->estimated_completion_date && now()->gt($prod->estimated_completion_date) && $prod->status !== 'Completed';
        });
        
        // Product type breakdown
        $productTypeBreakdown = $productions->groupBy('product_type')
            ->map(function ($group, $type) {
                return [
                    'total' => $group->count(),
                    'completed' => $group->where('status', 'Completed')->count(),
                    'in_progress' => $group->where('status', 'In Progress')->count(),
                    'completion_rate' => $group->count() > 0 ? 
                        round(($group->where('status', 'Completed')->count() / $group->count()) * 100, 1) : 0
                ];
            });
            
        // Stage efficiency analysis
        $stageEfficiency = $this->calculateStageEfficiency($productions);
        
        // Resource utilization
        $resourceUtilization = $this->calculateResourceUtilization($productions);
        
        // Performance trends
        $performanceTrends = $this->calculatePerformanceTrends($startDate, $endDate, $period);
        
        // Capacity utilization
        $capacityUtilization = $this->calculateCapacityUtilization($productions, $period);
        
        // Quality metrics
        $qualityMetrics = $this->calculateQualityMetrics($productions);
        
        return [
            'report_info' => [
                'generated_at' => now()->toISOString(),
                'period' => $period,
                'date_range' => [
                    'start' => $startDate->toISOString(),
                    'end' => $endDate->toISOString()
                ]
            ],
            'summary' => [
                'total_productions' => $totalProductions,
                'completed' => $completedProductions->count(),
                'in_progress' => $inProgressProductions->count(),
                'delayed' => $delayedProductions->count(),
                'completion_rate' => $totalProductions > 0 ? 
                    round(($completedProductions->count() / $totalProductions) * 100, 1) : 0,
                'on_time_delivery_rate' => $this->calculateOnTimeDeliveryRate($completedProductions),
                'average_completion_time' => $this->calculateAverageCompletionTime($completedProductions)
            ],
            'product_types' => $productTypeBreakdown,
            'stage_efficiency' => $stageEfficiency,
            'resource_utilization' => $resourceUtilization,
            'performance_trends' => $performanceTrends,
            'capacity_utilization' => $capacityUtilization,
            'quality_metrics' => $qualityMetrics,
            'top_performers' => $this->getTopPerformers($productions),
            'bottlenecks' => $this->identifyBottlenecks($productions),
            'recommendations' => $this->generateRecommendations($productions, $stageEfficiency)
        ];
    }
    
    private function calculateStageEfficiency($productions)
    {
        $trackedProductions = $productions->where('requires_tracking', true);
        
        $stageStats = [];
        $allStages = ['Material Preparation', 'Cutting & Shaping', 'Assembly', 
                     'Sanding & Surface Preparation', 'Finishing', 'Quality Check & Packaging'];
                     
        foreach ($allStages as $stageName) {
            $stageLogs = ProductionStageLog::whereHas('productionStage', function ($query) use ($stageName) {
                $query->where('name', $stageName);
            })
            ->whereIn('production_id', $trackedProductions->pluck('id'))
            ->get();
            
            $completedLogs = $stageLogs->where('status', 'completed');
            $averageDuration = $completedLogs->whereNotNull('actual_duration_hours')->avg('actual_duration_hours');
            $delayedLogs = $stageLogs->filter(function ($log) {
                return $log->estimated_completion_at && now()->gt($log->estimated_completion_at) && $log->status !== 'completed';
            });
            
            $stageStats[$stageName] = [
                'total_instances' => $stageLogs->count(),
                'completed' => $completedLogs->count(),
                'in_progress' => $stageLogs->where('status', 'in_progress')->count(),
                'delayed' => $delayedLogs->count(),
                'average_duration_hours' => round($averageDuration ?: 0, 1),
                'completion_rate' => $stageLogs->count() > 0 ? 
                    round(($completedLogs->count() / $stageLogs->count()) * 100, 1) : 0,
                'delay_rate' => $stageLogs->count() > 0 ? 
                    round(($delayedLogs->count() / $stageLogs->count()) * 100, 1) : 0
            ];
        }
        
        return $stageStats;
    }
    
    private function calculateResourceUtilization($productions)
    {
        $resourceUsage = [];
        
        foreach ($productions as $production) {
            if ($production->resources_used) {
                foreach ($production->resources_used as $resource => $amount) {
                    if (!isset($resourceUsage[$resource])) {
                        $resourceUsage[$resource] = 0;
                    }
                    $resourceUsage[$resource] += $amount;
                }
            }
            
            // Collect stage-level resource usage
            foreach ($production->stageLogs as $stageLog) {
                if ($stageLog->resources_used) {
                    foreach ($stageLog->resources_used as $resource => $amount) {
                        if (!isset($resourceUsage[$resource])) {
                            $resourceUsage[$resource] = 0;
                        }
                        $resourceUsage[$resource] += $amount;
                    }
                }
            }
        }
        
        return $resourceUsage;
    }
    
    private function calculatePerformanceTrends($startDate, $endDate, $period)
    {
        $intervalDays = $period === 'daily' ? 1 : ($period === 'weekly' ? 7 : 30);
        $intervals = [];
        
        $currentDate = $startDate->copy();
        while ($currentDate->lte($endDate)) {
            $intervalEnd = $currentDate->copy()->addDays($intervalDays - 1);
            if ($intervalEnd->gt($endDate)) {
                $intervalEnd = $endDate->copy();
            }
            
            $intervalProductions = Production::whereBetween('created_at', [$currentDate, $intervalEnd])->get();
            
            $intervals[] = [
                'date' => $currentDate->toDateString(),
                'total' => $intervalProductions->count(),
                'completed' => $intervalProductions->where('status', 'Completed')->count(),
                'completion_rate' => $intervalProductions->count() > 0 ? 
                    round(($intervalProductions->where('status', 'Completed')->count() / $intervalProductions->count()) * 100, 1) : 0
            ];
            
            $currentDate->addDays($intervalDays);
        }
        
        return $intervals;
    }
    
    private function calculateCapacityUtilization($productions, $period)
    {
        // Assume maximum capacity based on period
        $maxCapacity = [
            'daily' => 10,    // 10 productions per day
            'weekly' => 50,   // 50 productions per week
            'monthly' => 200  // 200 productions per month
        ];
        
        $currentCapacity = $productions->count();
        $maxPeriodCapacity = $maxCapacity[$period] ?? $maxCapacity['daily'];
        
        return [
            'current' => $currentCapacity,
            'maximum' => $maxPeriodCapacity,
            'utilization_rate' => round(($currentCapacity / $maxPeriodCapacity) * 100, 1),
            'available_capacity' => $maxPeriodCapacity - $currentCapacity
        ];
    }
    
    private function calculateQualityMetrics($productions)
    {
        $totalIssues = 0;
        $productionsWithIssues = 0;
        
        foreach ($productions as $production) {
            $hasIssues = false;
            foreach ($production->stageLogs as $stageLog) {
                if ($stageLog->issues && count($stageLog->issues) > 0) {
                    $totalIssues += count($stageLog->issues);
                    $hasIssues = true;
                }
            }
            if ($hasIssues) $productionsWithIssues++;
        }
        
        return [
            'total_issues' => $totalIssues,
            'productions_with_issues' => $productionsWithIssues,
            'quality_rate' => $productions->count() > 0 ? 
                round((($productions->count() - $productionsWithIssues) / $productions->count()) * 100, 1) : 100,
            'average_issues_per_production' => $productions->count() > 0 ? 
                round($totalIssues / $productions->count(), 2) : 0
        ];
    }
    
    private function calculateOnTimeDeliveryRate($completedProductions)
    {
        if ($completedProductions->isEmpty()) return 0;
        
        $onTimeDeliveries = $completedProductions->filter(function ($production) {
            return $production->actual_completion_date && $production->estimated_completion_date &&
                   $production->actual_completion_date <= $production->estimated_completion_date;
        })->count();
        
        return round(($onTimeDeliveries / $completedProductions->count()) * 100, 1);
    }
    
    private function calculateAverageCompletionTime($completedProductions)
    {
        $completionTimes = $completedProductions
            ->whereNotNull('production_started_at')
            ->whereNotNull('actual_completion_date')
            ->map(function ($production) {
                return Carbon::parse($production->production_started_at)
                    ->diffInHours(Carbon::parse($production->actual_completion_date));
            });
            
        return $completionTimes->isEmpty() ? 0 : round($completionTimes->avg(), 1);
    }
    
    private function getTopPerformers($productions)
    {
        // This would normally connect to user performance data
        // For now, return a placeholder structure
        return [
            'fastest_completions' => $productions->where('status', 'Completed')
                ->sortBy(function ($prod) {
                    return $prod->production_started_at && $prod->actual_completion_date ?
                        Carbon::parse($prod->production_started_at)->diffInHours($prod->actual_completion_date) : 
                        999999;
                })
                ->take(5)
                ->map(function ($prod) {
                    return [
                        'id' => $prod->id,
                        'product_name' => $prod->product_name,
                        'batch_number' => $prod->production_batch_number,
                        'completion_time_hours' => $prod->production_started_at && $prod->actual_completion_date ?
                            Carbon::parse($prod->production_started_at)->diffInHours($prod->actual_completion_date) : 0
                    ];
                })
                ->values()
        ];
    }
    
    private function identifyBottlenecks($productions)
    {
        $bottlenecks = [];
        
        // Find stages with high delay rates
        $stageEfficiency = $this->calculateStageEfficiency($productions);
        
        foreach ($stageEfficiency as $stageName => $stats) {
            if ($stats['delay_rate'] > 20) { // More than 20% delay rate is a bottleneck
                $bottlenecks[] = [
                    'type' => 'stage_delay',
                    'stage' => $stageName,
                    'delay_rate' => $stats['delay_rate'],
                    'severity' => $stats['delay_rate'] > 40 ? 'high' : 'medium'
                ];
            }
        }
        
        // Find products with consistently long completion times
        $productTypes = $productions->groupBy('product_type');
        foreach ($productTypes as $type => $typeProductions) {
            $avgCompletion = $this->calculateAverageCompletionTime($typeProductions->where('status', 'Completed'));
            if ($avgCompletion > 240) { // More than 240 hours (10 days) is slow
                $bottlenecks[] = [
                    'type' => 'slow_product_type',
                    'product_type' => $type,
                    'average_completion_hours' => $avgCompletion,
                    'severity' => $avgCompletion > 360 ? 'high' : 'medium'
                ];
            }
        }
        
        return $bottlenecks;
    }
    
    private function generateRecommendations($productions, $stageEfficiency)
    {
        $recommendations = [];
        
        // Check completion rates
        $totalProductions = $productions->count();
        $completedProductions = $productions->where('status', 'Completed')->count();
        $completionRate = $totalProductions > 0 ? ($completedProductions / $totalProductions) * 100 : 0;
        
        if ($completionRate < 70) {
            $recommendations[] = [
                'category' => 'productivity',
                'priority' => 'high',
                'title' => 'Low Completion Rate',
                'description' => "Current completion rate is {$completionRate}%. Consider reviewing workflow processes and resource allocation.",
                'action' => 'Review bottlenecks and increase resource allocation to delayed stages.'
            ];
        }
        
        // Check stage efficiency
        foreach ($stageEfficiency as $stageName => $stats) {
            if ($stats['delay_rate'] > 25) {
                $recommendations[] = [
                    'category' => 'efficiency',
                    'priority' => 'medium',
                    'title' => "High Delay Rate in {$stageName}",
                    'description' => "The {$stageName} stage has a {$stats['delay_rate']}% delay rate.",
                    'action' => "Focus on optimizing the {$stageName} process and ensure adequate resources are allocated."
                ];
            }
        }
        
        // Check for delayed productions
        $delayedCount = $productions->filter(function ($prod) {
            return $prod->estimated_completion_date && now()->gt($prod->estimated_completion_date) && $prod->status !== 'Completed';
        })->count();
        
        if ($delayedCount > 0) {
            $recommendations[] = [
                'category' => 'scheduling',
                'priority' => 'high',
                'title' => 'Delayed Productions',
                'description' => "{$delayedCount} productions are currently delayed.",
                'action' => 'Prioritize delayed orders and consider adjusting production schedules or adding overtime.'
            ];
        }
        
        return $recommendations;
    }
    
    private function displayReport($report, $format)
    {
        switch ($format) {
            case 'json':
                $this->line(json_encode($report, JSON_PRETTY_PRINT));
                break;
                
            case 'csv':
                $this->displayCsvReport($report);
                break;
                
            default:
                $this->displayTextReport($report);
        }
    }
    
    private function displayTextReport($report)
    {
        $this->line('=====================================');
        $this->line('    PRODUCTION PERFORMANCE REPORT');
        $this->line('=====================================');
        $this->line('');
        
        // Report info
        $this->line('Report Period: ' . $report['report_info']['period']);
        $this->line('Generated: ' . $report['report_info']['generated_at']);
        $this->line('');
        
        // Summary
        $this->line('SUMMARY:');
        $this->line('--------');
        foreach ($report['summary'] as $key => $value) {
            $this->line(ucfirst(str_replace('_', ' ', $key)) . ': ' . $value . ($key === 'completion_rate' || $key === 'on_time_delivery_rate' ? '%' : ''));
        }
        $this->line('');
        
        // Product types
        $this->line('PRODUCT TYPE BREAKDOWN:');
        $this->line('----------------------');
        foreach ($report['product_types'] as $type => $stats) {
            $this->line("{$type}: {$stats['total']} total, {$stats['completed']} completed ({$stats['completion_rate']}%)");
        }
        $this->line('');
        
        // Stage efficiency
        $this->line('STAGE EFFICIENCY:');
        $this->line('----------------');
        foreach ($report['stage_efficiency'] as $stage => $stats) {
            $this->line("{$stage}: {$stats['completion_rate']}% complete, {$stats['delay_rate']}% delayed");
        }
        $this->line('');
        
        // Recommendations
        if (!empty($report['recommendations'])) {
            $this->line('RECOMMENDATIONS:');
            $this->line('---------------');
            foreach ($report['recommendations'] as $rec) {
                $this->line("[{$rec['priority']}] {$rec['title']}");
                $this->line("  {$rec['description']}");
                $this->line("  Action: {$rec['action']}");
                $this->line('');
            }
        }
    }
    
    private function displayCsvReport($report)
    {
        // Output basic CSV format
        $this->line('Metric,Value');
        foreach ($report['summary'] as $key => $value) {
            $this->line(ucfirst(str_replace('_', ' ', $key)) . ',' . $value);
        }
    }
    
    private function saveReport($report, $period, $format)
    {
        $timestamp = now()->format('Y-m-d_H-i-s');
        $filename = "production_report_{$period}_{$timestamp}.{$format}";
        
        $content = $format === 'json' ? 
            json_encode($report, JSON_PRETTY_PRINT) :
            $this->formatReportForSaving($report, $format);
            
        Storage::disk('local')->put("reports/production/{$filename}", $content);
        
        $this->info("Report saved to storage/app/reports/production/{$filename}");
    }
    
    private function formatReportForSaving($report, $format)
    {
        // Convert report to desired format for saving
        if ($format === 'txt') {
            $output = "Production Performance Report\n";
            $output .= "Generated: {$report['report_info']['generated_at']}\n\n";
            
            $output .= "SUMMARY:\n";
            foreach ($report['summary'] as $key => $value) {
                $output .= ucfirst(str_replace('_', ' ', $key)) . ": {$value}\n";
            }
            
            return $output;
        }
        
        return json_encode($report, JSON_PRETTY_PRINT);
    }
}

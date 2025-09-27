<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Production;
use App\Models\ProductionStage;
use App\Models\ProductionStageLog;
use App\Models\Order;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ProductionTrackingController extends Controller
{
    /**
     * Display the production dashboard
     */
    public function dashboard()
    {
        $stats = $this->getDashboardStats();
        $recentProductions = $this->getRecentProductions();
        $delayedProductions = $this->getDelayedProductions();
        $upcomingDeadlines = $this->getUpcomingDeadlines();
        
        return response()->json([
            'stats' => $stats,
            'recent_productions' => $recentProductions,
            'delayed_productions' => $delayedProductions,
            'upcoming_deadlines' => $upcomingDeadlines,
        ]);
    }

    /**
     * Get all productions with tracking info
     */
    public function index(Request $request)
    {
        $query = Production::with([
            'product',
            'order',
            'user',
            'stageLogs.productionStage',
            'stageLogs.assignedWorker'
        ]);

        // Filter by product type
        if ($request->has('product_type') && $request->product_type !== 'all') {
            $query->byProductType($request->product_type);
        }

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by tracking requirement
        if ($request->has('requires_tracking')) {
            if ($request->requires_tracking === 'true') {
                $query->requiresTracking();
            } else {
                $query->noTracking();
            }
        }

        // Search by production batch number or product name
        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('production_batch_number', 'like', '%' . $request->search . '%')
                  ->orWhere('product_name', 'like', '%' . $request->search . '%');
            });
        }

        $productions = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        // Add stage progress to each production
        $productions->getCollection()->transform(function ($production) {
            $production->stage_progress = $production->stage_progress;
            return $production;
        });

        return response()->json($productions);
    }

    /**
     * Create a new production order
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'order_id' => 'nullable|exists:orders,id',
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'priority' => 'in:low,medium,high,urgent',
            'product_type' => 'required|in:alkansya,table,chair,custom',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Get product details
            $product = Product::findOrFail($request->product_id);
            $requiresTracking = in_array($request->product_type, ['table', 'chair', 'custom']);
            
            // Create production
            $production = Production::create([
                'order_id' => $request->order_id,
                'user_id' => auth()->id(),
                'product_id' => $request->product_id,
                'product_name' => $product->name,
                'date' => now()->toDateString(),
                'current_stage' => $requiresTracking ? 'Material Preparation' : 'Ready for Delivery',
                'status' => $requiresTracking ? 'In Progress' : 'Completed',
                'quantity' => $request->quantity,
                'priority' => $request->priority ?? 'medium',
                'requires_tracking' => $requiresTracking,
                'product_type' => $request->product_type,
                'production_started_at' => now(),
                'estimated_completion_date' => $requiresTracking ? now()->addWeeks(2) : now()->addHours(1),
                'production_batch_number' => 'PROD-' . now()->format('Ymd') . '-' . str_pad(Production::whereDate('created_at', today())->count() + 1, 4, '0', STR_PAD_LEFT),
                'notes' => $request->notes,
                'overall_progress' => $requiresTracking ? 0 : 100,
            ]);

            // Initialize stages for tracked products
            if ($requiresTracking) {
                $production->initializeStages();
                
                // Start the first stage
                $firstStage = $production->stageLogs()
                    ->whereHas('productionStage', function ($query) {
                        $query->where('order_sequence', 1);
                    })
                    ->first();
                    
                if ($firstStage) {
                    $firstStage->start(auth()->id());
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Production order created successfully',
                'production' => $production->load(['stageLogs.productionStage'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create production order: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get detailed production tracking info
     */
    public function show($id)
    {
        $production = Production::with([
            'product',
            'order.orderItems',
            'user',
            'stageLogs.productionStage',
            'stageLogs.assignedWorker'
        ])->findOrFail($id);

        // Add calculated attributes
        $production->stage_progress = $production->stage_progress;
        $production->is_delayed = $production->is_delayed;
        $production->delay_hours = $production->delay_hours;

        return response()->json([
            'production' => $production
        ]);
    }

    /**
     * Update production details
     */
    public function update(Request $request, $id)
    {
        $production = Production::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'priority' => 'in:low,medium,high,urgent',
            'notes' => 'nullable|string',
            'estimated_completion_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $production->update($request->only(['priority', 'notes', 'estimated_completion_date']));

        return response()->json([
            'success' => true,
            'message' => 'Production updated successfully',
            'production' => $production->fresh()
        ]);
    }

    /**
     * Start a specific production stage
     */
    public function startStage(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'stage_id' => 'required|exists:production_stage_logs,id',
            'worker_id' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $production = Production::findOrFail($id);
            $stageLog = ProductionStageLog::where('production_id', $id)
                ->where('id', $request->stage_id)
                ->firstOrFail();

            if ($stageLog->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Stage is not in pending status'
                ], 422);
            }

            $stageLog->start($request->worker_id);
            
            if ($request->notes) {
                $stageLog->update(['notes' => $request->notes]);
            }

            // Update production current stage
            $production->update([
                'current_stage' => $stageLog->productionStage->name
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Stage started successfully',
                'stage_log' => $stageLog->fresh(['productionStage', 'assignedWorker'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to start stage: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Complete a specific production stage
     */
    public function completeStage(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'stage_id' => 'required|exists:production_stage_logs,id',
            'notes' => 'nullable|string',
            'resources_used' => 'nullable|array',
            'issues' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $production = Production::findOrFail($id);
            $stageLog = ProductionStageLog::where('production_id', $id)
                ->where('id', $request->stage_id)
                ->firstOrFail();

            if (!in_array($stageLog->status, ['in_progress', 'pending'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Stage cannot be completed from current status'
                ], 422);
            }

            // Complete the stage
            $stageLog->complete([
                'notes' => $request->notes,
                'resources_used' => $request->resources_used,
                'issues' => $request->issues,
            ]);

            // Update production progress and potentially start next stage
            $production->updateOverallProgress();
            $production->startNextStage();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Stage completed successfully',
                'production' => $production->fresh(['stageLogs.productionStage'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete stage: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update stage progress
     */
    public function updateStageProgress(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'stage_id' => 'required|exists:production_stage_logs,id',
            'progress' => 'required|numeric|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $stageLog = ProductionStageLog::where('production_id', $id)
                ->where('id', $request->stage_id)
                ->firstOrFail();

            $stageLog->updateProgress($request->progress, $request->notes);

            return response()->json([
                'success' => true,
                'message' => 'Progress updated successfully',
                'stage_log' => $stageLog->fresh(['productionStage'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update progress: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get production statistics for dashboard
     */
    private function getDashboardStats()
    {
        return [
            'total_productions' => Production::count(),
            'in_progress' => Production::inProgress()->count(),
            'completed_today' => Production::where('status', 'Completed')
                ->whereDate('actual_completion_date', today())->count(),
            'delayed' => Production::delayed()->count(),
            'requiring_tracking' => Production::requiresTracking()->count(),
            'alkansya_ready' => Production::byProductType('alkansya')->count(),
            'average_completion_time' => $this->getAverageCompletionTime(),
        ];
    }

    private function getRecentProductions()
    {
        return Production::with(['product', 'stageLogs.productionStage'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($production) {
                $production->stage_progress = $production->stage_progress;
                return $production;
            });
    }

    private function getDelayedProductions()
    {
        return Production::delayed()
            ->with(['product', 'stageLogs.productionStage'])
            ->get()
            ->map(function ($production) {
                $production->delay_hours = $production->delay_hours;
                return $production;
            });
    }

    private function getUpcomingDeadlines()
    {
        return Production::where('estimated_completion_date', '>=', now())
            ->where('estimated_completion_date', '<=', now()->addDays(3))
            ->where('status', '!=', 'Completed')
            ->with(['product'])
            ->orderBy('estimated_completion_date')
            ->get();
    }

    private function getAverageCompletionTime()
    {
        $completed = Production::where('status', 'Completed')
            ->whereNotNull('production_started_at')
            ->whereNotNull('actual_completion_date')
            ->get();

        if ($completed->isEmpty()) {
            return 0;
        }

        $totalHours = $completed->sum(function ($production) {
            return $production->production_started_at->diffInHours($production->actual_completion_date);
        });

        return round($totalHours / $completed->count(), 1);
    }

    /**
     * Generate production report
     */
    public function generateReport(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'product_type' => 'nullable|in:alkansya,table,chair,custom,all',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $query = Production::whereBetween('created_at', [
            Carbon::parse($request->start_date)->startOfDay(),
            Carbon::parse($request->end_date)->endOfDay()
        ]);

        if ($request->product_type && $request->product_type !== 'all') {
            $query->byProductType($request->product_type);
        }

        $productions = $query->with(['product', 'stageLogs.productionStage'])->get();

        $report = [
            'period' => [
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
            ],
            'summary' => [
                'total_productions' => $productions->count(),
                'completed' => $productions->where('status', 'Completed')->count(),
                'in_progress' => $productions->where('status', 'In Progress')->count(),
                'delayed' => $productions->where('is_delayed', true)->count(),
            ],
            'by_product_type' => $productions->groupBy('product_type')->map->count(),
            'by_priority' => $productions->groupBy('priority')->map->count(),
            'average_completion_time' => $this->calculateAverageCompletionTime($productions),
            'efficiency_metrics' => $this->calculateEfficiencyMetrics($productions),
        ];

        return response()->json($report);
    }

    private function calculateAverageCompletionTime($productions)
    {
        $completed = $productions->where('status', 'Completed')
            ->whereNotNull('production_started_at')
            ->whereNotNull('actual_completion_date');

        if ($completed->isEmpty()) {
            return 0;
        }

        $totalHours = $completed->sum(function ($production) {
            return Carbon::parse($production->production_started_at)
                ->diffInHours(Carbon::parse($production->actual_completion_date));
        });

        return round($totalHours / $completed->count(), 1);
    }

    private function calculateEfficiencyMetrics($productions)
    {
        $completed = $productions->where('status', 'Completed');
        $onTime = $completed->filter(function ($production) {
            return $production->actual_completion_date <= $production->estimated_completion_date;
        });

        return [
            'on_time_delivery_rate' => $completed->count() > 0 ? 
                round(($onTime->count() / $completed->count()) * 100, 1) : 0,
            'productivity_rate' => $productions->count() > 0 ? 
                round(($completed->count() / $productions->count()) * 100, 1) : 0,
        ];
    }
    
    /**
     * Get predictive analytics and forecasting
     */
    public function predictiveAnalytics(Request $request)
    {
        $days = $request->get('days', 30); // Forecast for next 30 days
        
        $forecasts = $this->generateProductionForecasts($days);
        $capacityPredictions = $this->predictCapacityNeeds($days);
        $delayPredictions = $this->predictDelays();
        $resourceForecasts = $this->forecastResourceNeeds($days);
        $recommendations = $this->generatePredictiveRecommendations($forecasts, $delayPredictions);
        
        return response()->json([
            'forecasts' => $forecasts,
            'capacity_predictions' => $capacityPredictions,
            'delay_predictions' => $delayPredictions,
            'resource_forecasts' => $resourceForecasts,
            'recommendations' => $recommendations,
            'confidence_level' => $this->calculateConfidenceLevel()
        ]);
    }
    
    private function generateProductionForecasts($days)
    {
        // Get historical data for trend analysis
        $historicalData = Production::where('created_at', '>=', now()->subDays(90))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count, 
                         COUNT(CASE WHEN status = "Completed" THEN 1 END) as completed')
            ->groupBy('date')
            ->orderBy('date')
            ->get();
            
        if ($historicalData->count() < 7) {
            return [
                'daily_forecast' => [],
                'trend' => 'insufficient_data',
                'confidence' => 0
            ];
        }
        
        // Calculate moving averages and trends
        $recentAvg = $historicalData->take(-7)->avg('count');
        $monthlyAvg = $historicalData->take(-30)->avg('count');
        
        $trend = $recentAvg > $monthlyAvg * 1.1 ? 'increasing' : 
                ($recentAvg < $monthlyAvg * 0.9 ? 'decreasing' : 'stable');
                
        // Generate forecast based on trend
        $dailyForecasts = [];
        $baseAmount = round($recentAvg);
        
        for ($i = 1; $i <= $days; $i++) {
            $trendMultiplier = $trend === 'increasing' ? 1 + (0.02 * $i / 30) : 
                              ($trend === 'decreasing' ? 1 - (0.02 * $i / 30) : 1);
                              
            $seasonalFactor = $this->getSeasonalFactor($i);
            $randomFactor = 0.9 + (mt_rand() / mt_getrandmax()) * 0.2; // ±10% variance
            
            $forecasted = round($baseAmount * $trendMultiplier * $seasonalFactor * $randomFactor);
            
            $dailyForecasts[] = [
                'date' => now()->addDays($i)->toDateString(),
                'forecasted_production' => max(0, $forecasted),
                'expected_completions' => round($forecasted * 0.8), // Assume 80% completion rate
                'confidence' => max(0.3, 0.9 - ($i * 0.02)) // Decrease confidence over time
            ];
        }
        
        return [
            'daily_forecast' => $dailyForecasts,
            'trend' => $trend,
            'base_daily_average' => $baseAmount,
            'total_forecasted' => array_sum(array_column($dailyForecasts, 'forecasted_production'))
        ];
    }
    
    private function getSeasonalFactor($daysFromNow)
    {
        $futureDate = now()->addDays($daysFromNow);
        $dayOfWeek = $futureDate->dayOfWeek;
        
        // Assume Monday-Friday are more productive
        $weeklyFactor = in_array($dayOfWeek, [1, 2, 3, 4, 5]) ? 1.0 : 0.6;
        
        // Monthly factors (assuming some months are busier)
        $month = $futureDate->month;
        $monthlyFactors = [
            1 => 0.8,  // January - slow start
            2 => 0.9,  // February
            3 => 1.1,  // March - spring rush
            4 => 1.2,  // April
            5 => 1.1,  // May
            6 => 1.0,  // June
            7 => 0.8,  // July - summer slowdown
            8 => 0.7,  // August
            9 => 1.2,  // September - back to business
            10 => 1.3, // October - pre-holiday rush
            11 => 1.4, // November - holiday preparation
            12 => 0.9  // December - holiday period
        ];
        
        return $weeklyFactor * ($monthlyFactors[$month] ?? 1.0);
    }
    
    private function predictCapacityNeeds($days)
    {
        $currentCapacity = $this->getCurrentCapacityUtilization();
        $forecasts = $this->generateProductionForecasts($days);
        
        $totalForecastedProduction = $forecasts['total_forecasted'];
        $assumedDailyCapacity = 10; // Assume 10 productions per day capacity
        $totalCapacityAvailable = $assumedDailyCapacity * $days;
        
        $utilizationRate = ($totalForecastedProduction / $totalCapacityAvailable) * 100;
        
        $recommendations = [];
        if ($utilizationRate > 90) {
            $recommendations[] = 'Consider expanding production capacity - forecasted utilization exceeds 90%';
        } elseif ($utilizationRate < 50) {
            $recommendations[] = 'Current capacity may be underutilized - consider scaling down or increasing orders';
        }
        
        return [
            'forecasted_demand' => $totalForecastedProduction,
            'available_capacity' => $totalCapacityAvailable,
            'predicted_utilization_rate' => round($utilizationRate, 1),
            'capacity_shortfall' => max(0, $totalForecastedProduction - $totalCapacityAvailable),
            'recommendations' => $recommendations
        ];
    }
    
    private function predictDelays()
    {
        // Analyze historical delay patterns
        $historicalDelays = Production::where('created_at', '>=', now()->subDays(60))
            ->where('estimated_completion_date', '<', DB::raw('actual_completion_date'))
            ->selectRaw('product_type, AVG(TIMESTAMPDIFF(HOUR, estimated_completion_date, actual_completion_date)) as avg_delay_hours')
            ->groupBy('product_type')
            ->get();
            
        $currentInProgress = Production::inProgress()->with('stageLogs')->get();
        
        $riskAssessments = [];
        
        foreach ($currentInProgress as $production) {
            $riskFactors = [];
            $riskScore = 0;
            
            // Factor 1: Historical delay rate for this product type
            $historicalDelay = $historicalDelays->firstWhere('product_type', $production->product_type);
            if ($historicalDelay && $historicalDelay->avg_delay_hours > 24) {
                $riskScore += 30;
                $riskFactors[] = 'Product type has historical delays';
            }
            
            // Factor 2: Current stage progress
            if ($production->overall_progress < 50 && 
                $production->estimated_completion_date && 
                now()->diffInDays($production->estimated_completion_date) < 7) {
                $riskScore += 40;
                $riskFactors[] = 'Low progress with approaching deadline';
            }
            
            // Factor 3: Stage-specific risks
            foreach ($production->stageLogs as $stageLog) {
                if ($stageLog->status === 'in_progress' && 
                    $stageLog->estimated_completion_at && 
                    now()->gt($stageLog->estimated_completion_at)) {
                    $riskScore += 20;
                    $riskFactors[] = "Stage '{$stageLog->productionStage->name}' is overdue";
                }
            }
            
            // Factor 4: Priority vs timeline mismatch
            if ($production->priority === 'urgent' && $production->overall_progress < 75) {
                $riskScore += 25;
                $riskFactors[] = 'Urgent priority with slow progress';
            }
            
            $riskLevel = $riskScore > 70 ? 'high' : ($riskScore > 40 ? 'medium' : 'low');
            
            $riskAssessments[] = [
                'production_id' => $production->id,
                'product_name' => $production->product_name,
                'batch_number' => $production->production_batch_number,
                'risk_score' => $riskScore,
                'risk_level' => $riskLevel,
                'risk_factors' => $riskFactors,
                'predicted_delay_hours' => $riskScore > 50 ? round($riskScore * 0.5) : 0,
                'recommended_actions' => $this->generateDelayMitigationActions($riskLevel, $riskFactors)
            ];
        }
        
        return [
            'at_risk_productions' => array_filter($riskAssessments, fn($r) => $r['risk_level'] !== 'low'),
            'total_assessed' => count($riskAssessments),
            'high_risk_count' => count(array_filter($riskAssessments, fn($r) => $r['risk_level'] === 'high')),
            'medium_risk_count' => count(array_filter($riskAssessments, fn($r) => $r['risk_level'] === 'medium'))
        ];
    }
    
    private function generateDelayMitigationActions($riskLevel, $riskFactors)
    {
        $actions = [];
        
        switch ($riskLevel) {
            case 'high':
                $actions[] = 'Assign additional workers to critical stages';
                $actions[] = 'Consider overtime or extended shifts';
                $actions[] = 'Review and optimize current stage processes';
                break;
            case 'medium':
                $actions[] = 'Monitor progress closely';
                $actions[] = 'Consider reallocating resources from lower priority items';
                break;
        }
        
        if (in_array('Stage overdue', $riskFactors)) {
            $actions[] = 'Immediately address overdue stage bottlenecks';
        }
        
        return $actions;
    }
    
    private function forecastResourceNeeds($days)
    {
        $forecasts = $this->generateProductionForecasts($days);
        $totalForecastedProduction = $forecasts['total_forecasted'];
        
        // Historical resource usage per production
        $avgResourceUsage = Production::where('created_at', '>=', now()->subDays(30))
            ->whereNotNull('resources_used')
            ->get()
            ->reduce(function ($carry, $production) {
                if (!$production->resources_used) return $carry;
                
                foreach ($production->resources_used as $resource => $amount) {
                    $carry[$resource] = ($carry[$resource] ?? 0) + $amount;
                }
                return $carry;
            }, []);
            
        $totalRecentProductions = Production::where('created_at', '>=', now()->subDays(30))->count();
        
        $forecastedResourceNeeds = [];
        foreach ($avgResourceUsage as $resource => $totalUsed) {
            $avgPerProduction = $totalRecentProductions > 0 ? $totalUsed / $totalRecentProductions : 0;
            $forecastedNeed = $avgPerProduction * $totalForecastedProduction;
            
            $forecastedResourceNeeds[$resource] = [
                'forecasted_need' => round($forecastedNeed, 2),
                'avg_per_production' => round($avgPerProduction, 2),
                'confidence' => $totalRecentProductions > 10 ? 0.8 : 0.5
            ];
        }
        
        return $forecastedResourceNeeds;
    }
    
    private function generatePredictiveRecommendations($forecasts, $delayPredictions)
    {
        $recommendations = [];
        
        // Forecast-based recommendations
        if ($forecasts['trend'] === 'increasing') {
            $recommendations[] = [
                'category' => 'capacity_planning',
                'priority' => 'medium',
                'title' => 'Increasing Demand Trend',
                'description' => 'Production demand is forecasted to increase over the next period.',
                'action' => 'Consider expanding capacity, hiring additional staff, or optimizing processes.'
            ];
        } elseif ($forecasts['trend'] === 'decreasing') {
            $recommendations[] = [
                'category' => 'efficiency',
                'priority' => 'low',
                'title' => 'Decreasing Demand Trend',
                'description' => 'Production demand is forecasted to decrease.',
                'action' => 'Focus on efficiency improvements and consider temporary resource reallocation.'
            ];
        }
        
        // Delay-based recommendations
        $highRiskCount = $delayPredictions['high_risk_count'] ?? 0;
        if ($highRiskCount > 0) {
            $recommendations[] = [
                'category' => 'risk_management',
                'priority' => 'high',
                'title' => 'High Delay Risk Detected',
                'description' => "{$highRiskCount} productions are at high risk of delays.",
                'action' => 'Implement immediate intervention strategies and resource reallocation.'
            ];
        }
        
        return $recommendations;
    }
    
    private function calculateConfidenceLevel()
    {
        // Base confidence on amount of historical data
        $dataPoints = Production::where('created_at', '>=', now()->subDays(60))->count();
        
        if ($dataPoints < 10) return 0.3;
        if ($dataPoints < 50) return 0.6;
        if ($dataPoints < 100) return 0.8;
        return 0.9;
    }
    
    private function getCurrentCapacityUtilization()
    {
        $currentProductions = Production::inProgress()->count();
        $assumedMaxCapacity = 50; // Assume max 50 concurrent productions
        
        return [
            'current_productions' => $currentProductions,
            'max_capacity' => $assumedMaxCapacity,
            'utilization_rate' => round(($currentProductions / $assumedMaxCapacity) * 100, 1)
        ];
    }
}

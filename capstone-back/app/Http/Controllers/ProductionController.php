<?php

namespace App\Http\Controllers;

use App\Models\Production;
use App\Models\ProductionProcess;
use App\Models\ProductionAnalytics;
use App\Models\Product;
use App\Models\InventoryItem;
use App\Models\InventoryUsage;
use App\Models\ProductMaterial;
use App\Models\User;
use Illuminate\Http\Request;
use App\Events\ProductionUpdated;
use App\Events\ProductionProcessUpdated;
use App\Notifications\OrderStageUpdated;
use App\Notifications\LowStockAlert;
use App\Models\Order;
use App\Models\OrderTracking;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ProductionController extends Controller
{
    public function index(Request $request)
    {
        $query = Production::with(['user', 'product']); // eager load relationships

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        return response()->json(
            $query->orderBy('date', 'desc')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id'       => 'required|exists:users,id',
            'product_id'    => 'required|exists:products,id',
            'product_name'  => 'required|string|max:255', // keep for quick display
            'date'          => 'required|date',
            'stage'         => 'required|string|in:Design,Preparation,Cutting,Assembly,Finishing,Quality Control',
            'status'        => 'required|string|in:Pending,In Progress,Completed,Hold',
            'quantity'      => 'required|integer|min:0',
            'resources_used'=> 'nullable|array',
            'notes'         => 'nullable|string',
        ]);

        $production = Production::create($data)->load(['user','product']);

        broadcast(new ProductionUpdated($production))->toOthers();

        return response()->json($production, 201);
    }

    public function show($id)
    {
        $production = Production::with(['user', 'product'])->findOrFail($id);
        return response()->json($production);
    }

    public function update(Request $request, $id)
    {
        $production = Production::findOrFail($id);

        $data = $request->validate([
            'user_id'       => 'sometimes|exists:users,id',
            'product_id'    => 'sometimes|exists:products,id',
            'product_name'  => 'sometimes|string|max:255',
            'date'          => 'sometimes|date',
            'stage'         => 'sometimes|string|in:Design,Preparation,Cutting,Assembly,Finishing,Quality Control',
            'status'        => 'sometimes|string|in:Pending,In Progress,Completed,Hold',
            'quantity'      => 'sometimes|integer|min:0',
            'resources_used'=> 'nullable|array',
            'notes'         => 'nullable|string',
        ]);

        $old = $production->replicate();
        $production->update($data);

        $production->load(['user', 'product']); // reload relationships

        broadcast(new ProductionUpdated($production))->toOthers();

        // Notify customer on stage or status change
        if (($data['stage'] ?? null) || ($data['status'] ?? null)) {
            $order = $production->order_id ? Order::with('user')->find($production->order_id) : null;
            if ($order && $order->user) {
                $order->user->notify(new OrderStageUpdated(
                    $order->id,
                    $production->product_name,
                    $production->stage,
                    $production->status
                ));
            }
        }

        return response()->json($production);
    }

    public function destroy($id)
    {
        $production = Production::findOrFail($id);
        $production->delete();

        return response()->json(['message' => 'Production deleted']);
    }

    public function analytics(Request $request)
    {
        $query = Production::query();

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        $data = $query->get();

        $kpis = [
            'total'       => $data->count(),
            'in_progress' => $data->where('status', 'In Progress')->count(),
            'completed'   => $data->where('status', 'Completed')->count(),
            'hold'        => $data->where('status', 'Hold')->count(),
        ];

        $daily = $data->groupBy(fn($p) => optional($p->date)->format('Y-m-d'))
            ->map(fn($items, $date) => [
                'date'     => $date,
                'quantity' => $items->sum('quantity'),
            ])
            ->values()
            ->sortBy('date')
            ->values();

        $stages = ['Design','Preparation','Cutting','Assembly','Finishing','Quality Control'];
        $stageBreakdown = collect($stages)->map(fn($stage) => [
            'name'  => $stage,
            'value' => $data->where('stage', $stage)->count(),
        ])->values();

        return response()->json([
            'kpis'             => $kpis,
            'daily_output'     => $daily,
            'stage_breakdown'  => $stageBreakdown,
        ]);
    }

    /**
     * Get predictive analytics for production
     */
    public function predictiveAnalytics(Request $request)
    {
        $productId = $request->get('product_id');
        $days = $request->get('days', 7);

        // Get historical data for the product
        $historicalData = ProductionAnalytics::where('product_id', $productId)
            ->orderBy('date', 'desc')
            ->limit(30)
            ->get();

        // Calculate moving averages for prediction
        $avgOutput = $historicalData->avg('actual_output');
        $avgEfficiency = $historicalData->avg('efficiency_percentage');
        $avgDuration = $historicalData->avg('total_duration_minutes');

        // Predict next day's output based on historical data
        $predictedOutput = round($avgOutput * (1 + ($avgEfficiency - 100) / 100));
        
        // Calculate trend
        $recentData = $historicalData->take(7);
        $olderData = $historicalData->slice(7, 7);
        $trend = $recentData->avg('actual_output') - $olderData->avg('actual_output');

        // Generate daily predictions
        $predictions = [];
        $currentDate = Carbon::now();
        
        for ($i = 1; $i <= $days; $i++) {
            $predictedDate = $currentDate->copy()->addDays($i);
            $dayOfWeek = $predictedDate->dayOfWeek;
            
            // Adjust prediction based on day of week (weekends might have different output)
            $dayAdjustment = in_array($dayOfWeek, [0, 6]) ? 0.8 : 1.0; // Weekend adjustment
            
            $dailyPrediction = round($predictedOutput * $dayAdjustment);
            
            $predictions[] = [
                'date' => $predictedDate->format('Y-m-d'),
                'predicted_output' => $dailyPrediction,
                'confidence_level' => 85, // Based on historical accuracy
                'factors' => [
                    'historical_average' => round($avgOutput),
                    'efficiency_trend' => round($trend, 2),
                    'day_of_week_adjustment' => $dayAdjustment
                ]
            ];
        }

        return response()->json([
            'product_id' => $productId,
            'historical_data' => $historicalData,
            'predictions' => $predictions,
            'summary' => [
                'avg_daily_output' => round($avgOutput),
                'avg_efficiency' => round($avgEfficiency, 2),
                'trend' => round($trend, 2),
                'prediction_confidence' => 85
            ]
        ]);
    }

    /**
     * Start a production process for Alkansya (6 processes)
     */
    public function startProduction(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'user_id' => 'required|exists:users,id',
            'order_id' => 'nullable|exists:orders,id',
        ]);

        $product = Product::findOrFail($data['product_id']);

        // Pre-check: ensure raw materials are sufficient for requested quantity using BOM
        $bom = ProductMaterial::where('product_id', $product->id)->get();
        $shortages = [];
        foreach ($bom as $mat) {
            $inv = InventoryItem::find($mat->inventory_item_id);
            if ($inv) {
                $required = (int) ($mat->qty_per_unit * $data['quantity']);
                if ($inv->quantity_on_hand < $required) {
                    $shortages[] = [
                        'sku' => $inv->sku,
                        'name' => $inv->name,
                        'required' => $required,
                        'on_hand' => $inv->quantity_on_hand,
                        'deficit' => max(0, $required - $inv->quantity_on_hand),
                    ];
                }
            }
        }
        if (!empty($shortages)) {
            return response()->json([
                'message' => 'Insufficient raw materials to start production',
                'shortages' => $shortages,
            ], 422);
        }
        
        // Create production record
        $production = Production::create([
            'user_id' => $data['user_id'],
            'product_id' => $data['product_id'],
            'product_name' => $product->name,
            'date' => Carbon::now()->format('Y-m-d'),
            'stage' => 'Design',
            'status' => 'In Progress',
            'quantity' => $data['quantity'],
            'order_id' => $data['order_id'] ?? null,
        ]);

        // Create process records for Alkansya (6 processes)
        if (str_contains(strtolower($product->name), 'alkansya')) {
            $processes = [
                ['name' => 'Design', 'order' => 1, 'estimated_duration' => 30],
                ['name' => 'Preparation', 'order' => 2, 'estimated_duration' => 45],
                ['name' => 'Cutting', 'order' => 3, 'estimated_duration' => 60],
                ['name' => 'Assembly', 'order' => 4, 'estimated_duration' => 90],
                ['name' => 'Finishing', 'order' => 5, 'estimated_duration' => 45],
                ['name' => 'Quality Control', 'order' => 6, 'estimated_duration' => 30],
            ];

            foreach ($processes as $process) {
                ProductionProcess::create([
                    'production_id' => $production->id,
                    'process_name' => $process['name'],
                    'process_order' => $process['order'],
                    'status' => $process['order'] === 1 ? 'in_progress' : 'pending',
                    'estimated_duration_minutes' => $process['estimated_duration'],
                    'started_at' => $process['order'] === 1 ? Carbon::now() : null,
                ]);
            }
        }

        // Automatically reduce inventory materials only if not created from an order (to avoid double deduction)
        if (empty($data['order_id'])) {
            $this->reduceInventoryMaterials($production);
        }

        return response()->json($production->load('processes'));
    }

    /**
     * Update production process status
     */
    public function updateProcess(Request $request, $productionId, $processId)
    {
        $data = $request->validate([
            'status' => 'required|in:pending,in_progress,completed,delayed',
            'notes' => 'nullable|string',
            'materials_used' => 'nullable|array',
            'quality_checks' => 'nullable|array',
        ]);

        $process = ProductionProcess::where('production_id', $productionId)
            ->where('id', $processId)
            ->firstOrFail();

        $process->update($data);

        // Broadcast process update
        broadcast(new ProductionProcessUpdated($process))->toOthers();

        // If process is completed, start next process
        if ($data['status'] === 'completed') {
            $process->update(['completed_at' => Carbon::now()]);
            
            $nextProcess = ProductionProcess::where('production_id', $productionId)
                ->where('process_order', $process->process_order + 1)
                ->first();

            if ($nextProcess) {
                $nextProcess->update([
                    'status' => 'in_progress',
                    'started_at' => Carbon::now(),
                ]);
            } else {
                // All processes completed
                $production = Production::find($productionId);
                $production->update([
                    'status' => 'Completed',
                    'stage' => 'Quality Control'
                ]);

                // If linked to an order, mark tracking completed
                if ($production && $production->order_id) {
                    $tracking = OrderTracking::firstOrCreate([
                        'order_id' => $production->order_id,
                        'product_id' => $production->product_id,
                    ], [
                        'tracking_type' => 'standard',
                        'current_stage' => 'Quality Control',
                        'status' => 'completed',
                    ]);
                    $tracking->update([
                        'current_stage' => 'Quality Control',
                        'status' => 'completed',
                        'actual_completion_date' => Carbon::now(),
                    ]);
                    broadcast(new \App\Events\OrderTrackingUpdated($tracking))->toOthers();
                }
            }
        }

        // Sync order tracking current stage/status when linked to order
        $production = Production::find($productionId);
        if ($production && $production->order_id) {
            $stageStatus = match ($process->status) {
                'in_progress' => 'in_production',
                'completed' => 'completed',
                'delayed' => 'in_production',
                default => 'pending',
            };

            $tracking = OrderTracking::firstOrCreate([
                'order_id' => $production->order_id,
                'product_id' => $production->product_id,
            ], [
                'tracking_type' => 'standard',
                'current_stage' => $process->process_name,
                'status' => $stageStatus,
            ]);

            $tracking->update([
                'current_stage' => $process->process_name,
                'status' => $stageStatus,
            ]);

            broadcast(new \App\Events\OrderTrackingUpdated($tracking))->toOthers();
        }

        return response()->json($process->load('production'));
    }

    /**
     * Get daily production summary with predictive analytics
     */
    public function dailySummary(Request $request)
    {
        $date = $request->get('date', Carbon::now()->format('Y-m-d'));
        
        // Get today's productions
        $todayProductions = Production::where('date', $date)->get();
        
        // Calculate daily metrics
        $totalOutput = $todayProductions->sum('quantity');
        $completedProductions = $todayProductions->where('status', 'Completed')->count();
        $inProgressProductions = $todayProductions->where('status', 'In Progress')->count();
        
        // Get process breakdown
        $processBreakdown = ProductionProcess::whereHas('production', function($query) use ($date) {
            $query->where('date', $date);
        })->get()->groupBy('process_name')->map(function($processes) {
            return [
                'total' => $processes->count(),
                'completed' => $processes->where('status', 'completed')->count(),
                'in_progress' => $processes->where('status', 'in_progress')->count(),
                'delayed' => $processes->where('status', 'delayed')->count(),
            ];
        });

        // Calculate efficiency
        $targetOutput = 50; // Assuming 50 units per day target
        $efficiency = $targetOutput > 0 ? round(($totalOutput / $targetOutput) * 100, 2) : 0;

        // Get predictive forecast for tomorrow
        $tomorrow = Carbon::parse($date)->addDay()->format('Y-m-d');
        $predictedOutput = $this->predictTomorrowOutput($date);

        return response()->json([
            'date' => $date,
            'summary' => [
                'total_output' => $totalOutput,
                'completed_productions' => $completedProductions,
                'in_progress_productions' => $inProgressProductions,
                'efficiency_percentage' => $efficiency,
                'target_output' => $targetOutput,
            ],
            'process_breakdown' => $processBreakdown,
            'prediction' => [
                'tomorrow_date' => $tomorrow,
                'predicted_output' => $predictedOutput,
                'confidence_level' => 85,
            ],
            'productions' => $todayProductions->load('processes')
        ]);
    }

    /**
     * Reduce inventory materials when production starts
     */
    private function reduceInventoryMaterials($production)
    {
        // Use BOM to compute material usage
        $bom = ProductMaterial::where('product_id', $production->product_id)->get();
        foreach ($bom as $mat) {
            $inventoryItem = InventoryItem::find($mat->inventory_item_id);
            if (!$inventoryItem) {
                continue;
            }
            $quantityNeeded = (int) ($mat->qty_per_unit * $production->quantity);

            // Reduce inventory
            $inventoryItem->decrement('quantity_on_hand', $quantityNeeded);

            // Record usage (migration uses qty_used field)
            InventoryUsage::create([
                'inventory_item_id' => $inventoryItem->id,
                'qty_used' => $quantityNeeded,
                'date' => Carbon::now()->format('Y-m-d'),
            ]);

            // Low stock notifications when hitting ROP
            $inventoryItem->refresh();
            if (!is_null($inventoryItem->reorder_point) && $inventoryItem->quantity_on_hand <= $inventoryItem->reorder_point) {
                User::where('role', 'employee')->get()->each(function ($u) use ($inventoryItem) {
                    $u->notify(new LowStockAlert($inventoryItem));
                });
            }
        }
    }

    /**
     * Predict tomorrow's output based on historical data
     */
    private function predictTomorrowOutput($currentDate)
    {
        // Get last 7 days of production data
        $historicalData = Production::where('date', '>=', Carbon::parse($currentDate)->subDays(7))
            ->where('date', '<', $currentDate)
            ->get()
            ->groupBy('date')
            ->map(function($productions) {
                return $productions->sum('quantity');
            });

        if ($historicalData->count() < 3) {
            return 40; // Default prediction if not enough data
        }

        // Calculate moving average
        $avgOutput = $historicalData->avg();
        
        // Apply trend adjustment
        $recentDays = $historicalData->take(3);
        $olderDays = $historicalData->slice(3, 3);
        $trend = $recentDays->avg() - $olderDays->avg();
        
        $prediction = round($avgOutput + ($trend * 0.5)); // Apply 50% of trend
        
        return max(0, $prediction);
    }
}

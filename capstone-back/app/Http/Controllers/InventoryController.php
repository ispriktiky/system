<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\InventoryUsage;
use App\Models\ProductMaterial;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use App\Events\InventoryUpdated;

class InventoryController extends Controller
{
    public function index() {
        return response()->json(InventoryItem::all());
    }

    public function store(Request $request) {
        $data = $request->validate([
            'sku' => 'required|unique:inventory_items',
            'name' => 'required',
            'category' => 'required|in:raw,finished',
            'location' => 'nullable',
            'unit' => 'nullable|string',
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string',
            'description' => 'nullable|string',
            'quantity_on_hand' => 'integer|min:0',
            'safety_stock' => 'integer|min:0',
            'reorder_point' => 'nullable|integer|min:0',
            'max_level' => 'nullable|integer|min:0',
            'lead_time_days' => 'integer|min:0',
        ]);
        $item = InventoryItem::create($data);
        broadcast(new InventoryUpdated($item))->toOthers();
        return response()->json($item, 201);
    }

    public function update(Request $request, $id) {
        $item = InventoryItem::findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|string',
            'category' => 'sometimes|in:raw,finished',
            'location' => 'nullable',
            'unit' => 'nullable|string',
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string',
            'description' => 'nullable|string',
            'quantity_on_hand' => 'sometimes|integer|min:0',
            'safety_stock' => 'sometimes|integer|min:0',
            'reorder_point' => 'nullable|integer|min:0',
            'max_level' => 'nullable|integer|min:0',
            'lead_time_days' => 'sometimes|integer|min:0',
        ]);
        $item->update($data);
        broadcast(new InventoryUpdated($item))->toOthers();
        return response()->json($item);
    }

    public function destroy($id) {
        $item = InventoryItem::find($id);
        if ($item) {
            $item->delete();
            broadcast(new InventoryUpdated($item))->toOthers();
        }
        return response()->json(['message'=>'Deleted']);
    }

    /**
     * Get inventory items that need reordering
     */
    public function getReorderItems()
    {
        $reorderItems = InventoryItem::whereRaw('quantity_on_hand <= reorder_point')
            ->get()
            ->map(function($item) {
                $item->reorder_quantity = $item->max_level - $item->quantity_on_hand;
                $item->days_until_stockout = $this->calculateDaysUntilStockout($item);
                return $item;
            });

        return response()->json($reorderItems);
    }

    /**
     * Get daily material usage report
     */
    public function getDailyUsage(Request $request)
    {
        $date = $request->get('date', Carbon::now()->format('Y-m-d'));
        
        $usage = InventoryUsage::where('date', $date)
            ->with(['inventoryItem'])
            ->get()
            ->groupBy('inventory_item_id')
            ->map(function($usages, $itemId) {
                $totalUsed = $usages->sum('quantity_used');
                $item = $usages->first()->inventoryItem;
                
                return [
                    'item_id' => $itemId,
                    'item_name' => $item->name,
                    'sku' => $item->sku,
                    'total_used' => $totalUsed,
                    'remaining_stock' => $item->quantity_on_hand,
                    'usage_details' => $usages->map(function($usage) {
                        return [
                            'production_id' => $usage->production_id,
                            'quantity_used' => $usage->quantity_used,
                            'notes' => $usage->notes,
                            'created_at' => $usage->created_at
                        ];
                    })
                ];
            });

        return response()->json([
            'date' => $date,
            'usage_summary' => $usage,
            'total_items_used' => $usage->count(),
            'total_quantity_used' => $usage->sum('total_used')
        ]);
    }

    /**
     * Get material consumption trends
     */
    public function getConsumptionTrends(Request $request)
    {
        $days = $request->get('days', 30);
        $startDate = Carbon::now()->subDays($days);

        $trends = InventoryUsage::where('date', '>=', $startDate)
            ->with(['inventoryItem'])
            ->get()
            ->groupBy('inventory_item_id')
            ->map(function($usages, $itemId) {
                $item = $usages->first()->inventoryItem;
                $dailyUsage = $usages->groupBy('date')
                    ->map(function($dayUsages) {
                        return $dayUsages->sum('quantity_used');
                    });

                $avgDailyUsage = $dailyUsage->avg();
                $trend = $this->calculateTrend($dailyUsage->values()->toArray());

                return [
                    'item_id' => $itemId,
                    'item_name' => $item->name,
                    'sku' => $item->sku,
                    'avg_daily_usage' => round($avgDailyUsage, 2),
                    'total_usage_period' => $usages->sum('quantity_used'),
                    'trend' => $trend,
                    'days_until_stockout' => $this->calculateDaysUntilStockout($item, $avgDailyUsage),
                    'daily_usage_data' => $dailyUsage
                ];
            });

        return response()->json([
            'period_days' => $days,
            'start_date' => $startDate->format('Y-m-d'),
            'trends' => $trends
        ]);
    }

    /**
     * Calculate days until stockout
     */
    private function calculateDaysUntilStockout($item, $dailyUsage = null)
    {
        if (!$dailyUsage) {
            // Get recent usage data
            $recentUsage = InventoryUsage::where('inventory_item_id', $item->id)
                ->where('date', '>=', Carbon::now()->subDays(7))
                ->sum('quantity_used');
            $dailyUsage = $recentUsage / 7;
        }

        if ($dailyUsage <= 0) {
            return 999; // No usage, won't stockout
        }

        return floor($item->quantity_on_hand / $dailyUsage);
    }

    /**
     * Calculate trend (positive = increasing, negative = decreasing)
     */
    private function calculateTrend($values)
    {
        if (count($values) < 2) {
            return 0;
        }

        $n = count($values);
        $sumX = 0;
        $sumY = 0;
        $sumXY = 0;
        $sumX2 = 0;

        for ($i = 0; $i < $n; $i++) {
            $sumX += $i;
            $sumY += $values[$i];
            $sumXY += $i * $values[$i];
            $sumX2 += $i * $i;
        }

        $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
        return round($slope, 2);
    }

    /**
     * Get inventory dashboard data
     */
    public function getDashboardData()
    {
        $totalItems = InventoryItem::count();
        $lowStockItems = InventoryItem::whereRaw('quantity_on_hand <= reorder_point')->count();
        $outOfStockItems = InventoryItem::where('quantity_on_hand', 0)->count();
        
        // Get recent usage
        $recentUsage = InventoryUsage::where('date', '>=', Carbon::now()->subDays(7))
            ->sum('quantity_used');

        // Get items that need immediate attention
        $criticalItems = InventoryItem::whereRaw('quantity_on_hand <= safety_stock')
            ->get()
            ->map(function($item) {
                $item->urgency = 'critical';
                $item->days_until_stockout = $this->calculateDaysUntilStockout($item);
                return $item;
            });

        return response()->json([
            'summary' => [
                'total_items' => $totalItems,
                'low_stock_items' => $lowStockItems,
                'out_of_stock_items' => $outOfStockItems,
                'recent_usage' => $recentUsage
            ],
            'critical_items' => $criticalItems
        ]);
    }
}
<?php

// app/Http/Controllers/ReportController.php
namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\InventoryUsage;
use App\Models\Production;
use App\Models\ProductionProcess;
use Illuminate\Http\Request;
use App\Services\InventoryForecastService;

class ReportController extends Controller
{
    public function replenishment() {
        $items = InventoryItem::with('usage')->get();

        $report = $items->map(function($item) {
            $avgDaily = $item->usage()
                ->where('date','>=',now()->subDays(30))
                ->avg('qty_used') ?? 0;

            $rop = $item->reorder_point ??
                ($avgDaily * $item->lead_time_days + $item->safety_stock);

            $suggestOrder = ($item->quantity_on_hand <= $rop)
                ? max(0, ($item->max_level ?? $rop + $item->safety_stock) - $item->quantity_on_hand)
                : 0;

            return [
                'sku' => $item->sku,
                'name' => $item->name,
                'on_hand' => $item->quantity_on_hand,
                'avg_daily_usage' => round($avgDaily,2),
                'rop' => $rop,
                'suggested_order' => $suggestOrder,
            ];
        });

        return response()->json($report);
    }

    public function forecast(Request $request, InventoryForecastService $svc)
    {
        $window = (int) $request->query('window', 30);
        $items = InventoryItem::with('usage')->get();

        $data = $items->map(function(InventoryItem $item) use ($svc, $window) {
            $avg = $svc->calculateMovingAverageDailyUsage($item, $window);
            $days = $svc->estimateDaysToDepletion($item, $window);
            $rop = $svc->computeReorderPoint($item, $window);
            $suggest = $svc->suggestReplenishmentQty($item, $window);
            return [
                'sku' => $item->sku,
                'name' => $item->name,
                'on_hand' => $item->quantity_on_hand,
                'avg_daily_usage' => round($avg,2),
                'days_to_depletion' => $days,
                'reorder_point' => $rop,
                'suggested_order' => $suggest,
            ];
        })->values();

        return response()->json($data);
    }

    public function stockCsv()
    {
        $rows = InventoryItem::all()->map(function($i){
            return [
                'sku' => $i->sku,
                'name' => $i->name,
                'category' => $i->category,
                'location' => $i->location,
                'quantity_on_hand' => $i->quantity_on_hand,
                'safety_stock' => $i->safety_stock,
                'reorder_point' => $i->reorder_point,
                'max_level' => $i->max_level,
                'lead_time_days' => $i->lead_time_days,
            ];
        })->toArray();

        return $this->arrayToCsvResponse($rows, 'stock.csv');
    }

    public function usageCsv(Request $request)
    {
        $days = (int) $request->query('days', 90);
        $since = now()->subDays($days);
        $rows = \App\Models\InventoryUsage::with('inventoryItem')
            ->where('date','>=',$since)
            ->get()
            ->map(function($u){
                return [
                    'date' => optional($u->date)->format('Y-m-d'),
                    'sku' => optional($u->inventoryItem)->sku,
                    'name' => optional($u->inventoryItem)->name,
                    'qty_used' => $u->qty_used,
                ];
            })->toArray();

        return $this->arrayToCsvResponse($rows, 'usage.csv');
    }

    public function replenishmentCsv(InventoryForecastService $svc)
    {
        $items = InventoryItem::with('usage')->get();
        $rows = $items->map(function($item) use ($svc) {
            return [
                'sku' => $item->sku,
                'name' => $item->name,
                'on_hand' => $item->quantity_on_hand,
                'avg_daily_usage' => round($svc->calculateMovingAverageDailyUsage($item),2),
                'reorder_point' => $svc->computeReorderPoint($item),
                'suggested_order' => $svc->suggestReplenishmentQty($item),
            ];
        })->toArray();

        return $this->arrayToCsvResponse($rows, 'replenishment.csv');
    }

    // New: Inventory overview JSON and CSV
    public function inventoryOverview()
    {
        $items = InventoryItem::all();
        $summary = [
            'total_items' => $items->count(),
            'raw_materials' => $items->where('category','raw')->count(),
            'finished_goods' => $items->where('category','finished')->count(),
            'low_stock' => $items->filter(fn($i)=>!is_null($i->reorder_point) && $i->quantity_on_hand <= $i->reorder_point)->count(),
            'out_of_stock' => $items->where('quantity_on_hand', 0)->count(),
        ];

        return response()->json([
            'summary' => $summary,
            'items' => $items,
        ]);
    }

    public function inventoryOverviewCsv()
    {
        $rows = InventoryItem::all()->map(function($i){
            return [
                'sku' => $i->sku,
                'name' => $i->name,
                'category' => $i->category,
                'location' => $i->location,
                'on_hand' => $i->quantity_on_hand,
                'safety_stock' => $i->safety_stock,
                'reorder_point' => $i->reorder_point,
                'lead_time_days' => $i->lead_time_days,
            ];
        })->toArray();
        return $this->arrayToCsvResponse($rows, 'inventory_overview.csv');
    }

    // New: Turnover metrics and CSV
    public function turnover(Request $request, InventoryForecastService $svc)
    {
        $window = (int) $request->query('window', 30);
        $items = InventoryItem::with('usage')->get();
        $data = $items->map(function(InventoryItem $item) use ($svc, $window){
            $avg = $svc->calculateMovingAverageDailyUsage($item, $window);
            $daysToDepletion = $svc->estimateDaysToDepletion($item, $window);
            $rop = $svc->computeReorderPoint($item, $window);
            $turnover = $avg > 0 ? round(($item->quantity_on_hand / max(1,$avg)), 2) : null;
            return [
                'sku' => $item->sku,
                'name' => $item->name,
                'avg_daily_usage' => round($avg,2),
                'on_hand' => $item->quantity_on_hand,
                'inventory_turnover_days' => $turnover,
                'reorder_point' => $rop,
                'days_to_depletion' => $daysToDepletion,
            ];
        })->values();
        return response()->json($data);
    }

    public function turnoverCsv(Request $request, InventoryForecastService $svc)
    {
        $json = $this->turnover($request, $svc)->getData(true);
        $rows = $json;
        return $this->arrayToCsvResponse($rows, 'inventory_turnover.csv');
    }

    // New: Replenishment schedule and CSV
    public function replenishmentSchedule(Request $request, InventoryForecastService $svc)
    {
        $window = (int) $request->query('window', 30);
        $items = InventoryItem::with('usage')->get();
        $schedule = $items->map(function(InventoryItem $item) use ($svc, $window){
            $avg = $svc->calculateMovingAverageDailyUsage($item, $window);
            $rop = $svc->computeReorderPoint($item, $window);
            $daysToRop = $avg > 0 ? max(0, ceil(($item->quantity_on_hand - $rop) / max($avg, 1e-6))) : null;
            $eta = is_null($daysToRop) ? null : now()->addDays($daysToRop)->toDateString();
            $suggest = $svc->suggestReplenishmentQty($item, $window);
            return [
                'sku' => $item->sku,
                'name' => $item->name,
                'reorder_on_or_before' => $eta,
                'suggested_order_qty' => $suggest,
            ];
        })->filter(fn($r) => ($r['suggested_order_qty'] ?? 0) > 0)->values();
        return response()->json($schedule);
    }

    public function replenishmentScheduleCsv(Request $request, InventoryForecastService $svc)
    {
        $json = $this->replenishmentSchedule($request, $svc)->getData(true);
        $rows = $json;
        return $this->arrayToCsvResponse($rows, 'replenishment_schedule.csv');
    }
    /**
     * Export production report as CSV (efficiency, progress, bottlenecks)
     */
    public function productionCsv(Request $request)
    {
        $start = $request->query('start_date');
        $end = $request->query('end_date');
        $q = Production::with('product');
        if ($start && $end) {
            $q->whereBetween('date', [$start, $end]);
        }
        $rows = $q->get()->map(function($p){
            return [
                'id' => $p->id,
                'date' => optional($p->date)->format('Y-m-d'),
                'product' => optional($p->product)->name ?? $p->product_name,
                'stage' => $p->stage,
                'status' => $p->status,
                'quantity' => $p->quantity,
            ];
        })->toArray();

        return $this->arrayToCsvResponse($rows, 'production.csv');
    }

    private function arrayToCsvResponse(array $rows, string $filename)
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function() use ($rows) {
            $out = fopen('php://output', 'w');
            if (empty($rows)) {
                fclose($out);
                return;
            }
            // header
            fputcsv($out, array_keys($rows[0]));
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        };

        return response()->stream($callback, 200, $headers);
    }
}

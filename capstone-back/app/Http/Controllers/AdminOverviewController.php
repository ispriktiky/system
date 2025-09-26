<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\InventoryItem;
use App\Models\Production;
use App\Models\Order;
use App\Services\InventoryForecastService;

class AdminOverviewController extends Controller
{
    public function index(Request $request, InventoryForecastService $svc)
    {
        $stocks = InventoryItem::all(['id','sku','name','category','quantity_on_hand','safety_stock','reorder_point','max_level','lead_time_days']);

        $productions = Production::orderBy('date','desc')->limit(100)->get(['id','order_id','product_id','product_name','date','stage','status','quantity']);

        $orders = [
            'pending' => Order::where('status','pending')->count(),
            'completed' => Order::where('status','completed')->count(),
            'in_progress' => Production::where('status','In Progress')->distinct('order_id')->count('order_id'),
        ];

        $forecasts = $stocks->map(function($i) use ($svc) {
            return [
                'sku' => $i->sku,
                'name' => $i->name,
                'on_hand' => $i->quantity_on_hand,
                'avg_daily_usage' => round($svc->calculateMovingAverageDailyUsage($i),2),
                'days_to_depletion' => $svc->estimateDaysToDepletion($i),
                'reorder_point' => $svc->computeReorderPoint($i),
                'suggested_order' => $svc->suggestReplenishmentQty($i),
                'max_level' => $i->max_level,
            ];
        })->values();

        return response()->json([
            'stocks' => $stocks,
            'productions' => $productions,
            'orders' => $orders,
            'forecasts' => $forecasts,
        ]);
    }
}


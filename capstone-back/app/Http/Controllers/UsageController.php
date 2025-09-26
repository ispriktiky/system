<?php

namespace App\Http\Controllers;

use App\Models\InventoryUsage;
use App\Models\InventoryItem;
use Illuminate\Http\Request;
use App\Notifications\LowStockAlert;
use App\Models\User;
use App\Services\InventoryForecastService;
use App\Events\InventoryUpdated;

class UsageController extends Controller
{
    public function index(Request $request) {
        $days = $request->query('days', 90);
        $since = now()->subDays($days);
        $usage = InventoryUsage::where('date','>=',$since)->get();
        return response()->json($usage);
    }

    public function store(Request $request, InventoryForecastService $svc) {
        $data = $request->validate([
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'date' => 'required|date',
            'qty_used' => 'required|integer|min:1',
        ]);
        $usage = InventoryUsage::create($data);

        // Update inventory balance
        $item = InventoryItem::find($data['inventory_item_id']);
        $item->decrement('quantity_on_hand', $data['qty_used']);

        // Notify employees if below reorder point or forecasted depletion very soon
        $item->refresh();
        $rop = $item->reorder_point ?? 0;
        $daysToDepletion = $svc->estimateDaysToDepletion($item) ?? PHP_INT_MAX;
        $imminent = $daysToDepletion <= max(1, (int) ($item->lead_time_days ?? 1));
        if (($rop > 0 && $item->quantity_on_hand <= $rop) || $imminent) {
            // Notify all employees
            User::where('role', 'employee')->get()->each(function ($u) use ($item) {
                $u->notify(new LowStockAlert($item));
            });
        }

        // Broadcast update
        broadcast(new InventoryUpdated($item))->toOthers();

        return response()->json($usage, 201);
    }
}
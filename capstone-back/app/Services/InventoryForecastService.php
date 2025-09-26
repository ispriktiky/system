<?php

namespace App\Services;

use App\Models\InventoryItem;
use Carbon\Carbon;

class InventoryForecastService
{
    /**
     * Compute simple moving average of daily usage over a given window.
     */
    public function calculateMovingAverageDailyUsage(InventoryItem $item, int $windowDays = 30): float
    {
        $since = Carbon::now()->subDays($windowDays)->toDateString();
        $avg = $item->usage()
            ->where('date', '>=', $since)
            ->avg('qty_used');
        return (float) ($avg ?? 0.0);
    }

    /**
     * Estimate days until depletion at current average consumption rate.
     * Returns null if rate is zero (no depletion expected).
     */
    public function estimateDaysToDepletion(InventoryItem $item, int $windowDays = 30): ?int
    {
        $avgDaily = $this->calculateMovingAverageDailyUsage($item, $windowDays);
        if ($avgDaily <= 0) {
            return null;
        }
        return (int) ceil(max(0, $item->quantity_on_hand) / $avgDaily);
    }

    /**
     * Compute reorder point using either explicit ROP or calculated: MA * lead_time + safety_stock.
     */
    public function computeReorderPoint(InventoryItem $item, int $windowDays = 30): int
    {
        if (!is_null($item->reorder_point)) {
            return (int) $item->reorder_point;
        }
        $avgDaily = $this->calculateMovingAverageDailyUsage($item, $windowDays);
        $leadTime = (int) ($item->lead_time_days ?? 0);
        $safety = (int) ($item->safety_stock ?? 0);
        return (int) ceil($avgDaily * $leadTime + $safety);
    }

    /**
     * Suggest replenishment quantity up to max level if below ROP.
     */
    public function suggestReplenishmentQty(InventoryItem $item, int $windowDays = 30): int
    {
        $rop = $this->computeReorderPoint($item, $windowDays);
        $onHand = (int) $item->quantity_on_hand;
        if ($onHand > $rop) {
            return 0;
        }
        $target = $item->max_level ?? ($rop + ($item->safety_stock ?? 0));
        return (int) max(0, $target - $onHand);
    }
}


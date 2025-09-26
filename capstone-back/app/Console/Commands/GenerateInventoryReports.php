<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use App\Models\InventoryItem;
use App\Services\InventoryForecastService;

class GenerateInventoryReports extends Command
{
    protected $signature = 'reports:inventory {--window=30}';
    protected $description = 'Generate inventory CSV reports (overview, turnover, replenishment schedule)';

    public function handle(InventoryForecastService $svc)
    {
        $window = (int) $this->option('window');
        $date = now()->format('Y-m-d');
        $dir = "reports/{$date}";

        $overviewRows = InventoryItem::all()->map(function($i){
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

        $items = InventoryItem::with('usage')->get();
        $turnoverRows = $items->map(function(InventoryItem $item) use ($svc, $window){
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
        })->values()->toArray();

        $scheduleRows = $items->map(function(InventoryItem $item) use ($svc, $window){
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
        })->filter(fn($r) => ($r['suggested_order_qty'] ?? 0) > 0)->values()->toArray();

        Storage::makeDirectory($dir);
        $this->writeCsv("{$dir}/inventory_overview.csv", $overviewRows);
        $this->writeCsv("{$dir}/inventory_turnover.csv", $turnoverRows);
        $this->writeCsv("{$dir}/replenishment_schedule.csv", $scheduleRows);

        $this->info('Inventory reports generated at storage/app/' . $dir);
        return self::SUCCESS;
    }

    private function writeCsv(string $path, array $rows): void
    {
        $handle = fopen('php://temp', 'r+');
        if (empty($rows)) {
            fwrite($handle, "No data\n");
        } else {
            fputcsv($handle, array_keys($rows[0]));
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
        }
        rewind($handle);
        $contents = stream_get_contents($handle);
        fclose($handle);
        Storage::put($path, $contents);
    }
}




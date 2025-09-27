<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // $schedule->command('inspire')->hourly();
        $schedule->command('reports:inventory --window=30')->dailyAt('06:00');
        $schedule->command('reports:inventory --window=60')->weeklyOn(1, '06:30');
        
        // Production tracking automation
        $schedule->command('production:update-stages')->hourly();
        $schedule->command('production:update-stages --force')->dailyAt('23:00');
        
        // Automated production reports
        $schedule->command('production:generate-reports --period=daily --save')->dailyAt('06:00');
        $schedule->command('production:generate-reports --period=weekly --save')->weeklyOn(1, '07:00');
        $schedule->command('production:generate-reports --period=monthly --save')->monthlyOn(1, '08:00');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}

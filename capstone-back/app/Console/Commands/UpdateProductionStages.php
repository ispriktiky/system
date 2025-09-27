<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Production;
use App\Models\ProductionStageLog;
use Carbon\Carbon;

class UpdateProductionStages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'production:update-stages {--force : Force update even if not due}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically progress production stages based on timeline for tables and chairs';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Updating production stages...');

        // Get all productions that require tracking and are in progress
        $productions = Production::requiresTracking()
            ->where('status', 'In Progress')
            ->where('current_stage', '!=', 'Completed')
            ->get();

        $updated = 0;
        $completed = 0;

        foreach ($productions as $production) {
            if ($this->processProduction($production)) {
                $updated++;
                
                if ($production->fresh()->status === 'Completed') {
                    $completed++;
                }
            }
        }

        $this->info("Updated {$updated} productions. {$completed} completed.");
        
        // Update stage logs that should auto-complete
        $this->autoCompleteOverdueStages();
        
        return Command::SUCCESS;
    }

    private function processProduction(Production $production)
    {
        $updated = false;
        
        // Get current stage log
        $currentStageLog = $production->stageLogs()
            ->whereHas('productionStage', function ($query) use ($production) {
                $query->where('name', $production->current_stage);
            })
            ->where('status', '!=', 'completed')
            ->first();

        if (!$currentStageLog) {
            $this->warn("No current stage log found for production {$production->id}");
            return false;
        }

        // Check if current stage should be completed based on timeline
        if ($this->shouldCompleteStage($currentStageLog)) {
            $this->info("Auto-completing stage '{$currentStageLog->productionStage->name}' for production {$production->id}");
            
            $currentStageLog->complete([
                'notes' => 'Auto-completed by system based on timeline',
            ]);
            
            // Update production progress and start next stage
            $production->updateOverallProgress();
            $production->startNextStage();
            
            $updated = true;
        }
        
        // Check if any pending stages should be started
        if ($this->shouldStartNextStage($production)) {
            $production->startNextStage();
            $updated = true;
        }

        return $updated;
    }

    private function shouldCompleteStage(ProductionStageLog $stageLog)
    {
        // If force option is used, complete overdue stages
        if ($this->option('force') && $stageLog->is_delayed) {
            return true;
        }

        // Complete stage if it's significantly overdue (more than 6 hours past estimated completion)
        if ($stageLog->estimated_completion_at && 
            now()->gt($stageLog->estimated_completion_at->addHours(6))) {
            return true;
        }

        // Complete stage if it has reached its estimated completion time and is marked as in_progress
        if ($stageLog->status === 'in_progress' && 
            $stageLog->estimated_completion_at && 
            now()->gte($stageLog->estimated_completion_at)) {
            return true;
        }

        return false;
    }

    private function shouldStartNextStage(Production $production)
    {
        // Find the next pending stage
        $nextStage = $production->stageLogs()
            ->where('status', 'pending')
            ->whereHas('productionStage')
            ->join('production_stages', 'production_stage_logs.production_stage_id', '=', 'production_stages.id')
            ->orderBy('production_stages.order_sequence')
            ->first();

        if (!$nextStage) {
            return false;
        }

        // Start next stage if current time has passed the estimated start time
        // (which would be when the previous stage should have been completed)
        $previousStageLog = $production->stageLogs()
            ->whereHas('productionStage', function ($query) use ($nextStage) {
                $query->where('order_sequence', $nextStage->productionStage->order_sequence - 1);
            })
            ->first();

        if ($previousStageLog && 
            $previousStageLog->estimated_completion_at && 
            now()->gte($previousStageLog->estimated_completion_at)) {
            return true;
        }

        return false;
    }

    private function autoCompleteOverdueStages()
    {
        $overdueLogs = ProductionStageLog::delayed()
            ->where('estimated_completion_at', '<=', now()->subHours(12)) // 12 hours overdue
            ->get();

        foreach ($overdueLogs as $log) {
            $log->complete([
                'notes' => 'Auto-completed: Significantly overdue (12+ hours)',
                'issues' => ['severely_delayed']
            ]);
            
            $this->warn("Auto-completed severely overdue stage: {$log->productionStage->name} for production {$log->production_id}");
        }
    }
}

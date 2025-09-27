<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Production;
use App\Models\ProductionStage;
use App\Models\User;
use App\Models\Product;
use Carbon\Carbon;

class ProductionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ✅ Ensure we have users
        if (User::count() === 0) {
            User::factory()->count(3)->create();
        }

        // ✅ Create specific products for the three types
        $this->createProducts();

        $this->command->info('Creating production orders...');

        // Create a mix of production orders
        $this->createAlkansyaProductions(10);
        $this->createTableProductions(8);
        $this->createChairProductions(12);
        
        $this->command->info('Production orders created successfully!');
    }
    
    private function createProducts()
    {
        // Use EXACT same product names from ProductsTableSeeder
        $productTypes = [
            ['name' => 'Alkansya', 'price' => 159.00, 'type' => 'alkansya'],
            ['name' => 'Dining Table', 'price' => 12500.00, 'type' => 'table'],
            ['name' => 'Wooden Chair', 'price' => 7500.00, 'type' => 'chair'],
        ];
        
        foreach ($productTypes as $productData) {
            Product::firstOrCreate(
                ['name' => $productData['name']],
                [
                    'price' => $productData['price'],
                    'description' => 'High-quality ' . strtolower($productData['name']),
                    'stock' => 50
                ]
            );
        }
    }
    
    private function createAlkansyaProductions($count)
    {
        $alkansyaProducts = Product::whereIn('name', ['Wooden Alkansya', 'Ceramic Alkansya'])->get();
        
        for ($i = 0; $i < $count; $i++) {
            Production::factory()->alkansya()->create([
                'product_id' => $alkansyaProducts->random()->id,
            ]);
        }
        
        $this->command->info("Created {$count} alkansya productions (ready for delivery)");
    }
    
    private function createTableProductions($count)
    {
        $tableProducts = Product::whereIn('name', ['Dining Table', 'Coffee Table'])->get();
        
        for ($i = 0; $i < $count; $i++) {
            $production = Production::factory()->withTracking()->create([
                'product_id' => $tableProducts->random()->id,
                'product_type' => 'table',
            ]);
            
            // Initialize stage logs for tracking
            $this->initializeStageLogsForProduction($production);
        }
        
        $this->command->info("Created {$count} table productions with tracking");
    }
    
    private function createChairProductions($count)
    {
        $chairProducts = Product::whereIn('name', ['Wooden Chair', 'Office Chair'])->get();
        
        for ($i = 0; $i < $count; $i++) {
            $production = Production::factory()->withTracking()->create([
                'product_id' => $chairProducts->random()->id,
                'product_type' => 'chair',
            ]);
            
            // Initialize stage logs for tracking
            $this->initializeStageLogsForProduction($production);
        }
        
        $this->command->info("Created {$count} chair productions with tracking");
    }
    
    private function initializeStageLogsForProduction(Production $production)
    {
        if (!$production->requires_tracking) {
            return;
        }
        
        $stages = ProductionStage::orderBy('order_sequence')->get();
        $startDate = $production->production_started_at ?? now()->subDays(rand(1, 15));
        
        foreach ($stages as $index => $stage) {
            $isCurrentStage = $stage->name === $production->current_stage;
            $stageStartTime = $startDate->copy()->addHours($stages->where('order_sequence', '<', $stage->order_sequence)->sum('duration_hours'));
            $estimatedCompletion = $stageStartTime->copy()->addHours($stage->duration_hours);
            
            // Determine stage status based on production progress
            $status = 'pending';
            $startedAt = null;
            $completedAt = null;
            $progress = 0;
            
            if ($stage->order_sequence < $stages->where('name', $production->current_stage)->first()->order_sequence) {
                // Past stages are completed
                $status = 'completed';
                $startedAt = $stageStartTime;
                $completedAt = $estimatedCompletion->copy()->subHours(rand(0, 6)); // Completed a bit early/on time
                $progress = 100;
            } elseif ($isCurrentStage && $production->status === 'In Progress') {
                // Current stage is in progress
                $status = 'in_progress';
                $startedAt = $stageStartTime;
                $progress = rand(20, 80);
            }
            
            $production->stageLogs()->create([
                'production_stage_id' => $stage->id,
                'status' => $status,
                'started_at' => $startedAt,
                'completed_at' => $completedAt,
                'estimated_completion_at' => $estimatedCompletion,
                'progress_percentage' => $progress,
                'actual_duration_hours' => $completedAt && $startedAt ? 
                    $startedAt->diffInHours($completedAt) : null,
                'notes' => $status === 'completed' ? 'Stage completed successfully' : null,
            ]);
        }
        
        // Update overall progress based on completed stages
        $production->updateOverallProgress();
    }
}

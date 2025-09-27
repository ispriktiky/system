<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\User;
use App\Models\Product;
use Carbon\Carbon;

class ProductionFactory extends Factory
{
    public function definition(): array
    {
        $productType = $this->faker->randomElement(['alkansya', 'table', 'chair']);
        $requiresTracking = in_array($productType, ['table', 'chair']);
        
        $productNames = [
            'alkansya' => ['Wooden Alkansya', 'Ceramic Alkansya', 'Bamboo Alkansya'],
            'table' => ['Dining Table', 'Coffee Table', 'Study Table', 'Side Table'],
            'chair' => ['Wooden Chair', 'Dining Chair', 'Office Chair', 'Rocking Chair']
        ];
        
        $stages = [
            'Material Preparation',
            'Cutting & Shaping', 
            'Assembly',
            'Sanding & Surface Preparation',
            'Finishing',
            'Quality Check & Packaging'
        ];
        
        $currentStage = $requiresTracking ? 
            $this->faker->randomElement($stages) : 
            'Ready for Delivery';
            
        $status = $requiresTracking ? 
            $this->faker->randomElement(['Pending', 'In Progress', 'Completed']) :
            'Completed';
            
        $startDate = $this->faker->dateTimeBetween('-30 days', '-1 days');
        $estimatedCompletion = $requiresTracking ? 
            Carbon::parse($startDate)->addWeeks(2) : 
            Carbon::parse($startDate)->addHours(1);
            
        return [
            // Relationships
            'user_id' => User::inRandomOrder()->first()?->id ?? User::factory(),
            'product_id' => Product::inRandomOrder()->first()?->id ?? Product::factory(),

            // Product details
            'product_name' => $this->faker->randomElement($productNames[$productType]),
            'product_type' => $productType,
            'requires_tracking' => $requiresTracking,

            // Production details
            'date' => $startDate->format('Y-m-d'),
            'current_stage' => $currentStage,
            'status' => $status,
            'priority' => $this->faker->randomElement(['low', 'medium', 'high', 'urgent']),
            
            // Timing
            'production_started_at' => $startDate,
            'estimated_completion_date' => $estimatedCompletion,
            'actual_completion_date' => $status === 'Completed' ? 
                $this->faker->dateTimeBetween($startDate, 'now') : null,

            // Quantities
            'quantity' => $this->faker->numberBetween(1, $productType === 'alkansya' ? 50 : 10),
            
            // Progress
            'overall_progress' => $requiresTracking ? 
                ($status === 'Completed' ? 100 : $this->faker->numberBetween(10, 90)) : 
                100,

            // JSON fields
            'resources_used' => $this->getResourcesForProductType($productType),
            'production_metrics' => [
                'efficiency_score' => $this->faker->numberBetween(70, 100),
                'quality_score' => $this->faker->numberBetween(80, 100)
            ],

            // Batch number
            'production_batch_number' => 'PROD-' . now()->format('Ymd') . '-' . str_pad($this->faker->numberBetween(1, 999), 3, '0', STR_PAD_LEFT),
            
            // Extra notes
            'notes' => $this->faker->randomElement([
                'Standard production order',
                'Rush order - high priority', 
                'Custom specifications requested',
                'Quality check passed',
                'Customer specific requirements'
            ]),
        ];
    }
    
    private function getResourcesForProductType($type)
    {
        switch ($type) {
            case 'alkansya':
                return [
                    'clay' => $this->faker->numberBetween(2, 5) . ' kg',
                    'paint' => $this->faker->numberBetween(1, 2) . ' bottles',
                    'varnish' => $this->faker->numberBetween(1, 1) . ' bottle'
                ];
            case 'table':
                return [
                    'wood_planks' => $this->faker->numberBetween(10, 20) . ' pcs',
                    'screws' => $this->faker->numberBetween(50, 100) . ' pcs',
                    'wood_stain' => $this->faker->numberBetween(1, 2) . ' liters',
                    'varnish' => $this->faker->numberBetween(1, 2) . ' liters'
                ];
            case 'chair':
                return [
                    'wood_planks' => $this->faker->numberBetween(5, 12) . ' pcs',
                    'screws' => $this->faker->numberBetween(30, 60) . ' pcs',
                    'wood_stain' => $this->faker->numberBetween(1, 1) . ' liter',
                    'cushioning' => $this->faker->numberBetween(1, 2) . ' pcs'
                ];
            default:
                return [];
        }
    }
    
    /**
     * Create production with tracking stages initialized
     */
    public function withTracking()
    {
        return $this->state(function (array $attributes) {
            return [
                'product_type' => $this->faker->randomElement(['table', 'chair']),
                'requires_tracking' => true,
                'status' => 'In Progress',
                'current_stage' => 'Material Preparation',
                'overall_progress' => $this->faker->numberBetween(10, 60)
            ];
        });
    }
    
    /**
     * Create alkansya production (no tracking)
     */
    public function alkansya()
    {
        return $this->state(function (array $attributes) {
            return [
                'product_type' => 'alkansya',
                'requires_tracking' => false,
                'status' => 'Completed',
                'current_stage' => 'Ready for Delivery',
                'overall_progress' => 100
            ];
        });
    }
}

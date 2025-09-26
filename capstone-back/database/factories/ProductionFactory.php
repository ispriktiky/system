<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\User;
use App\Models\Product;

class ProductionFactory extends Factory
{
    public function definition(): array
    {
        return [
            // Relationships
            'user_id'       => User::inRandomOrder()->first()->id ?? User::factory(),
            'product_id'    => Product::inRandomOrder()->first()->id ?? Product::factory(),

            // Fake product details
            'product_name'  => $this->faker->randomElement([
                "Wooden Chair", "Dining Table", "Bookshelf", "Cabinet", 
                "Bed Frame", "Coffee Table", "Stool", "Wardrobe"
            ]),

            // Production details
            'date'          => $this->faker->dateTimeBetween('-15 days', 'now')->format('Y-m-d'),
            'stage'         => $this->faker->randomElement([
                "Preparation", "Assembly", "Finishing", "Quality Control"
            ]),
            'status'        => $this->faker->randomElement([
                "Pending", "In Progress", "Completed", "Hold"
            ]),

            // Quantities
            'quantity'      => $this->faker->numberBetween(5, 50),

            // JSON or array field for resources
            'resources_used' => [
                'wood'  => $this->faker->numberBetween(5, 20) . " pcs",
                'nails' => $this->faker->numberBetween(10, 100) . " pcs",
                'paint' => $this->faker->numberBetween(1, 5) . " liters",
            ],

            // Extra notes
            'notes'         => $this->faker->randomElement([
                "Urgent order", "Standard priority"
            ]),
        ];
    }
}

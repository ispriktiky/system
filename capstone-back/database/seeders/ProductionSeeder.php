<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Production;
use App\Models\User;
use App\Models\Product;

class ProductionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ✅ Ensure we have at least 5 products
        if (Product::count() === 0) {
            Product::factory()->count(5)->create();
        }

        // ✅ Ensure we have at least some users
        if (User::count() === 0) {
            User::factory()->count(5)->create();
        }

        // ✅ Create productions with random user + product
        Production::factory()
            ->count(50)
            ->create();
    }
}

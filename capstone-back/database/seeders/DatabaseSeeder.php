<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UsersTableSeeder::class,
            ProductsTableSeeder::class,
            ProductionSeeder::class, // now uses factory
            InventoryItemsSeeder::class,
        ]);
    }
}

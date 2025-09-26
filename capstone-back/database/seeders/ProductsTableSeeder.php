<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;

class ProductsTableSeeder extends Seeder
{
    public function run()
    {
        Product::updateOrCreate(
            ['name' => 'Dining Table'],
            [
                'description' => '',
                'price' => 12500.00,
                'stock' => 50,
                'image' => 'storage/products/Table.jpg',
            ]
        );

        Product::updateOrCreate(
            ['name' => 'Wooden Chair'],
            [
                'description' => '',
                'price' => 7500.00,
                'stock' => 50,
                'image' => 'storage/products/Chair.jpg',
            ]
        );

        Product::updateOrCreate(
            ['name' => 'Alkansya'],
            [
                'description' => '',
                'price' => 159.00,
                'stock' => 50,
                'image' => 'storage/products/Alkansya.jpg',
            ]
        );
    }
}
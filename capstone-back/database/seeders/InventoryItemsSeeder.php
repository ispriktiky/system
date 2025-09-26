<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\InventoryItem;

class InventoryItemsSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            [
                'sku' => 'PW-1x4x8',
                'name' => 'Pinewood 1x4x8ft',
                'category' => 'raw',
                'unit' => 'piece',
                'description' => 'Pine wood board 1x4x8 ft',
            ],
            [
                'sku' => 'PLY-4.2-4x8',
                'name' => 'Plywood 4.2mm 4x8ft',
                'category' => 'raw',
                'unit' => 'sheet',
                'description' => 'Plywood sheet 4.2mm thickness 4x8 ft',
            ],
            [
                'sku' => 'ACR-1.5-4x8',
                'name' => 'Acrylic 1.5mm 4x8ft',
                'category' => 'raw',
                'unit' => 'sheet',
                'description' => 'Acrylic sheet 1.5mm thickness 4x8 ft',
            ],
            [
                'sku' => 'PN-F30',
                'name' => 'Pin Nail F30',
                'category' => 'raw',
                'unit' => 'box',
                'description' => 'F30 pin nails',
            ],
            [
                'sku' => 'BS-1.5',
                'name' => 'Black Screw 1 1/2',
                'category' => 'raw',
                'unit' => 'box',
                'description' => 'Black screw 1.5 inch',
            ],
            [
                'sku' => 'STKW-250',
                'name' => 'Stikwell 250',
                'category' => 'raw',
                'unit' => 'tube',
                'description' => 'Stikwell adhesive 250',
            ],
            [
                'sku' => 'GRP-4-120',
                'name' => 'Grinder pad 4inch 120 grit',
                'category' => 'raw',
                'unit' => 'piece',
                'description' => 'Grinding pad 4 inch, 120 grit',
            ],
            [
                'sku' => 'STK-24-W',
                'name' => 'Sticker 24 inch Car Decals - White',
                'category' => 'raw',
                'unit' => 'roll',
                'description' => 'White sticker roll, 24 inch for car decals',
            ],
            [
                'sku' => 'STK-24-B',
                'name' => 'Sticker 24 inch Car Decals - Black',
                'category' => 'raw',
                'unit' => 'roll',
                'description' => 'Black sticker roll, 24 inch for car decals',
            ],
            [
                'sku' => 'TFT-24',
                'name' => 'Transfer Tape 24 inch',
                'category' => 'raw',
                'unit' => 'roll',
                'description' => 'Transfer tape, 24 inch width',
            ],
            [
                'sku' => 'TAPE-2-300',
                'name' => 'TAPE 2 inch 300m',
                'category' => 'raw',
                'unit' => 'roll',
                'description' => 'General packing tape, 2 inch x 300 m',
            ],
            [
                'sku' => 'FRAG-2-300',
                'name' => 'Fragile Tape 2inch 300m',
                'category' => 'raw',
                'unit' => 'roll',
                'description' => 'Fragile printed packing tape, 2 inch x 300 m',
            ],
            [
                'sku' => 'BWRAP-40-100',
                'name' => 'Bubble Wrap 40 inch x 100 m',
                'category' => 'raw',
                'unit' => 'roll',
                'description' => 'Bubble wrap roll 40 inch width x 100 m length',
            ],
            [
                'sku' => 'INS-8-40-100',
                'name' => 'Insulation 8mm 40 inch x 100 m',
                'category' => 'raw',
                'unit' => 'roll',
                'description' => 'Insulation foam 8mm, 40 inch width x 100 m length',
            ],
        ];

        foreach ($items as $item) {
            InventoryItem::updateOrCreate(
                ['sku' => $item['sku']],
                [
                    'name' => $item['name'],
                    'category' => $item['category'],
                    'location' => null,
                    'unit' => $item['unit'] ?? null,
                    'unit_cost' => null,
                    'supplier' => null,
                    'description' => $item['description'] ?? null,
                    'quantity_on_hand' => 0,
                    'safety_stock' => 0,
                    'reorder_point' => 0,
                    'max_level' => 0,
                    'lead_time_days' => 0,
                ]
            );
        }
    }
}



<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductMaterial extends Model
{
    protected $fillable = ['product_id','inventory_item_id','qty_per_unit'];

    public function product() { return $this->belongsTo(Product::class); }
    public function inventoryItem() { return $this->belongsTo(InventoryItem::class); }
}


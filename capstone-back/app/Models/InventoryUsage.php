<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryUsage extends Model
{
    protected $table = 'inventory_usages';
    protected $fillable = ['inventory_item_id','date','qty_used'];

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class);
    }
}
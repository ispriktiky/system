<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    protected $fillable = [
        'sku','name','category','location','unit','unit_cost','supplier','description',
        'quantity_on_hand','safety_stock',
        'reorder_point','max_level','lead_time_days'
    ];

    public function usage(): HasMany {
        return $this->hasMany(InventoryUsage::class);
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'description', 'price', 'stock', 'image'];

    // A product can be in multiple cart items
    public function cartItems() {
        return $this->hasMany(Cart::class);
    }

    // A product can be part of multiple orders
    public function orderItems() {
        return $this->hasMany(OrderItem::class);
    }
    
    // A product can have multiple production records
    public function productions()
    {
        return $this->hasMany(Production::class);
    }

    public function materials()
    {
        return $this->hasMany(ProductMaterial::class);
    }
}
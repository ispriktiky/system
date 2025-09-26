<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('inventory_item_id')->constrained()->onDelete('cascade');
            $table->integer('qty_per_unit')->default(1); // units of material per 1 product unit
            $table->timestamps();
            $table->unique(['product_id','inventory_item_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('product_materials');
    }
};


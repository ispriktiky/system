<?php

// database/migrations/2025_01_01_000001_create_inventory_usage_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('inventory_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->integer('qty_used');
            $table->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('inventory_usages');
    }
};

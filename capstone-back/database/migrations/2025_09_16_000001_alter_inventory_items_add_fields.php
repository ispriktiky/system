<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->string('unit')->nullable()->after('location');
            $table->decimal('unit_cost', 12, 2)->nullable()->after('unit');
            $table->string('supplier')->nullable()->after('unit_cost');
            $table->text('description')->nullable()->after('supplier');
        });
    }

    public function down(): void {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropColumn(['unit','unit_cost','supplier','description']);
        });
    }
};



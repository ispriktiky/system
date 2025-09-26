<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_tracking', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->string('tracking_type'); // 'alkansya' or 'custom' (for tables/chairs)
            $table->string('current_stage');
            $table->string('status'); // 'pending', 'in_production', 'completed', 'shipped', 'delivered'
            $table->timestamp('estimated_start_date')->nullable();
            $table->timestamp('estimated_completion_date')->nullable();
            $table->timestamp('actual_start_date')->nullable();
            $table->timestamp('actual_completion_date')->nullable();
            $table->json('process_timeline')->nullable(); // Detailed timeline for each process
            $table->json('production_updates')->nullable(); // Real-time updates
            $table->text('customer_notes')->nullable();
            $table->text('internal_notes')->nullable();
            $table->timestamps();
            
            $table->index(['order_id', 'tracking_type']);
            $table->index(['status', 'estimated_completion_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_tracking');
    }
};

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
        Schema::create('production_analytics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->integer('target_output')->default(0);
            $table->integer('actual_output')->default(0);
            $table->integer('efficiency_percentage')->default(0);
            $table->integer('total_duration_minutes')->default(0);
            $table->integer('avg_process_duration_minutes')->default(0);
            $table->json('process_breakdown')->nullable(); // Detailed breakdown by process
            $table->json('bottleneck_analysis')->nullable(); // Identify bottlenecks
            $table->json('predictive_forecast')->nullable(); // Next day/week predictions
            $table->json('resource_utilization')->nullable(); // Worker and equipment usage
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->unique(['product_id', 'date']);
            $table->index(['date', 'efficiency_percentage']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_analytics');
    }
};

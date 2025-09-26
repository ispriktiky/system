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
        Schema::create('production_processes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_id')->constrained()->onDelete('cascade');
            $table->string('process_name'); // e.g., "Design", "Preparation", "Cutting", "Assembly", "Finishing", "Quality Control"
            $table->integer('process_order'); // 1-6 for Alkansya, different for other products
            $table->string('status')->default('pending'); // pending, in_progress, completed, delayed
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->integer('estimated_duration_minutes')->nullable();
            $table->text('notes')->nullable();
            $table->json('materials_used')->nullable(); // Track materials consumed in this process
            $table->json('quality_checks')->nullable(); // Quality control data
            $table->string('assigned_worker')->nullable();
            $table->timestamps();
            
            $table->index(['production_id', 'process_order']);
            $table->index(['status', 'started_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_processes');
    }
};

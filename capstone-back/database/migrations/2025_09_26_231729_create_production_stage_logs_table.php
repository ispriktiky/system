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
        Schema::create('production_stage_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_id')->constrained('productions')->onDelete('cascade');
            $table->foreignId('production_stage_id')->constrained('production_stages')->onDelete('cascade');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'delayed', 'hold']);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('estimated_completion_at')->nullable();
            $table->integer('actual_duration_hours')->nullable();
            $table->text('notes')->nullable();
            $table->json('resources_used')->nullable();
            $table->json('issues')->nullable(); // Track any problems or delays
            $table->foreignId('assigned_worker_id')->nullable()->constrained('users')->onDelete('set null');
            $table->decimal('progress_percentage', 5, 2)->default(0.00); // 0.00 to 100.00
            $table->timestamps();
            
            // Index for better query performance
            $table->index(['production_id', 'production_stage_id']);
            $table->index(['status', 'estimated_completion_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_stage_logs');
    }
};

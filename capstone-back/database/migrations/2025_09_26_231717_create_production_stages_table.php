<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('production_stages', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Stage name: Material Preparation, Cutting & Shaping, etc.
            $table->text('description')->nullable();
            $table->integer('order_sequence'); // 1-6 for the 6 stages
            $table->integer('duration_hours')->default(24); // Default duration per stage
            $table->text('requirements')->nullable(); // JSON field for stage requirements
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        
        // Insert the 6 production stages
        DB::table('production_stages')->insert([
            [
                'name' => 'Material Preparation',
                'description' => 'Preparing and sourcing all required materials for production',
                'order_sequence' => 1,
                'duration_hours' => 24,
                'requirements' => json_encode(['raw_materials', 'tools', 'workspace']),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Cutting & Shaping',
                'description' => 'Cutting wood to size and shaping components',
                'order_sequence' => 2,
                'duration_hours' => 36,
                'requirements' => json_encode(['cutting_tools', 'measuring_tools', 'safety_equipment']),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Assembly',
                'description' => 'Assembling cut components into the final product structure',
                'order_sequence' => 3,
                'duration_hours' => 48,
                'requirements' => json_encode(['assembly_tools', 'fasteners', 'glue', 'clamps']),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Sanding & Surface Preparation',
                'description' => 'Smoothing surfaces and preparing for finishing',
                'order_sequence' => 4,
                'duration_hours' => 24,
                'requirements' => json_encode(['sandpaper', 'sanding_tools', 'dust_removal']),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Finishing',
                'description' => 'Applying stains, paints, or protective coatings',
                'order_sequence' => 5,
                'duration_hours' => 36,
                'requirements' => json_encode(['finishing_materials', 'brushes', 'spray_equipment', 'drying_area']),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Quality Check & Packaging',
                'description' => 'Final quality inspection and packaging for delivery',
                'order_sequence' => 6,
                'duration_hours' => 12,
                'requirements' => json_encode(['quality_checklist', 'packaging_materials', 'labels']),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_stages');
    }
};

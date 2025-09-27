<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('productions', function (Blueprint $table) {
            // Enhanced tracking fields
            $table->timestamp('production_started_at')->nullable()->after('notes');
            $table->timestamp('estimated_completion_date')->nullable()->after('production_started_at');
            $table->timestamp('actual_completion_date')->nullable()->after('estimated_completion_date');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium')->after('actual_completion_date');
            $table->string('production_batch_number')->nullable()->after('priority');
            $table->boolean('requires_tracking')->default(true)->after('production_batch_number'); // false for alkansya
            $table->enum('product_type', ['alkansya', 'table', 'chair', 'custom'])->default('custom')->after('requires_tracking');
            $table->decimal('overall_progress', 5, 2)->default(0.00)->after('product_type'); // 0.00 to 100.00
            $table->json('production_metrics')->nullable()->after('overall_progress'); // Store analytics data
            
            // Update stage enum to match new workflow
            $table->dropColumn('stage');
        });

        // Add new stage column with updated enum values
        Schema::table('productions', function (Blueprint $table) {
            $table->enum('current_stage', [
                'Material Preparation',
                'Cutting & Shaping',
                'Assembly',
                'Sanding & Surface Preparation',
                'Finishing',
                'Quality Check & Packaging',
                'Ready for Delivery',
                'Completed'
            ])->default('Material Preparation')->after('date');
        });
    }

    public function down()
    {
        Schema::table('productions', function (Blueprint $table) {
            $table->dropColumn([
                'production_started_at',
                'estimated_completion_date',
                'actual_completion_date',
                'priority',
                'production_batch_number',
                'requires_tracking',
                'product_type',
                'overall_progress',
                'production_metrics'
            ]);
            
            $table->dropColumn('current_stage');
        });

        // Restore original stage column
        Schema::table('productions', function (Blueprint $table) {
            $table->enum('stage', [
                'Design', 'Preparation', 'Cutting', 'Assembly', 'Finishing', 'Quality Control'
            ])->default('Design')->after('date');
        });
    }
};

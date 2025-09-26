<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::create('productions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->string('product_name'); // optional, can duplicate from product for quick display
            $table->date('date')->nullable();
            $table->enum('stage', [
                'Design', 'Preparation', 'Cutting', 'Assembly', 'Finishing', 'Quality Control'
            ])->default('Design');
            $table->enum('status', [
                'Pending', 'In Progress', 'Completed', 'Hold'
            ])->default('Pending');
            $table->integer('quantity')->default(0);
            $table->json('resources_used')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down() {
        Schema::dropIfExists('productions');
    }
};

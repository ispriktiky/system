<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->enum('payment_method', ['cod','gcash','maya'])->default('cod')->after('status');
            $table->enum('payment_status', ['unpaid','cod_pending','paid','failed','refunded'])->default('unpaid')->after('payment_method');
            $table->string('transaction_ref')->nullable()->after('payment_status');
            $table->string('shipping_address')->nullable()->after('transaction_ref');
            $table->string('contact_phone')->nullable()->after('shipping_address');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['payment_method','payment_status','transaction_ref','shipping_address','contact_phone']);
        });
    }
};



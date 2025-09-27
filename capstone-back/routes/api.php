<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\UsageController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ProductionController;
use App\Http\Controllers\OrderTrackingController;
use App\Http\Controllers\AdminOverviewController;
use App\Http\Controllers\PaymentWebhookController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\ProductionTrackingController;

use App\Models\Production;
use Illuminate\Support\Facades\DB;

// Auth
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // Product Routes
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{id}', [ProductController::class, 'show']);
    Route::get('/products/{id}/materials', [ProductController::class, 'getMaterials']);
    Route::post('/products/{id}/materials', [ProductController::class, 'setMaterials']);
    Route::get('/products/{id}/materials/export', [ProductController::class, 'exportMaterialsCsv']);
    Route::post('/products/{id}/materials/import', [ProductController::class, 'importMaterialsCsv']);

    // Cart Routes
    Route::post('/cart', [CartController::class, 'addToCart']);
    Route::get('/cart', [CartController::class, 'viewCart']);
    Route::put('/cart/{id}', [CartController::class, 'update']);
    Route::delete('/cart/{id}', [CartController::class, 'removeFromCart']);

    // Order Routes
    Route::post('/checkout', [OrderController::class, 'checkout']);
    Route::post('/payments/init', [OrderController::class, 'initPayment']);
    Route::post('/payments/verify', [OrderController::class, 'verifyPayment']);
    Route::post('/payments/confirm', [OrderController::class, 'confirmPayment']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/my-orders', [OrderController::class, 'myOrders']);
    Route::get('/orders/{id}/tracking', [OrderController::class, 'tracking']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);
    Route::get('/orders/{id}/payment-status', function($id){
        $order = \App\Models\Order::select('id','payment_status')->find($id);
        return $order ? response()->json($order) : response()->json(['message'=>'Not found'],404);
    });
    Route::put('/orders/{id}/complete', [OrderController::class, 'markAsComplete']);
    Route::put('/orders/{id}/status', [OrderController::class, 'updateStatus']);
    Route::put('/orders/{id}/ready-for-delivery', [OrderController::class, 'markAsReadyForDelivery']);
    Route::put('/orders/{id}/delivered', [OrderController::class, 'markAsDelivered']);

    // Inventory Routes
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::post('/inventory', [InventoryController::class, 'store']);
    Route::put('/inventory/{id}', [InventoryController::class, 'update']);
    Route::delete('/inventory/{id}', [InventoryController::class, 'destroy']);
    Route::get('/inventory/reorder-items', [InventoryController::class, 'getReorderItems']);
    Route::get('/inventory/daily-usage', [InventoryController::class, 'getDailyUsage']);
    Route::get('/inventory/consumption-trends', [InventoryController::class, 'getConsumptionTrends']);
    Route::get('/inventory/dashboard', [InventoryController::class, 'getDashboardData']);

    // Usage
    Route::get('/usage', [UsageController::class, 'index']);
    Route::post('/usage', [UsageController::class, 'store']);

    // Reports
    Route::get('/replenishment', [ReportController::class, 'replenishment']);
    Route::get('/forecast', [ReportController::class, 'forecast']);
    Route::get('/reports/stock.csv', [ReportController::class, 'stockCsv']);
    Route::get('/reports/usage.csv', [ReportController::class, 'usageCsv']);
    Route::get('/reports/replenishment.csv', [ReportController::class, 'replenishmentCsv']);
    Route::get('/reports/inventory-overview', [ReportController::class, 'inventoryOverview']);
    Route::get('/reports/inventory-overview.csv', [ReportController::class, 'inventoryOverviewCsv']);
    Route::get('/reports/turnover', [ReportController::class, 'turnover']);
    Route::get('/reports/turnover.csv', [ReportController::class, 'turnoverCsv']);
    Route::get('/reports/replenishment-schedule', [ReportController::class, 'replenishmentSchedule']);
    Route::get('/reports/replenishment-schedule.csv', [ReportController::class, 'replenishmentScheduleCsv']);
    Route::get('/reports/production.csv', [ReportController::class, 'productionCsv']);

    // Productions
    Route::get('/productions', [ProductionController::class, 'index']);
    Route::get('/productions/analytics', [ProductionController::class, 'analytics']);
    Route::get('/productions/predictive', [ProductionController::class, 'predictiveAnalytics']);
    Route::get('/productions/daily-summary', [ProductionController::class, 'dailySummary']);
    Route::get('/productions/dashboard', [ProductionController::class, 'dashboard']);
    Route::get('/productions/efficiency-report', [ProductionController::class, 'efficiencyReport']);
    Route::get('/productions/capacity-utilization', [ProductionController::class, 'capacityUtilization']);
    Route::get('/productions/resource-allocation', [ProductionController::class, 'resourceAllocation']);
    Route::get('/productions/performance-metrics', [ProductionController::class, 'performanceMetrics']);
    Route::post('/productions', [ProductionController::class, 'store']);
    Route::post('/productions/start', [ProductionController::class, 'startProduction']);
    Route::post('/productions/batch', [ProductionController::class, 'createBatch']);
    Route::patch('/productions/{id}', [ProductionController::class, 'update']);
    Route::patch('/productions/{id}/priority', [ProductionController::class, 'updatePriority']);
    Route::patch('/productions/{productionId}/processes/{processId}', [ProductionController::class, 'updateProcess']);
    Route::get('/productions/{id}', [ProductionController::class, 'show']);
    Route::get('/productions/{id}/timeline', [ProductionController::class, 'getTimeline']);
    Route::delete('/productions/{id}', [ProductionController::class, 'destroy']);

    // Production Tracking Routes
    Route::group(['prefix' => 'production-tracking'], function () {
        Route::get('/dashboard', [ProductionTrackingController::class, 'dashboard']);
        Route::get('/analytics/predictive', [ProductionTrackingController::class, 'predictiveAnalytics']);
        Route::get('/', [ProductionTrackingController::class, 'index']);
        Route::post('/', [ProductionTrackingController::class, 'store']);
        Route::get('/{id}', [ProductionTrackingController::class, 'show']);
        Route::put('/{id}', [ProductionTrackingController::class, 'update']);
        Route::post('/{id}/start-stage', [ProductionTrackingController::class, 'startStage']);
        Route::post('/{id}/complete-stage', [ProductionTrackingController::class, 'completeStage']);
        Route::post('/{id}/update-progress', [ProductionTrackingController::class, 'updateStageProgress']);
        Route::post('/reports/generate', [ProductionTrackingController::class, 'generateReport']);
    });

    // ✅ Analytics: Top Users
    Route::get('/top-users', function () {
        $topUsers = Production::select('user_id', DB::raw('SUM(quantity) as total_quantity'))
            ->with('user:id,name')
            ->groupBy('user_id')
            ->orderByDesc('total_quantity')
            ->take(5)
            ->get()
            ->map(function ($row) {
                return [
                    'user_name' => $row->user->name,
                    'quantity'  => $row->total_quantity,
                ];
            });

        return response()->json($topUsers);
    });

    // Order Tracking Routes
    Route::get('/order-tracking/{orderId}', [OrderTrackingController::class, 'getTracking']);
    Route::post('/order-tracking', [OrderTrackingController::class, 'createTracking']);
    Route::patch('/order-tracking/{trackingId}', [OrderTrackingController::class, 'updateTracking']);
    Route::get('/order-tracking/{orderId}/customer', [OrderTrackingController::class, 'getCustomerTracking']);
    Route::get('/order-tracking/stats', [OrderTrackingController::class, 'getTrackingStats']);

    // Admin Overview
    Route::get('/admin/overview', [AdminOverviewController::class, 'index']);
});

// Webhooks (no auth)
Route::post('/webhooks/xendit', [PaymentWebhookController::class, 'handleXendit']);
Route::post('/webhooks/stripe', [StripeWebhookController::class, 'handle']);
Route::post('/webhooks/maya', [PaymentWebhookController::class, 'handleMaya']);

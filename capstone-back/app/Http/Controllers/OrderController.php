<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\Auth;
use App\Models\Production;
use Illuminate\Support\Facades\DB;
use App\Models\Product;
use App\Models\ProductMaterial;
use App\Models\InventoryItem;
use App\Models\InventoryUsage;
use App\Services\XenditService;
use App\Services\StripeService;
use App\Services\MayaService;

class OrderController extends Controller
{
    public function checkout(Request $request)
    {
        $user = Auth::user(); // Get the authenticated user
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $cartItems = Cart::where('user_id', $user->id)->with('product')->get();

        if ($cartItems->isEmpty()) {
            return response()->json(['message' => 'Cart is empty'], 400);
        }

        $totalPrice = 0;
        foreach ($cartItems as $item) {
            if (!$item->product || $item->product->stock < $item->quantity) {
                return response()->json(['message' => 'Stock unavailable for ' . $item->product->name], 400);
            }
            $totalPrice += $item->product->price * $item->quantity;
        }

        // Pre-check: ensure raw materials are sufficient based on BOM
        $shortages = [];
        foreach ($cartItems as $item) {
            $bom = ProductMaterial::where('product_id', $item->product_id)->get();
            foreach ($bom as $mat) {
                $requiredQty = $mat->qty_per_unit * $item->quantity;
                $inv = InventoryItem::find($mat->inventory_item_id);
                if ($inv && ($inv->quantity_on_hand < $requiredQty)) {
                    $shortages[] = [
                        'product_id' => $item->product_id,
                        'product_name' => $item->product->name,
                        'sku' => $inv->sku,
                        'material_name' => $inv->name,
                        'on_hand' => $inv->quantity_on_hand,
                        'required' => $requiredQty,
                        'deficit' => max(0, $requiredQty - $inv->quantity_on_hand),
                    ];
                }
            }
        }
        if (!empty($shortages)) {
            return response()->json([
                'message' => 'Insufficient raw materials for this order',
                'shortages' => $shortages
            ], 422);
        }

        $validated = $request->validate([
            'payment_method' => 'nullable|in:cod,gcash,maya',
            'shipping_address' => 'nullable|string|max:500',
            'contact_phone' => 'nullable|string|max:64',
            'transaction_ref' => 'nullable|string|max:128',
        ]);

        $paymentMethod = $validated['payment_method'] ?? 'cod';
        $paymentStatus = $paymentMethod === 'cod' ? 'cod_pending' : 'unpaid';

        return DB::transaction(function () use ($user, $cartItems, $totalPrice, $paymentMethod, $paymentStatus, $validated) {
            // Create order with checkout_date
            $order = Order::create([
                'user_id' => $user->id,
                'total_price' => $totalPrice,
                'status' => 'pending',
                'checkout_date' => now(),
                'payment_method' => $paymentMethod,
                'payment_status' => $paymentStatus,
                'transaction_ref' => $validated['transaction_ref'] ?? null,
                'shipping_address' => $validated['shipping_address'] ?? null,
                'contact_phone' => $validated['contact_phone'] ?? null,
            ]);

            foreach ($cartItems as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'price' => $item->product->price
                ]);

                // Reduce finished product stock (if applicable)
                $item->product->decrement('stock', $item->quantity);

                // Deduct raw materials per BOM (at order time)
                $bom = ProductMaterial::where('product_id', $item->product_id)->get();
                foreach ($bom as $mat) {
                    $requiredQty = (int) ($mat->qty_per_unit * $item->quantity);
                    $inv = InventoryItem::find($mat->inventory_item_id);
                    if ($inv) {
                        // Ensure sufficient stock; otherwise abort with error
                        if ($inv->quantity_on_hand < $requiredQty) {
                            throw new \RuntimeException("Insufficient stock for SKU {$inv->sku}");
                        }
                        $inv->decrement('quantity_on_hand', $requiredQty);
                        // record usage row
                        InventoryUsage::create([
                            'inventory_item_id' => $inv->id,
                            'date' => now()->toDateString(),
                            'qty_used' => $requiredQty,
                        ]);
                    }
                }

                // Auto-create Production record for this item
                Production::create([
                    'order_id' => $order->id,
                    'user_id' => $user->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product->name,
                    'date' => now()->toDateString(),
                    'stage' => 'Preparation',
                    'status' => 'Pending',
                    'quantity' => $item->quantity,
                    'resources_used' => $bom->map(function ($m) use ($item) {
                        return [
                            'inventory_item_id' => $m->inventory_item_id,
                            'qty' => $m->qty_per_unit * $item->quantity,
                        ];
                    })->values(),
                    'notes' => 'Generated from Order #' . $order->id
                ]);
            }

            // Clear cart
            Cart::where('user_id', $user->id)->delete();

            return response()->json(['message' => 'Checkout successful', 'order_id' => $order->id, 'order' => $order]);
        });
    }

    public function initPayment(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'provider' => 'required|in:gcash,maya',
        ]);

        $order = Order::where('id', $validated['order_id'])->where('user_id', $user->id)->firstOrFail();

        if ($validated['provider'] === 'gcash') {
            $stripe = new StripeService();
            $session = $stripe->createCheckoutSessionForGcash([
                'amount' => (int) round($order->total_price),
                'currency' => 'php',
                'name' => 'Order #'.$order->id,
                'success_url' => config('app.url').'/payment/success?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => config('app.url').'/payment/failed',
                'metadata' => [ 'order_id' => $order->id, 'user_id' => $user->id ],
            ]);

            $order->update([
                'payment_method' => 'gcash',
                'payment_status' => 'unpaid',
                'transaction_ref' => $session['id'] ?? null,
            ]);

            return response()->json([
                'checkout_url' => $session['url'] ?? null,
                'transaction_ref' => $order->transaction_ref,
            ]);
        }

        // Maya via Maya Checkout (sandbox)
        if ($validated['provider'] === 'maya') {
            $maya = new MayaService();
            $referenceId = 'ORD-'.$order->id.'-'.now()->timestamp;
            $amount = (int) round($order->total_price);
            $frontend = env('FRONTEND_URL', 'http://localhost:3000');
            $payload = [
                'totalAmount' => [ 'value' => $amount, 'currency' => 'PHP' ],
                'buyer' => [
                    'firstName' => $user->name ?? 'Customer',
                    'email' => $user->email ?? 'customer@example.com',
                ],
                'items' => [[
                    'name' => 'Order #'.$order->id,
                    'quantity' => 1,
                    'amount' => [ 'value' => $amount ],
                    'totalAmount' => [ 'value' => $amount ],
                ]],
                'requestReferenceNumber' => $referenceId,
                'redirectUrl' => [
                    'success' => $frontend.'/cart?payment=success&provider=maya&order_id='.$order->id,
                    'failure' => $frontend.'/cart?payment=failed&provider=maya&order_id='.$order->id,
                    'cancel' => $frontend.'/cart?payment=cancel&provider=maya&order_id='.$order->id,
                ],
                'metadata' => [ 'order_id' => $order->id, 'user_id' => $user->id ],
            ];

            $resp = $maya->createCheckout($payload);
            $checkoutUrl = $resp['redirectUrl'] ?? $resp['checkoutUrl'] ?? null;

            $order->update([
                'payment_method' => 'maya',
                'payment_status' => 'unpaid',
                'transaction_ref' => $referenceId,
            ]);

            return response()->json([
                'checkout_url' => $checkoutUrl,
                'transaction_ref' => $order->transaction_ref,
            ]);
        }

        return response()->json(['message' => 'Unsupported provider'], 422);
    }

    public function verifyPayment(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'transaction_ref' => 'required|string',
            'status' => 'required|in:paid,failed',
        ]);

        $order = Order::where('id', $validated['order_id'])->where('user_id', $user->id)->firstOrFail();
        if ($order->transaction_ref !== $validated['transaction_ref']) {
            return response()->json(['message' => 'Invalid transaction'], 422);
        }

        $order->payment_status = $validated['status'] === 'paid' ? 'paid' : 'failed';
        $order->save();

        return response()->json(['message' => 'Payment status updated', 'order' => $order]);
    }

    public function confirmPayment(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'provider' => 'required|in:gcash,maya',
        ]);

        $order = Order::where('id', $validated['order_id'])->where('user_id', $user->id)->firstOrFail();

        // If webhook already marked paid, return
        if ($order->payment_status === 'paid') {
            return response()->json(['message' => 'Already paid', 'order' => $order]);
        }

        // Optimistic confirmation on return from provider
        $order->payment_status = 'paid';
        $order->save();

        return response()->json(['message' => 'Payment confirmed', 'order' => $order]);
    }


    public function index()
    {
        $user = Auth::user();
        if (!$user || $user->role !== 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(Order::with('user', 'items.product')->get());
    }

    public function myOrders()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return response()->json(Order::where('user_id', $user->id)->with('items.product')->get());
    }

    public function tracking($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $order = Order::with('items.product')->where('id', $id)->where('user_id', $user->id)->first();
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $stages = ['Design','Preparation','Cutting','Assembly','Finishing','Quality Control'];
        $productions = Production::where('order_id', $order->id)->get();

        $stageSummary = collect($stages)->map(function ($s) use ($productions) {
            $items = $productions->where('stage', $s);
            return [
                'stage' => $s,
                'in_progress' => $items->where('status','In Progress')->count(),
                'completed' => $items->where('status','Completed')->count(),
                'pending' => $items->where('status','Pending')->count(),
            ];
        })->values();

        // Simple ETA: assume each stage takes 2 days per item
        $perStageDays = 2;
        $totalJobs = max(1, $productions->count());
        $completedJobs = $productions->where('status','Completed')->count();
        $inProgressJobs = $productions->where('status','In Progress')->count();
        $progressRatio = ($completedJobs + 0.5 * $inProgressJobs) / $totalJobs;
        $progressPct = round($progressRatio * 100);
        $estimatedTotalDays = count($stages) * $perStageDays; // coarse
        $remainingDays = max(0, round($estimatedTotalDays * (1 - $progressRatio)));
        $etaDate = now()->addDays($remainingDays)->toDateString();

        $overall = [
            'total' => $productions->count(),
            'completed' => $completedJobs,
            'pending' => $productions->where('status','Pending')->count(),
            'in_progress' => $inProgressJobs,
            'progress_pct' => $progressPct,
            'eta' => $etaDate,
        ];

        return response()->json([
            'order' => $order,
            'stage_summary' => $stageSummary,
            'productions' => $productions,
            'overall' => $overall,
        ]);
    }

    public function show($id)
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $order = Order::with('items.product', 'user')->find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        // Ensure items contain product details
        $order->items->each(function ($item) {
            $item->product_name = $item->product->name ?? 'Unknown Product';
        });

        return response()->json($order);
    }


    public function markAsComplete($id)
    {
        $user = Auth::user();

        // Only employees can mark an order as complete
        if (!$user || $user->role !== 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Find the order
        $order = Order::find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        // Update the order status
        $order->status = 'completed';
        $order->save();

        return response()->json(['message' => 'Order marked as complete', 'order' => $order->load(['user', 'items.product'])]);
    }

    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();

        // Only employees can update order status
        if (!$user || $user->role !== 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,ready_for_delivery,delivered,completed,cancelled'
        ]);

        $order = Order::find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $order->status = $validated['status'];
        $order->save();

        return response()->json([
            'message' => 'Order status updated successfully',
            'order' => $order->load(['user', 'items.product'])
        ]);
    }

    public function markAsReadyForDelivery($id)
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $order = Order::find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $order->status = 'ready_for_delivery';
        $order->save();

        return response()->json([
            'message' => 'Order marked as ready for delivery',
            'order' => $order->load(['user', 'items.product'])
        ]);
    }

    public function markAsDelivered($id)
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $order = Order::find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $order->status = 'delivered';
        $order->save();

        return response()->json([
            'message' => 'Order marked as delivered',
            'order' => $order->load(['user', 'items.product'])
        ]);
    }

}
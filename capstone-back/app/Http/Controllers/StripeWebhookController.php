<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Order;
use Stripe\Webhook;

class StripeWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $secret = config('services.stripe.webhook_secret');

        if ($secret) {
            try {
                $event = Webhook::constructEvent($payload, $sigHeader, $secret);
            } catch (\Exception $e) {
                return response()->json(['message' => 'Invalid signature'], 400);
            }
        } else {
            $event = json_decode($payload, true);
        }

        $type = is_array($event) ? ($event['type'] ?? null) : $event->type;
        $data = is_array($event) ? ($event['data']['object'] ?? []) : $event->data->object;

        if ($type === 'checkout.session.completed') {
            $metadata = $data['metadata'] ?? [];
            $orderId = $metadata['order_id'] ?? null;
            if ($orderId) {
                $order = Order::find($orderId);
                if ($order) {
                    $order->payment_status = 'paid';
                    $order->transaction_ref = $data['id'] ?? $order->transaction_ref;
                    $order->save();
                }
            }
        }

        Log::info('Stripe webhook', ['type' => $type]);
        return response()->json(['ok' => true]);
    }
}



<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Order;

class PaymentWebhookController extends Controller
{
    public function handleXendit(Request $request)
    {
        // Optional: verify token header
        $token = $request->header('X-Callback-Token');
        $expected = config('services.xendit.webhook_token');
        if ($expected && $token !== $expected) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $event = $request->input('data');
        $status = $event['status'] ?? null; // SUCCEEDED, FAILED, VOIDED, etc
        $reference = $event['id'] ?? $request->input('id');
        $metadata = $event['metadata'] ?? [];
        $orderId = $metadata['order_id'] ?? null;

        if (!$orderId && isset($event['reference_id'])) {
            // reference_id has order id fragment: ORD-<id>-<ts>
            if (preg_match('/ORD-(\d+)-/',$event['reference_id'],$m)) {
                $orderId = (int)$m[1];
            }
        }

        if ($orderId) {
            $order = Order::find($orderId);
            if ($order) {
                if ($status === 'SUCCEEDED') {
                    $order->payment_status = 'paid';
                } elseif ($status === 'FAILED' || $status === 'VOIDED') {
                    $order->payment_status = 'failed';
                }
                if ($reference) {
                    $order->transaction_ref = $reference;
                }
                $order->save();
            }
        }

        Log::info('Xendit webhook received', $request->all());
        return response()->json(['ok' => true]);
    }

    public function handleMaya(Request $request)
    {
        $token = $request->header('X-Callback-Token');
        $expected = config('services.maya.webhook_token');
        // If a token is configured AND provided but does not match, reject. Otherwise accept.
        if ($expected && $token && $token !== $expected) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $status = $request->input('paymentStatus') ?? $request->input('status');
        $reference = $request->input('requestReferenceNumber') ?? $request->input('id');
        $metadata = $request->input('metadata', []);
        $orderId = $metadata['order_id'] ?? null;

        if (!$orderId && $reference && preg_match('/ORD-(\d+)-/', $reference, $m)) {
            $orderId = (int) $m[1];
        }

        if ($orderId) {
            $order = \App\Models\Order::find($orderId);
            if ($order) {
                if (in_array(strtoupper($status), ['SUCCESS','PAYMENT_SUCCESS'])) {
                    $order->payment_status = 'paid';
                } elseif (in_array(strtoupper($status), ['FAILED','PAYMENT_FAILED','VOIDED','CANCELLED'])) {
                    $order->payment_status = 'failed';
                }
                if ($reference) {
                    $order->transaction_ref = $reference;
                }
                $order->save();
            }
        }

        \Log::info('Maya webhook received', $request->all());
        return response()->json(['ok' => true]);
    }
}



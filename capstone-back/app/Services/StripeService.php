<?php

namespace App\Services;

use Stripe\StripeClient;

class StripeService
{
    private StripeClient $client;

    public function __construct()
    {
        $this->client = new StripeClient(config('services.stripe.secret'));
    }

    public function createCheckoutSessionForGcash(array $params): array
    {
        // params: amount, currency, success_url, cancel_url, metadata
        $session = $this->client->checkout->sessions->create([
            'mode' => 'payment',
            'payment_method_types' => ['gcash'],
            'line_items' => [[
                'price_data' => [
                    'currency' => $params['currency'] ?? 'php',
                    'product_data' => [
                        'name' => $params['name'] ?? 'Order Payment',
                    ],
                    'unit_amount' => (int) $params['amount'] * 100,
                ],
                'quantity' => 1,
            ]],
            'success_url' => $params['success_url'],
            'cancel_url' => $params['cancel_url'],
            'metadata' => $params['metadata'] ?? [],
        ]);

        return $session->toArray();
    }
}



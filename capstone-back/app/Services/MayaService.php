<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MayaService
{
    private string $publicKey;
    private string $secretKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->publicKey = config('services.maya.public');
        $this->secretKey = config('services.maya.secret');
        $this->baseUrl = rtrim(config('services.maya.base_url', 'https://pg-sandbox.paymaya.com'), '/');
    }

    // Maya Checkout: Create checkout link
    public function createCheckout(array $payload): array
    {
        $endpoint = $this->baseUrl . '/checkout/v1/checkouts';
        // Maya Checkout uses PUBLIC key for creating a checkout session
        $auth = base64_encode($this->publicKey . ':');

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'Authorization' => 'Basic ' . $auth,
        ])->post($endpoint, $payload);

        if (!$response->successful()) {
            throw new \RuntimeException($response->json('message') ?? $response->body());
        }

        return $response->json();
    }
}



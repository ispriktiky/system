<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class XenditService
{
    private string $secretKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->secretKey = config('services.xendit.secret');
        $this->baseUrl = rtrim(config('services.xendit.base_url', 'https://api.xendit.co'), '/');
    }

    public function createEwalletCharge(array $params): array
    {
        $endpoint = $this->baseUrl . '/ewallets/charges';

        $response = Http::withBasicAuth($this->secretKey, '')
            ->acceptJson()
            ->asJson()
            ->post($endpoint, $params);

        if (!$response->successful()) {
            throw new \RuntimeException($response->json('message') ?? $response->body());
        }

        return $response->json();
    }
}



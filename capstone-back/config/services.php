<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'xendit' => [
        'secret' => env('XENDIT_SECRET_KEY'),
        'base_url' => env('XENDIT_BASE_URL', 'https://api.xendit.co'),
        'webhook_token' => env('XENDIT_WEBHOOK_TOKEN'),
    ],

    'stripe' => [
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'api_base' => env('STRIPE_API_BASE', 'https://api.stripe.com'),
    ],

    'maya' => [
        'public' => env('MAYA_PUBLIC_KEY'),
        'secret' => env('MAYA_SECRET_KEY'),
        'base_url' => env('MAYA_BASE_URL', 'https://pg-sandbox.paymaya.com'),
        'webhook_token' => env('MAYA_WEBHOOK_TOKEN'),
    ],

];

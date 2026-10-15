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

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    // Sign in with Apple (§4.8). Not a Socialite driver — implemented directly
    // against Apple's REST endpoints in Auth\AppleController because Apple's
    // "client_secret" is a self-signed ES256 JWT, not a static string, and the
    // redirect_uri must be a backend endpoint (Apple's authorize server POSTs
    // code+state there via response_mode=form_post, unlike the other providers'
    // simple GET-redirect-with-code-in-querystring flow).
    'apple' => [
        'services_id'  => env('APPLE_SERVICES_ID'),
        'team_id'      => env('APPLE_TEAM_ID'),
        'key_id'       => env('APPLE_KEY_ID'),
        'private_key'  => env('APPLE_PRIVATE_KEY'),
        'redirect'     => env('APPLE_REDIRECT_URI'),
    ],

    'microsoft' => [
        'client_id' => env('MICROSOFT_CLIENT_ID'),
        'client_secret' => env('MICROSOFT_CLIENT_SECRET'),
        'redirect' => env('MICROSOFT_REDIRECT_URI'),
        'tenant' => env('MICROSOFT_AD_TENANT', 'common'), // Default to common if not set
    ],

    'linkedin' => [
        'client_id' => env('LINKEDIN_CLIENT_ID'),
        'client_secret' => env('LINKEDIN_CLIENT_SECRET'),
        'redirect' => env('LINKEDIN_REDIRECT_URI', 'http://localhost:8080/auth/linkedin/callback'), // frontend callback route
    ],

    'paystack' => [
        'secret_key' => env('PAYSTACK_SECRET_KEY'),
        'public_key' => env('PAYSTACK_PUBLIC_KEY'),
        'callback_url' => env('PAYSTACK_CALLBACK_URL'),
    ],

    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
    ],

    'apple_iap' => [
        'bundle_id'        => env('APPLE_IAP_BUNDLE_ID', 'com.passmobilegeneral.app'),
        'shared_secret'    => env('APPLE_IAP_SHARED_SECRET'),
        'use_sandbox'      => env('APPLE_IAP_USE_SANDBOX', false),
        'verify_url_prod'  => 'https://buy.itunes.apple.com/verifyReceipt',
        'verify_url_sbox'  => 'https://sandbox.itunes.apple.com/verifyReceipt',
    ],

    'google_iap' => [
        'package_name'             => env('GOOGLE_IAP_PACKAGE_NAME', 'com.passmobilegeneral.app'),
        'service_account_json'     => env('GOOGLE_IAP_SERVICE_ACCOUNT_JSON'),
        'service_account_json_b64' => env('GOOGLE_IAP_SERVICE_ACCOUNT_JSON_B64'),
    ],

    'firebase' => [
        'project_id'  => env('FIREBASE_PROJECT_ID'),
        'credentials' => env('FIREBASE_CREDENTIALS'),
    ],

    'ai' => [
        'endpoint' => env('AI_PROVIDER_ENDPOINT', 'https://api.anthropic.com/v1/messages'),
        'key'      => env('AI_PROVIDER_KEY'),
        'model'    => env('AI_MODEL', 'claude-opus-4-6'),
    ],

    // AWS Builder mini-challenge (Devpost): Bedrock vision captions Ring
    // doorbell thumbnails for the check-in kiosk. Reuses the same AWS
    // account's key/secret as 'ses' unless overridden.
    'bedrock' => [
        'key' => env('AWS_BEDROCK_ACCESS_KEY_ID', env('AWS_ACCESS_KEY_ID')),
        'secret' => env('AWS_BEDROCK_SECRET_ACCESS_KEY', env('AWS_SECRET_ACCESS_KEY')),
        'region' => env('AWS_BEDROCK_REGION', env('AWS_DEFAULT_REGION', 'us-east-1')),
        'model_id' => env('AWS_BEDROCK_MODEL_ID', 'anthropic.claude-3-haiku-20240307-v1:0'),
    ],

    // Opt-in face check-in (stretch goal). One Rekognition Face Collection
    // per event ("event-{event_id}"), populated only from registration
    // opt-in photos, deleted by PurgeEventFaceData when the event ends.
    'rekognition' => [
        'key' => env('AWS_REKOGNITION_ACCESS_KEY_ID', env('AWS_ACCESS_KEY_ID')),
        'secret' => env('AWS_REKOGNITION_SECRET_ACCESS_KEY', env('AWS_SECRET_ACCESS_KEY')),
        'region' => env('AWS_REKOGNITION_REGION', env('AWS_DEFAULT_REGION', 'us-east-1')),
        'match_threshold' => env('AWS_REKOGNITION_MATCH_THRESHOLD', 92),
    ],

    'protonvpn' => [
        'enabled'  => env('PROTONVPN_ENABLED', false),
        'username' => env('PROTONVPN_USERNAME'),      // Your ProtonVPN username (add +socks suffix)
        'password' => env('PROTONVPN_PASSWORD'),
        'host'     => env('PROTONVPN_HOST', 'node-nl-01.protonvpn.net'),  // SOCKS5 proxy server
        'port'     => env('PROTONVPN_PORT', 1080),
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'dalle_model' => env('OPENAI_DALLE_MODEL', 'dall-e-2'),
    ],

    'affiliate' => [
        'commission_percentage' => env('AFFILIATE_COMMISSION_PERCENTAGE', 10),
        'commission_duration_days' => env('AFFILIATE_COMMISSION_DURATION_DAYS', 90),
        'min_payout' => env('AFFILIATE_MIN_PAYOUT', 10),
        'payout_day' => env('AFFILIATE_PAYOUT_DAY', 28),
        'auto_payout_enabled' => env('AFFILIATE_AUTO_PAYOUT_ENABLED', true),
    ],

    'ring' => [
        'client_id' => env('RING_CLIENT_ID'),
        'client_secret' => env('RING_CLIENT_SECRET'),
        'hmac_secret' => env('RING_HMAC_SECRET'),
        'partner_account_identifier' => env('RING_PARTNER_ACCOUNT_IDENTIFIER'),
        'access_token' => env('RING_ACCESS_TOKEN'), // Playground token stopgap for outbound calls (RingService)
    ],

];

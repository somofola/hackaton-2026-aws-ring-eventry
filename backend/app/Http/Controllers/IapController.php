<?php

namespace App\Http\Controllers;

use App\Mail\PaymentReceiptMail;
use App\Models\Payment;
use App\Models\User;
use Google\Auth\Credentials\ServiceAccountCredentials;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Native In-App Purchase receipt verification.
 *
 * Apple: validates against verifyReceipt (prod with sandbox fallback on 21007).
 * Google: validates with Play Developer API (purchases.products.get /
 * purchases.subscriptions.get) using a service-account OAuth2 token.
 *
 * After verification, provisions the same entitlements as Stripe/Paystack
 * (Payment row, EventEnrollment) by delegating to PaymentController helpers.
 */
class IapController extends Controller
{
    public function verifyApple(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);

        $verifyUrl = config('services.apple_iap.use_sandbox')
            ? config('services.apple_iap.verify_url_sbox')
            : config('services.apple_iap.verify_url_prod');

        $payload = [
            'receipt-data' => $data['receipt'],
            'password'     => config('services.apple_iap.shared_secret'),
            'exclude-old-transactions' => true,
        ];

        $response = Http::asJson()->post($verifyUrl, $payload);
        if (!$response->ok()) {
            return response()->json(['error' => 'Apple verifyReceipt unreachable.'], 502);
        }
        $body = $response->json();

        // Status 21007 = sandbox receipt sent to prod endpoint — retry sandbox.
        if (($body['status'] ?? null) === 21007) {
            $body = Http::asJson()
                ->post(config('services.apple_iap.verify_url_sbox'), $payload)
                ->json();
        }

        if (($body['status'] ?? null) !== 0) {
            Log::warning('Apple IAP verification failed', ['status' => $body['status'] ?? null, 'user_id' => Auth::id()]);
            return response()->json(['status' => 'failed', 'error' => 'Receipt rejected.', 'apple_status' => $body['status'] ?? null], 422);
        }

        // Validate bundle id.
        $expectedBundle = config('services.apple_iap.bundle_id');
        $receiptBundle = $body['receipt']['bundle_id'] ?? null;
        if ($expectedBundle && $receiptBundle && $receiptBundle !== $expectedBundle) {
            return response()->json(['error' => 'Bundle id mismatch.'], 422);
        }

        // Find the in-app transaction matching the requested productId.
        $inApp = $body['latest_receipt_info'] ?? $body['receipt']['in_app'] ?? [];
        $tx = collect($inApp)->firstWhere('product_id', $data['productId']);
        if (!$tx) {
            return response()->json(['error' => 'Product not found in receipt.'], 422);
        }

        $transactionId = $tx['transaction_id'] ?? $tx['original_transaction_id'] ?? $data['transactionId'] ?? null;
        if (!$transactionId) {
            return response()->json(['error' => 'No transaction id in receipt.'], 422);
        }

        // Idempotency — reject duplicate redemption.
        if ($existing = Payment::where('payment_reference', $this->reference('A', $transactionId))->first()) {
            return $this->successResponse($existing, 'Payment already verified.');
        }

        return $this->provision('apple', $data, $transactionId, $body);
    }

    public function verifyGoogle(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);

        // The frontend sends the JSON-encoded native purchase as `receipt`. Extract purchaseToken.
        $purchaseToken = $data['transactionId'] ?? null;
        $decoded = json_decode($data['receipt'], true);
        if (is_array($decoded)) {
            $purchaseToken = $decoded['purchaseToken']
                ?? $decoded['transactionReceipt']
                ?? ($decoded['receipt']['purchaseToken'] ?? null)
                ?? $purchaseToken;
        }
        if (!$purchaseToken) {
            return response()->json(['error' => 'Missing purchase token.'], 422);
        }

        $packageName = config('services.google_iap.package_name');
        $accessToken = $this->googleAccessToken();
        if (!$accessToken) {
            return response()->json(['error' => 'Google service account not configured.'], 500);
        }

        // Try one-time products first; fall back to subscriptions endpoint.
        $base = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{$packageName}/purchases";
        $productUrl = "$base/products/{$data['productId']}/tokens/" . urlencode($purchaseToken);
        $subUrl     = "$base/subscriptionsv2/tokens/" . urlencode($purchaseToken);

        $resp = Http::withToken($accessToken)->get($productUrl);
        $isSubscription = false;
        if ($resp->status() === 404) {
            $resp = Http::withToken($accessToken)->get($subUrl);
            $isSubscription = true;
        }
        if (!$resp->ok()) {
            Log::warning('Google IAP verify failed', ['status' => $resp->status(), 'body' => $resp->body()]);
            return response()->json(['status' => 'failed', 'error' => 'Google rejected token.'], 422);
        }
        $body = $resp->json();

        if ($isSubscription) {
            $state = $body['subscriptionState'] ?? null;
            if (!in_array($state, ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'])) {
                return response()->json(['status' => 'failed', 'error' => 'Subscription not active.'], 422);
            }
        } else {
            // purchaseState: 0 purchased, 1 cancelled, 2 pending
            if (($body['purchaseState'] ?? null) !== 0) {
                return response()->json(['status' => 'failed', 'error' => 'Purchase not in purchased state.'], 422);
            }
            // Acknowledge to avoid auto-refund after 3 days.
            if (($body['acknowledgementState'] ?? null) === 0) {
                Http::withToken($accessToken)->post("$productUrl:acknowledge");
            }
        }

        $orderId = $body['orderId'] ?? ($body['latestOrderId'] ?? $purchaseToken);

        if ($existing = Payment::where('payment_reference', $this->reference('G', $orderId))->first()) {
            return $this->successResponse($existing, 'Payment already verified.');
        }

        return $this->provision('google', $data, $orderId, $body);
    }

    /* ──────────── shared verification helpers ──────────── */

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'receipt'        => 'required|string',
            'productId'      => 'required|string',
            'transactionId'  => 'nullable|string',
            'paymentType'    => 'required|string|in:event_ticket_category',
            'itemId'         => 'required',
            'currency'       => 'required|string',
            'billingCycle'   => 'nullable|string',
            'formData'       => 'nullable|array',
        ]);
    }

    private function reference(string $prefix, string $native): string
    {
        return "IAP_{$prefix}_" . substr(hash('sha256', $native), 0, 18);
    }

    private function googleAccessToken(): ?string
    {
        $json = config('services.google_iap.service_account_json');
        if (!$json && ($b64 = config('services.google_iap.service_account_json_b64'))) {
            $json = base64_decode($b64);
        }
        if (!$json) return null;

        $key = is_string($json) && str_starts_with(trim($json), '{') ? json_decode($json, true) : null;
        if (!$key && is_string($json) && file_exists($json)) {
            $key = json_decode(file_get_contents($json), true);
        }
        if (!$key) return null;

        try {
            $creds = new ServiceAccountCredentials(
                ['https://www.googleapis.com/auth/androidpublisher'],
                $key
            );
            $token = $creds->fetchAuthToken();
            return $token['access_token'] ?? null;
        } catch (\Throwable $e) {
            Log::error('Google IAP token fetch failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /* ──────────── provisioning ──────────── */

    private function provision(string $platform, array $data, string $nativeTxId, array $gatewayResp): JsonResponse
    {
        $user = Auth::user();
        if (!$user) return response()->json(['error' => 'Unauthenticated.'], 401);

        $prefix = $platform === 'apple' ? 'A' : 'G';
        $reference = $this->reference($prefix, $nativeTxId);

        // Resolve charged amount from EventTicketCategory.
        $amount = $this->resolveAmount($data);

        $payment = Payment::create([
            'user_id'                  => $user->id,
            'type'                     => $data['paymentType'],
            'item_id'                  => $data['itemId'],
            'amount'                   => $amount,
            'currency'                 => strtoupper($data['currency']),
            'billing_cycle'            => $data['billingCycle'] ?? 'oneoff',
            'payment_reference'        => $reference,
            'payment_gateway_response' => json_encode([
                'platform'       => $platform,
                'product_id'     => $data['productId'],
                'transaction_id' => $nativeTxId,
                'gateway'        => $gatewayResp,
            ]),
            'status'  => 'paid',
            'paid_at' => now(),
        ]);

        $paymentCtrl = app(PaymentController::class);

        $event = $paymentCtrl->createEventEnrollment($payment, $user);
        $this->sendReceipt($payment, $user);
        return response()->json($paymentCtrl->withExternalRegistration([
            'status'    => 'success',
            'message'   => 'Payment verified.',
            'reference' => $reference,
        ], $event, $user));
    }

    private function resolveAmount(array $data): float
    {
        $tc = \App\Models\EventTicketCategory::find($data['itemId']);
        return (float) ($tc?->price ?? 0);
    }

    private function sendReceipt(Payment $payment, User $user): void
    {
        try {
            Mail::to($user->email)->send(new PaymentReceiptMail($payment, $user));
        } catch (\Throwable $e) {
            Log::error('IAP receipt email failed', ['error' => $e->getMessage(), 'reference' => $payment->payment_reference]);
        }
    }

    private function successResponse(Payment $payment, string $message): JsonResponse
    {
        return response()->json([
            'status'    => 'success',
            'message'   => $message,
            'reference' => $payment->payment_reference,
        ]);
    }
}

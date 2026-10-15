<?php

namespace App\Http\Controllers;

use App\Models\RingLinkedAccount;
use App\Services\RingCredentialResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * One-Way Account Linking (Ring-driven), per the full spec at
 * developer.amazon.com/docs/ring/api-documentation.html
 * #6-account-linking-flow-one-way-account-linking:
 *
 *   1. User approves the app in Ring AppStore. Ring Backend generates an
 *      OAuth authorization code and POSTs it to our Token Exchange URL
 *      (backend-to-backend). Exact POST shape is undocumented publicly —
 *      tokenExchange() logs the raw payload on top of best-effort parsing.
 *   2. We exchange that code at oauth.ring.com/oauth/token (no PKCE — PKCE
 *      is Partner-Initiated-OAuth-only) for an access+refresh token pair.
 *      This token is "unclaimed" — we know it belongs to *some* Ring user,
 *      but not which of our own users. We call GET /v1/users/me with it to
 *      learn the Ring account_id, then store the pair as unclaimed, keyed
 *      by that account_id.
 *   3. Ring later redirects the browser to our Account Link URL with
 *      ?nonce=...&time=.... We show a MANDATORY sign-in form (never
 *      auto-verify before login — this is what proves which of our users is
 *      doing the linking).
 *   4. After sign-in, we recompute HMAC-SHA256(K_hmac, "{time}:{account_id}")
 *      for every unclaimed token until one matches the given nonce
 *      (constant-time compare). That's the token this user is claiming.
 *   5. POST then PATCH to Ring's App Integrations API, using the matched
 *      token as the Bearer (not our client_secret — that was wrong in an
 *      earlier draft of this file). The matched token pair is then persisted
 *      to ring_linked_accounts (see RingLinkedAccount) — durable storage, not
 *      cache, so a corporate user's own device keeps working across cache
 *      flushes/restarts. Only the *unclaimed* tokens (step 2, not yet tied to
 *      an Eventry user) stay cache-only — that's genuinely transient state.
 *
 * Multi-tenant credentials: a corporate who registered their own Ring
 * Developer app (RingOwnerCredential, see RingCredentialResolver) gets their
 * own Token Exchange / Account Link URLs — {these routes}/{ownerId} — which
 * they register in *their* Ring console instead of Eventry's shared one.
 * $ownerId is null for the shared/legacy URLs (no path segment), which keep
 * using the global RING_CLIENT_ID/SECRET/HMAC_SECRET env values.
 */
class RingOAuthController extends Controller
{
    private const TOKEN_URL = 'https://oauth.ring.com/oauth/token';
    private const USERS_ME_URL = 'https://api.amazonvision.com/v1/users/me';
    private const APP_INTEGRATIONS_URL = 'https://api.amazonvision.com/v1/accounts/me/app-integrations';
    private const NONCE_VALIDATION_WINDOW_SECONDS = 600;

    public function __construct(private readonly RingCredentialResolver $credentials)
    {
    }

    private function unclaimedTokensCacheKey(?int $ownerId): string
    {
        return 'ring:unclaimed_tokens:' . ($ownerId ?? 'global');
    }

    /**
     * Token Exchange URL. Ring POSTs an authorization code here
     * backend-to-backend. Field name for the code is unconfirmed — we try
     * the common candidates and log the raw body either way so the real
     * shape can be read from storage/logs/laravel.log on first live call.
     */
    public function tokenExchange(Request $request, ?int $ownerId = null)
    {
        Log::info('Ring token exchange — raw payload', [
            'owner_id' => $ownerId,
            'headers' => $request->headers->all(),
            'body' => $request->all(),
        ]);

        $code = $request->input('code')
            ?? $request->input('authorization_code')
            ?? $request->input('auth_code');

        if (!$code) {
            Log::warning('Ring token exchange: no recognizable code field — inspect laravel.log and adjust tokenExchange()');
            return response()->json(['status' => 'received'], 200);
        }

        $creds = $this->credentials->forOwner($ownerId);

        $tokenResponse = Http::asForm()->post(self::TOKEN_URL, [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'client_id' => $creds['client_id'],
            'client_secret' => $creds['client_secret'],
        ]);

        if (!$tokenResponse->successful()) {
            Log::error('Ring token exchange failed at oauth.ring.com', [
                'status' => $tokenResponse->status(),
                'body' => $tokenResponse->body(),
            ]);
            return response()->json(['status' => 'exchange_failed'], 200);
        }

        $tokens = $tokenResponse->json();

        $profileResponse = Http::withToken($tokens['access_token'])->get(self::USERS_ME_URL);

        if (!$profileResponse->successful()) {
            Log::error('Ring users/me lookup failed', [
                'status' => $profileResponse->status(),
                'body' => $profileResponse->body(),
            ]);
            return response()->json(['status' => 'profile_lookup_failed'], 200);
        }

        $accountId = $profileResponse->json('data.id');

        if (!$accountId) {
            Log::error('Ring users/me response missing data.id', ['body' => $profileResponse->json()]);
            return response()->json(['status' => 'profile_lookup_failed'], 200);
        }

        $cacheKey = $this->unclaimedTokensCacheKey($ownerId);
        $unclaimed = cache()->get($cacheKey, []);
        $unclaimed[$accountId] = [
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
            'expires_at' => now()->addSeconds($tokens['expires_in'])->toIso8601String(),
        ];
        cache()->put($cacheKey, $unclaimed, now()->addDays(7));

        return response()->json(['status' => 'received'], 200);
    }

    /**
     * Account Link URL. GET ?nonce=...&time=...
     * Must show a real sign-in form — nonce matching only runs after login.
     */
    public function linkPage(Request $request, ?int $ownerId = null)
    {
        $validated = $request->validate([
            'nonce' => 'required|string',
            'time' => 'required',
        ]);

        $ageSeconds = (now()->getTimestampMs() - (int) $validated['time']) / 1000;

        if ($ageSeconds > self::NONCE_VALIDATION_WINDOW_SECONDS || $ageSeconds < 0) {
            return response('<h1>Link expired</h1><p>Please restart account linking from the Ring app.</p>', 400)
                ->header('Content-Type', 'text/html');
        }

        $nonce = e($validated['nonce']);
        $time = e($validated['time']);
        $csrf = e($request->session()->token());
        $error = $request->session()->pull('ring_link_error');
        $errorHtml = $error ? '<p style="color:red">' . e($error) . '</p>' : '';
        $confirmAction = '/api/ring/link/confirm' . ($ownerId ? "/{$ownerId}" : '');

        return response(<<<HTML
            <h1>Sign in to link your Ring account to Eventry</h1>
            {$errorHtml}
            <form method="POST" action="{$confirmAction}">
                <input type="hidden" name="nonce" value="{$nonce}">
                <input type="hidden" name="time" value="{$time}">
                <input type="hidden" name="_token" value="{$csrf}">
                <label>Email <input type="email" name="email" required></label><br>
                <label>Password <input type="password" name="password" required></label><br>
                <button type="submit">Sign in &amp; link</button>
            </form>
            HTML, 200)->header('Content-Type', 'text/html');
    }

    public function confirm(Request $request, ?int $ownerId = null)
    {
        $validated = $request->validate([
            'nonce' => 'required|string',
            'time' => 'required',
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt(['email' => $validated['email'], 'password' => $validated['password']])) {
            $request->session()->put('ring_link_error', 'Invalid credentials');
            $connectPath = '/api/ring/connect' . ($ownerId ? "/{$ownerId}" : '');
            return redirect($connectPath . '?nonce=' . urlencode($validated['nonce']) . '&time=' . urlencode($validated['time']));
        }

        $user = Auth::user();
        $hmacKey = $this->credentials->forOwner($ownerId)['hmac_secret'];
        $cacheKey = $this->unclaimedTokensCacheKey($ownerId);
        $unclaimed = cache()->get($cacheKey, []);

        $matchedAccountId = null;
        $matchedToken = null;

        foreach ($unclaimed as $accountId => $tokenData) {
            $computed = rtrim(strtr(
                base64_encode(hash_hmac('sha256', "{$validated['time']}:{$accountId}", $hmacKey, true)),
                '+/',
                '-_'
            ), '=');

            if (hash_equals($computed, $validated['nonce'])) {
                $matchedAccountId = $accountId;
                $matchedToken = $tokenData;
                break;
            }
        }

        if (!$matchedToken) {
            Log::warning('Ring account link: no unclaimed token matched nonce', ['email' => $user->email]);
            return response('<h1>Linking failed</h1><p>No matching Ring link request found. Restart from the Ring app.</p>', 400)
                ->header('Content-Type', 'text/html');
        }

        $accessToken = $matchedToken['access_token'];
        $maskedEmail = $this->maskEmail($user->email);

        $postResponse = Http::withToken($accessToken)->post(self::APP_INTEGRATIONS_URL, [
            'account_identifier' => $maskedEmail,
            'nonce' => $validated['nonce'],
        ]);

        if (!$postResponse->successful()) {
            Log::error('Ring app-integrations POST failed', ['status' => $postResponse->status(), 'body' => $postResponse->body()]);
            return response('<h1>Linking failed</h1><p>Ring rejected this link request.</p>', 400)
                ->header('Content-Type', 'text/html');
        }

        $patchResponse = Http::withToken($accessToken)->patch(self::APP_INTEGRATIONS_URL, [
            'status' => 'completed',
        ]);

        if (!$patchResponse->successful()) {
            Log::error('Ring app-integrations PATCH failed', ['status' => $patchResponse->status(), 'body' => $patchResponse->body()]);
            return response('<h1>Linking failed</h1><p>Could not finalize linking with Ring.</p>', 502)
                ->header('Content-Type', 'text/html');
        }

        unset($unclaimed[$matchedAccountId]);
        cache()->put($cacheKey, $unclaimed, now()->addDays(7));

        RingLinkedAccount::updateOrCreate(
            ['user_id' => $user->id],
            [
                'ring_account_id' => $matchedAccountId,
                'access_token' => $accessToken,
                'refresh_token' => $matchedToken['refresh_token'],
                'expires_at' => $matchedToken['expires_at'],
            ]
        );

        return response('<h1>Ring account linked</h1><p>You can close this tab.</p>', 200)
            ->header('Content-Type', 'text/html');
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);
        $masked = strlen($local) <= 2 ? $local[0] . '***' : $local[0] . '***' . $local[-1];
        return "{$masked}@{$domain}";
    }
}

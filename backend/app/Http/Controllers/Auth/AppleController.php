<?php

namespace App\Http\Controllers\Auth;

use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Firebase\JWT\JWT;
use Firebase\JWT\JWK;

/**
 * Sign in with Apple (§4.8). Not a Socialite driver, by design:
 *
 *  - Apple's "client_secret" is a self-signed ES256 JWT (iss=team id,
 *    sub=services id, signed with a .p8 private key), not a static string.
 *  - Apple's authorize endpoint must use response_mode=form_post whenever the
 *    `name`/`email` scopes are requested, which means Apple's server POSTs
 *    code+state (and, on first authorization only, a `user` JSON blob)
 *    directly to redirect_uri as a top-level browser navigation — it cannot
 *    be a frontend route the way Google/Microsoft/LinkedIn's GET-redirect-
 *    with-code-in-querystring callback is. redirect_uri therefore points
 *    here (a backend route), and this controller hands the browser back to
 *    the SPA via the existing one-time handoff-token mechanism
 *    (AuthController::createHandoffToken / exchangeHandoffToken) instead of
 *    returning JSON like the other providers' callbacks do.
 */
class AppleController extends Controller
{
    public function redirectToApple(Request $request)
    {
        $flow = $request->query('flow', 'login');
        $statePayload = base64_encode(json_encode(['flow' => $flow]));

        $query = http_build_query([
            'response_type' => 'code',
            'response_mode' => 'form_post',
            'client_id'     => config('services.apple.services_id'),
            'redirect_uri'  => config('services.apple.redirect'),
            'scope'         => 'name email',
            'state'         => $statePayload,
        ]);

        return response()->json(['url' => "https://appleid.apple.com/auth/authorize?{$query}"]);
    }

    public function handleAppleCallback(Request $request)
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', config('app.url')), '/');
        if (str_contains($frontendUrl, ',')) {
            $frontendUrl = trim(explode(',', $frontendUrl)[0]);
        }

        try {
            $flow = 'login';
            if ($request->has('state')) {
                $decoded = json_decode(base64_decode($request->input('state')), true);
                $flow = $decoded['flow'] ?? 'login';
            }

            $code = $request->input('code');
            if (!$code) {
                throw new \RuntimeException('Missing authorization code from Apple.');
            }

            $now = time();
            $clientSecret = JWT::encode([
                'iss' => config('services.apple.team_id'),
                'iat' => $now,
                'exp' => $now + 300,
                'aud' => 'https://appleid.apple.com',
                'sub' => config('services.apple.services_id'),
            ], str_replace('\n', "\n", config('services.apple.private_key')), 'ES256', config('services.apple.key_id'));

            $tokenResponse = Http::asForm()->post('https://appleid.apple.com/auth/token', [
                'client_id'     => config('services.apple.services_id'),
                'client_secret' => $clientSecret,
                'code'          => $code,
                'grant_type'    => 'authorization_code',
                'redirect_uri'  => config('services.apple.redirect'),
            ]);

            if ($tokenResponse->failed() || !$tokenResponse->json('id_token')) {
                Log::error('Apple token exchange failed', ['body' => $tokenResponse->body()]);
                throw new \RuntimeException('Failed to fetch user from Apple');
            }

            $jwks = Http::get('https://appleid.apple.com/auth/keys')->json();
            $claims = JWT::decode($tokenResponse->json('id_token'), JWK::parseKeySet($jwks));

            $email = $claims->email ?? null;
            if (!$email) {
                throw new \RuntimeException('Apple did not return an email address.');
            }

            // Apple only sends the name on the very first authorization.
            $appleName = null;
            if ($request->filled('user')) {
                $userPayload = json_decode($request->input('user'), true);
                if (isset($userPayload['name'])) {
                    $appleName = trim(($userPayload['name']['firstName'] ?? '') . ' ' . ($userPayload['name']['lastName'] ?? ''));
                }
            }

            $user = User::where('email', $email)->first();

            if (!$user && $flow === 'login') {
                $user = User::where('secondary_email', $email)
                    ->where('role', 'user')
                    ->whereNotNull('secondary_email_verified_at')
                    ->first();
            }

            if (!$user) {
                if ($flow === 'login') {
                    return redirect()->away("{$frontendUrl}/login?sso_error=" . urlencode('Invalid credentials'));
                }

                $conflict = User::where('secondary_email', $email)
                    ->orWhere('secondary_email_pending', $email)
                    ->exists();
                if ($conflict) {
                    return redirect()->away("{$frontendUrl}/login?sso_error=" . urlencode('This email is already associated with another account.'));
                }

                $user = User::create([
                    'name'              => $appleName ?: explode('@', $email)[0],
                    'email'             => $email,
                    'role'              => 'user',
                    'password'          => Hash::make(Str::random(24)),
                    'email_verified_at' => now(),
                ]);
            }

            Auth::login($user);

            $handoffToken = Str::random(64);
            Cache::put('handoff:' . $handoffToken, [
                'user_id'   => $user->id,
                'user_type' => $user->role,
            ], now()->addMinutes(5));

            return redirect()->away("{$frontendUrl}/auth/handoff?token={$handoffToken}&redirect=/{$user->role}/dashboard");
        } catch (\Throwable $e) {
            Log::error('Apple login failed', ['error' => $e->getMessage()]);
            return redirect()->away("{$frontendUrl}/login?sso_error=" . urlencode('Apple sign-in failed. Please try again.'));
        }
    }
}

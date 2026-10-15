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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use App\Support\TokenCookie;
use Laravel\Socialite\Facades\Socialite;

class LinkedinController extends Controller
{
    /**
     * Redirect to Linkedin for authentication
     */
    public function redirectToLinkedin(Request $request)
    {
        $flow  = $request->query('flow', 'login');
        $nonce = $request->query('nonce'); // optional nonce for mobile import polling
        // Pack the flow (and optional nonce) into state so it round-trips securely
        $statePayload = base64_encode(json_encode(array_filter(['flow' => $flow, 'nonce' => $nonce])));
        //Log::info('LinkedIn OAuth flow: ' . $flow);
        $driver = Socialite::driver('linkedin-openid')
            ->stateless()
            ->with(['state' => $statePayload]); // pass flow along

        // Override the default scopes completely
        $driver->setScopes(['openid', 'profile', 'email']);

        $redirectUrl = $driver->redirect()->getTargetUrl();
        //Log::info('LinkedIn redirect URL: ' . $redirectUrl);
        return response()->json(['url' => $redirectUrl]);
    }

    /**
     * Handle Linkedin OAuth callback
     */
    public function handleLinkedinCallback(Request $request)
    {
        //log::info('request array:', $request->all());
        try {
            // decode flow from state 
            if ($request->has('state')) {
                $decoded = json_decode(base64_decode($request->input('state')), true);
                $flow = $decoded['flow'] ?? 'login';
            }
            //Log::info('LinkedIn OAuth flow: ' . $flow);

            $linkedinUser = Socialite::driver('linkedin-openid')->stateless()->user();
            //log user object
            //Log::info('LinkedIn user data:', (array) $linkedinUser);

            if (!$linkedinUser) {
                return response()->json([
                    'message' => 'Failed to fetch user from LinkedIn',
                    'status' => 401,
                ], 401);
            }

            if (!$linkedinUser['email'] || empty($linkedinUser['email'])) {
                return response()->json([
                    'message' => 'Linkedin account not retrieved. Please use another login method.',
                    'status' => 401,
                ], 401);
            }

            // ── Import flow: cache profile + return HTML close page ──────────
            if (($flow ?? '') === 'import') {
                $firstName = $linkedinUser->user['given_name']  ?? '';
                $lastName  = $linkedinUser->user['family_name'] ?? '';
                $fullName  = trim("$firstName $lastName") ?: $linkedinUser->getName();

                $rawAvatar   = $linkedinUser->getAvatar() ?? '';
                $storedAvatar = $rawAvatar ? $this->storeLinkedinAvatar($rawAvatar) : '';

                $profile = [
                    'flow'              => 'import',
                    'name'              => $fullName,
                    'email'             => $linkedinUser['email'],
                    'profile_image_url' => $storedAvatar ?: $rawAvatar,
                    'title'             => '',
                    'company'           => '',
                    'bio'               => '',
                    'website'           => '',
                    'socials'           => [
                        // getNickname() returns the OpenID sub (numeric ID) — vanity URL is not
                        // available via openid/profile/email scopes, so this is the best fallback.
                        'linkedin'  => $linkedinUser->getNickname()
                            ? 'https://www.linkedin.com/in/' . $linkedinUser->getNickname()
                            : '',
                        'twitter'   => '',
                        'instagram' => '',
                    ],
                ];

                // Cache by nonce so mobile in-app browser can poll for the result
                $nonce = $decoded['nonce'] ?? null;
                if ($nonce) {
                    Cache::put("linkedin_import_{$nonce}", $profile, 300); // 5 min TTL
                }

                // Return JSON — the frontend LinkedinCallbackHandler posts this to the
                // opener via postMessage and closes the popup/in-app browser window
                return response()->json($profile);
            }

            //Log::info('LinkedIn user data:', (array) $linkedinUser);
            $email = $linkedinUser['email'];

            // Find user by primary email
            $user = User::where('email', $email)->first();

            // Fallback: check verified secondary_email (login only)
            if (!$user && $flow === 'login') {
                $user = User::where('secondary_email', $email)
                    ->where('role', 'user')
                    ->whereNotNull('secondary_email_verified_at')
                    ->first();
            }

            // Register if user does not exist and from register flow
            if (!$user) {
                if ($flow === 'login') {
                    return response()->json([
                        'message' => 'Invalid credentials',
                        'status' => 401,
                    ], 401);
                } elseif ($flow === 'register') {
                    // Block if email is already used as a secondary/pending email
                    $conflict = User::where('secondary_email', $email)
                        ->orWhere('secondary_email_pending', $email)
                        ->exists();
                    if ($conflict) {
                        return response()->json([
                            'message' => 'This email is already associated with another account.',
                            'status' => 422,
                        ], 422);
                    }
                    $user = User::create([
                        'name' => $linkedinUser->getName() ?? $linkedinUser->getNickname(),
                        'email' => $email,
                        'role' => 'user',
                        'password' => Hash::make(Str::random(24)),
                        'email_verified_at' => now(),
                    ]);
                }
            }

            // Log in the user
            Auth::login($user);

            // Create token
            $tokenResult = $user->createToken('authToken');
            $plainToken = $tokenResult->plainTextToken;

            // Manually update expiry (30 minutes from now)
            $token = $tokenResult->accessToken;
            $token->expires_at = Carbon::now()->addMinutes((int) env('TOKEN_EXPIRY_MINUTES', 30)); // Use env variable or default to 30 minutes
            $token->save();

            //return token and usertype
            // SECURITY (F-12): HttpOnly cookie + body token.
            return response()->json([
                'token' => $plainToken,
                'user_type' => $user->role,
                'name' => $user->name,
                'status' => 200
            ], 200)->withCookie(TokenCookie::make($plainToken, $user->role));
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Linkedin login failed',
                'error' => $e->getMessage(),
                'status' => 500
            ], 500);
        }
    }

    /**
     * Fetch a LinkedIn avatar URL and store it in R2, returning the stored URL.
     * Falls back to null on any failure so the caller can use the original URL.
     */
    private function storeLinkedinAvatar(string $url): ?string
    {
        try {
            $response = Http::timeout(10)->get($url);
            if (!$response->successful()) return null;

            $filename = 'linkedin_' . time() . '_' . Str::uuid() . '.jpg';
            Storage::disk('r2')->put('card/' . $filename, $response->body());
            return Storage::disk('r2')->url('card/' . $filename);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Poll endpoint — mobile in-app browser polls this until the OAuth callback
     * caches the profile, then the app closes the browser and loads the data.
     */
    public function importResult(Request $request)
    {
        $nonce = $request->query('nonce');
        if (!$nonce) {
            return response()->json(['message' => 'Missing nonce'], 400);
        }

        $profile = Cache::get("linkedin_import_{$nonce}");
        if (!$profile) {
            return response()->json(['message' => 'Pending'], 202);
        }

        Cache::forget("linkedin_import_{$nonce}");
        return response()->json($profile);
    }
}

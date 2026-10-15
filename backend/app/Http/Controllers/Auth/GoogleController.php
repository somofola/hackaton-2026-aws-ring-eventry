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
use Laravel\Socialite\Facades\Socialite;
use App\Support\TokenCookie;

class GoogleController extends Controller
{
    /**
     * Redirect to Google for authentication
     */
    public function redirectToGoogle(Request $request)
    {
        $flow = $request->query('flow', 'login'); // default = login 
        // Pack the flow into state so it round-trips securely
        $statePayload = base64_encode(json_encode(['flow' => $flow]));

        $redirectUrl = Socialite::driver('google')->stateless()->with(['state' => $statePayload])->redirect()->getTargetUrl();
        //Log::info('Google redirect URL: ' . $redirectUrl);
        return response()->json(['url' => $redirectUrl]);
    }

    /**
     * Handle Google OAuth callback
     */
    public function handleGoogleCallback(Request $request)
    {
        //log::info('request array:', $request->all());

        try {
            // decode flow from state 
            if ($request->has('state')) {
                $decoded = json_decode(base64_decode($request->input('state')), true);
                $flow = $decoded['flow'] ?? 'login';
            }
            //Log::info('LinkedIn OAuth flow: ' . $flow);

            // Pass the code + redirect URI to Socialite
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->user();

            if (!$googleUser) {
                return response()->json([
                    'message' => 'Failed to fetch user from Google',
                    'status' => 401,
                ], 401);
            }

            $ssoEmail = $googleUser->getEmail();

            // Check if user already exists by primary email
            $user = User::where('email', $ssoEmail)->first();

            // Fallback: check verified secondary_email (login only)
            if (!$user && $flow === 'login') {
                $user = User::where('secondary_email', $ssoEmail)
                    ->where('role', 'user')
                    ->whereNotNull('secondary_email_verified_at')
                    ->first();
            }

            // If still not found, handle register vs login
            if (!$user) {
                if ($flow === 'login') {
                    return response()->json([
                        'message' => 'Invalid credentials',
                        'status' => 401,
                    ], 401);
                } elseif ($flow === 'register') {
                    // Block if email is already used as a secondary/pending email
                    $conflict = User::where('secondary_email', $ssoEmail)
                        ->orWhere('secondary_email_pending', $ssoEmail)
                        ->exists();
                    if ($conflict) {
                        return response()->json([
                            'message' => 'This email is already associated with another account.',
                            'status' => 422,
                        ], 422);
                    }
                    $user = User::create([
                        'name' => $googleUser->getName() ?? $googleUser->getNickname(),
                        'email' => $ssoEmail,
                        'role' => 'user',
                        'password' => Hash::make(Str::random(24)),
                        'email_verified_at' => now(),
                    ]);
                }
            }

            // Log in the user
            Auth::login($user);

            // Generate token
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
                'message' => 'Google  login failed.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

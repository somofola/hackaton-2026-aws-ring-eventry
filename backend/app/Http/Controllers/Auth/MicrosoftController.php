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

class MicrosoftController extends Controller
{
    /**
     * Redirect to Microsoft for authentication
     */
    public function redirectToMicrosoft(Request $request)
    {
        $flow = $request->query('flow', 'login'); // default = login 
        // Pack the flow into state so it round-trips securely
        $statePayload = base64_encode(json_encode(['flow' => $flow]));

        $redirectUrl = Socialite::driver('microsoft')->stateless()->with(['state' => $statePayload])->redirect()->getTargetUrl();
        //Log::info('Microsoft redirect URL: ' . $redirectUrl);
        return response()->json(['url' => $redirectUrl]);
    }

    /**
     * Handle Microsoft OAuth callback
     */
    public function handleMicrosoftCallback(Request $request)
    {
        //log::info('request array:', $request->all());

        try {
            // decode flow from state 
            if ($request->has('state')) {
                $decoded = json_decode(base64_decode($request->input('state')), true);
                $flow = $decoded['flow'] ?? 'login';
            }
            //Log::info('LinkedIn OAuth flow: ' . $flow);

            $microsoftUser = Socialite::driver('microsoft')->stateless()->scopes(['User.Read'])->user();

            if (!$microsoftUser) {
                return response()->json([
                    'message' => 'Failed to fetch user from Google',
                    'status' => 401,
                ], 401);
            }

            $email = $microsoftUser->getEmail(); //INTEPRET EMAILS FROM MS

            // Fix EXT guest emails if needed
            if (strpos($email, '#') !== false) {
                // Take everything before #EXT#
                $base = explode('#EXT#', $email)[0];

                // Replace last underscore with @
                $pos = strrpos($base, '_');
                if ($pos !== false) {
                    $email = substr($base, 0, $pos) . '@' . substr($base, $pos + 1);
                } else {
                    $email = $base;
                }
            }

            // Find user by primary email
            $user = User::where('email', $email)->first();

            // Fallback: check verified secondary_email (login only)
            if (!$user && $flow === 'login') {
                $user = User::where('secondary_email', $email)
                    ->where('role', 'user')
                    ->whereNotNull('secondary_email_verified_at')
                    ->first();
            }

            // Register if user does not exist
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
                        'name' => $microsoftUser->getName() ?? $microsoftUser->getNickname(),
                        'email' => $email,
                        'role' => 'user',
                        'password' => Hash::make(Str::random(24)),
                        'email_verified_at' => now(),
                    ]);
                }
            }

            // SECURITY: role column is nullable at DB level (legacy/migrated rows);
            // never let a null role reach TokenCookie/response. Flag it — a null
            // role on an existing account means data needs backfilling.
            if (!$user->role) {
                Log::warning('SSO login: user has null role', ['user_id' => $user->id, 'provider' => 'microsoft']);
                $user->role = 'user';
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
                'message' => 'Microsoft login failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

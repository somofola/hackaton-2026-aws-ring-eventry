<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\TransientToken;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\PasswordResetMail;
use App\Support\TokenCookie;

class AuthController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/departments",
     *     tags={"Departments"},
     *     summary="Get list of departments",
     *     description="Returns all departments",
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation"
     *     )
     * )
     */
    /**
     * @OA\Post(
     *   path="/api/register",
     *  tags={"Auth"},
     *  summary="Register a new user",
     * *  description="Creates a new user and returns the user object",
     * *  @OA\RequestBody(
     *   required=true,
     *  *   @OA\JsonContent(
     *     required={"name", "email", "password"},
     *    @OA\Property(property="name", type="string"),
     *  @OA\Property(property="email", type="string", format="email"),
     *   @OA\Property(property="password", type="string", format="password")
     *   )
     *  ),
     * *  @OA\Response(
     *   response=201,
     *  *  description="User created successfully",
     * *  @OA\JsonContent(
     *   @OA\Property(property="id", type="integer"),
     *  @OA\Property(property="name", type="string"),
     *      @OA\Property(property="email", type="string", format="email"),
     *  @OA\Property(property="created_at", type="string", format="date-time"),
     * *  @OA\Property(property="updated_at", type="string", format="date-time")
     *  )
     *  *  ),
     * *  @OA\Response(
     *  response=422,
     * *  description="Validation error",
     *  *  @OA\JsonContent(
     *   @OA\Property(property="message", type="string"),
     *  *  @OA\Property(property="errors", type="object"),
     * *  @OA\Property(property="status", type="integer")
     * *  )
     *  )
     * *  )
     *  */

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email|unique:users,secondary_email|unique:users,secondary_email_pending',
            'password' => 'required|min:8',
            //'password_confirmation' => 'required_with:password|same:password|min:8',
            // SECURITY (F-03/F-11): user_type retained for legacy callers but ignored
            // — see forceFill below. Public registration is always role=user.
            'user_type' => 'sometimes|in:user',
            'card_uuid' => 'nullable|string',
        ]);

        // Block re-registration while a deletion-archive snapshot still exists for
        // this email (ACCOUNT_ARCHIVE_RETENTION_DAYS window) — prevents wiping a
        // fraud/legal trail via delete-then-reregister. Generic message: no
        // enumeration of deletion status.
        $archived = \App\Models\AccountDeletionArchive::where('email', $validated['email'])
            ->where('purge_at', '>', now())
            ->exists();
        if ($archived) {
            return response()->json([
                'message' => 'This email can\'t be used to register right now.',
                'status' => 422,
            ], 422);
        }

        // Block re-registration while a deletion-archive snapshot still exists for
        // this email (ACCOUNT_ARCHIVE_RETENTION_DAYS window) — closes the
        // delete-then-reregister loophole around fraud/legal lookups. Generic
        // message: don't leak that this email was previously deleted.
        $archived = \App\Models\AccountDeletionArchive::where('email', $validated['email'])
            ->where('purge_at', '>', now())
            ->exists();
        if ($archived) {
            return response()->json([
                'message' => 'This email can\'t be used to register right now.',
                'status' => 422,
            ], 422);
        }

        // SECURITY (F-03): Public registration is always role=user. Corporate/team
        // accounts must be created via authenticated invite/payment flows.
        $user = new User();
        $user->forceFill([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role'     => 'user',
        ])->save();

        // Log card view referral if registration was triggered from a card page
        if (!empty($validated['card_uuid'])) {
            $card = \App\Models\Card::where('uuid', $validated['card_uuid'])->first();
            if ($card) {
                \App\Models\CardScan::create([
                    'card_id'    => $card->id,
                    'ip'         => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'scanned_by' => $user->id,
                    'scanned_at' => now(),
                ]);
            }
        }

        event(new Registered($user)); // triggers email verification

        return response()->json([
            'message' => 'Registration successful. Please check your email to verify your account.',
            'status' => 'success',
        ], 200);
    }


    public function login(Request $request)
    {
        try {
            $credentials = $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
                'status' => 422,
            ], 422);
        }

        // Try primary email first
        $user = null;
        if (Auth::attempt($credentials)) {
            $user = Auth::user();
        } else {
            // Try secondary_email for role=user accounts
            $bySecondary = \App\Models\User::where('secondary_email', $credentials['email'])
                ->where('role', 'user')
                ->whereNotNull('secondary_email_verified_at')
                ->first();

            if ($bySecondary && Hash::check($credentials['password'], $bySecondary->password)) {
                Auth::login($bySecondary);
                $user = $bySecondary;
            }
        }

        if ($user) {
            // ✅ Check if email is verified
            if (is_null($user->email_verified_at)) {
                Auth::logout();

                return response()->json([
                    'message' => 'Please verify your email address before logging in.',
                    'status' => 403,
                ], 403);
            }

            // Logging back in during the deletion grace window cancels the
            // pending self-service deletion (see AuthController::deleteAccount).
            $deletionCancelled = false;
            if ($user->deletion_requested_at) {
                $user->forceFill([
                    'deletion_requested_at' => null,
                    'scheduled_purge_at'    => null,
                ])->save();
                $deletionCancelled = true;
            }

            // Create token
            $tokenResult = $user->createToken('authToken');
            $plainToken = $tokenResult->plainTextToken;

            // Manually update expiry
            $token = $tokenResult->accessToken;
            $token->expires_at = Carbon::now()->addMinutes((int) env('TOKEN_EXPIRY_MINUTES', 30));
            $token->save();

            // SECURITY (F-12): Set HttpOnly cookie alongside body token.
            return response()->json([
                'token'                 => $plainToken,
                'user_type'             => $user->role,
                'id'                    => $user->id,
                'email'                 => $user->email,
                'name'                  => $user->name,
                'company'               => $user->company,
                'force_password_change' => (bool) $user->force_password_change,
                'deletion_cancelled'    => $deletionCancelled,
            ], 200)->withCookie(TokenCookie::make($plainToken, $user->role));
        }

        return response()->json([
            'message' => 'Invalid credentials',
            'status' => 401,
        ], 401);
    }

    public function appRegister(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email|unique:users,secondary_email|unique:users,secondary_email_pending',
            'password' => 'required|min:8',
            'app_id' => 'required|uuid',
            'pin' => 'required|numeric|digits:6',
        ]);

        // SECURITY (F-03): App registration always role=user.
        $user = new User();
        $user->forceFill([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'app_id'   => $validated['app_id'],
            'pin'      => Hash::make($validated['pin']),
            'role'     => 'user',
        ])->save();

        /*return response()->json([
            'token' => $plainToken,
            'user_type' => $user->role,
            $user
        ], 201);*/

        //No auto login
        //$request->merge(['email' => $validated['email'], 'password' => $validated['password']]);
        //return $this->login($request);

        event(new Registered($user)); // triggers email verification

        return response()->json([
            'message' => 'Registration successful. Please check your email to verify your account.',
            'status' => 'success',
        ], 200);

    }

    public function appEmailLogin(Request $request)
    {
        //Log::info('App Email Login request', $request->all());

        try {
            $credentials = $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);
        } catch (ValidationException $e) {
            //Log::error($e->getMessage(), ['exception' => $e]);

            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
                'status' => 422,
            ], 422);
        }

        $validated = $request->validate([
            'pin' => 'required|numeric|digits:6',
            'appId' => 'required|uuid'
        ]);

        $user = null;
        if (Auth::attempt($credentials)) {
            $user = Auth::user();
        } else {
            // Fallback: try verified secondary_email for role=user accounts
            $bySecondary = User::where('secondary_email', $credentials['email'])
                ->where('role', 'user')
                ->whereNotNull('secondary_email_verified_at')
                ->first();

            if ($bySecondary && Hash::check($credentials['password'], $bySecondary->password)) {
                Auth::login($bySecondary);
                $user = $bySecondary;
            }
        }

        if ($user) {
            if (is_null($user->email_verified_at)) {
                Auth::logout(); // Immediately log out unverified user

                return response()->json([
                    'message' => 'Please verify your email address before logging in.',
                    'status' => 403,
                ], 403);
            }

            // ✅ Save the posted app_id and pin (hashed)
            $user->app_id = $validated['appId'];
            $user->pin = Hash::make($validated['pin']);
            $user->save();

            // Create token
            $tokenResult = $user->createToken('authToken');
            $plainToken = $tokenResult->plainTextToken;

            // Manually update expiry (30 minutes from now)
            $token = $tokenResult->accessToken;
            $token->expires_at = Carbon::now()->addMinutes((int) env('TOKEN_EXPIRY_MINUTES', 30)); // Use env variable or default to 30 minutes
            $token->save();

            // SECURITY (F-12): cookie + body token (native reads body).
            return response()->json([
                'token'                 => $plainToken,
                'user_type'             => $user->role,
                'id'                    => $user->id,
                'email'                 => $user->email,
                'name'                  => $user->name,
                'company'               => $user->company,
                'force_password_change' => (bool) $user->force_password_change,
            ], 200)->withCookie(TokenCookie::make($plainToken, $user->role));
        }


        return response()->json([
            'message' => 'Invalid credentials',
            'status' => 401,
        ], 401);
    }

    public function appPinLogin(Request $request)
    {
        try {
            $credentials = $request->validate([
                'savedAppId' => 'required|uuid',
                'loginPin' => 'required|numeric|digits:6',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
                'status' => 422,
            ], 422);
        }

        // SECURITY (F-07): Per-app_id brute-force lockout.
        $lockKey = 'pinlock:' . $credentials['savedAppId'];
        $attempts = (int) Cache::get($lockKey, 0);
        $maxAttempts = 5;
        $lockoutSeconds = 900; // 15 min
        if ($attempts >= $maxAttempts) {
            return response()->json([
                'message' => 'Too many invalid attempts. Try again later.',
                'status'  => 429,
            ], 429);
        }

        // SECURITY (F-05): Null check BEFORE attribute access.
        $user = User::where('app_id', $credentials['savedAppId'])->first();
        if (!$user) {
            Cache::put($lockKey, $attempts + 1, $lockoutSeconds);
            return response()->json([
                'message' => 'Invalid credentials',
                'status'  => 401,
            ], 401);
        }

        if (is_null($user->email_verified_at)) {
            Auth::logout(); // Immediately log out unverified user

            return response()->json([
                'message' => 'Please verify your email address before logging in.',
                'status'  => 403,
            ], 403);
        }

        if ($user->pin && Hash::check($credentials['loginPin'], $user->pin)) {
            Cache::forget($lockKey);
            // Create token
            $tokenResult = $user->createToken('authToken');
            $plainToken = $tokenResult->plainTextToken;

            // Manually update expiry (30 minutes from now)
            $token = $tokenResult->accessToken;
            $token->expires_at = Carbon::now()->addMinutes((int) env('TOKEN_EXPIRY_MINUTES', 30)); // Use env variable or default to 30 minutes
            $token->save();

            // SECURITY (F-15): Minimal claims — never leak hashed pin or full record.
            // SECURITY (F-12): HttpOnly cookie set alongside body token.
            return response()->json([
                'token'     => $plainToken,
                'user_type' => $user->role,
                'id'        => $user->id,
                'name'      => $user->name,
                'email'     => $user->email,
            ], 201)->withCookie(TokenCookie::make($plainToken, $user->role));
        }

        // Increment failed-attempt counter on bad PIN.
        Cache::put($lockKey, $attempts + 1, $lockoutSeconds);

        return response()->json([
            'message' => 'Invalid credentials',
            'status' => 401,
        ], 401);
    }

    public function verifyEmail(Request $request)
    {
        // SECURITY (F-02): Predictable sha1(email) replaced with a per-user
        // random token issued by CustomVerifyEmail and stored hashed in cache
        // with 60-minute TTL. Constant-time compare; token consumed on use.
        $validated = $request->validate([
            'uid'   => 'required|uuid',
            'token' => 'required|string|min:32',
        ]);

        $user = User::where('uuid', $validated['uid'])->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired verification link.'], 400);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $cacheKey = \App\Notifications\CustomVerifyEmail::cacheKey($user->uuid);
        $expectedHash = \Illuminate\Support\Facades\Cache::get($cacheKey);

        if (!$expectedHash
            || !hash_equals($expectedHash, hash('sha256', $validated['token']))) {
            return response()->json(['message' => 'Invalid or expired verification link.'], 400);
        }

        // One-shot: pull the token so it cannot be replayed.
        \Illuminate\Support\Facades\Cache::forget($cacheKey);

        $user->markEmailAsVerified();
        event(new Verified($user));

        return response()->json(['status' => 'ok']);
    }

    /**
     * Self-service account deletion (App Store §5.1.1(v) / Play account-deletion policy).
     * Gated by password.confirmed middleware.
     *
     * SECURITY/LEGAL: does NOT hard-delete immediately. Marks the account for
     * purge in DELETION_GRACE_DAYS (default 60) and revokes access now. This
     * grace window covers: (a) accidental/coerced deletion recovery — logging
     * back in during the window cancels the request (see login()); (b) fraud/
     * chargeback disputes that surface after the fact; (c) legal holds — if
     * law enforcement serves a preservation request/subpoena before the purge
     * job runs, an operator sets `legal_hold` (see UserController::setLegalHold)
     * and the nightly purge command skips the account indefinitely.
     * Cascading FK ON DELETE CASCADE (Cards, QRCodes, ShortLinks, Enrollments,
     * Payments, Subscriptions, payout settings, affiliate records) fires only
     * when `users:purge-pending-deletions` actually deletes the row.
     */
    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        $blocked = $this->blockDeletionIfIneligible($user);
        if ($blocked) {
            return $blocked;
        }

        $graceDays = $this->scheduleAccountDeletion($user);

        if (Auth::guard('web')->check()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        $resp = response()->json([
            'message' => "Your account has been deactivated. Log back in within {$graceDays} days to cancel — otherwise it and all associated data will be permanently deleted.",
            'scheduled_purge_at' => $user->scheduled_purge_at,
        ], 200);
        foreach (TokenCookie::forgetAll() as $c) {
            $resp = $resp->withCookie($c);
        }
        return $resp;
    }

    /**
     * Returns a 422 JSON response if the account can't be deleted yet, null otherwise.
     */
    private function blockDeletionIfIneligible(User $user)
    {
        // 'corporate' role merged into 'admin' — an admin managing team members
        // (via User.corporate_id) still can't delete until those are reassigned.
        if (in_array($user->role, ['admin', 'super-admin']) && User::where('corporate_id', $user->id)->exists()) {
            return response()->json([
                'message' => 'Remove or transfer your team members before deleting this account.',
            ], 422);
        }

        if ($user->events()->exists()) {
            return response()->json([
                'message' => 'You still organize events. Cancel or transfer them before deleting your account.',
            ], 422);
        }

        return null;
    }

    /**
     * Shared deletion-scheduling logic used by both the in-app (Sanctum-authed)
     * flow and the web email-confirmation flow. Revokes tokens now, marks the
     * account for purge in DELETION_GRACE_DAYS. Returns the grace period used.
     */
    private function scheduleAccountDeletion(User $user): int
    {
        $graceDays = (int) env('DELETION_GRACE_DAYS', 60);

        DB::transaction(function () use ($user, $graceDays) {
            $user->tokens()->delete();
            Cache::forget(\App\Http\Middleware\RequirePasswordConfirmation::cacheKey($user->id));
            $user->forceFill([
                'deletion_requested_at' => now(),
                'scheduled_purge_at'    => now()->addDays($graceDays),
            ])->save();
        });

        return $graceDays;
    }

    /**
     * Public entry point for users without app access (web deletion-request page).
     * Sends a confirmation link to the account's email — proves the requester
     * controls that inbox before any deletion is scheduled. Always returns a
     * generic success message regardless of whether the email matches an
     * account, to avoid leaking account existence.
     */
    public function requestAccountDeletion(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if ($user) {
            $expiryHours = (int) env('ACCOUNT_DELETION_CONFIRM_HOURS', 24);
            $token = Str::random(64);

            \App\Models\AccountDeletionRequest::create([
                'email'      => $user->email,
                'token_hash' => hash('sha256', $token),
                'expires_at' => now()->addHours($expiryHours),
            ]);

            $confirmUrl = rtrim(config('app.frontend_url'), '/') . '/delete-account/confirm?token=' . $token;

            Mail::to($user->email)->queue(new \App\Mail\AccountDeletionConfirmMail($confirmUrl, $expiryHours));
        }

        return response()->json([
            'message' => 'If that email matches an account, a confirmation link has been sent.',
        ]);
    }

    /**
     * Confirms a deletion request via the emailed token, then schedules
     * deletion the same way the in-app flow does. Called by the frontend's
     * /delete-account/confirm page via API (not hit directly as a browser
     * link) — returns JSON so the page can render its own status UI.
     */
    public function confirmAccountDeletion(string $token)
    {
        $record = \App\Models\AccountDeletionRequest::where('token_hash', hash('sha256', $token))
            ->whereNull('used_at')
            ->where('expires_at', '>=', now())
            ->first();

        if (!$record) {
            return response()->json(['status' => 'invalid', 'message' => 'Invalid or expired confirmation link.'], 404);
        }

        $user = User::where('email', $record->email)->first();
        if (!$user) {
            $record->forceFill(['used_at' => now()])->save();
            return response()->json(['status' => 'invalid', 'message' => 'Invalid or expired confirmation link.'], 404);
        }

        $blocked = $this->blockDeletionIfIneligible($user);
        if ($blocked) {
            $record->forceFill(['used_at' => now()])->save();
            $blockedPayload = json_decode($blocked->getContent(), true);
            return response()->json([
                'status'  => 'blocked',
                'message' => $blockedPayload['message'] ?? 'Account can\'t be deleted right now.',
            ], 422);
        }

        $record->forceFill(['used_at' => now()])->save();
        $this->scheduleAccountDeletion($user);

        return response()->json(['status' => 'ok', 'message' => 'Account deletion confirmed and scheduled.']);
    }

    public function logout(Request $request)
    {
        // Revoke the current user's token
        //$request->user()->currentAccessToken()->delete();
        /*$request->session()->invalidate();
        $request->session()->regenerateToken();*/

        $user = $request->user();

        // Handle token-based logout (e.g., Postman, mobile app)
        $token = $user->currentAccessToken();
        if ($token && !($token instanceof TransientToken)) {
            $token->delete();
        }

        // Handle cookie-based logout (e.g., React SPA)
        if (Auth::guard('web')->check()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }


        // Drop sensitive-op re-auth window on logout.
        if ($user) {
            Cache::forget(\App\Http\Middleware\RequirePasswordConfirmation::cacheKey($user->id));
        }

        // SECURITY (F-12): Clear every role cookie on logout so a stale cookie
        // can't authenticate after the underlying token is revoked.
        $resp = response()->json([
            'message' => 'Logged out successfully',
            'status' => 200,
        ], 200);
        foreach (TokenCookie::forgetAll() as $c) {
            $resp = $resp->withCookie($c);
        }
        return $resp;
    }

    /**
     * SECURITY: Sensitive-op re-auth. User submits their current password;
     * we cache a confirm flag for 10 minutes so the password.confirmed
     * middleware lets subsequent sensitive requests through.
     */
    public function confirmPassword(Request $request)
    {
        $validated = $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();
        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Invalid password.'], 422);
        }

        Cache::put(
            \App\Http\Middleware\RequirePasswordConfirmation::cacheKey($user->id),
            true,
            \App\Http\Middleware\RequirePasswordConfirmation::TTL_SECONDS
        );

        return response()->json([
            'confirmed_for_seconds' => \App\Http\Middleware\RequirePasswordConfirmation::TTL_SECONDS,
        ]);
    }

    /**
     * Issue a one-time handoff token so the mobile app can transfer its
     * session to the web browser without the user logging in again.
     * Authenticated route — called by the mobile app.
     */
    public function createHandoffToken(Request $request)
    {
        $token = Str::random(64);

        Cache::put('handoff:' . $token, [
            'user_id'   => Auth::id(),
            'user_type' => Auth::user()->role,
        ], now()->addMinutes(5));

        return response()->json(['handoff_token' => $token]);
    }

    /**
     * Exchange a handoff token for a full Sanctum session.
    /** GET /auth/verify-email/resend/{id} */
    public function resendVerificationEmail($uuid)
    {
        $user = User::where('uuid', $uuid)->firstOrFail();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.'], 200);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification email resent.']);
    }

    /** POST /auth/forgot-password */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        // Always return success to avoid email enumeration
        if (!$user) {
            return response()->json(['message' => 'If an account exists for that email, a reset link has been sent.']);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($token), 'created_at' => now()]
        );

        $frontendUrl = rtrim(env('FRONTEND_URL', config('app.url')), '/');
        // If multiple origins, take the first
        if (str_contains($frontendUrl, ',')) {
            $frontendUrl = trim(explode(',', $frontendUrl)[0]);
        }
        $resetUrl = "{$frontendUrl}/password-recovery?token={$token}&email=" . urlencode($user->email);

        // SECURITY (F-08): Queue the mail so success/failure paths return in
        // constant time — synchronous SMTP send leaked existence by latency.
        try {
            Mail::to($user->email)->queue(new PasswordResetMail($user, $token, $resetUrl));
        } catch (\Exception $e) {
            Log::error('Failed to queue password reset email', ['error' => $e->getMessage()]);
        }

        return response()->json(['message' => 'If an account exists for that email, a reset link has been sent.']);
    }

    /** POST /auth/reset-password */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'                 => 'required|email',
            'token'                 => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json(['message' => 'Invalid or expired reset link.'], 422);
        }

        // Token expires after 60 minutes
        if (Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json(['message' => 'This reset link has expired. Please request a new one.'], 422);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->update(['password' => Hash::make($request->password)]);

        // Revoke all existing tokens for security
        $user->tokens()->delete();

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Password reset successfully. You can now log in.']);
    }

    /**
     * Public route — called by the web browser.
     */
    public function exchangeHandoffToken($token)
    {
        $data = Cache::pull('handoff:' . $token);

        if (!$data) {
            return response()->json(['message' => 'Invalid or expired token'], 401);
        }

        $user = User::findOrFail($data['user_id']);

        $tokenResult = $user->createToken('web-handoff');
        $plainToken  = $tokenResult->plainTextToken;
        $tokenResult->accessToken->expires_at = Carbon::now()->addMinutes((int) env('TOKEN_EXPIRY_MINUTES', 30));
        $tokenResult->accessToken->save();

        $nameParts = explode(' ', $user->name, 2);

        // SECURITY (F-12): handoff also seeds the role cookie for the browser.
        return response()->json([
            'token'      => $plainToken,
            'user_type'  => $user->role,
            'id'         => $user->id,
            'email'      => $user->email,
            'first_name' => $nameParts[0] ?? '',
            'last_name'  => $nameParts[1] ?? '',
            'company'    => $user->company,
            'is_verified' => !is_null($user->email_verified_at),
        ])->withCookie(TokenCookie::make($plainToken, $user->role));
    }
}

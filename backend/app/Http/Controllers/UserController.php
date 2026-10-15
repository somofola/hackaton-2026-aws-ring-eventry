<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use App\Mail\SecondaryEmailConfirmationMail;
use App\Mail\PasswordChangedMail;
use App\Mail\EmailChangeVerificationMail;
use App\Mail\EmailChangeNotificationMail;
use App\Services\PushNotificationService;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::query()
            ->when($request->role, fn($query) => $query->where('role', $request->role))
            ->when($request->search, fn($query) => 
                $query->where('name', 'like', "%{$request->search}%")
                      ->orWhere('email', 'like', "%{$request->search}%"))
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:user,team,admin,super-admin',
            'company' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        // Only admins can create other admins
        if (in_array($validated['role'], ['admin', 'super-admin'])) {
            $requester = $request->user();
            if (!$requester || !in_array($requester->role, ['admin', 'super-admin'])) {
                return response()->json(['message' => 'Only admins can create admin accounts.'], 403);
            }
        }

        $validated['password'] = Hash::make($validated['password']);

        // SECURITY (F-01): `role` is not in $fillable; assign via forceFill.
        $role = $validated['role'];
        unset($validated['role']);
        $user = new User();
        $user->fill($validated);
        $user->forceFill(['role' => $role])->save();

        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        return response()->json($user->load(['events', 'enrollments']));
    }

    public function update(Request $request, ?User $user = null)
    {
        // When called via admin apiResource (PUT /users/{user}), $user is the target.
        // When called via user profile route (PUT /user/profile), $user is null — use the authenticated user.
        if (!$user) {
            $user = $request->user();
        }

        if (!$user) {
            return response()->json(['message' => 'No authenticated user'], 401);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . ($user->id ?? 'null'),
            'password' => 'sometimes|string|min:8',
            'role' => 'sometimes|in:user,team,admin,super-admin',
            'company' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'gender' => 'nullable|in:male,female,non-binary,prefer_not_to_say',
            'profile_image_url' => 'nullable|url',
            'is_active' => 'boolean',
        ]);

        // SECURITY (F-01): Role mutation is admin-only AND only on a different
        // user — never self-mutate role. Strip role entirely otherwise.
        $requester = $request->user();
        $requesterIsAdmin = $requester && in_array($requester->role, ['admin', 'super-admin']);
        if (isset($validated['role'])) {
            if (!$requesterIsAdmin || $requester->id === $user->id) {
                unset($validated['role']);
            }
        }

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        // Handle email change — requires verification before activating
        $emailChangePending = false;
        if (isset($validated['email'])) {
            if ($validated['email'] !== $user->email) {
                $newEmail = $validated['email'];
                unset($validated['email']);

                $token  = bin2hex(random_bytes(32));
                // SECURITY (F-01): These fields are not in $fillable; assign
                // them directly so $user->update($validated) won't see them.
                $user->forceFill([
                    'email_pending'      => $newEmail,
                    'email_change_token' => hash('sha256', $token),
                ])->save();

                $frontendUrl     = rtrim(config('app.frontend_url'), '/');
                $confirmationUrl = $frontendUrl . '/confirm-email-change?token=' . $token;

                try {
                    Mail::to($newEmail)->send(new EmailChangeVerificationMail($user->name, $newEmail, $confirmationUrl));
                } catch (\Throwable $e) {
                    Log::error("EmailChangeVerificationMail failed for user {$user->id}: " . $e->getMessage());
                }
                try {
                    Mail::to($user->email)->send(new EmailChangeNotificationMail($user, $newEmail));
                } catch (\Throwable $e) {
                    Log::error("EmailChangeNotificationMail failed for user {$user->id}: " . $e->getMessage());
                }
                try {
                    app(PushNotificationService::class)->sendToUser(
                        $user,
                        'An email change was requested for your account. Check your inbox to confirm. If this wasn\'t you, secure your account immediately.',
                        'alerts'
                    );
                } catch (\Throwable $e) {
                    Log::error("Email change push notification failed for user {$user->id}: " . $e->getMessage());
                }

                $emailChangePending = true;
            } else {
                // Same email re-submitted — clear any pending change
                unset($validated['email']);
                $user->forceFill([
                    'email_pending'      => null,
                    'email_change_token' => null,
                ])->save();
            }
        }

        // Handle file upload
        try {
            if ($request->hasFile('profile_image_file') && $request->file('profile_image_file')->isValid()) {
                if ($user->profile_image_url) {
                    Storage::disk('public')->delete(str_replace('/storage/', '', $user->profile_image_url));
                }

                $extension = $request->file('profile_image_file')->getClientOriginalExtension();
                $filename  = time() . '_' . (string) Str::uuid() . '.' . $extension;

                $path = $request->file('profile_image_file')->storeAs('profile', $filename, 'r2');

                /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
                $disk = Storage::disk('r2');
                $user->profile_image_url = $disk->url($path);
            }
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'File upload failed.',
                'error'   => $e->getMessage(),
            ], 200);
        }

        $user->update($validated);

        // SECURITY (F-15): Strip sensitive/internal fields from response.
        $fresh = $user->fresh();
        $responseData = collect($fresh->toArray())->except([
            'pin', 'app_id', 'email_change_token', 'secondary_email_token',
            'secondary_email_pending', 'email_pending', 'remember_token',
            'affiliate_code', 'referred_by',
        ])->all();
        if ($emailChangePending) {
            $responseData['email_change_pending'] = true;
        }

        return response()->json($responseData);
    }

    public function destroy(User $user)
    {
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * Admin toggle block/unblock by flipping is_active.
     * Revokes Sanctum tokens on block so blocked user is signed out
     * across all devices immediately.
     */
    public function toggleBlock(Request $request, User $user)
    {
        $actor = $request->user();

        if (!in_array($actor->role, ['admin', 'super-admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($actor->id === $user->id) {
            return response()->json(['message' => 'Cannot block your own account.'], 422);
        }

        $user->is_active = !$user->is_active;
        $user->save();

        if (!$user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json([
            'message'   => $user->is_active ? 'User unblocked.' : 'User blocked.',
            'is_active' => $user->is_active,
        ]);
    }

    /**
     * Place/lift a legal hold on a pending account deletion (law enforcement
     * preservation request, subpoena, active fraud/chargeback investigation).
     * A held account is never purged by `users:purge-pending-deletions`
     * regardless of how long scheduled_purge_at has passed.
     */
    public function setLegalHold(Request $request, User $user)
    {
        $actor = $request->user();

        if (!in_array($actor->role, ['admin', 'super-admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'legal_hold'        => 'required|boolean',
            'legal_hold_reason' => 'nullable|string|max:2000',
        ]);

        $user->forceFill([
            'legal_hold'        => $validated['legal_hold'],
            'legal_hold_reason' => $validated['legal_hold'] ? ($validated['legal_hold_reason'] ?? null) : null,
        ])->save();

        return response()->json([
            'message'    => $validated['legal_hold'] ? 'Legal hold placed.' : 'Legal hold lifted.',
            'legal_hold' => $user->legal_hold,
        ]);
    }

    public function getProfile(Request $request)
    {
        $user = $request->user()->load(['events', 'enrollments']);
        return response()->json($user);
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password'      => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->forceFill([
            'password'              => Hash::make($validated['password']),
            'force_password_change' => false,
        ])->save();

        // Revoke all other tokens + the sensitive-op re-auth window on password change.
        $user->tokens()->where('id', '!=', optional($user->currentAccessToken())->id)->delete();
        \Illuminate\Support\Facades\Cache::forget(
            \App\Http\Middleware\RequirePasswordConfirmation::cacheKey($user->id)
        );

        // Notify user of password change
        try {
            Mail::to($user->email)->send(new PasswordChangedMail($user));
        } catch (\Throwable $e) {
            Log::error("PasswordChangedMail failed for user {$user->id}: " . $e->getMessage());
        }
        try {
            app(PushNotificationService::class)->sendToUser(
                $user,
                'Your account password was changed. If this wasn\'t you, secure your account immediately.',
                'alerts'
            );
        } catch (\Throwable $e) {
            Log::error("Password changed push notification failed for user {$user->id}: " . $e->getMessage());
        }

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function forceChangePassword(Request $request)
    {
        $user = $request->user();

        if (!$user->force_password_change) {
            return response()->json(['message' => 'No forced password change required.'], 403);
        }

        $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user->forceFill([
            'password'              => Hash::make($request->input('password')),
            'force_password_change' => false,
        ])->save();

        return response()->json(['message' => 'Password changed successfully.']);
    }

    /**
     * Request a secondary (recovery) email — only allowed for role=user.
     * Sends a confirmation link to the new address.
     */
    public function requestSecondaryEmail(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'user') {
            return response()->json(['message' => 'Secondary email is only available for user accounts.'], 403);
        }

        $request->validate([
            'secondary_email' => [
                'required',
                'email',
                'different:email',
                // must not already be anyone's primary or secondary email
                'unique:users,email',
                'unique:users,secondary_email',
                'unique:users,secondary_email_pending',
            ],
        ]);

        $pending = $request->input('secondary_email');
        $token   = bin2hex(random_bytes(32)); // 64 hex chars

        $user->forceFill([
            'secondary_email_pending' => $pending,
            'secondary_email_token'   => hash('sha256', $token),
        ])->save();

        $frontendUrl      = rtrim(config('app.frontend_url'), '/');
        $confirmationUrl  = $frontendUrl . '/confirm-secondary-email?token=' . $token;

        // Send confirmation directly to the new (pending) address
        Mail::to($pending)->send(new SecondaryEmailConfirmationMail($user->name, $pending, $confirmationUrl));

        return response()->json(['message' => 'Confirmation email sent to ' . $pending . '. Please check your inbox.']);
    }

    /**
     * Confirm a secondary email via the token from the confirmation link.
     * Public endpoint — no auth required.
     */
    public function confirmSecondaryEmail(Request $request)
    {
        $token = $request->query('token');

        if (!$token) {
            return response()->json(['message' => 'Missing token.'], 400);
        }

        $hashed = hash('sha256', $token);
        $user   = User::where('secondary_email_token', $hashed)->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired confirmation link.'], 404);
        }

        $user->forceFill([
            'secondary_email'             => $user->secondary_email_pending,
            'secondary_email_verified_at' => now(),
            'secondary_email_pending'     => null,
            'secondary_email_token'       => null,
        ])->save();

        return response()->json(['message' => 'Recovery email confirmed successfully.']);
    }

    /**
     * Confirm an email address change via the token from the verification link.
     * Public endpoint — no auth required.
     */
    public function confirmEmailChange(Request $request)
    {
        $token = $request->query('token');

        if (!$token) {
            return response()->json(['message' => 'Missing token.'], 400);
        }

        $hashed = hash('sha256', $token);
        $user   = User::where('email_change_token', $hashed)->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired confirmation link.'], 404);
        }

        $user->forceFill([
            'email'              => $user->email_pending,
            'email_verified_at'  => now(),
            'email_pending'      => null,
            'email_change_token' => null,
        ])->save();

        return response()->json(['message' => 'Email address updated successfully.']);
    }
}

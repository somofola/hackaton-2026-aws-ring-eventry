<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

/**
 * SECURITY: Sensitive-op re-auth gate.
 *
 * Caller must have hit POST /auth/confirm-password with their current
 * password within the last N minutes (TTL set when the cache flag is written).
 * Returns 423 Locked otherwise so the frontend can prompt for password.
 */
class RequirePasswordConfirmation
{
    public const CACHE_KEY_PREFIX = 'pwd-confirmed:';
    public const TTL_SECONDS      = 600; // 10 minutes

    public static function cacheKey(int|string $userId): string
    {
        return self::CACHE_KEY_PREFIX . $userId;
    }

    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!Cache::has(self::cacheKey($user->id))) {
            return response()->json([
                'message' => 'Password confirmation required for this action.',
                'code'    => 'password_confirmation_required',
            ], 423);
        }

        return $next($request);
    }
}

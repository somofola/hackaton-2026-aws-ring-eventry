<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ExtendSanctumToken
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();

        if (!$token || !$token->expires_at || $token->expires_at->isPast()) {
            return $next($request); // Don't attempt to extend expired or missing tokens
        }

        $now = Carbon::now();

        if ($token->expires_at) {
            $expiresAt = $token->expires_at;

            // Auto-extend if token expires within the grace window
            $expiryMinutes = (int) env('TOKEN_EXPIRY_MINUTES', 30);
            $graceMinutes  = (int) env('TOKEN_GRACE_MINUTES', 5);

            if ($expiresAt->diffInMinutes($now) <= $graceMinutes) {
                $token->forceFill([
                    'expires_at' => $now->copy()->addMinutes($expiryMinutes)
                ])->save();
            }
        }

        // Stamp last_activity_at at most once per minute to avoid per-request writes
        if ($user && (
            !$user->last_activity_at ||
            $user->last_activity_at->diffInSeconds($now) >= 60
        )) {
            $user->timestamps = false;
            $user->last_activity_at = $now;
            $user->save();
            $user->timestamps = true;
        }

        return $next($request);
    }
}


<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CheckTokenExpiration
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    
    public function handle(Request $request, Closure $next)
    {
        // Check if the user is authenticated
        if ($user = $request->user()) {
            // Get the current access token
            $token = $user->currentAccessToken();

            if ($token && $token->created_at->addDays(1)->isPast()) {
                $token->delete(); // Revoke token
                return response()->json(['message' => 'Token expired. Please login again.'], 401);
            }
        }

        return $next($request);
    }
}

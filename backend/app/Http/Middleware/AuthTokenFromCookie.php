<?php

namespace App\Http\Middleware;

use App\Support\TokenCookie;
use Closure;
use Illuminate\Http\Request;

/**
 * SECURITY (F-12): If no Authorization header is present, promote the role-scoped
 * HttpOnly cookie to a Bearer token so Sanctum's token guard authenticates the
 * request transparently.
 *
 * Role is selected from the request's `Origin`/`Referer` URL path (e.g. /admin/*),
 * or falls back to scanning all known role cookies. Bearer header (native apps)
 * always wins — cookies only kick in for browser sessions.
 */
class AuthTokenFromCookie
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->bearerToken()) {
            return $next($request);
        }

        $role = $this->detectRole($request);

        // Try the role-specific cookie first, then fall back to any auth cookie.
        $candidates = array_unique(array_filter([
            $role ? TokenCookie::name($role) : null,
            'auth_user_token',
            'auth_team_token',
            'auth_corporate_token',
            'auth_admin_token',
        ]));

        foreach ($candidates as $cookieName) {
            $token = $request->cookie($cookieName);
            if (is_string($token) && $token !== '') {
                $request->headers->set('Authorization', 'Bearer ' . $token);
                break;
            }
        }

        return $next($request);
    }

    private function detectRole(Request $request): ?string
    {
        $sources = array_filter([
            $request->header('X-App-Role'),
            $request->header('Referer'),
            $request->header('Origin'),
        ]);

        foreach ($sources as $src) {
            $path = parse_url($src, PHP_URL_PATH) ?? $src;
            $path = strtolower($path);
            foreach (['admin', 'corporate', 'team', 'user'] as $r) {
                if (str_contains($path, '/' . $r)) {
                    return $r;
                }
            }
        }
        return null;
    }
}

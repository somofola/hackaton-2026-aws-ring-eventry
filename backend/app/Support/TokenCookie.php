<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\Cookie;

/**
 * SECURITY (F-12): Per-role HttpOnly Secure SameSite=Lax token cookie.
 *
 * Cookie name pattern: auth_{role}_token  (matches frontend localStorage convention
 * we replaced). Each role owns an independent cookie so concurrent sessions for
 * different roles in the same browser still work.
 *
 * SameSite: None in production (cross-site frontends like Cloudflare Workers
 * subdomain → api.eventry.app); Lax in dev. None requires Secure (already on in prod).
 *
 * Web flow: server sets cookie, browser stores it HttpOnly so JS/XSS cannot read.
 * Native (Capacitor) flow: cookie is still set on the response but mobile reads the
 * token from the JSON body and stores it in Keychain/Keystore. The cookie path is
 * harmless on native since the WKWebView origin differs from the API.
 */
class TokenCookie
{
    private const ROLES = ['user', 'team', 'corporate', 'admin', 'super-admin'];
    private const LIFETIME_MINUTES = 60 * 24 * 7; // 7 days

    public static function name(string $role): string
    {
        $role = strtolower($role);
        if (!in_array($role, self::ROLES, true)) {
            $role = 'user';
        }
        // super-admin collapses into admin cookie (same route prefix)
        if ($role === 'super-admin') {
            $role = 'admin';
        }
        return 'auth_' . $role . '_token';
    }

    public static function make(string $token, string $role): Cookie
    {
        // Build the Symfony Cookie directly so Laravel's session.domain default
        // doesn't override our intent (host-only on dev, configurable on prod).
        return new Cookie(
            name:            self::name($role),
            value:           $token,
            expire:          time() + (self::LIFETIME_MINUTES * 60),
            path:            '/',
            domain:          config('session.cookie_domain_override') ?: null,
            secure:          app()->environment('production'),
            httpOnly:        true,
            raw:             false,
            sameSite:        app()->environment('production') ? Cookie::SAMESITE_NONE : Cookie::SAMESITE_LAX
        );
    }

    public static function forget(string $role): Cookie
    {
        return new Cookie(
            name:     self::name($role),
            value:    '',
            expire:   1,
            path:     '/',
            domain:   config('session.cookie_domain_override') ?: null,
            secure:   app()->environment('production'),
            httpOnly: true,
            raw:      false,
            sameSite: Cookie::SAMESITE_LAX
        );
    }

    public static function forgetAll(): array
    {
        $unique = ['user', 'team', 'corporate', 'admin'];
        return array_map(fn($r) => self::forget($r), $unique);
    }
}

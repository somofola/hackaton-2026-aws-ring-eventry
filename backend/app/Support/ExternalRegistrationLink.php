<?php

namespace App\Support;

use App\Models\Event;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Builds the outbound URL to a 3rd-party event registration page with
 * referral / UTM / user prefill query params attached, and decides whether
 * the page can be embedded in an <iframe> or must be opened in a new tab.
 *
 * Used right after a successful Eventry enrollment so the user can complete
 * the registration on the originating platform without re-typing their info.
 */
class ExternalRegistrationLink
{
    /**
     * @return array{url:string, embed_mode:string, can_iframe:bool, origin:string}|null
     */
    public static function build(Event $event, ?User $user): ?array
    {
        if (!$event->is_external || !$event->external_url) return null;

        $url    = $event->external_url;
        $origin = $event->external_origin ?? 'generic';

        $params = [];

        // User prefill — generic key mapping (per-source adapter/prefill
        // resolution was removed along with the event scraper feature).
        if ($user) {
            $map = [
                'email'      => 'email',
                'first_name' => 'first_name',
                'last_name'  => 'last_name',
                'phone'      => 'phone',
            ];

            $first = '';
            $last  = '';
            $name  = trim((string) ($user->name ?? ''));
            if ($name !== '') {
                $parts = preg_split('/\s+/', $name, 2);
                $first = $parts[0] ?? '';
                $last  = $parts[1] ?? '';
            }

            $values = [
                'email'      => (string) ($user->email ?? ''),
                'first_name' => $first,
                'last_name'  => $last,
                'phone'      => (string) ($user->phone ?? ''),
            ];
            foreach ($map as $eventryKey => $thirdPartyKey) {
                $v = $values[$eventryKey] ?? '';
                if ($v !== '' && $thirdPartyKey) {
                    $params[(string) $thirdPartyKey] = $v;
                }
            }
        }

        $finalUrl = self::appendQuery($url, $params);

        $canIframe = self::iframeable($url);
        $resolved = $canIframe ? 'iframe' : 'new_tab';

        return [
            'url'        => $finalUrl,
            'embed_mode' => $resolved,
            'can_iframe' => $canIframe,
            'origin'     => $origin,
        ];
    }

    protected static function appendQuery(string $url, array $params): string
    {
        if (empty($params)) return $url;
        $sep = str_contains($url, '?') ? '&' : '?';
        return $url . $sep . http_build_query($params);
    }

    /**
     * Probe the destination URL once (cached 24h per host) to see whether
     * X-Frame-Options or CSP frame-ancestors permits iframe embedding.
     */
    public static function iframeable(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if ($host === '') return false;

        return (bool) Cache::remember('iframeable:' . $host, now()->addDay(), function () use ($url) {
            try {
                $r = Http::timeout(8)->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 Eventry-IframeProbe/1.0',
                ])->head($url);
            } catch (\Throwable $e) {
                Log::info('Iframeable probe failed', ['url' => $url, 'err' => $e->getMessage()]);
                return false;
            }
            if (!$r->successful() && $r->status() < 300) return false;

            $xfo = strtolower((string) $r->header('X-Frame-Options'));
            if ($xfo === 'deny' || $xfo === 'sameorigin') return false;

            $csp = (string) $r->header('Content-Security-Policy');
            if ($csp !== '' && preg_match('/frame-ancestors\s+([^;]+)/i', $csp, $m)) {
                $value = strtolower(trim($m[1]));
                if ($value === "'none'" || str_contains($value, "'self'")) return false;
            }
            return true;
        });
    }
}

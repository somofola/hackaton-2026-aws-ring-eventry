<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ScrapeController extends Controller
{
    /**
     * Fetch a LinkedIn public profile via Microlink API.
     * Microlink runs headless Chrome on their servers, bypassing LinkedIn's bot detection.
     * Free tier: 50 requests/day — no API key required.
     *
     * GET /api/linkedin/scrape?url=https://linkedin.com/in/username
     */
    public function linkedinProfile(Request $request)
    {
        $request->validate([
            'url' => 'required|url',
        ]);

        $url = trim($request->url);

        // Only accept LinkedIn /in/ profile URLs
        if (!preg_match('#linkedin\.com/in/[^/?&\s]+#i', $url)) {
            return response()->json([
                'message' => 'URL must be a valid LinkedIn profile URL (linkedin.com/in/username).',
            ], 422);
        }

        // Normalise to https://www.linkedin.com/in/username (strip query/fragment)
        preg_match('#linkedin\.com/in/([^/?&\s]+)#i', $url, $um);
        $username = rtrim($um[1] ?? '', '/');
        $profileUrl = "https://www.linkedin.com/in/{$username}/";

        // ── Call Microlink API ───────────────────────────────────────────────
        // Microlink uses headless Chrome on their end — bypasses LinkedIn blocking.
        // Free tier: 50 requests/day. No API key required.
        $microlinkUrl = 'https://api.microlink.io?' . http_build_query([
            'url'        => $profileUrl,
            'screenshot' => 'false',
        ]);

        try {
            $response = Http::withOptions(['verify' => false])
                ->timeout(15)
                ->get($microlinkUrl);

            $json   = $response->json();
            $status = $json['status'] ?? 'error';

            if ($status !== 'success' || empty($json['data'])) {
                Log::warning('Microlink non-success', ['status' => $status, 'url' => $profileUrl]);
                return response()->json([
                    'message' => 'Could not fetch the profile. Make sure the URL is correct and the profile is public.',
                ], 422);
            }

            $d = $json['data'];

            // ── Extract name ─────────────────────────────────────────────────
            // Microlink returns:
            //   title  → "John Doe - Software Engineer at Google | LinkedIn"
            //   author → "John Doe"
            $rawTitle = $d['title'] ?? '';
            $name     = $d['author'] ?? '';

            // If author is empty, derive name from the title
            if (empty($name) && $rawTitle) {
                $name = trim(preg_replace('/\s*[-|].*$/u', '', $rawTitle));
            }

            // ── Extract title & company from the title string ────────────────
            // Formats:  "Name - Title at Company | LinkedIn"
            //           "Name - Title | LinkedIn"
            //           "Name | LinkedIn"
            $title   = '';
            $company = '';

            $stripped = trim(preg_replace('/\s*\|\s*LinkedIn\s*$/i', '', $rawTitle));

            if ($name && str_starts_with($stripped, $name)) {
                $rest = trim(ltrim(substr($stripped, strlen($name)), " \t-–—"));
            } elseif (str_contains($stripped, ' - ')) {
                [, $rest] = explode(' - ', $stripped, 2);
                $rest = trim($rest);
            } else {
                $rest = '';
            }

            if ($rest) {
                if (preg_match('/^(.+?)\s+at\s+(.+)$/iu', $rest, $pm)) {
                    $title   = trim($pm[1]);
                    $company = trim($pm[2]);
                } elseif (preg_match('/^(.+?)\s*[-|]\s*(.+)$/u', $rest, $pm)) {
                    $title   = trim($pm[1]);
                    $company = trim($pm[2]);
                } else {
                    $title = $rest;
                }
            }

            // ── Bio from description ─────────────────────────────────────────
            $bio  = '';
            $desc = $d['description'] ?? '';
            if ($desc) {
                $bio = preg_replace("/^View .+?'s (professional\s+)?profile on LinkedIn[,.]?\s*/iu", '', $desc);
                $bio = preg_replace('/\.\s*(LinkedIn is the world|Join LinkedIn).*$/isu', '.', $bio);
                $bio = trim($bio);
                if (strlen($bio) < 60 && stripos($bio, 'LinkedIn') !== false) {
                    $bio = '';
                }
            }

            // ── Profile image ────────────────────────────────────────────────
            $image = $d['image']['url'] ?? $d['logo']['url'] ?? '';

            if (empty($name)) {
                return response()->json([
                    'message' => 'Could not extract profile data. The profile may be private or restricted.',
                ], 422);
            }

            return response()->json([
                'name'              => $name,
                'title'             => $title,
                'company'           => $company,
                'bio'               => $bio,
                'profile_image_url' => $image,
                'website'           => $d['url'] !== $profileUrl ? ($d['url'] ?? '') : '',
                'socials'           => [
                    'linkedin'  => $profileUrl,
                    'twitter'   => '',
                    'instagram' => '',
                ],
            ]);

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::warning('Microlink connection error', ['url' => $profileUrl, 'error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Could not reach the scraping service. Please try again.',
            ], 503);
        } catch (\Exception $e) {
            Log::error('Microlink error', ['url' => $profileUrl, 'error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to fetch the LinkedIn profile. Please try again.',
            ], 500);
        }
    }
}

<?php

namespace App\Services;

use App\Models\RingDevice;
use App\Models\RingLinkedAccount;
use App\Models\RingPlatformCredential;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin wrapper around Ring's outbound Partner API (api.amazonvision.com).
 * Separate from RingWebhookController (which only receives inbound pushed
 * events) and RingOAuthController (which only handles account linking).
 *
 * Auth here is a bearer token, resolved per-device via resolveAccessToken():
 *   - A device onboarded by a corporate user (RingDevice.owner_type =
 *     'corporate', see RingDeviceController::onboardOwnDevice()) uses that
 *     user's own linked Ring OAuth token, persisted by RingOAuthController::
 *     confirm() into ring_linked_accounts (see RingLinkedAccount).
 *   - Everything else (admin-onboarded pool devices, or any device_id with
 *     no RingDevice row at all, e.g. the Playground device used for manual
 *     testing) falls back to the shared RING_ACCESS_TOKEN env — the Ring
 *     Developer Console's Playground token, short-lived, manually refreshed.
 */
class RingService
{
    private const BASE_URL = 'https://api.amazonvision.com';

    /**
     * Per-device token resolution — see class docblock. A corporate-owned
     * device whose owner hasn't completed OAuth linking (no row yet) falls
     * back to the shared token rather than hard-failing, since that's still
     * usable for e.g. a shared demo device the corporate re-registered.
     *
     * Doesn't check expires_at / attempt a refresh — there's no refresh-token
     * exchange implemented yet (see RingLinkedAccount), so an expired linked
     * token just surfaces as a normal Ring API 401 downstream.
     */
    private function resolveAccessToken(string $deviceId): ?string
    {
        $device = RingDevice::where('device_id', $deviceId)->first();

        if ($device && $device->owner_type === 'corporate' && $device->owner_id) {
            $linked = RingLinkedAccount::where('user_id', $device->owner_id)->first();

            if ($linked && $linked->access_token) {
                return $linked->access_token;
            }
        }

        return RingPlatformCredential::first()?->access_token ?: config('services.ring.access_token');
    }

    /**
     * Returns a result array {triggered, reason} instead of a bare bool so
     * callers (EventController's check-in endpoints) can surface *why* the
     * chime didn't sound to the frontend, rather than a silent no-op.
     * reason is one of: not_configured, unsupported_device, no_audio_slot,
     * api_error — null when triggered is true.
     */
    public function triggerChime(string $deviceId, ?string $audioRef = null): array
    {
        $token = $this->resolveAccessToken($deviceId);

        if (!$token) {
            Log::info('Ring chime trigger skipped: no RING_ACCESS_TOKEN configured');
            return ['triggered' => false, 'reason' => 'not_configured'];
        }

        if (!$this->supportsChimePlay($deviceId, $token)) {
            Log::info('Ring chime trigger skipped: device has no chime.play capability', ['device_id' => $deviceId]);
            return ['triggered' => false, 'reason' => 'unsupported_device'];
        }

        if (!$audioRef) {
            $audioRef = $this->resolveAudioRef($deviceId, $token);

            if (!$audioRef) {
                Log::warning('Ring chime trigger skipped: no audio_ref slot resolved', ['device_id' => $deviceId]);
                return ['triggered' => false, 'reason' => 'no_audio_slot'];
            }
        }

        $response = Http::withToken($token)->post(
            self::BASE_URL . "/v1/devices/{$deviceId}/media/audio/playback",
            [
                'data' => [
                    'type' => 'audio',
                    'attributes' => ['audio_ref' => $audioRef],
                ],
            ]
        );

        if (!$response->successful()) {
            Log::warning('Ring chime trigger failed', [
                'device_id' => $deviceId,
                'audio_ref' => $audioRef,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return ['triggered' => false, 'reason' => 'api_error'];
        }

        return ['triggered' => true, 'reason' => null];
    }

    /**
     * Per api-documentation.html#playing-audio-on-a-chime, playback is gated
     * by whether the device's capabilities report "chime.play" in
     * audio.supported_actions — a doorbell/camera (no chime hardware)
     * reports audio.supported_actions: null and can never take the command.
     */
    private function supportsChimePlay(string $deviceId, string $token): bool
    {
        return cache()->remember("ring:device:{$deviceId}:supports_chime_play", now()->addHours(6), function () use ($deviceId, $token) {
            $response = Http::withToken($token)->get(
                self::BASE_URL . "/v1/devices/{$deviceId}/capabilities"
            );

            if (!$response->successful()) {
                Log::warning('Ring capabilities fetch failed', [
                    'device_id' => $deviceId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return false;
            }

            $actions = $response->json('data.attributes.audio.supported_actions', []);

            return in_array('chime.play', $actions ?? [], true);
        });
    }

    /**
     * Per api-documentation.html#chime-configurations, slots live at
     * data.attributes.audio.customizable_slots[] — each
     * {event, disabled, audio_ref, audio_url, audio_name}. Picks the first
     * non-disabled slot and caches its audio_ref.
     */
    private function resolveAudioRef(string $deviceId, string $token): ?string
    {
        return cache()->remember("ring:device:{$deviceId}:audio_ref", now()->addHours(6), function () use ($deviceId, $token) {
            $response = Http::withToken($token)->get(
                self::BASE_URL . "/v1/devices/{$deviceId}/configurations"
            );

            if (!$response->successful()) {
                Log::warning('Ring chime configurations fetch failed', [
                    'device_id' => $deviceId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            }

            $slots = $response->json('data.attributes.audio.customizable_slots', []);
            $slot = collect($slots)->firstWhere('disabled', false) ?? ($slots[0] ?? null);

            return $slot['audio_ref'] ?? null;
        });
    }

    /**
     * On-demand snapshot from a device's camera (JPEG/PNG bytes). Used by
     * RingArrivalCaptureService as a cheap stand-in for continuous video —
     * polled repeatedly during a capture window instead of consuming Ring's
     * RTSP/WHEP live-video streams, which would need an ffmpeg/WebRTC
     * pipeline this backend doesn't run.
     */
    public function downloadSnapshot(string $deviceId): ?string
    {
        $token = $this->resolveAccessToken($deviceId);

        if (!$token) {
            Log::info('Ring snapshot download skipped: no RING_ACCESS_TOKEN configured');
            return null;
        }

        $response = Http::withToken($token)->post(
            self::BASE_URL . "/v1/devices/{$deviceId}/media/image/download",
            [
                'type' => 'latest_in_range',
                'start_timestamp' => now()->subSeconds(30)->getTimestampMs(),
                'end_timestamp' => now()->getTimestampMs(),
                'image_options' => ['format' => 'jpeg'],
            ]
        );

        if (!$response->successful()) {
            Log::warning('Ring snapshot download failed', [
                'device_id' => $deviceId,
                'status' => $response->status(),
            ]);
            return null;
        }

        return $response->body();
    }

    /**
     * Opens a WHEP live-view session so a device with no recent motion (e.g.
     * a Playground virtual device) has footage in its last-30s media buffer
     * for downloadSnapshot() to find — see docs/ring/api-documentation.html
     * #whep-live-video-streaming. Proxied so the frontend never holds
     * RING_ACCESS_TOKEN directly; the frontend's RTCPeerConnection offer is
     * just forwarded as-is.
     *
     * @return array{sdp: string, session_url: string}|null
     */
    public function openWhepSession(string $deviceId, string $sdpOffer): ?array
    {
        $token = $this->resolveAccessToken($deviceId);

        if (!$token) {
            Log::info('Ring WHEP open skipped: no RING_ACCESS_TOKEN configured');
            return null;
        }

        $response = Http::withToken($token)
            ->withBody($sdpOffer, 'application/sdp')
            ->post(self::BASE_URL . "/v1/devices/{$deviceId}/media/streaming/whep/sessions");

        if (!$response->successful()) {
            Log::warning('Ring WHEP session open failed', [
                'device_id' => $deviceId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return null;
        }

        $sessionUrl = $response->header('Location');

        if (!$sessionUrl) {
            Log::warning('Ring WHEP session open: no Location header in response', ['device_id' => $deviceId]);
            return null;
        }

        return ['sdp' => $response->body(), 'session_url' => $sessionUrl];
    }

    /**
     * Closes a WHEP session. $sessionUrl must be the exact Location header
     * value returned by openWhepSession() (it carries a signed ?location=
     * query param, not just the bare session id).
     */
    public function closeWhepSession(string $deviceId, string $sessionUrl): bool
    {
        $token = $this->resolveAccessToken($deviceId);

        if (!$token) {
            return false;
        }

        if (!str_starts_with($sessionUrl, self::BASE_URL . '/v1/devices/')) {
            Log::warning('Ring WHEP session close: rejected non-Ring session_url', ['session_url' => $sessionUrl]);
            return false;
        }

        $response = Http::withToken($token)->delete($sessionUrl);

        if (!$response->successful()) {
            Log::warning('Ring WHEP session close failed', ['session_url' => $sessionUrl, 'status' => $response->status()]);
            return false;
        }

        return true;
    }
}

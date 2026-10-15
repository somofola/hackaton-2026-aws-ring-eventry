<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Services\RingCredentialResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Receives Ring partner-API webhooks and arms the check-in kiosk.
 * This is a trigger only — it does not authenticate anyone. QR/face matching
 * happens separately via EventController::checkInByQr().
 *
 * Verification is real Ring HMAC-SHA256 signing (per developer.amazon.com/docs/ring/
 * api-documentation.html#notifications), NOT the simplified Bearer-token check in the
 * ring-api-helloworld sample (that sample only covers Playground/access-token mode,
 * which never receives real pushed webhooks).
 *
 *   X-Signature: sha256=<hex hmac-sha256 of raw request body, keyed with RING_HMAC_SECRET>
 *   {
 *     "meta": { "version": "...", "time": "...", "request_id": "..." },
 *     "data": {
 *       "id": "...",
 *       "type": "motion_detected"|"person_detected"|"device_added"|"device_removed",
 *       "attributes": {
 *         "source": "<device_id>",
 *         "source_type": "...",
 *         "timestamp": 169... ,
 *         "confidence": 0.9,
 *         "bounding_box": {"x":0,"y":0,"width":0,"height":0},
 *         "thumbnail_url": "..."
 *       },
 *       "relationships": { "devices": { "links": { "self": "..." } } }
 *     }
 *   }
 *
 * The Ring device itself is still reusable hardware, not hardcoded to one
 * event permanently — but to support checking attendees in directly from
 * the device's own camera (no kiosk/second device), staff "arm" a device
 * for whichever event is currently running there via arm()/disarm(), a
 * runtime cache mapping, not a schema column. On person_detected while
 * armed, RingArrivalCaptureService takes over: pulls repeated snapshots
 * straight from the camera and resolves them to an enrollment via QR or
 * opted-in face match, checking in without any other device involved.
 */
class RingWebhookController extends Controller
{
    public function __construct(private readonly RingCredentialResolver $credentials)
    {
    }

    public function handle(Request $request)
    {
        $signature = $request->header('X-Signature');

        if (!$signature) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Parsed before signature verification purely to read device_id —
        // a corporate's own Ring app signs with their own hmac_secret
        // (RingOwnerCredential), not Eventry's shared one, so we can't know
        // which secret to verify against until we know whose device this is.
        $body = $request->all();
        $data = $body['data'] ?? null;
        $attributes = $data['attributes'] ?? null;

        if (!is_array($data) || !is_array($attributes)) {
            Log::info('Ring webhook: non-standard payload, ignoring', ['body' => $body]);
            return response()->json(['status' => 'ignored'], 200);
        }

        $deviceId = $attributes['source'] ?? null;

        if (!$deviceId) {
            Log::info('Ring webhook: no device id in payload, ignoring', ['body' => $body]);
            return response()->json(['status' => 'ignored'], 200);
        }

        $hmacSecret = $this->credentials->forDeviceId($deviceId)['hmac_secret'];

        if (!$hmacSecret) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $computed = 'sha256=' . hash_hmac('sha256', $request->getContent(), $hmacSecret);

        if (!hash_equals($computed, $signature)) {
            Log::warning('Ring webhook: signature mismatch', ['device_id' => $deviceId]);
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $timestamp = $attributes['timestamp'] ?? null;
        $at = is_numeric($timestamp)
            ? now()->createFromTimestamp((int) $timestamp)->toIso8601String()
            : ($timestamp ?? ($body['meta']['time'] ?? now()->toIso8601String()));

        $thumbnailUrl = $attributes['thumbnail_url'] ?? null;

        cache()->put("ring:device:{$deviceId}:status", [
            'event_type' => $data['type'] ?? 'unknown',
            'device_id' => $deviceId,
            'confidence' => $attributes['confidence'] ?? null,
            'thumbnail_url' => $thumbnailUrl,
            'caption' => null,
            'at' => $at,
        ], now()->addSeconds(30));

        // Ring requires a 200 within 5s; Bedrock isn't guaranteed to fit that
        // window, so caption generation runs after the response is flushed.
        if ($thumbnailUrl) {
            dispatch(function () use ($deviceId, $thumbnailUrl) {
                app(\App\Services\RingVisionCaptionService::class)->captionAndCache($deviceId, $thumbnailUrl);
            })->afterResponse();
        }

        $armedEventId = cache()->get("ring:device:{$deviceId}:armed_event_id");

        if ($armedEventId && ($data['type'] ?? null) === 'person_detected') {
            dispatch(function () use ($deviceId, $armedEventId) {
                app(\App\Services\RingArrivalCaptureService::class)->run($deviceId, (int) $armedEventId);
            })->afterResponse();
        }

        return response()->json(['status' => 'armed', 'device_id' => $deviceId]);
    }

    /** Staff arms a device for whichever event is currently running there. */
    public function arm(Request $request, string $deviceId)
    {
        $validated = $request->validate(['event_id' => 'required|integer|exists:events,id']);

        cache()->put("ring:device:{$deviceId}:armed_event_id", $validated['event_id'], now()->addHours(24));

        return response()->json(['status' => 'armed', 'device_id' => $deviceId, 'event_id' => $validated['event_id']]);
    }

    public function disarm(string $deviceId)
    {
        cache()->forget("ring:device:{$deviceId}:armed_event_id");

        return response()->json(['status' => 'disarmed', 'device_id' => $deviceId]);
    }

    /** Manual test: fires the device's chime via RingService, standalone of any webhook. */
    public function testChime(string $deviceId, \App\Services\RingService $ringService)
    {
        $result = $ringService->triggerChime($deviceId);

        return response()->json(['success' => $result['triggered'], 'reason' => $result['reason']]);
    }

    /**
     * Manual test: pulls one snapshot straight from the camera and runs it
     * through QrDecoder, same as RingArrivalCaptureService would — lets staff
     * verify both RING_ACCESS_TOKEN and zbar-tools without waiting on a real
     * person_detected webhook.
     */
    public function testCapture(
        string $deviceId,
        \App\Services\RingService $ringService,
        \App\Services\QrDecoder $qrDecoder
    ) {
        $bytes = $ringService->downloadSnapshot($deviceId);

        if (!$bytes) {
            return response()->json(['success' => false, 'message' => 'Snapshot download failed — check RING_ACCESS_TOKEN'], 422);
        }

        return response()->json([
            'success' => true,
            'image_base64' => 'data:image/jpeg;base64,' . base64_encode($bytes),
            'qr_result' => $qrDecoder->decode($bytes),
        ]);
    }

    /**
     * Opens a WHEP live-view session, proxied so the frontend's
     * RTCPeerConnection offer never needs RING_ACCESS_TOKEN directly.
     * Used by the no-physical-device demo view: a live session keeps the
     * device's media buffer populated so testCapture()/the arrival-capture
     * poll loop can actually pull frames from a Playground device that
     * otherwise has no recent motion.
     */
    public function openWhep(Request $request, string $deviceId, \App\Services\RingService $ringService)
    {
        $sdpOffer = $request->getContent();

        if (!$sdpOffer || !str_starts_with(trim($sdpOffer), 'v=0')) {
            return response()->json(['message' => 'Request body must be a raw SDP offer'], 422);
        }

        $session = $ringService->openWhepSession($deviceId, $sdpOffer);

        if (!$session) {
            return response()->json(['message' => 'WHEP session open failed — check RING_ACCESS_TOKEN / device'], 422);
        }

        return response()->json($session);
    }

    public function closeWhep(Request $request, string $deviceId, \App\Services\RingService $ringService)
    {
        $validated = $request->validate(['session_url' => 'required|string']);

        $ringService->closeWhepSession($deviceId, $validated['session_url']);

        return response()->json(['status' => 'closed']);
    }

    /**
     * Polled by the kiosk/dashboard to show "someone's approaching" state
     * (keyed by the kiosk's own device_id, passed as a query param) and the
     * most recent completed check-in (keyed by event, from checkInByQr()).
     */
    public function status(Request $request, Event $event)
    {
        $deviceId = $request->query('device_id');

        return response()->json([
            'ring' => $deviceId ? cache()->get("ring:device:{$deviceId}:status") : null,
            'last_checkin' => cache()->get("event:{$event->id}:last_checkin"),
        ]);
    }
}

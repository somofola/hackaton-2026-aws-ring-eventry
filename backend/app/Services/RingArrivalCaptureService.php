<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventEnrollment;
use Illuminate\Support\Facades\Log;

/**
 * The no-second-device check-in path: on a person_detected webhook for a
 * device that's "armed" for a specific event, repeatedly pull snapshots
 * straight from the Ring camera (no kiosk, no separate scanner) and try to
 * resolve them to an enrollment — first by QR code, then by opted-in face
 * match — checking the attendee in the moment a match is found.
 *
 * Runs synchronously after the webhook's HTTP response has already been
 * sent (see RingWebhookController::handle() -> ->afterResponse()). This
 * ties up a PHP-FPM worker for the full capture window (~12s) per arrival —
 * acceptable for a single-device demo, not meant for high-concurrency
 * production use without moving this to a real queue worker.
 */
class RingArrivalCaptureService
{
    private const CAPTURE_ATTEMPTS = 8;
    private const CAPTURE_INTERVAL_SECONDS = 1.5;

    public function __construct(
        private readonly RingService $ring,
        private readonly QrDecoder $qrDecoder,
        private readonly RingFaceService $faceService,
        private readonly CheckInService $checkInService,
    ) {
    }

    public function run(string $deviceId, int $eventId): void
    {
        $event = Event::find($eventId);

        if (!$event) {
            Log::warning('Ring arrival capture: armed event no longer exists', ['event_id' => $eventId]);
            return;
        }

        $hasFaceOptIns = EventEnrollment::where('event_id', $eventId)
            ->where('face_checkin_opt_in', true)
            ->exists();

        for ($i = 0; $i < self::CAPTURE_ATTEMPTS; $i++) {
            $frame = $this->ring->downloadSnapshot($deviceId);

            if ($frame === null) {
                usleep((int) (self::CAPTURE_INTERVAL_SECONDS * 1_000_000));
                continue;
            }

            $match = $this->matchByQr($eventId, $frame)
                ?? ($hasFaceOptIns ? $this->matchByFace($eventId, $frame) : null);

            if ($match) {
                [$enrollment, $method] = $match;
                $checkedIn = $this->checkInService->checkIn($enrollment, $method, 'ring-arrival');

                if ($checkedIn) {
                    $this->ring->triggerChime($deviceId, 'default');
                    Log::info('Ring arrival capture: checked in', [
                        'event_id' => $eventId,
                        'enrollment_id' => $enrollment->id,
                        'method' => $method,
                    ]);
                }

                return;
            }

            usleep((int) (self::CAPTURE_INTERVAL_SECONDS * 1_000_000));
        }

        Log::info('Ring arrival capture: no match found in capture window', ['event_id' => $eventId, 'device_id' => $deviceId]);
    }

    /** @return array{0: EventEnrollment, 1: string}|null */
    private function matchByQr(int $eventId, string $frameBytes): ?array
    {
        $decoded = $this->qrDecoder->decode($frameBytes);

        if (!$decoded) {
            return null;
        }

        $enrollment = EventEnrollment::where('event_id', $eventId)
            ->where('qr_code', $decoded)
            ->first();

        return $enrollment ? [$enrollment, 'qr'] : null;
    }

    /** @return array{0: EventEnrollment, 1: string}|null */
    private function matchByFace(int $eventId, string $frameBytes): ?array
    {
        $enrollmentId = $this->faceService->searchByImage($eventId, $frameBytes);

        if (!$enrollmentId) {
            return null;
        }

        $enrollment = EventEnrollment::where('event_id', $eventId)->find($enrollmentId);

        return $enrollment ? [$enrollment, 'face'] : null;
    }
}

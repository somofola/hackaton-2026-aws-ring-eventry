<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Models\EventEnrollment;
use App\Services\RingFaceService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Deletes the Rekognition Face Collection for every event that's ended and
 * still has an active collection, and clears the opt-in flags on its
 * enrollments. This is the actual privacy guarantee for face check-in:
 * Rekognition stores the face vector inside the collection, not a photo —
 * deleting the collection deletes the vector. Run on a schedule (see
 * Kernel::schedule), not only on demand.
 */
class PurgeEventFaceData extends Command
{
    protected $signature = 'ring:purge-face-data {event? : Specific event ID, otherwise all ended events with face opt-ins}';
    protected $description = 'Delete Rekognition face data for events that have ended';

    public function handle(RingFaceService $faceService): void
    {
        $events = $this->argument('event')
            ? Event::where('id', $this->argument('event'))->get()
            : Event::where('status', 'completed')
                ->whereHas('enrollments', fn ($q) => $q->where('face_checkin_opt_in', true))
                ->get();

        foreach ($events as $event) {
            $faceService->deleteCollection($event->id);

            $count = EventEnrollment::where('event_id', $event->id)
                ->where('face_checkin_opt_in', true)
                ->update(['face_checkin_opt_in' => false, 'face_indexed_at' => null]);

            Log::info("ring:purge-face-data — purged collection + {$count} enrollment(s) for event {$event->id}");
            $this->info("Purged face data for event {$event->id} ({$count} enrollment(s))");
        }

        if ($events->isEmpty()) {
            $this->info('No events with face data to purge.');
        }
    }
}

<?php

namespace App\Services;

use App\Models\EventEnrollment;

/**
 * Single place that actually marks an enrollment checked-in, shared by the
 * HTTP check-in endpoints (EventController) and the no-kiosk Ring capture
 * path (ProcessRingArrivalJob), which isn't an HTTP request and has no
 * $request->user() to authorize against.
 */
class CheckInService
{
    /** @return bool false if already checked in (no-op), true if this call did the check-in */
    public function checkIn(EventEnrollment $enrollment, string $method, string $checkedInBy): bool
    {
        if ($enrollment->checked_in) {
            return false;
        }

        $enrollment->update([
            'checked_in' => true,
            'checked_in_at' => now(),
            'checked_in_by' => $checkedInBy,
            'status' => 'attended',
        ]);

        cache()->put("event:{$enrollment->event_id}:last_checkin", [
            'name' => $enrollment->user_name,
            'method' => $method,
            'at' => now()->toIso8601String(),
        ], now()->addMinutes(10));

        return true;
    }
}

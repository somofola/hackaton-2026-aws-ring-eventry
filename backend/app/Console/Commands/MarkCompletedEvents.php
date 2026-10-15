<?php

namespace App\Console\Commands;

use App\Models\Event;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class MarkCompletedEvents extends Command
{
    protected $signature   = 'events:mark-completed';
    protected $description = 'Set event status to "completed" for all events whose end date/time has passed';

    public function handle(): void
    {
        // Match events where CONCAT(end_date, ' ', end_time) is in the past.
        // Falls back to '23:59:59' when end_time is null (treat end of the end_date day).
        // Only touch statuses that are still "active" — skip already-completed or cancelled.
        $updated = Event::whereNotIn('status', ['completed', 'cancelled'])
            ->whereNotNull('end_date')
            ->whereRaw("CONCAT(end_date, ' ', COALESCE(end_time, '23:59:59')) < NOW()")
            ->update(['status' => 'completed']);

        if ($updated > 0) {
            Log::info("events:mark-completed — marked {$updated} event(s) as completed.");
            $this->info("Marked {$updated} event(s) as completed.");
        } else {
            $this->info('No events to mark as completed.');
        }
    }
}

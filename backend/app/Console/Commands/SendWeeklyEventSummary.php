<?php

namespace App\Console\Commands;

use App\Mail\WeeklyEventSummaryMail;
use App\Models\Event;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendWeeklyEventSummary extends Command
{
    protected $signature   = 'events:send-weekly-summary';
    protected $description = 'Send weekly personalised event digest to all users';

    private const MAX_NEARBY = 5;
    private const MAX_OTHER  = 5;

    public function handle(PushNotificationService $push): void
    {
        // Fetch all upcoming published events in the next 30 days (eager)
        $upcomingEvents = Event::where('status', 'live')
            ->whereBetween('start_date', [now()->toDateString(), now()->addDays(30)->toDateString()])
            ->orderBy('start_date')
            ->get();

        if ($upcomingEvents->isEmpty()) {
            $this->info('No upcoming events — skipping weekly summary.');
            return;
        }

        $users = User::where('role', 'user')->whereNotNull('email')->get();
        $sent  = 0;

        foreach ($users as $user) {
            try {
                $this->processUser($user, $upcomingEvents, $push);
                $sent++;
            } catch (\Throwable $e) {
                Log::error("Weekly event summary failed for user {$user->id}: " . $e->getMessage());
            }
        }

        $this->info("Weekly event summaries sent to {$sent} users.");
    }

    private function processUser(User $user, $allEvents, PushNotificationService $push): void
    {
        $nearby = collect();
        $other  = collect();

        if ($user->location) {
            // Extract significant words from user location (>3 chars, ignore common words)
            $stopWords = ['the', 'and', 'for', 'street', 'avenue', 'road', 'lane', 'drive'];
            $words = array_filter(
                preg_split('/[\s,]+/', strtolower($user->location)),
                fn($w) => strlen($w) > 3 && !in_array($w, $stopWords)
            );

            foreach ($allEvents as $event) {
                $eventLocation = strtolower($event->location ?? '');
                $isNearby = false;
                foreach ($words as $word) {
                    if ($word && str_contains($eventLocation, $word)) {
                        $isNearby = true;
                        break;
                    }
                }
                if ($isNearby) {
                    $nearby->push($event);
                } else {
                    $other->push($event);
                }
            }
        } else {
            $other = $allEvents;
        }

        $nearbySlice = $nearby->take(self::MAX_NEARBY);
        $otherSlice  = $other->take(self::MAX_OTHER);

        // Only send if there's at least one event to show
        if ($nearbySlice->isEmpty() && $otherSlice->isEmpty()) return;

        Mail::to($user->email)->send(
            new WeeklyEventSummaryMail($user, $nearbySlice, $otherSlice)
        );

        $total = $nearbySlice->count() + $otherSlice->count();
        $push->sendToUser(
            $user,
            "Your weekly event digest is ready — {$total} upcoming event" . ($total === 1 ? '' : 's') . " near you and online.",
            'events'
        );
    }
}

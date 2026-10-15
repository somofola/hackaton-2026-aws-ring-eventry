<?php

namespace App\Console\Commands;

use App\Models\Card;
use App\Models\CardScan;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendNotificationSummary extends Command
{
    protected $signature   = 'notifications:send-summary';
    protected $description = 'Send 6-hourly notification summary to all users (card views, trending)';

    public function handle(PushNotificationService $push): void
    {
        $window    = now()->subHours(6);
        $users     = User::where('role', 'user')->get();
        $sent      = 0;

        foreach ($users as $user) {
            try {
                $this->processUser($user, $window, $push);
                $sent++;
            } catch (\Throwable $e) {
                Log::error("Summary notification failed for user {$user->id}: " . $e->getMessage());
            }
        }

        $this->info("Summary notifications sent to {$sent} users.");
    }

    private function processUser(User $user, \Carbon\Carbon $window, PushNotificationService $push): void
    {
        $cardIds = Card::where('user_id', $user->id)->pluck('id');
        if ($cardIds->isEmpty()) return;

        // ── 1. Card view summary ─────────────────────────────────────────────
        $viewCount = CardScan::whereIn('card_id', $cardIds)
            ->where('scanned_at', '>=', $window)
            ->count();

        if ($viewCount > 0) {
            $msg = $viewCount === 1
                ? "1 person viewed your card in the last 6 hours."
                : "{$viewCount} people viewed your card in the last 6 hours.";
            $push->sendToUser($user, $msg, 'card_activity');
        }

        // ── 2. Trending card ────────────────────────────────────────────────
        $trending = Card::where('user_id', $user->id)
            ->withCount(['scans as recent_scans' => fn($q) => $q->where('scanned_at', '>=', $window)])
            ->having('recent_scans', '>=', 5)
            ->orderByDesc('recent_scans')
            ->first();

        if ($trending) {
            $push->sendToUser(
                $user,
                "Your card \"{$trending->name}\" is trending — {$trending->recent_scans} views in the last 6 hours!",
                'card_activity'
            );
        }

        // Inactive-card nudge moved to weekly command: notifications:send-inactive-card-nudge
    }
}

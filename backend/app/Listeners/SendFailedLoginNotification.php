<?php

namespace App\Listeners;

use App\Mail\FailedLoginMail;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Auth\Events\Failed;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendFailedLoginNotification
{
    public function __construct(private PushNotificationService $push) {}

    public function handle(Failed $event): void
    {
        $email = $event->credentials['email'] ?? null;
        if (!$email) return;

        $user = User::where('email', $email)->first();
        if (!$user) return;

        $ip          = request()->ip() ?? 'Unknown';
        $attemptedAt = now()->format('D, d M Y \a\t H:i') . ' UTC';

        try {
            Mail::to($user->email)->send(new FailedLoginMail($user, $ip, $attemptedAt));
        } catch (\Throwable $e) {
            Log::error("FailedLoginMail failed for user {$user->id}: " . $e->getMessage());
        }

        try {
            $this->push->sendToUser(
                $user,
                "Failed login attempt detected from IP {$ip} at {$attemptedAt}. If this wasn't you, secure your account.",
                'alerts'
            );
        } catch (\Throwable $e) {
            Log::error("Failed login push notification failed for user {$user->id}: " . $e->getMessage());
        }
    }
}

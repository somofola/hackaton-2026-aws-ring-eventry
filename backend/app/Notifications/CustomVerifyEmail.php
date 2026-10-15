<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Auth\Notifications\VerifyEmail as VerifyEmailBase;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Carbon\Carbon;

class CustomVerifyEmail extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    protected function verificationUrl($notifiable)
    {
        // SECURITY (F-02): Replaced predictable sha1(email) with a per-user
        // random 256-bit token stored hashed in cache with a 60-minute TTL.
        // Issuing a new link rotates the token (old link becomes invalid).
        $token = Str::random(64);
        Cache::put(
            self::cacheKey($notifiable->uuid),
            hash('sha256', $token),
            now()->addMinutes(60)
        );

        $frontendUrl = rtrim(config('app.frontend_url'), '/')
                     . '/verify-email?uid=' . $notifiable->uuid
                     . '&token=' . $token;

        return $frontendUrl;
    }

    /**
     * Shared cache key — used by AuthController::verifyEmail to pull/compare.
     * Keyed by user UUID (not numeric id) so the id is never exposed in links.
     */
    public static function cacheKey(string $userUuid): string
    {
        return 'email-verify:' . $userUuid;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('Verify Your Email Address')
            ->view('emails.verify-email', [
                'user' => $notifiable,
                'verificationUrl' => $this->verificationUrl($notifiable),
            ]);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}

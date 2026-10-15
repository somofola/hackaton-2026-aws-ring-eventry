<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SecondaryEmailConfirmation extends Notification
{
    use Queueable;

    public function __construct(
        private string $confirmationUrl,
        private string $pendingEmail,
        private string $userName = '',
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Confirm Your Recovery Email – Eventry')
            ->greeting('Hello ' . ($this->userName ?: 'there') . ',')
            ->line('You requested to add **' . $this->pendingEmail . '** as a recovery email for your Eventry account.')
            ->line('This email will allow you to log in if your primary work email is ever changed.')
            ->action('Confirm Recovery Email', $this->confirmationUrl)
            ->line('This link expires in 24 hours. If you did not make this request, you can safely ignore this email.')
            ->salutation('The Eventry Team');
    }
}

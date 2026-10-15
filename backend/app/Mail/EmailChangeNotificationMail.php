<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EmailChangeNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $newEmail,
    ) {}

    public function build(): static
    {
        return $this->subject('Email Change Requested – Eventry')
            ->view('emails.email_change_notification');
    }
}

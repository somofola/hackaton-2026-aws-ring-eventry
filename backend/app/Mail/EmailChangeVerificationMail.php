<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EmailChangeVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $userName,
        public string $pendingEmail,
        public string $confirmationUrl,
    ) {}

    public function build(): static
    {
        return $this->subject('Verify Your New Email Address – Eventry')
            ->view('emails.email_change_verification');
    }
}

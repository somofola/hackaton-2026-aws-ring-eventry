<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SecondaryEmailConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $userName,
        public string $pendingEmail,
        public string $confirmationUrl,
    ) {}

    public function build(): static
    {
        return $this->subject('Confirm Your Recovery Email – Eventry')
            ->view('emails.secondary_email_confirmation');
    }
}

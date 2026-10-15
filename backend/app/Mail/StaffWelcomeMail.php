<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class StaffWelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $staffName,
        public string $staffEmail,
        public string $temporaryPassword,
        public string $companyName,
        public string $loginUrl,
    ) {}

    public function build(): static
    {
        return $this->subject("Welcome to Eventry – Your Account is Ready")
            ->view('emails.staff_welcome');
    }
}

<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class FailedLoginMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User   $user,
        public string $ipAddress,
        public string $attemptedAt,
    ) {}

    public function build()
    {
        return $this->subject('Failed login attempt on your Eventry account')
            ->view('emails.failed_login');
    }
}

<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $token;
    public string $resetUrl;

    public function __construct($user, string $token, string $resetUrl)
    {
        $this->user     = $user;
        $this->token    = $token;
        $this->resetUrl = $resetUrl;
    }

    public function build(): static
    {
        return $this->subject('Reset Your Eventry Password')
            ->view('emails.password_reset');
    }
}

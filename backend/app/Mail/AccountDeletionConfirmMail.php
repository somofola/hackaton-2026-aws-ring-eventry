<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AccountDeletionConfirmMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $confirmUrl;
    public int $expiryHours;

    public function __construct(string $confirmUrl, int $expiryHours)
    {
        $this->confirmUrl  = $confirmUrl;
        $this->expiryHours = $expiryHours;
    }

    public function build(): static
    {
        return $this->subject('Confirm Account Deletion — Eventry')
            ->view('emails.account_deletion_confirm');
    }
}

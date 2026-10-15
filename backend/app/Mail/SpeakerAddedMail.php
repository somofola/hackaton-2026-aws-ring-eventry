<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SpeakerAddedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $speakerName,
        public string $eventTitle,
        public ?string $sessionTitle,
        public bool $isNewAccount,
    ) {}

    public function build(): static
    {
        return $this->subject("You've been added as a speaker – {$this->eventTitle}")
            ->view('emails.speaker_added');
    }
}

<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ChatHistoryMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $chatHistory;
    public string $timestamp;

    public function __construct(string $chatHistory, string $timestamp)
    {
        $this->chatHistory = $chatHistory;
        $this->timestamp = $timestamp;
    }

    public function build(): static
    {
        return $this->subject('Your Eventry Chat History')
            ->view('emails.chat_history');
    }
}

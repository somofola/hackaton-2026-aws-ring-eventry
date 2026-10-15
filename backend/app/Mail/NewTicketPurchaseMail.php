<?php

namespace App\Mail;

use App\Models\Event;
use App\Models\EventEnrollment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewTicketPurchaseMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Event           $event,
        public EventEnrollment $enrollment,
    ) {}

    public function build()
    {
        return $this->subject("New ticket purchase — {$this->event->title}")
            ->view('emails.new_ticket_purchase');
    }
}

<?php

namespace App\Mail;

use Carbon\Carbon;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Barryvdh\DomPDF\Facade\Pdf;

class PaymentReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public Payment $payment;
    public User $user;
    public string $planName;
    public float $vat;
    public float $amountLessVat;
    public string $nextBillingDate;

    public function __construct(Payment $payment, User $user)
    {
        $this->payment = $payment;
        $this->user    = $user;

        $amount = (float) $payment->amount;
        $this->vat          = round($amount * 0.075, 2);
        $this->amountLessVat = round($amount - $this->vat, 2);

        $planName = $payment->type ?? 'Event Ticket';
        $this->planName = $payment->billing_cycle
            ? "{$planName} · {$payment->billing_cycle}"
            : $planName;

        $paidDate = Carbon::parse($payment->paid_at ?? $payment->created_at);
        $this->nextBillingDate = match ($payment->billing_cycle) {
            'yearly'  => $paidDate->copy()->addYear()->format('M d, Y'),
            'monthly' => $paidDate->copy()->addMonth()->format('M d, Y'),
            default   => $paidDate->copy()->addDays(30)->format('M d, Y'),
        };
    }

    public function build(): static
    {
        $data = [
            'payment'        => $this->payment,
            'user'           => $this->user,
            'planName'       => $this->planName,
            'vat'            => $this->vat,
            'amountLessVat'  => $this->amountLessVat,
            'nextBillingDate'=> $this->nextBillingDate,
        ];

        $pdf = Pdf::loadView('emails.payment_receipt_pdf', $data)
            ->setPaper('a4', 'portrait');

        $fileName = "Eventry_Receipt_{$this->payment->payment_reference}.pdf";

        return $this->subject("Payment Confirmed — Eventry Receipt #{$this->payment->payment_reference}")
            ->view('emails.payment_receipt')
            ->with($data)
            ->attachData($pdf->output(), $fileName, ['mime' => 'application/pdf']);
    }
}

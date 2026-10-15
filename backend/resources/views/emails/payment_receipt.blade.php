@extends('emails.layouts.base')

@section('title', "Payment Confirmed â€” Eventry Receipt #{{ $payment->payment_reference }}")

@section('header-right')
  <div style="text-align:right;">
    <div style="color:rgba(255,255,255,0.55);font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Receipt</div>
    <div style="color:#ffffff;font-size:13px;font-weight:700;margin-top:4px;font-family:monospace;">#{{ $payment->payment_reference }}</div>
    <div style="color:rgba(255,255,255,0.65);font-size:11px;margin-top:4px;">{{ now()->format('M d, Y') }}</div>
    <div style="margin-top:10px;">
      <span style="background:#22c55e;color:#fff;font-size:10px;font-weight:700;letter-spacing:1.2px;
                   text-transform:uppercase;padding:3px 10px;border-radius:20px;">âœ“ Paid</span>
    </div>
  </div>
@endsection

@section('body')
  <p style="margin:0 0 24px 0;font-size:15px;color:#374151;">
    Hi <strong>{{ $user->name }}</strong>,<br><br>
    Thank you for your payment. Your subscription has been activated successfully.
    Please find your receipt details below.
  </p>

  {{-- Summary box --}}
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f8faff;border:1px solid #dbeafe;border-radius:8px;margin-bottom:28px;">
    <tr>
      <td style="padding:20px 24px;">
        <div style="font-size:10px;font-weight:700;color:#3b82f6;letter-spacing:1px;text-transform:uppercase;margin-bottom:14px;">
          Payment Summary
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Plan</td>
            <td align="right" style="color:#111827;font-weight:600;">{{ $planName }}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Subtotal</td>
            <td align="right" style="color:#111827;">{{ $payment->currency }} {{ number_format($amountLessVat, 2) }}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:5px 0;">VAT (7.5%)</td>
            <td align="right" style="color:#111827;">{{ $payment->currency }} {{ number_format($vat, 2) }}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:10px;border-top:1px solid #e5e7eb;"></td>
          </tr>
          <tr>
            <td style="color:#111827;font-weight:700;font-size:14px;padding:4px 0;">Total Paid</td>
            <td align="right" style="color:#0060D4;font-weight:700;font-size:14px;">
              {{ $payment->currency }} {{ number_format($payment->amount, 2) }}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  {{-- Transaction meta --}}
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;font-size:12px;">
    <tr>
      <td width="50%" style="padding:6px 0;">
        <div style="color:#9ca3af;">Transaction ID</div>
        <div style="color:#111827;font-family:monospace;font-weight:500;margin-top:2px;">{{ $payment->payment_reference }}</div>
      </td>
      <td width="50%" style="padding:6px 0;">
        <div style="color:#9ca3af;">Payment Date</div>
        <div style="color:#111827;font-weight:500;margin-top:2px;">
          {{ \Carbon\Carbon::parse($payment->paid_at ?? $payment->created_at)->format('M d, Y') }}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:6px 0;">
        <div style="color:#9ca3af;">Billing Cycle</div>
        <div style="color:#111827;font-weight:500;margin-top:2px;text-transform:capitalize;">
          {{ $payment->billing_cycle ?? 'One-off' }}
        </div>
      </td>
      <td style="padding:6px 0;">
        <div style="color:#9ca3af;">Next Billing</div>
        <div style="color:#111827;font-weight:500;margin-top:2px;">{{ $nextBillingDate }}</div>
      </td>
    </tr>
  </table>

  <p style="margin:0;font-size:13px;color:#6b7280;">
    You can view and download your full invoice from your
    <a href="{{ config('app.url') }}/user/billing" style="color:#0060D4;text-decoration:none;">Billing page</a>.
  </p>
@endsection

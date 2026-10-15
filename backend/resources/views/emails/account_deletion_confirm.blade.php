@extends('emails.layouts.base')

@section('title', 'Confirm Account Deletion â€” Eventry')

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">Confirm Account Deletion</h2>
  <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi,</p>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    We received a request to delete the Eventry account tied to this email address.
    Click the button below to confirm. If you don't confirm, no action is taken.
  </p>

  <table cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
    <tr>
      <td style="border-radius:8px;background:#dc2626;">
        <a href="{{ $confirmUrl }}"
           style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          Confirm Deletion
        </a>
      </td>
    </tr>
  </table>

  <div style="background:#fff8f0;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#92400e;">
      âš ï¸ This link expires in <strong>{{ $expiryHours }} hours</strong>. If you did not request this,
      ignore this email â€” your account stays active.
    </p>
  </div>

  <p style="margin:0;font-size:13px;color:#9ca3af;">
    Confirming starts a 60-day grace period before permanent deletion. Logging back in during
    that window cancels the deletion automatically.
  </p>
@endsection

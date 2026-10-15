@extends('emails.layouts.base')

@section('title', 'Confirm Your Recovery Email â€” Eventry')

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">Confirm Your Recovery Email</h2>
  <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi <strong>{{ $userName }}</strong>,</p>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    You requested to add <strong>{{ $pendingEmail }}</strong> as a recovery email for your Eventry account.
    This email will allow you to log in if your primary work email is ever changed.
    Click the button below to confirm.
  </p>

  <table cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
    <tr>
      <td style="border-radius:8px;background:#0060D4;">
        <a href="{{ $confirmationUrl }}"
           style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          Confirm Recovery Email
        </a>
      </td>
    </tr>
  </table>

  <div style="background:#fff8f0;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#92400e;">
      âš ï¸ This link expires in <strong>24 hours</strong>. If you did not make this request,
      you can safely ignore this email â€” your account is not affected.
    </p>
  </div>

  <p style="margin:0;font-size:13px;color:#9ca3af;">
    For security, never share this link with anyone.
  </p>
@endsection

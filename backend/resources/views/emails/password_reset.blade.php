@extends('emails.layouts.base')

@section('title', 'Reset Your Password â€” Eventry')

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">Reset Your Password</h2>
  <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi <strong>{{ $user->name }}</strong>,</p>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    We received a request to reset the password for your Eventry account.
    Click the button below to choose a new password.
  </p>

  <table cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
    <tr>
      <td style="border-radius:8px;background:#0060D4;">
        <a href="{{ $resetUrl }}"
           style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          Reset Password
        </a>
      </td>
    </tr>
  </table>

  <div style="background:#fff8f0;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#92400e;">
      âš ï¸ This link expires in <strong>60 minutes</strong>. If you did not request a password reset,
      please ignore this email â€” your account is safe.
    </p>
  </div>

  <p style="margin:0;font-size:13px;color:#9ca3af;">
    For security, never share this link with anyone.
  </p>
@endsection

@extends('emails.layouts.base')

@section('title', 'Verify Your Email â€” Eventry')

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">Verify Your Email Address</h2>
  <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi <strong>{{ $user->name }}</strong>,</p>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    Thank you for signing up to Eventry! Please verify your email address to activate your account
    and start creating your digital business cards.
  </p>

  <table cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
    <tr>
      <td style="border-radius:8px;background:#0060D4;">
        <a href="{{ $verificationUrl }}"
           style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          Verify Email Address
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 8px 0;font-size:13px;color:#9ca3af;">
    Or copy and paste this link into your browser:
  </p>
  <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;font-family:monospace;background:#f9fafb;padding:10px 12px;border-radius:6px;">
    {{ $verificationUrl }}
  </p>

  <p style="margin:24px 0 0 0;font-size:13px;color:#9ca3af;">
    If you did not create an account, no action is required.
    This link expires in 60 minutes.
  </p>
@endsection

@extends('emails.layouts.base')

@section('title', 'Your Chat History â€” Eventry')

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">Your Support Chat History</h2>
  <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hello,</p>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    As requested, here is a copy of your recent conversation with our support assistant, Stella.
  </p>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
    <p style="margin:0 0 8px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">
      Chat recorded on {{ \Carbon\Carbon::parse($timestamp)->format('F j, Y \a\t g:i A') }}
    </p>
    <div style="font-size:14px;color:#374151;line-height:1.8;white-space:pre-wrap;">{{ $chatHistory }}</div>
  </div>

  <p style="margin:0 0 12px 0;font-size:14px;color:#6b7280;">
    If you have any further questions, feel free to reach out to us at
    <a href="mailto:support@eventry.app" style="color:#0060D4;text-decoration:none;">support@eventry.app</a>.
  </p>

  <p style="margin:0;font-size:13px;color:#9ca3af;">
    Thank you for using Eventry!
  </p>
@endsection

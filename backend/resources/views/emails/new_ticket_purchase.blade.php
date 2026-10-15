@extends('emails.layouts.base')

@section('title', 'New Ticket Purchase â€” Eventry')

@section('header-right')
  <div style="text-align:right;">
    <div style="background:#22c55e;color:#fff;font-size:10px;font-weight:700;letter-spacing:1.2px;
                text-transform:uppercase;padding:4px 12px;border-radius:20px;display:inline-block;">
      New Registration
    </div>
  </div>
@endsection

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">New Ticket Purchase</h2>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    Someone just registered for your event <strong>{{ $event->title }}</strong>.
  </p>

  {{-- Attendee details --}}
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 12px 0;font-size:10px;font-weight:700;color:#16a34a;letter-spacing:1px;text-transform:uppercase;">
          Attendee Info
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Name</td>
            <td align="right" style="color:#111827;font-weight:600;">{{ $enrollment->user_name }}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Email</td>
            <td align="right" style="color:#111827;">{{ $enrollment->user_email }}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Confirmation #</td>
            <td align="right" style="color:#111827;font-weight:600;font-family:monospace;">{{ $enrollment->confirmation_number }}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Registered At</td>
            <td align="right" style="color:#111827;">{{ $enrollment->enrolled_at ? \Carbon\Carbon::parse($enrollment->enrolled_at)->format('d M Y, H:i') . ' UTC' : now()->format('d M Y, H:i') . ' UTC' }}</td>
          </tr>
          @if($enrollment->ticketCategory)
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Ticket Type</td>
            <td align="right" style="color:#111827;">{{ $enrollment->ticketCategory->name }}</td>
          </tr>
          @endif
        </table>
      </td>
    </tr>
  </table>

  {{-- Event stats --}}
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f8faff;border:1px solid #dbeafe;border-radius:8px;margin-bottom:28px;">
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 12px 0;font-size:10px;font-weight:700;color:#3b82f6;letter-spacing:1px;text-transform:uppercase;">
          Event Overview
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Total Registered</td>
            <td align="right" style="color:#111827;font-weight:600;">{{ $event->current_attendees }} / {{ $event->max_attendees }}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Date</td>
            <td align="right" style="color:#111827;">{{ \Carbon\Carbon::parse($event->start_date)->format('D, d M Y') }}</td>
          </tr>
          @if($event->location)
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Location</td>
            <td align="right" style="color:#111827;">{{ $event->location }}</td>
          </tr>
          @endif
        </table>
      </td>
    </tr>
  </table>

  <table cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
    <tr>
      <td style="border-radius:8px;background:#0060D4;">
        <a href="{{ config('app.url') }}/corporate/events/{{ $event->uuid }}/manage"
           style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          Manage Attendees
        </a>
      </td>
    </tr>
  </table>
@endsection

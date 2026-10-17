@extends('emails.layouts.base')

@section('title', 'Support Ticket Created â€” Eventry')

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">Support Ticket Opened</h2>
  <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi <strong>{{ $ticket->createdBy->name ?? 'there' }}</strong>,</p>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    Your support ticket has been created and our team has been notified.
    We'll get back to you as soon as possible.
  </p>

  {{-- Ticket details --}}
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f8faff;border:1px solid #dbeafe;border-radius:8px;margin-bottom:28px;">
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 14px 0;font-size:10px;font-weight:700;color:#3b82f6;letter-spacing:1px;text-transform:uppercase;">
          Ticket Details
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          <tr>
            <td style="color:#6b7280;padding:5px 0;width:120px;">Title</td>
            <td style="color:#111827;font-weight:600;padding:5px 0;">{{ $ticket->title }}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Priority</td>
            <td style="color:#111827;padding:5px 0;text-transform:capitalize;">{{ $ticket->priority->name ?? 'N/A' }}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Status</td>
            <td style="color:#111827;padding:5px 0;text-transform:capitalize;">{{ $ticket->status->name ?? 'Open' }}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Assigned To</td>
            <td style="color:#111827;padding:5px 0;">{{ $ticket->assignedAdmin->name ?? 'Support Team' }}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Created</td>
            <td style="color:#111827;padding:5px 0;">{{ $ticket->created_at->format('M d, Y H:i') }}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  @if($ticket->content)
  <div style="background:#f9fafb;border-left:3px solid #0060D4;padding:14px 16px;border-radius:0 6px 6px 0;margin-bottom:24px;">
    <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
    <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">{{ $ticket->content }}</p>
  </div>
  @endif

  <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
    <tr>
      <td style="border-radius:8px;background:#0060D4;">
        <a href="{{ config('app.frontend_url') }}/tickets/{{ $ticket->id }}"
           style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          View Ticket
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:0;font-size:13px;color:#9ca3af;">
    You can track your ticket status at any time from your dashboard.
    For urgent matters, contact <a href="mailto:{{ config('app.support_email') }}" style="color:#0060D4;text-decoration:none;">{{ config('app.support_email') }}</a>.
  </p>
@endsection

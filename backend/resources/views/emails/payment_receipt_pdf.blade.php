<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt #{{ $payment->payment_reference }}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; }

    .header { background: #0060D4; color: #fff; padding: 28px 32px 22px; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .brand-sub { font-size: 11px; color: rgba(255,255,255,0.65); margin-top: 2px; }
    .receipt-label { text-align: right; }
    .receipt-label .label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,0.55); }
    .receipt-label .ref { font-size: 14px; font-weight: 700; margin-top: 4px; }
    .receipt-label .date { font-size: 11px; color: rgba(255,255,255,0.65); margin-top: 4px; }
    .paid-badge { display: inline-block; background: #22c55e; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; padding: 3px 12px; border-radius: 20px; margin-top: 16px; }

    .body { padding: 28px 32px; }

    .billing-row { display: flex; gap: 24px; margin-bottom: 24px; }
    .billing-col { flex: 1; }
    .billing-col .col-label { font-size: 10px; font-weight: 700; color: #6b7280; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
    .billing-col .col-name { font-weight: 600; font-size: 13px; color: #111827; }
    .billing-col .col-detail { font-size: 12px; color: #6b7280; margin-top: 3px; }

    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 0 0 22px; }

    table.items { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    table.items thead tr { background: #f9fafb; }
    table.items th { padding: 9px 10px; font-size: 10px; font-weight: 700; color: #6b7280; letter-spacing: 1px; text-transform: uppercase; text-align: left; }
    table.items th:last-child { text-align: right; }
    table.items td { padding: 13px 10px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
    table.items td:last-child { text-align: right; font-weight: 600; color: #111827; }
    .item-sub { font-size: 11px; color: #6b7280; margin-top: 3px; }

    .totals { float: right; width: 240px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
    .total-row.final { border-top: 2px solid #111827; padding-top: 10px; margin-top: 5px; }
    .total-row.final .label { font-weight: 700; font-size: 14px; color: #111827; }
    .total-row.final .value { font-weight: 700; font-size: 14px; color: #0060D4; }
    .total-row .label { color: #6b7280; }
    .total-row .value { color: #374151; }

    .meta-box { background: #f8faff; border: 1px solid #dbeafe; border-radius: 8px; padding: 14px 16px; margin-top: 28px; clear: both; }
    .meta-box .meta-title { font-size: 10px; font-weight: 700; color: #3b82f6; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; }
    .meta-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .meta-item { width: 48%; }
    .meta-item .k { font-size: 11px; color: #6b7280; }
    .meta-item .v { font-size: 12px; color: #111827; font-weight: 500; margin-top: 2px; word-break: break-all; }

    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; margin-top: 24px; }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-row">
      <div>
        <div class="brand">Eventry</div>
        <div class="brand-sub">Digital Business Cards</div>
      </div>
      <div class="receipt-label">
        <div class="label">Receipt</div>
        <div class="ref">#{{ $payment->payment_reference }}</div>
        <div class="date">{{ now()->format('M d, Y') }}</div>
      </div>
    </div>
    <div class="paid-badge">&#10003; Paid</div>
  </div>

  <div class="body">

    {{-- Billing --}}
    <div class="billing-row">
      <div class="billing-col">
        <div class="col-label">From</div>
        <div class="col-name">Eventry Inc.</div>
        <div class="col-detail">billing@eventry.app</div>
        <div class="col-detail">app.eventry.app</div>
      </div>
      <div class="billing-col">
        <div class="col-label">Billed To</div>
        <div class="col-name">{{ $user->name }}</div>
        <div class="col-detail">{{ $user->email }}</div>
        @if($user->phone)
          <div class="col-detail">{{ $user->phone }}</div>
        @endif
      </div>
    </div>

    <hr class="divider" />

    {{-- Line items --}}
    <table class="items">
      <thead>
        <tr>
          <th>Description</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            {{ $planName }}
            <div class="item-sub">Subscription &middot; {{ strtoupper($payment->currency) }}</div>
          </td>
          <td>{{ strtoupper($payment->currency) }} {{ number_format($amountLessVat, 2) }}</td>
          <td>{{ strtoupper($payment->currency) }} {{ number_format($amountLessVat, 2) }}</td>
        </tr>
      </tbody>
    </table>

    {{-- Totals --}}
    <div class="totals">
      <div class="total-row">
        <span class="label">Subtotal</span>
        <span class="value">{{ strtoupper($payment->currency) }} {{ number_format($amountLessVat, 2) }}</span>
      </div>
      <div class="total-row">
        <span class="label">VAT (7.5%)</span>
        <span class="value">{{ strtoupper($payment->currency) }} {{ number_format($vat, 2) }}</span>
      </div>
      <div class="total-row final">
        <span class="label">Total Paid</span>
        <span class="value">{{ strtoupper($payment->currency) }} {{ number_format($payment->amount, 2) }}</span>
      </div>
    </div>

    {{-- Transaction details --}}
    <div class="meta-box">
      <div class="meta-title">Transaction Details</div>
      <div class="meta-grid">
        <div class="meta-item">
          <div class="k">Transaction ID</div>
          <div class="v">{{ $payment->payment_reference }}</div>
        </div>
        <div class="meta-item">
          <div class="k">Payment Date</div>
          <div class="v">{{ \Carbon\Carbon::parse($payment->paid_at ?? $payment->created_at)->format('M d, Y') }}</div>
        </div>
        <div class="meta-item">
          <div class="k">Billing Cycle</div>
          <div class="v" style="text-transform:capitalize;">{{ $payment->billing_cycle ?? 'One-off' }}</div>
        </div>
        <div class="meta-item">
          <div class="k">Next Billing</div>
          <div class="v">{{ $nextBillingDate }}</div>
        </div>
      </div>
    </div>

  </div>

  <div class="footer">
    <span>Thank you for choosing Eventry!</span>
    <span>{{ config('app.support_email') }} &middot; eventry.app</span>
  </div>

</body>
</html>

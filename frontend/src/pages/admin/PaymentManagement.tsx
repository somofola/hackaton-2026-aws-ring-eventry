import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Download, DollarSign, CreditCard, RefreshCw, AlertCircle,
  FileText, FileSpreadsheet, FileDown, Loader2, TrendingUp,
} from "lucide-react";
import api from "@/services/api";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface TicketSale {
  id: number;
  reference: string;
  buyer_name: string;
  buyer_email: string;
  event_title: string;
  event_date: string | null;
  ticket_category: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface EventOption {
  id: number;
  title: string;
  date: string;
}

interface Summary {
  total_revenue: number;
  total_sales: number;
  paid_count: number;
  pending_count: number;
  failed_count: number;
}

const STATUS_COLORS: Record<string, string> = {
  paid:       "bg-green-100 text-green-700",
  successful: "bg-green-100 text-green-700",
  pending:    "bg-yellow-100 text-yellow-700",
  failed:     "bg-red-100 text-red-700",
  refunded:   "bg-gray-100 text-gray-600",
};

function fmt(amount: number, currency: string) {
  return amount === 0 ? "Free" : `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const PaymentManagement = () => {
  const [sales, setSales]         = useState<TicketSale[]>([]);
  const [events, setEvents]       = useState<EventOption[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  // Filters (applied client-side after initial full load; we also re-fetch on server for event/date changes)
  const [search, setSearch]       = useState("");
  const [eventId, setEventId]     = useState("all");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [status, setStatus]       = useState("all");

  // Exchange rates: units of {currency} per 1 USD. toUSD = amount / rate.
  const { rates, ratesLoading, ratesFallback } = useExchangeRates();

  // Total revenue normalized to USD. Sums only realized revenue (paid / successful)
  // across mixed-currency rows. Backend summary.total_revenue is a raw mixed-currency
  // sum and isn't meaningful for display.
  const PAID_STATUSES = new Set(["paid", "successful"]);
  const totalRevenueUSD = sales.reduce((sum, s) => {
    if (!PAID_STATUSES.has(s.status)) return sum;
    const rate = rates[(s.currency ?? "USD").toUpperCase()] ?? 1;
    return sum + (Number(s.amount) || 0) / rate;
  }, 0);
  const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (eventId !== "all")  params.event_id  = eventId;
      if (dateFrom)           params.date_from = dateFrom;
      if (dateTo)             params.date_to   = dateTo;
      if (status !== "all")   params.status    = status;
      if (search)             params.search    = search;

      const res = await api.get("/corporate/ticket-sales", { params });
      setSales(res.data.sales ?? []);
      setEvents(res.data.events ?? []);
      setSummary(res.data.summary ?? null);
    } catch {
      setError("Failed to load ticket sales.");
    } finally {
      setLoading(false);
    }
  }, [eventId, dateFrom, dateTo, status, search]);

  // Fetch on filter change with a small debounce for search
  useEffect(() => {
    const t = setTimeout(fetchSales, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchSales]);

  // ── Exports ──────────────────────────────────────────────────────────────

  const exportHeaders = ["Reference", "Buyer", "Email", "Event", "Event Date", "Ticket Type", "Amount", "Currency", "Status", "Paid At"];

  function rowToArray(s: TicketSale) {
    return [
      s.reference,
      s.buyer_name,
      s.buyer_email,
      s.event_title,
      s.event_date ? fmtDate(s.event_date) : "—",
      s.ticket_category,
      s.amount,
      s.currency,
      s.status,
      s.paid_at ? fmtDate(s.paid_at) : "—",
    ];
  }

  const exportCSV = () => {
    const lines = [exportHeaders.join(",")];
    sales.forEach((s) => {
      lines.push(rowToArray(s).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `ticket-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([exportHeaders, ...sales.map(rowToArray)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ticket Sales");
    XLSX.writeFile(wb, `ticket-sales-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Ticket Sales Report", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    autoTable(doc, {
      head:       [exportHeaders],
      body:       sales.map(rowToArray),
      startY:     28,
      styles:     { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`ticket-sales-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ticket Sales</h1>
            <p className="text-gray-600 mt-1">Revenue from event ticket purchases</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading || sales.length === 0}>
              <FileDown className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={loading || sales.length === 0}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} disabled={loading || sales.length === 0}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Revenue</p>
                <p className="text-xl font-bold text-green-600 mt-0.5">
                  {ratesLoading ? "—" : usdFmt.format(totalRevenueUSD)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Paid only · converted to USD{ratesFallback ? " (offline rates)" : ""}
                </p>
              </div>
              <DollarSign className="h-7 w-7 text-green-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Sales</p>
                <p className="text-xl font-bold text-blue-600 mt-0.5">{summary?.total_sales ?? "—"}</p>
              </div>
              <CreditCard className="h-7 w-7 text-blue-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Paid</p>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">{summary?.paid_count ?? "—"}</p>
              </div>
              <TrendingUp className="h-7 w-7 text-emerald-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Pending</p>
                <p className="text-xl font-bold text-yellow-600 mt-0.5">{summary?.pending_count ?? "—"}</p>
              </div>
              <RefreshCw className="h-7 w-7 text-yellow-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Failed</p>
                <p className="text-xl font-bold text-red-500 mt-0.5">{summary?.failed_count ?? "—"}</p>
              </div>
              <AlertCircle className="h-7 w-7 text-red-300" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search reference or buyer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={String(ev.id)}>{ev.title}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 whitespace-nowrap">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 whitespace-nowrap">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {(eventId !== "all" || dateFrom || dateTo || status !== "all" || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(""); setEventId("all"); setDateFrom(""); setDateTo(""); setStatus("all"); }}
                className="text-gray-500"
              >
                Clear filters
              </Button>
            )}
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              Transactions {!loading && <span className="text-gray-400 font-normal text-sm">({sales.length})</span>}
            </h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 p-4">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!error && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Reference</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Ticket Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading && sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                        No ticket sales found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-gray-50">
                        <TableCell>
                          <span className="font-mono text-xs text-gray-600">{sale.reference}</span>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{sale.buyer_name}</p>
                          <p className="text-xs text-gray-400">{sale.buyer_email}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{sale.event_title}</p>
                          {sale.event_date && (
                            <p className="text-xs text-gray-400">{fmtDate(sale.event_date)}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{sale.ticket_category}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-sm">{fmt(sale.amount, sale.currency)}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sale.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {fmtDate(sale.paid_at ?? sale.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default PaymentManagement;

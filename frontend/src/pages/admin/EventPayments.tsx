
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, Filter, CreditCard, Check, X, Clock, Loader2, Gift } from "lucide-react";

interface AttendeePayment {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  enrolled_at: string;
  status: string;
  confirmation_number: string;
  payment_reference: string | null;
  amount: number;
  currency: string;
  payment_status: 'paid' | 'pending' | 'failed' | 'refunded' | 'free';
  paid_at: string | null;
}

const getPaymentBadge = (status: string) => {
  switch (status) {
    case 'paid':
    case 'successful':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><Check className="w-3 h-3 mr-1" />Paid</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><X className="w-3 h-3 mr-1" />Failed</Badge>;
    case 'refunded':
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Refunded</Badge>;
    case 'free':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><Gift className="w-3 h-3 mr-1" />Free</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const EventPayments = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['event-payments', uuid],
    queryFn: async () => {
      const { data } = await api.get(`/events/${uuid}/payments`);
      return data as AttendeePayment[];
    },
    enabled: !!uuid,
  });

  const filtered = records.filter(r => {
    const matchesSearch =
      r.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.payment_reference ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.confirmation_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isPaid = (r: AttendeePayment) => r.payment_status === 'paid' || r.payment_status === 'successful';
  const totalRevenue = records.filter(isPaid).reduce((s, r) => s + r.amount, 0);
  const totalTransactions = records.filter(r => r.payment_reference !== null).length;
  const refundedAmount = records.filter(r => r.payment_status === 'refunded').reduce((s, r) => s + r.amount, 0);
  const paidCount = records.filter(isPaid).length;
  const freeCount = records.filter(r => r.payment_status === 'free').length;
  const pendingCount = records.filter(r => r.payment_status === 'pending').length;

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : "—";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(`/admin/events/${uuid}/manage`)} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event Management
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Event Payments</h1>
            <p className="text-gray-600 mt-1">Payment breakdown for all attendees</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{totalTransactions}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Attendees</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{records.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Paid</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{paidCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Free / Pending</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-600">{freeCount} / {pendingCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Refunded</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">${refundedAmount.toFixed(2)}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5" />Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input placeholder="Search by name, email, reference..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Filter by payment status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><CreditCard className="mr-2 h-5 w-5" />Attendee Payments ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Attendee</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Confirmation</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.user_name}</div>
                          <div className="text-sm text-gray-500">{r.user_email}</div>
                        </TableCell>
                        <TableCell>
                          {r.amount > 0 ? `$${r.amount.toFixed(2)} ${r.currency}` : <span className="text-gray-400">Free</span>}
                        </TableCell>
                        <TableCell>{getPaymentBadge(r.payment_status)}</TableCell>
                        <TableCell className="font-mono text-sm">{r.payment_reference ?? "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{r.confirmation_number}</TableCell>
                        <TableCell>{formatDate(r.paid_at ?? r.enrolled_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No attendees found.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default EventPayments;

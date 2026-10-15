import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEvent, useEventEnrollments } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Search, UserCheck, Mail, Phone, Download,
  Loader2, Users, ChevronLeft, ChevronRight,
} from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { checkInEnrollment } from "@/services/eventService";

const PAGE_SIZES = [10, 25, 50, 100];

export default function EventAttendees() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { data: event, isLoading: eventLoading } = useEvent(uuid ?? "");
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useEventEnrollments(uuid ?? "");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [checkingIn, setCheckingIn] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (eventLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-gray-500">Event not found.</div>
      </AdminLayout>
    );
  }

  const handleCheckIn = async (enrollmentId: number, name: string) => {
    setCheckingIn(enrollmentId);
    try {
      await checkInEnrollment(uuid!, enrollmentId, "organizer");
      queryClient.invalidateQueries({ queryKey: ["event-enrollments", uuid] });
      toast({ title: "Checked in", description: name + " has been checked in." });
    } catch {
      toast({ title: "Check-in failed", variant: "destructive" });
    } finally {
      setCheckingIn(0);
    }
  };

  const handleExport = () => {
    const header = ["Name", "Email", "Confirmation", "Status", "Checked In", "Checked In At", "Enrolled At"];
    const body = enrollments.map((e) => [
      e.user_name,
      e.user_email,
      e.confirmation_number,
      e.status,
      e.checked_in ? "Yes" : "No",
      e.checked_in_at ? new Date(e.checked_in_at).toLocaleString() : "",
      new Date(e.enrolled_at).toLocaleString(),
    ]);
    const csv = [header, ...body].map((r) => r.map((v) => '"' + v + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = event.title.replace(/\s+/g, "_") + "_attendees.csv";
    a.click();
  };

  // Filtering
  const q = search.toLowerCase();
  const filtered = enrollments.filter((e) => {
    const matchSearch =
      !q ||
      e.user_name.toLowerCase().includes(q) ||
      e.user_email.toLowerCase().includes(q) ||
      e.confirmation_number.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (statusFilter === "checked-in") return e.checked_in;
    if (statusFilter === "not-checked-in") return !e.checked_in;
    if (statusFilter === "cancelled") return e.status === "cancelled";
    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  const onSearch = (val: string) => { setSearch(val); setPage(1); };
  const onFilter = (val: string) => { setStatusFilter(val); setPage(1); };
  const onPageSize = (val: number) => { setPageSize(val); setPage(1); };

  // Stats
  const total = enrollments.length;
  const checkedInCount = enrollments.filter((e) => e.checked_in).length;
  const notCheckedInCount = total - checkedInCount;
  const cancelledCount = enrollments.filter((e) => e.status === "cancelled").length;

  // Page numbers with ellipsis
  const pageNumbers: (number | null)[] = [];
  const visible = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1);
  visible.forEach((p, i) => {
    if (i > 0 && p - visible[i - 1] > 1) pageNumbers.push(null);
    pageNumbers.push(p);
  });

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate("/admin/events/" + uuid + "/manage")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Event
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Event Attendees</h1>
            <p className="text-gray-600 mt-1">{event.title}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{total}</p>
            <p className="text-sm text-gray-600">Total Registered</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{checkedInCount}</p>
            <p className="text-sm text-gray-600">Checked In</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{notCheckedInCount}</p>
            <p className="text-sm text-gray-600">Not Checked In</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{cancelledCount}</p>
            <p className="text-sm text-gray-600">Cancelled</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-enhanced">
          <div className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search name, email or confirmation..."
                  value={search}
                  onChange={(e) => onSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => onFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="checked-in">Checked In</option>
                <option value="not-checked-in">Not Checked In</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Button variant="outline" onClick={handleExport} disabled={enrollments.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </Card>

        {/* Table */}
        <Card className="card-enhanced">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              Attendee List
              {enrollmentsLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </h2>

            {enrollmentsLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading attendees...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">
                  {enrollments.length === 0 ? "No attendees yet." : "No attendees match your search."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Attendee</TableHead>
                        <TableHead>Confirmation</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {enrollment.user?.profile_image_url ? (
                                <img
                                  src={enrollment.user.profile_image_url}
                                  alt={enrollment.user_name}
                                  className="w-8 h-8 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-semibold text-gray-500">
                                  {enrollment.user_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-sm">{enrollment.user_name}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {enrollment.user_email}
                                </p>
                                {enrollment.user?.phone && (
                                  <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {enrollment.user.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-600">
                            {enrollment.confirmation_number}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                            {new Date(enrollment.enrolled_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                enrollment.status === "attended"
                                  ? "default"
                                  : enrollment.status === "cancelled"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {enrollment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {enrollment.checked_in ? (
                              <div>
                                <Badge className="bg-green-500 text-white">Checked In</Badge>
                                {enrollment.checked_in_at && (
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {new Date(enrollment.checked_in_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">Not checked in</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!enrollment.checked_in && enrollment.status !== "cancelled" && (
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600 text-white"
                                disabled={checkingIn === enrollment.id}
                                onClick={() => handleCheckIn(enrollment.id, enrollment.user_name)}
                              >
                                {checkingIn === enrollment.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                                    Check In
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => onPageSize(Number(e.target.value))}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      {PAGE_SIZES.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <span>
                      {filtered.length === 0
                        ? "0"
                        : (start + 1) + "–" + Math.min(start + pageSize, filtered.length)}{" "}
                      of {filtered.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="sm" className="px-2"
                      onClick={() => setPage(1)} disabled={safePage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <ChevronLeft className="h-4 w-4 -ml-2" />
                    </Button>
                    <Button
                      variant="outline" size="sm" className="px-2"
                      onClick={() => setPage(safePage - 1)} disabled={safePage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {pageNumbers.map((p, i) =>
                      p === null ? (
                        <span key={"ellipsis-" + i} className="px-1 text-gray-400 text-sm">...</span>
                      ) : (
                        <Button
                          key={p}
                          variant={safePage === p ? "default" : "outline"}
                          size="sm"
                          className="w-8 px-0"
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      )
                    )}

                    <Button
                      variant="outline" size="sm" className="px-2"
                      onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline" size="sm" className="px-2"
                      onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <ChevronRight className="h-4 w-4 -ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

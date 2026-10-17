
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, ChevronDown, ChevronUp } from "lucide-react";
import ListPagination from "@/components/ui/list-pagination";
import api from "@/services/api";

interface ArchivedEnrollment {
  id: number;
  event_id: number;
  status?: string;
  checked_in?: boolean;
  enrolled_at?: string;
}

interface ArchivedUser {
  id: number;
  original_user_id: number;
  email: string;
  payload: {
    user?: { name?: string; email?: string; role?: string };
    event_enrollments?: ArchivedEnrollment[];
  };
  purge_at: string;
  created_at: string;
}

interface PaginatedResponse {
  data: ArchivedUser[];
  current_page: number;
  last_page: number;
  total: number;
}

const PAGE_SIZE = 15;

const ArchivedUsers = () => {
  const navigate = useNavigate();
  const [archives, setArchives] = useState<ArchivedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get<PaginatedResponse>("/archived-users", {
          params: { page: currentPage, per_page: PAGE_SIZE, search: search || undefined },
        });
        setArchives(res.data.data ?? []);
        setLastPage(res.data.last_page ?? 1);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentPage, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")} className="mb-2 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Archived Users</h1>
          <p className="text-gray-600 mt-1">
            Deleted accounts, snapshotted with their event enrollments before removal.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>All Archives</CardTitle>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search by email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-64"
                />
                <Button type="submit" variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500 py-6 text-center">Loading...</p>
            ) : archives.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No archived users found.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Enrollments</TableHead>
                      <TableHead>Deleted At</TableHead>
                      <TableHead>Purge At</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archives.map((a) => {
                      const enrollments = a.payload?.event_enrollments ?? [];
                      const isOpen = expanded === a.id;
                      return (
                        <React.Fragment key={a.id}>
                          <TableRow>
                            <TableCell>{a.payload?.user?.name ?? "—"}</TableCell>
                            <TableCell>{a.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{a.payload?.user?.role ?? "—"}</Badge>
                            </TableCell>
                            <TableCell>{enrollments.length}</TableCell>
                            <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(a.purge_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {enrollments.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpanded(isOpen ? null : a.id)}
                                >
                                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          {isOpen && enrollments.length > 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-gray-50">
                                <div className="text-xs text-gray-600 space-y-1 py-2">
                                  {enrollments.map((e) => (
                                    <div key={e.id} className="flex gap-4">
                                      <span>Event #{e.event_id}</span>
                                      <span>Status: {e.status ?? "—"}</span>
                                      <span>Checked in: {e.checked_in ? "Yes" : "No"}</span>
                                      <span>Enrolled: {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : "—"}</span>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
                <ListPagination
                  currentPage={currentPage}
                  totalPages={lastPage}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ArchivedUsers;

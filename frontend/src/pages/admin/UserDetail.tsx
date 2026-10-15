
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Edit, UserX, Mail, Phone, Building2, MapPin, Calendar } from "lucide-react";
import api from "@/services/api";

interface UserFull {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  phone?: string;
  company?: string;
  address?: string;
  bio?: string;
  profile_image_url?: string;
  created_at?: string;
  cards?: unknown[];
  events?: unknown[];
  enrollments?: unknown[];
}

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  "super-admin": "bg-purple-100 text-purple-700",
  corporate: "bg-green-100 text-green-700",
  team: "bg-yellow-100 text-yellow-700",
  user: "bg-blue-100 text-blue-700",
};

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<UserFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get(`/users/${id}`);
        setUser(res.data);
      } catch {
        toast({ title: "Error", description: "Failed to load user.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  const handleBlock = async () => {
    try {
      await api.post(`/users/${id}/block`);
      toast({ title: "User blocked", description: "User has been blocked successfully." });
      navigate("/admin/users");
    } catch {
      toast({ title: "Error", description: "Failed to block user.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900">User not found</h1>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/users")}>
            Back to Users
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate("/admin/users")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600">User Details</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => navigate(`/admin/users/${id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit User
            </Button>
            <Button variant="destructive" onClick={handleBlock}>
              <UserX className="mr-2 h-4 w-4" />
              Block User
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.profile_image_url && (
                <img
                  src={user.profile_image_url}
                  alt={user.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              )}
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              {user.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium">{user.phone}</p>
                  </div>
                </div>
              )}
              {user.company && (
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Company</p>
                    <p className="font-medium">{user.company}</p>
                  </div>
                </div>
              )}
              {user.address && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="font-medium">{user.address}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Role</p>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ROLE_STYLES[user.role] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
              {user.status && (
                <div className="flex items-center space-x-3">
                  <div className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.status}
                    </span>
                  </div>
                </div>
              )}
              {user.created_at && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Joined</p>
                    <p className="font-medium">
                      {new Date(user.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
              {user.bio && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-1">Bio</p>
                  <p className="text-sm text-gray-700">{user.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {user.cards?.length ?? 0}
                  </div>
                  <div className="text-sm text-gray-600">Business Cards</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {user.events?.length ?? 0}
                  </div>
                  <div className="text-sm text-gray-600">Events</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {user.enrollments?.length ?? 0}
                  </div>
                  <div className="text-sm text-gray-600">Enrollments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserDetail;

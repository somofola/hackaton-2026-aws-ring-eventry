
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, DollarSign, User, Calendar, CreditCard, Tag, RefreshCw } from "lucide-react";
import api from "@/services/api";

interface AdminPayment {
  id: number;
  payment_reference?: string;
  amount: number;
  currency: string;
  status: string;
  type?: string;
  description?: string;
  billing_cycle?: string;
  payment_gateway_response?: string;
  paid_at?: string;
  created_at?: string;
  updated_at?: string;
  user?: { id: number; name: string; email: string };
  subscriptionPlan?: { id: number; name: string; price: number };
}

const STATUS_STYLES: Record<string, string> = {
  success:   "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  pending:   "bg-yellow-100 text-yellow-800",
  failed:    "bg-red-100 text-red-800",
};

function fmtAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "USD").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount);
}

const PaymentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payment, setPayment] = useState<AdminPayment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const res = await api.get(`/payments/${id}`);
        setPayment(res.data);
      } catch {
        toast({ title: "Error", description: "Failed to load payment.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </AdminLayout>
    );
  }

  if (!payment) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900">Payment not found</h1>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/payments")}>
            Back to Payments
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
            <Button variant="outline" onClick={() => navigate("/admin/payments")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Payments
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payment Details</h1>
              <p className="text-gray-600 font-mono text-sm">
                {payment.payment_reference ?? `#${payment.id}`}
              </p>
            </div>
          </div>
          <Badge className={STATUS_STYLES[payment.status] ?? "bg-gray-100 text-gray-800"}>
            {payment.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="font-semibold text-lg">
                    {fmtAmount(payment.amount, payment.currency)}
                  </p>
                </div>
              </div>
              {payment.type && (
                <div className="flex items-center space-x-3">
                  <Tag className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-medium capitalize">{payment.type}</p>
                  </div>
                </div>
              )}
              {payment.billing_cycle && (
                <div className="flex items-center space-x-3">
                  <RefreshCw className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Billing Cycle</p>
                    <p className="font-medium capitalize">{payment.billing_cycle}</p>
                  </div>
                </div>
              )}
              {payment.description && (
                <div className="flex items-start space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="font-medium">{payment.description}</p>
                  </div>
                </div>
              )}
              {payment.paid_at && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Paid At</p>
                    <p className="font-medium">
                      {new Date(payment.paid_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {payment.created_at && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="font-medium">
                      {new Date(payment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {payment.payment_gateway_response && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-1">Gateway Response</p>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(payment.payment_gateway_response!), null, 2);
                      } catch {
                        return payment.payment_gateway_response;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent>
                {payment.user ? (
                  <div className="flex items-start space-x-3">
                    <User className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{payment.user.name}</p>
                      <p className="text-sm text-gray-500">{payment.user.email}</p>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-sm mt-1"
                        onClick={() => navigate(`/admin/users/${payment.user!.id}`)}
                      >
                        View User →
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No user information</p>
                )}
              </CardContent>
            </Card>

            {payment.subscriptionPlan && (
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Plan Name</p>
                    <p className="font-medium">{payment.subscriptionPlan.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Plan Price</p>
                    <p className="font-medium">{fmtAmount(payment.subscriptionPlan.price, payment.currency)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PaymentDetail;

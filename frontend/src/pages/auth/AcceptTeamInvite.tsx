import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, Users } from "lucide-react";
import api from "@/services/api";
import { BRAND_NAME } from "@/lib/brand";

type Step = "loading" | "invalid" | "form" | "done";

interface InviteInfo {
  email: string;
  event: string;
  event_date: string | null;
  role: string;
}

const AcceptTeamInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { toast }      = useToast();
  const token          = searchParams.get("token") ?? "";

  const [step, setStep]         = useState<Step>("loading");
  const [info, setInfo]         = useState<InviteInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "", gender: "", phone: "", password: "", password_confirmation: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!token) { setStep("invalid"); return; }
    api.get("/team-invite/validate", { params: { token } })
      .then(({ data }) => { setInfo(data); setStep("form"); })
      .catch(() => setStep("invalid"));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/team-invite/accept", { token, ...form });
      setStep("done");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to create account. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = form.name.trim() && form.gender && form.phone.trim()
    && form.password.length >= 8 && form.password === form.password_confirmation;

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Invalid Invitation</h1>
          <p className="text-sm text-gray-500">
            This invitation link is invalid or has already been used. Please contact the event organiser.
          </p>
          <Button variant="outline" onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Account Created!</h1>
          <p className="text-sm text-gray-500">
            Your account has been set up and you've been added to the team for <strong>{info?.event}</strong>.
            You can now log in with your email and password.
          </p>
          <Button className="w-full" onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">{BRAND_NAME}</span>
          </div>
          <h1 className="text-xl font-bold">Accept Team Invitation</h1>
          <p className="text-sm text-blue-100 mt-1">You've been invited to join the event team</p>
        </div>

        {/* Event info */}
        {info && (
          <div className="bg-blue-50 border-b border-blue-100 px-8 py-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Event</p>
            <p className="font-semibold text-gray-900">{info.event}</p>
            {info.event_date && <p className="text-sm text-gray-500 mt-0.5">{info.event_date}</p>}
            <p className="text-xs text-gray-400 mt-1">Role: {info.role} · {info.email}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <p className="text-sm text-gray-600">Complete your profile to create your {BRAND_NAME} account.</p>

          <div>
            <Label>Full Name <span className="text-red-500">*</span></Label>
            <Input
              className="mt-1"
              placeholder="Your full name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Gender <span className="text-red-500">*</span></Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone <span className="text-red-500">*</span></Label>
              <Input
                className="mt-1"
                placeholder="+1 555 000 0000"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label>Password <span className="text-red-500">*</span></Label>
            <Input
              className="mt-1"
              type="password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Confirm Password <span className="text-red-500">*</span></Label>
            <Input
              className="mt-1"
              type="password"
              placeholder="Re-enter password"
              value={form.password_confirmation}
              onChange={(e) => set("password_confirmation", e.target.value)}
              required
            />
            {form.password_confirmation && form.password !== form.password_confirmation && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit || submitting}>
            {submitting
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account…</>
              : "Create Account & Accept Invitation"
            }
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AcceptTeamInvite;

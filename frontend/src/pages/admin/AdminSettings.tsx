import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploadCrop } from "@/components/ui/image-upload-crop";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import api from "@/services/api";
import { invalidateProfile } from "@/hooks/useUserProfile";
import SupportChat from "@/components/support/SupportChat";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";

// ── helpers ────────────────────────────────────────────────────────────────

const EMPLOYEE_OPTIONS = ["1-10", "11-50", "50-100", "100-500", "500+"];

function toEmployeeRange(val: string | number | null | undefined): string {
  if (!val) return "";
  const s = String(val);
  if (EMPLOYEE_OPTIONS.includes(s)) return s;
  const n = parseInt(s, 10);
  if (isNaN(n)) return "";
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 100) return "50-100";
  if (n <= 500) return "100-500";
  return "500+";
}

function rangeToMidpoint(range: string): number | undefined {
  const map: Record<string, number> = {
    "1-10": 5, "11-50": 30, "50-100": 75, "100-500": 300, "500+": 500,
  };
  return map[range];
}

function toYear(val: string | null | undefined): string {
  if (!val) return "";
  const m = String(val).match(/^(\d{4})/);
  return m ? m[1] : String(val);
}

function getInitials(name?: string) {
  if (!name) return "CO";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Toggle switch (matches user/Settings.tsx inline style) ─────────────────
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
      checked ? "bg-primary" : "bg-gray-200"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
        checked ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </button>
);

// ── Main component ─────────────────────────────────────────────────────────

const AdminSettings = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "company");

  // ── Company profile state ────────────────────────────────────────────────
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [userId, setUserId] = useState<number>(0);

  const [company, setCompany] = useState({
    name: "", company: "", email: "", phone: "",
    website: "", address: "", description: "",
    industry: "", founded_date: "", employee_count: "", gender: "",
  });

  // Logo
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Email change pending state
  const [originalEmail, setOriginalEmail] = useState("");
  const [emailPending, setEmailPending] = useState("");

  // Secondary email (loaded with profile)
  const [secondaryEmail, setSecondaryEmail] = useState({
    current: "", verified_at: "", input: "", submitting: false, sent: false,
  });

  // Default template
  const [templates, setTemplates] = useState<{ id: number; name: string; thumbnail_url?: string }[]>([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState<number | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/my-company"),
      api.get("/my-card-templates"),
    ]).then(([profileRes, templatesRes]) => {
        const d = profileRes.data;
        setUserId(d.id ?? 0);
        setCompany({
          name: d.name ?? "",
          company: d.company ?? "",
          email: d.email ?? "",
          phone: d.phone ?? "",
          website: d.website ?? "",
          address: d.address ?? "",
          description: d.description ?? "",
          industry: d.industry ?? "",
          founded_date: toYear(d.founded_date),
          employee_count: toEmployeeRange(d.employee_count),
          gender: d.gender ?? "",
        });
        setOriginalEmail(d.email ?? "");
        setEmailPending(d.email_pending ?? "");
        setLogoUrl(d.profile_image_url ?? "");
        setDefaultTemplateId(d.default_card_template_id ?? null);
        setSecondaryEmail((prev) => ({
          ...prev,
          current: d.secondary_email ?? "",
          verified_at: d.secondary_email_verified_at ?? "",
        }));
        setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
      })
      .catch(() =>
        toast({ title: "Error", description: "Failed to load company profile.", variant: "destructive" })
      )
      .finally(() => setProfileLoading(false));
  }, []);

  const setField = (field: keyof typeof company) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setCompany((prev) => ({ ...prev, [field]: e.target.value }));

  const handleLogoSave = (file: File, preview: string) => {
    setLogoFile(file);
    setLogoPreview(preview);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const foundedDate = company.founded_date ? `${company.founded_date}-01-01` : undefined;
      const employeeCount = rangeToMidpoint(company.employee_count);

      let responseData: any;

      if (logoFile) {
        const fd = new FormData();
        if (company.name)        fd.append("name", company.name);
        if (company.company)     fd.append("company", company.company);
        if (company.email)       fd.append("email", company.email);
        if (company.phone)       fd.append("phone", company.phone);
        if (company.website)     fd.append("website", company.website);
        if (company.address)     fd.append("address", company.address);
        if (company.description) fd.append("description", company.description);
        if (company.industry)    fd.append("industry", company.industry);
        if (foundedDate)         fd.append("founded_date", foundedDate);
        if (employeeCount)       fd.append("employee_count", String(employeeCount));
        fd.append("gender", company.gender);
        fd.append("profile_image_file", logoFile);
        fd.append("_method", "PUT");

        const res = await api.post("/my-company", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        responseData = res.data;
        setLogoUrl(responseData.profile_image_url ?? logoUrl);
        setLogoFile(null);
        setLogoPreview("");
      } else {
        const res = await api.put("/my-company", {
          name: company.name || undefined,
          company: company.company || undefined,
          email: company.email || undefined,
          phone: company.phone || undefined,
          website: company.website || undefined,
          address: company.address || undefined,
          description: company.description || undefined,
          industry: company.industry || undefined,
          founded_date: foundedDate,
          employee_count: employeeCount,
          gender: company.gender || undefined,
        });
        responseData = res.data;
      }

      // Sync email state from response
      if (responseData.email_change_pending) {
        setEmailPending(responseData.email_pending ?? "");
        setOriginalEmail(responseData.email ?? originalEmail);
        setCompany(prev => ({ ...prev, email: responseData.email ?? prev.email }));
        toast({
          title: "Verification email sent",
          description: `A confirmation link was sent to ${responseData.email_pending}. Your current email stays active until verified.`,
          variant: "info",
        });
      } else {
        setEmailPending(responseData.email_pending ?? "");
        setOriginalEmail(responseData.email ?? company.email);
        toast({ title: "Profile updated", description: "Company profile saved successfully." });
      }

      invalidateProfile();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message ?? "Failed to save profile.",
        variant: "destructive",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Default template ──────────────────────────────────────────────────────
  const handleTemplateSave = async () => {
    setTemplateSaving(true);
    try {
      await api.post("/company/set-default-template", { template_id: defaultTemplateId });
      toast({ title: "Default template updated", description: defaultTemplateId ? "Default card template saved." : "Default template cleared." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message ?? "Failed to save template setting.",
        variant: "destructive",
      });
    } finally {
      setTemplateSaving(false);
    }
  };

  // ── Password state ────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    current_password: "", password: "", password_confirmation: "",
  });
  const [pwSaving, setPwSaving] = useState(false);

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.password !== pwForm.password_confirmation) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (pwForm.password.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters.", variant: "destructive" });
      return;
    }
    setPwSaving(true);
    try {
      await api.post("/user/change-password", pwForm);
      toast({ title: "Password updated", description: "Your password has been changed." });
      setPwForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (err: any) {
      toast({
        title: "Failed to update password",
        description: err?.response?.data?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setPwSaving(false);
    }
  };

  // ── Secondary email state ─────────────────────────────────────────────────
  const handleSecondaryEmailRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secondaryEmail.input.trim()) return;
    setSecondaryEmail((prev) => ({ ...prev, submitting: true }));
    try {
      await api.post("/user/secondary-email", { secondary_email: secondaryEmail.input });
      setSecondaryEmail((prev) => ({ ...prev, submitting: false, sent: true }));
      toast({
        title: "Confirmation sent",
        description: `Check ${secondaryEmail.input} for a confirmation link.`,
      });
    } catch (err: any) {
      setSecondaryEmail((prev) => ({ ...prev, submitting: false }));
      toast({
        title: "Error",
        description: err?.response?.data?.message ?? "Failed to send confirmation.",
        variant: "destructive",
      });
    }
  };

  // ── Notifications state ───────────────────────────────────────────────────
  const [notifTypes, setNotifTypes] = useState<any[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, Record<string, boolean>>>({});
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/notification-types"), api.get("/notification-subscriptions")])
      .then(([typesRes, subsRes]) => {
        const types = typesRes.data as any[];
        setNotifTypes(types);
        const defaults: Record<string, Record<string, boolean>> = {};
        types.forEach((t) => {
          defaults[t.id] = {};
          (t.available_channels as string[]).forEach((ch) => { defaults[t.id][ch] = true; });
        });
        (subsRes.data as any[]).forEach((s) => {
          if (defaults[s.notification_type_id]) {
            defaults[s.notification_type_id][s.channel] = s.enabled;
          }
        });
        setNotifPrefs(defaults);
      })
      .catch(() =>
        toast({ title: "Error", description: "Failed to load notification settings.", variant: "destructive" })
      )
      .finally(() => setNotifLoading(false));
  }, []);

  const togglePref = (typeId: number, channel: string) =>
    setNotifPrefs((prev) => ({
      ...prev,
      [typeId]: { ...prev[typeId], [channel]: !prev[typeId]?.[channel] },
    }));

  const handleNotificationSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSaving(true);
    try {
      const subscriptions: any[] = [];
      notifTypes.forEach((t) => {
        (t.available_channels as string[]).forEach((ch) => {
          subscriptions.push({ notification_type_id: t.id, channel: ch, enabled: notifPrefs[t.id]?.[ch] ?? true });
        });
      });
      await api.put("/notification-subscriptions", { subscriptions });
      toast({ title: "Preferences saved", description: "Notification settings updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save notification settings.", variant: "destructive" });
    } finally {
      setNotifSaving(false);
    }
  };

  // ── Shared input class ────────────────────────────────────────────────────
  const ic = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const currentLogo = logoPreview || logoUrl;
  const initials = getInitials(company.company || company.name);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your company profile and account preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="company">Company Profile</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          {/* ── Company Profile tab ─────────────────────────────────────────── */}
          <TabsContent value="company">
            {profileLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading profile…
              </div>
            ) : (
              <>
              <form onSubmit={handleProfileSave} className="space-y-6">
                {/* Logo */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Company Logo</h3>
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex justify-center md:justify-start shrink-0">
                      <div className="w-24 h-24 rounded-2xl border-2 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                        {currentLogo ? (
                          <img src={currentLogo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-bold text-gray-400">{initials}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-3">
                        Upload your company logo. It will appear on your profile and cards.
                      </p>
                      <div className="flex gap-3 items-center">
                        <ImageUploadCrop onImageSave={handleLogoSave} currentImage={currentLogo} />
                        {logoPreview && (
                          <button
                            type="button"
                            className="text-sm text-red-500 hover:text-red-600"
                            onClick={() => { setLogoFile(null); setLogoPreview(""); }}
                          >
                            Remove new
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company info */}
                <div className="bg-white p-6 rounded-lg shadow-sm space-y-5">
                  <h3 className="text-base font-semibold text-gray-900">Company Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Company Name</Label>
                      <input type="text" value={company.company} onChange={setField("company")} placeholder="e.g. Acme Corp" className={ic} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Account / Owner Name</Label>
                      <input type="text" value={company.name} onChange={setField("name")} placeholder="e.g. John Smith" className={ic} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Gender <span className="text-gray-400 font-normal">(optional)</span></Label>
                      <select value={company.gender} onChange={setField("gender")} className={ic}>
                        <option value="">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Industry</Label>
                      <input type="text" value={company.industry} onChange={setField("industry")} placeholder="e.g. Technology" className={ic} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Founded Year</Label>
                      <input
                        type="number"
                        value={company.founded_date}
                        onChange={setField("founded_date")}
                        placeholder="e.g. 2010"
                        min={1800}
                        max={new Date().getFullYear()}
                        className={ic}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Company Size</Label>
                    <select value={company.employee_count} onChange={setField("employee_count")} className={ic}>
                      <option value="">Select size…</option>
                      {EMPLOYEE_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o} employees</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <textarea value={company.description} onChange={setField("description")} rows={3} placeholder="Brief description of your company…" className={ic} />
                  </div>
                </div>

                {/* Contact info */}
                <div className="bg-white p-6 rounded-lg shadow-sm space-y-5">
                  <h3 className="text-base font-semibold text-gray-900">Contact Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label>Email</Label>
                        {emailPending && (
                          <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-0.5">
                            Pending: <strong>{emailPending}</strong> — check inbox
                          </span>
                        )}
                      </div>
                      <input type="email" value={company.email} onChange={setField("email")} className={ic} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <input type="tel" value={company.phone} onChange={setField("phone")} placeholder="+1 (555) 123-4567" className={ic} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Website</Label>
                    <input type="text" value={company.website} onChange={setField("website")} placeholder="https://example.com" className={ic} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Address</Label>
                    <textarea value={company.address} onChange={setField("address")} rows={2} placeholder="123 Business Ave, Suite 100…" className={ic} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={profileSaving} className="w-full sm:w-auto">
                    {profileSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Save Changes"}
                  </Button>
                </div>
              </form>

              {/* Default card template — separate save action */}
              <div className="bg-white p-6 rounded-lg shadow-sm space-y-4 mt-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Default Card Template</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    New staff cards will use this template by default. You can override it per card.
                  </p>
                </div>

                {templates.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    No templates yet. Create one under Company Cards to set a default.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* "None" option */}
                    <button
                      type="button"
                      onClick={() => setDefaultTemplateId(null)}
                      className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                        defaultTemplateId === null
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-medium shrink-0">
                          None
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700">No default</p>
                          <p className="text-xs text-gray-400">Each card uses its own template</p>
                        </div>
                      </div>
                      {defaultTemplateId === null && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </button>

                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setDefaultTemplateId(tpl.id)}
                        className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                          defaultTemplateId === tpl.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {tpl.thumbnail_url ? (
                            <img
                              src={tpl.thumbnail_url}
                              alt={tpl.name}
                              className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shrink-0">
                              <span className="text-blue-600 text-xs font-bold">{tpl.name.slice(0, 2).toUpperCase()}</span>
                            </div>
                          )}
                          <p className="text-sm font-medium text-gray-800 truncate">{tpl.name}</p>
                        </div>
                        {defaultTemplateId === tpl.id && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {templates.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <Button type="button" onClick={handleTemplateSave} disabled={templateSaving} variant="outline">
                      {templateSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Set Default Template"}
                    </Button>
                  </div>
                )}
              </div>
              </>
            )}
          </TabsContent>

          {/* ── Password tab ────────────────────────────────────────────────── */}
          <TabsContent value="password">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <form onSubmit={handlePasswordSave} className="space-y-6 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={pwForm.current_password}
                    onChange={(e) => setPwForm((p) => ({ ...p, current_password: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={pwForm.password}
                    onChange={(e) => setPwForm((p) => ({ ...p, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={pwForm.password_confirmation}
                    onChange={(e) => setPwForm((p) => ({ ...p, password_confirmation: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={pwSaving}>
                    {pwSaving ? "Updating…" : "Update Password"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* ── Security tab ─────────────────────────────────────────────────── */}
          <TabsContent value="security">
            <div className="bg-white p-6 rounded-lg shadow-sm space-y-6 max-w-lg">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Recovery Email</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Add a personal email as a backup. If your work email changes, you can still log in using this address.
                </p>
              </div>

              {secondaryEmail.current && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800">Active recovery email</p>
                    <p className="text-sm text-green-700 truncate">{secondaryEmail.current}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSecondaryEmailRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="secondary-email">
                    {secondaryEmail.current ? "Replace recovery email" : "Recovery email address"}
                  </Label>
                  <Input
                    id="secondary-email"
                    type="email"
                    placeholder="e.g. yourname@gmail.com"
                    value={secondaryEmail.input}
                    onChange={(e) =>
                      setSecondaryEmail((prev) => ({ ...prev, input: e.target.value, sent: false }))
                    }
                    disabled={secondaryEmail.submitting}
                  />
                  <p className="text-xs text-gray-400">
                    Use a personal address (Gmail, Yahoo, etc.) — not a work email. A confirmation link will be sent.
                  </p>
                </div>

                {secondaryEmail.sent && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                    Confirmation email sent to <strong>{secondaryEmail.input}</strong>. Check your inbox and click the link to activate it.
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={secondaryEmail.submitting || !secondaryEmail.input.trim()}>
                    {secondaryEmail.submitting ? "Sending…" : "Send Confirmation"}
                  </Button>
                </div>
              </form>

              <DeleteAccountSection userType="admin" loginPath="/login" />
            </div>
          </TabsContent>

          {/* ── Notifications tab ─────────────────────────────────────────────── */}
          <TabsContent value="notifications">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              {notifLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading preferences…
                </div>
              ) : (
                <form onSubmit={handleNotificationSave} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Notification Preferences</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Choose where you want to receive each type of notification.
                    </p>
                  </div>

                  <div className="hidden sm:grid sm:grid-cols-[1fr_80px_80px] gap-4 pb-2 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span>Notification type</span>
                    <span className="text-center">In-App</span>
                    <span className="text-center">Web</span>
                  </div>

                  <div className="space-y-1">
                    {notifTypes.map((type) => (
                      <div
                        key={type.id}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px] gap-3 sm:gap-4 py-4 border-b last:border-0 items-center"
                      >
                        <div>
                          <p className="font-medium text-sm text-gray-900">{type.label}</p>
                          {type.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                          )}
                        </div>

                        {(type.available_channels as string[]).includes("app") && (
                          <div className="flex sm:justify-center items-center gap-2">
                            <span className="text-xs text-gray-500 sm:hidden">In-App</span>
                            <Toggle
                              checked={!!notifPrefs[type.id]?.app}
                              onChange={() => togglePref(type.id, "app")}
                            />
                          </div>
                        )}

                        {(type.available_channels as string[]).includes("web") && (
                          <div className="flex sm:justify-center items-center gap-2">
                            <span className="text-xs text-gray-500 sm:hidden">Web</span>
                            <Toggle
                              checked={!!notifPrefs[type.id]?.web}
                              onChange={() => togglePref(type.id, "web")}
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    {notifTypes.length === 0 && (
                      <p className="text-sm text-gray-400 py-4">No notification types configured.</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={notifSaving}>
                      {notifSaving ? "Saving…" : "Save Preferences"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </TabsContent>

          <TabsContent value="support">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-medium text-gray-900">Support</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  For enquiries, technical issues, billing questions, or general feedback, our support team is here to help.
                  Reach us by email or phone — our team typically replies within one business day.
                </p>
              </div>
              <SupportChat />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;

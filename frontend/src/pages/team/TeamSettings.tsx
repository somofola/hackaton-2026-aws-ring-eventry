import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import TeamLayout from "@/components/layout/TeamLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Preloader from "@/components/ui/preloader";
import { useToast } from "@/hooks/use-toast";
import { ImageUploadCrop } from "@/components/ui/image-upload-crop";
import api from "@/services/api";
import { invalidateProfile } from "@/hooks/useUserProfile";
import SupportChat from "@/components/support/SupportChat";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";

const TeamSettings = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "profile");
  const [submitting, setSubmitting] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    gender: "",
    profile_image_url: "",
  });

  const [profileImage, setProfileImage]         = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  const [secondaryEmail, setSecondaryEmail] = useState({
    current: "",
    input: "",
    submitting: false,
    sent: false,
  });

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/user/profile")
      .then(({ data }) => {
        setProfile({
          name:              data.name || "",
          email:             data.email || "",
          phone:             data.phone || "",
          address:           data.address || "",
          gender:            data.gender || "",
          profile_image_url: data.profile_image_url || "",
        });
        setSecondaryEmail((p) => ({ ...p, current: data.secondary_email || "" }));
        if (data.profile_image_url) setProfileImage(data.profile_image_url);
      })
      .catch(() => toast({ title: "Error loading profile", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, []);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "TM";

  // ── Profile save ─────────────────────────────────────────────────────────
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name",    profile.name);
      formData.append("phone",   profile.phone);
      formData.append("address", profile.address);
      formData.append("gender",  profile.gender);
      if (profileImageFile) formData.append("profile_image_file", profileImageFile);
      await api.post("/user/profile?_method=PUT", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast({ title: "Profile updated", variant: "success" } as any);
      invalidateProfile();
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Update failed.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Password change ───────────────────────────────────────────────────────
  const [passwordForm, setPasswordForm] = useState({
    current_password: "", password: "", password_confirmation: "",
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.password_confirmation) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (passwordForm.password.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters.", variant: "destructive" });
      return;
    }
    setPasswordSubmitting(true);
    try {
      await api.post("/user/change-password", passwordForm);
      toast({ title: "Password updated", variant: "success" } as any);
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (err: any) {
      toast({ title: "Failed", description: err?.response?.data?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifTypes, setNotifTypes]     = useState<any[]>([]);
  const [notifPrefs, setNotifPrefs]     = useState<Record<string, Record<string, boolean>>>({});
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving]   = useState(false);

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
          if (defaults[s.notification_type_id]) defaults[s.notification_type_id][s.channel] = s.enabled;
        });
        setNotifPrefs(defaults);
      })
      .catch(() => toast({ title: "Error", description: "Failed to load notification settings.", variant: "destructive" }))
      .finally(() => setNotifLoading(false));
  }, []);

  const togglePref = (typeId: number, channel: string) =>
    setNotifPrefs((prev) => ({ ...prev, [typeId]: { ...prev[typeId], [channel]: !prev[typeId]?.[channel] } }));

  const handleNotificationUpdate = async (e: React.FormEvent) => {
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
      toast({ title: "Preferences saved", variant: "success" } as any);
    } catch {
      toast({ title: "Error", description: "Failed to save notification settings.", variant: "destructive" });
    } finally {
      setNotifSaving(false);
    }
  };

  // ── Recovery email ────────────────────────────────────────────────────────
  const handleSecondaryEmailRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secondaryEmail.input.trim()) return;
    setSecondaryEmail((p) => ({ ...p, submitting: true }));
    try {
      await api.post("/user/secondary-email", { secondary_email: secondaryEmail.input });
      setSecondaryEmail((p) => ({ ...p, submitting: false, sent: true }));
      toast({ title: "Confirmation sent", description: `Check ${secondaryEmail.input} for a confirmation link.`, variant: "success" } as any);
    } catch (err: any) {
      setSecondaryEmail((p) => ({ ...p, submitting: false }));
      toast({ title: "Error", description: err?.response?.data?.message || "Failed to send confirmation.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <TeamLayout>
        <div className="flex justify-center items-center h-full">
          <Preloader message="Loading settings..." />
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          {/* ── Profile ── */}
          <TabsContent value="profile">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="md:w-1/4 flex justify-center">
                    <div className="w-32 h-32 bg-gray-200 rounded-full overflow-hidden">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <span className="text-gray-500 text-xl font-semibold">{getInitials(profile.name)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:w-3/4">
                    <h3 className="text-lg font-medium mb-2">Profile Picture</h3>
                    <p className="text-gray-600 mb-4 text-sm">This will be displayed on your profile.</p>
                    <div className="flex gap-3">
                      <ImageUploadCrop
                        onImageSave={(file, url) => { setProfileImage(url); setProfileImageFile(file); }}
                        currentImage={profileImage}
                        maxOutputSizeBytes={25 * 1024}
                      />
                      {profileImage && (
                        <Button type="button" variant="ghost" className="text-red-500 hover:text-red-600"
                          onClick={() => { setProfileImage(""); setProfileImageFile(null); }}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" value={profile.email} disabled className="bg-gray-50 cursor-not-allowed" />
                      <p className="text-xs text-gray-400">Email changes are managed by your account administrator.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Location</Label>
                      <Input id="address" value={profile.address}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender <span className="text-gray-400 font-normal">(optional)</span></Label>
                      <select
                        id="gender"
                        value={profile.gender}
                        onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                    {submitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* ── Password ── */}
          <TabsContent value="password">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <form onSubmit={handlePasswordUpdate} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))}
                      required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password"
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, password: e.target.value }))}
                      required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password"
                      value={passwordForm.password_confirmation}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, password_confirmation: e.target.value }))}
                      required />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={passwordSubmitting}>
                    {passwordSubmitting ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* ── Security ── */}
          <TabsContent value="security">
            <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Recovery Email</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Add a personal email address as a backup. If your work email changes you can still log in using this address.
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
                    onChange={(e) => setSecondaryEmail((p) => ({ ...p, input: e.target.value, sent: false }))}
                    disabled={secondaryEmail.submitting}
                  />
                  <p className="text-xs text-gray-400">
                    Use a personal address (Gmail, Yahoo, etc.) — not a work email. A confirmation link will be sent.
                  </p>
                </div>

                {secondaryEmail.sent && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                    Confirmation sent to <strong>{secondaryEmail.input}</strong>. Check your inbox and click the link.
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={secondaryEmail.submitting || !secondaryEmail.input.trim()}>
                    {secondaryEmail.submitting ? "Sending…" : "Send Confirmation"}
                  </Button>
                </div>
              </form>

              <DeleteAccountSection userType="team" loginPath="/login" />
            </div>
          </TabsContent>

          {/* ── Notifications ── */}
          <TabsContent value="notifications">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              {notifLoading ? (
                <div className="flex justify-center py-12">
                  <Preloader message="Loading preferences..." />
                </div>
              ) : (
                <form onSubmit={handleNotificationUpdate} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Notification Preferences</h3>
                    <p className="text-sm text-gray-500 mt-1">Choose where you want to receive each type of notification.</p>
                  </div>

                  <div className="hidden sm:grid sm:grid-cols-[1fr_80px_80px] gap-4 pb-2 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span>Notification type</span>
                    <span className="text-center">In-App</span>
                    <span className="text-center">Web</span>
                  </div>

                  <div className="space-y-1">
                    {notifTypes.map((type) => (
                      <div key={type.id} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px] gap-3 sm:gap-4 py-4 border-b last:border-0 items-center">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{type.label}</p>
                          {type.description && <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>}
                        </div>
                        {(["app", "web"] as const).map((ch) =>
                          (type.available_channels as string[]).includes(ch) ? (
                            <div key={ch} className="flex sm:justify-center items-center gap-2">
                              <span className="text-xs text-gray-500 sm:hidden capitalize">{ch === "app" ? "In-App" : "Web"}</span>
                              <button
                                type="button" role="switch"
                                aria-checked={!!notifPrefs[type.id]?.[ch]}
                                onClick={() => togglePref(type.id, ch)}
                                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${notifPrefs[type.id]?.[ch] ? "bg-primary" : "bg-gray-200"}`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${notifPrefs[type.id]?.[ch] ? "translate-x-4" : "translate-x-0"}`} />
                              </button>
                            </div>
                          ) : <div key={ch} />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={notifSaving}>
                      {notifSaving ? "Saving..." : "Save Preferences"}
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
    </TeamLayout>
  );
};

export default TeamSettings;

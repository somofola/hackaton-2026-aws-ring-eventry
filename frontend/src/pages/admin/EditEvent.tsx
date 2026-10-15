
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEvent, useUpdateEvent } from "@/hooks/useApi";
import { uploadEventBanner, armRingDevice, disarmRingDevice, testRingChime, testRingCapture, RingTestCapture } from "@/services/eventService";
import { Speaker, Session, Exhibitor, Sponsor, TeamMember, TicketCategory, FloorPlan } from "@/types";
import { ArrowLeft, Info, Tag, Map, Mic, Clock, Building, Users, X, FileText, Globe, Loader2, ImagePlus, Star, Award, Copy, Bell, Volume2, Camera, QrCode } from "lucide-react";
import CloneEventDialog from "@/components/events/CloneEventDialog";
import { useToast } from "@/hooks/use-toast";
import SpeakerForm from "@/components/events/SpeakerForm";
import SessionForm from "@/components/events/SessionForm";
import ExhibitorForm from "@/components/events/ExhibitorForm";
import SponsorForm from "@/components/events/SponsorForm";
import TeamMemberForm from "@/components/events/TeamMemberForm";
import EnhancedTicketCategoryForm from "@/components/events/EnhancedTicketCategoryForm";
import FloorPlanForm from "@/components/events/FloorPlanForm";
import LocationPicker from "@/components/events/LocationPicker";

const RING_CHIME_SKIP_MESSAGES: Record<string, string> = {
  not_configured: "Ring integration isn't configured on the server.",
  unsupported_device: "This Ring device has no chime hardware — it can't play a sound.",
  no_audio_slot: "No chime sound is assigned to this device yet.",
  api_error: "Ring rejected the chime request — check the device ID.",
};

const EditEvent = () => {
  const navigate = useNavigate();
  const { uuid } = useParams<{ uuid: string }>();
  const { data: event, isLoading } = useEvent(uuid || "");
  const updateEventMutation = useUpdateEvent();
  const { toast } = useToast();
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [cloneOpen, setCloneOpen] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    location: "",
    event_type: "physical" as "virtual" | "physical" | "hybrid",
    virtual_link: "",
    maxAttendees: "",
    tags: "",
    issues_certificate: false,
  });

  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");

  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);

  // Ring device test tooling
  const [ringDeviceId, setRingDeviceId] = useState(() => localStorage.getItem("ring_test_device_id") || "");
  const [ringArmed, setRingArmed] = useState(false);
  const [ringArming, setRingArming] = useState(false);
  const [testingChime, setTestingChime] = useState(false);
  const [testingCapture, setTestingCapture] = useState(false);
  const [captureResult, setCaptureResult] = useState<RingTestCapture | null>(null);
  const [captureError, setCaptureError] = useState<string>("");

  // Populate form once when event loads.
  useEffect(() => {
    if (!event) return;
    const displayMax = event.max_attendees && event.max_attendees > 0 ? event.max_attendees : 0;
    setEventForm({
      title: event.title,
      description: event.description,
      start_date: event.start_date ? event.start_date.split('T')[0].split(' ')[0] : "",
      end_date: event.end_date ? event.end_date.split('T')[0].split(' ')[0] : "",
      start_time: event.start_time || "",
      end_time: event.end_time || "",
      location: event.location,
      event_type: (event.event_type as "virtual" | "physical" | "hybrid") || "physical",
      virtual_link: event.virtual_link || "",
      maxAttendees: displayMax > 0 ? displayMax.toString() : "",

      tags: Array.isArray(event.tags) ? event.tags.join(", ") : "",
      issues_certificate: event.issues_certificate ?? false,
    });
    setCoords({ lat: event.latitude ?? null, lng: event.longitude ?? null });
    setBannerPreview(event.image_url || "");
    setSpeakers(event.speakers || []);
    setSessions(event.sessions || []);
    setExhibitors(event.exhibitors || []);
    setSponsors(event.sponsors || []);
    setTeamMembers(event.team_members || []);
    setTicketCategories(event.ticket_categories || []);
    setFloorPlans(event.floor_plans || []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  const buildPayload = (status: "draft" | "live") => ({
    title: eventForm.title,
    description: eventForm.description,
    start_date: eventForm.start_date,
    end_date: eventForm.end_date || undefined,
    start_time: eventForm.start_time || undefined,
    end_time: eventForm.end_time || undefined,
    location: eventForm.location,
    event_type: eventForm.event_type,
    virtual_link: eventForm.virtual_link || undefined,
    latitude: coords.lat ?? undefined,
    longitude: coords.lng ?? undefined,
    status,
    max_attendees: parseInt(eventForm.maxAttendees) || 0,

    tags: eventForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
    issues_certificate: eventForm.issues_certificate,
    speakers,
    sessions,
    exhibitors,
    team_members: teamMembers,
    ticket_categories: ticketCategories,
    floor_plans: floorPlans,
  });

  const handleSave = async (status: "draft" | "live") => {
    setSaving(status === "draft" ? "draft" : "publish");
    try {
      if (bannerImageFile) {
        await uploadEventBanner(uuid!, bannerImageFile);
        setBannerImageFile(null);
      }
      await updateEventMutation.mutateAsync({ id: uuid!, data: buildPayload(status) });
      toast({ title: status === "draft" ? "Event saved as draft." : "Event is now live!" });
      if (status !== "draft") navigate("/admin/events");
    } catch {
      toast({ title: "Failed to save event.", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave("live");
  };

  const handleRingDeviceIdChange = (v: string) => {
    setRingDeviceId(v);
    localStorage.setItem("ring_test_device_id", v);
  };

  const handleToggleRingArm = async () => {
    if (!ringDeviceId || !event) return;
    setRingArming(true);
    try {
      if (ringArmed) {
        await disarmRingDevice(ringDeviceId);
        setRingArmed(false);
        toast({ title: "Ring device disarmed" });
      } else {
        await armRingDevice(ringDeviceId, Number(event.id));
        setRingArmed(true);
        toast({ title: "Ring device armed for this event" });
      }
    } catch {
      toast({ title: "Failed to update Ring device arm state", variant: "destructive" });
    } finally {
      setRingArming(false);
    }
  };

  const handleTestChime = async () => {
    if (!ringDeviceId) return;
    setTestingChime(true);
    try {
      const result = await testRingChime(ringDeviceId);
      toast({
        title: result.success ? "Chime triggered" : "Chime trigger failed",
        description: result.success
          ? "Device should chime now."
          : RING_CHIME_SKIP_MESSAGES[result.reason] ?? "Check RING_ACCESS_TOKEN on the server.",
        variant: result.success ? undefined : "destructive",
      });
    } catch {
      toast({ title: "Chime trigger failed", variant: "destructive" });
    } finally {
      setTestingChime(false);
    }
  };

  const handleTestCapture = async () => {
    if (!ringDeviceId) return;
    setTestingCapture(true);
    setCaptureResult(null);
    setCaptureError("");
    try {
      const result = await testRingCapture(ringDeviceId);
      setCaptureResult(result);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Snapshot/QR decode test failed.";
      setCaptureError(message);
    } finally {
      setTestingCapture(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading event…
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/admin/events")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
            <p className="text-gray-500 mt-1">Edit event details and configuration</p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
          <p className="text-sm text-gray-500 hidden sm:block">Changes are not saved automatically.</p>
          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => navigate("/admin/events")} disabled={!!saving}>
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
              onClick={() => setCloneOpen(true)}
              disabled={!!saving}
            >
              <Copy className="mr-1.5 h-4 w-4" /> Clone
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
              onClick={() => handleSave("draft")}
              disabled={!!saving}
            >
              {saving === "draft" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileText className="mr-1.5 h-4 w-4" />}
              Save as Draft
            </Button>
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleSave("live")}
              disabled={!!saving}
            >
              {saving === "publish" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Globe className="mr-1.5 h-4 w-4" />}
              Publish
            </Button>
          </div>
        </div>

        <Card className="card-enhanced">
          <div className="p-6">
            <Tabs defaultValue="basic" className="w-full">
              <div className="w-full overflow-x-auto">
                <TabsList className="flex md:grid md:grid-cols-9 w-max min-w-full md:w-full h-10 items-center gap-1 rounded-md bg-muted p-1">
                  <TabsTrigger value="basic" className="flex items-center gap-1.5 whitespace-nowrap"><Info className="h-3.5 w-3.5" /><span className="hidden sm:inline">Basic Info</span></TabsTrigger>
                  <TabsTrigger value="tickets" className="flex items-center gap-1.5 whitespace-nowrap"><Tag className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tickets</span></TabsTrigger>
                  <TabsTrigger value="floorplan" className="flex items-center gap-1.5 whitespace-nowrap"><Map className="h-3.5 w-3.5" /><span className="hidden sm:inline">Floor Plan</span></TabsTrigger>
                  <TabsTrigger value="speakers" className="flex items-center gap-1.5 whitespace-nowrap"><Mic className="h-3.5 w-3.5" /><span className="hidden sm:inline">Speakers</span></TabsTrigger>
                  <TabsTrigger value="sessions" className="flex items-center gap-1.5 whitespace-nowrap"><Clock className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sessions</span></TabsTrigger>
                  <TabsTrigger value="exhibitors" className="flex items-center gap-1.5 whitespace-nowrap"><Building className="h-3.5 w-3.5" /><span className="hidden sm:inline">Exhibitors</span></TabsTrigger>
                  <TabsTrigger value="team" className="flex items-center gap-1.5 whitespace-nowrap"><Users className="h-3.5 w-3.5" /><span className="hidden sm:inline">Team</span></TabsTrigger>
                  <TabsTrigger value="sponsors" className="flex items-center gap-1.5 whitespace-nowrap"><Star className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sponsors</span></TabsTrigger>
                  <TabsTrigger value="ring" className="flex items-center gap-1.5 whitespace-nowrap"><Bell className="h-3.5 w-3.5" /><span className="hidden sm:inline">Ring</span></TabsTrigger>
                </TabsList>
              </div>

              <form onSubmit={handleSubmit}>
                <TabsContent value="basic" className="space-y-4 pt-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Info className="h-5 w-5 text-gray-500" /> Basic Information
                  </h3>
                  <div>
                    <Label htmlFor="title">Event Title</Label>
                    <Input id="title" value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required />
                  </div>

                  <div>
                    <Label>Banner Image</Label>
                    <div className="mt-1 space-y-3">
                      {bannerPreview && (
                        <div className="relative w-full max-w-md">
                          <img
                            src={bannerPreview}
                            alt="Event banner"
                            className="w-full h-40 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => { setBannerPreview(""); setBannerImageFile(null); }}
                            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                          >
                            <X className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                      )}
                      <label
                        htmlFor="banner_image_file"
                        className="flex items-center gap-2 w-fit cursor-pointer rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                      >
                        <ImagePlus className="h-4 w-4" />
                        {bannerPreview ? "Replace banner" : "Upload banner image"}
                        <input
                          id="banner_image_file"
                          type="file"
                          accept="image/jpg,image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setBannerImageFile(file);
                              setBannerPreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>
                      <p className="text-xs text-gray-400">JPG, PNG or WebP, max 10 MB</p>
                    </div>
                  </div>

                  <LocationPicker
                    locationType={eventForm.event_type}
                    location={eventForm.location}
                    virtualLink={eventForm.virtual_link}
                    onTypeChange={(t) => setEventForm({ ...eventForm, event_type: t })}
                    onLocationChange={(v) => setEventForm({ ...eventForm, location: v })}
                    onVirtualLinkChange={(v) => setEventForm({ ...eventForm, virtual_link: v })}
                    onCoordsChange={(lat, lng) => setCoords({ lat, lng })}
                    required
                  />

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input id="start_date" type="date" value={eventForm.start_date}
                        onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value, end_date: eventForm.end_date && eventForm.end_date < e.target.value ? e.target.value : eventForm.end_date })} required />
                    </div>
                    <div>
                      <Label htmlFor="end_date">End Date</Label>
                      <Input id="end_date" type="date" value={eventForm.end_date}
                        min={eventForm.start_date || undefined}
                        onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input id="start_time" type="time" value={eventForm.start_time}
                        onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="end_time">End Time</Label>
                      <Input id="end_time" type="time" value={eventForm.end_time}
                        onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="maxAttendees">Max Attendees</Label>
                      <Input id="maxAttendees" type="number" min={1} value={eventForm.maxAttendees}
                        onChange={(e) => setEventForm({ ...eventForm, maxAttendees: e.target.value })} required />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input id="tags" value={eventForm.tags}
                      onChange={(e) => setEventForm({ ...eventForm, tags: e.target.value })}
                      placeholder="technology, networking, business" />
                  </div>

                  {/* Certificate toggle */}
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Award className="h-5 w-5 text-yellow-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Issue Attendance Certificates</p>
                        <p className="text-xs text-gray-500">Attendees will be able to download a certificate after check-in</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={eventForm.issues_certificate}
                      onClick={() => setEventForm({ ...eventForm, issues_certificate: !eventForm.issues_certificate })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        eventForm.issues_certificate ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          eventForm.issues_certificate ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </TabsContent>

                <TabsContent value="tickets">
                  <EnhancedTicketCategoryForm ticketCategories={ticketCategories} floorPlans={floorPlans} onChange={setTicketCategories} maxAttendees={parseInt(eventForm.maxAttendees) || 0} eventUuid={uuid} />
                </TabsContent>

                <TabsContent value="floorplan">
                  <FloorPlanForm floorPlans={floorPlans} onChange={setFloorPlans} eventUuid={uuid} />
                </TabsContent>

                <TabsContent value="speakers">
                  <SpeakerForm speakers={speakers} sessions={sessions} onChange={setSpeakers} onSessionsChange={setSessions} eventUuid={uuid} />
                </TabsContent>

                <TabsContent value="sessions">
                  <SessionForm
                    sessions={sessions}
                    speakers={speakers}
                    onChange={setSessions}
                    eventUuid={uuid}
                    eventStartDate={eventForm.start_date}
                    eventStartTime={eventForm.start_time}
                    eventEndDate={eventForm.end_date}
                    eventEndTime={eventForm.end_time}
                  />
                </TabsContent>

                <TabsContent value="exhibitors">
                  <ExhibitorForm exhibitors={exhibitors} onChange={setExhibitors} eventUuid={uuid} />
                </TabsContent>

                <TabsContent value="team">
                  <TeamMemberForm teamMembers={teamMembers} onChange={setTeamMembers} eventUuid={uuid} />
                </TabsContent>

                <TabsContent value="sponsors">
                  <SponsorForm sponsors={sponsors} onChange={setSponsors} eventUuid={uuid} />
                </TabsContent>

                <TabsContent value="ring" className="space-y-5 pt-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Bell className="h-5 w-5 text-gray-500" /> Ring Device Check-in (hackathon test tools)
                  </h3>
                  <p className="text-sm text-gray-500">
                    Arm a Ring device for this event's no-kiosk check-in path, and verify the device's
                    chime + snapshot/QR capture standalone before relying on a real person_detected webhook.
                  </p>

                  <div>
                    <Label htmlFor="ring_device_id">Ring Device ID</Label>
                    <Input
                      id="ring_device_id"
                      value={ringDeviceId}
                      onChange={(e) => handleRingDeviceIdChange(e.target.value)}
                      placeholder="e.g. 123456789"
                      className="max-w-md"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant={ringArmed ? "outline" : "default"}
                      className={ringArmed ? "border-red-300 text-red-600 hover:bg-red-50" : ""}
                      disabled={!ringDeviceId || ringArming}
                      onClick={handleToggleRingArm}
                    >
                      {ringArming ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Bell className="mr-1.5 h-4 w-4" />}
                      {ringArmed ? "Disarm Device" : "Arm Device for This Event"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={!ringDeviceId || testingChime}
                      onClick={handleTestChime}
                    >
                      {testingChime ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Volume2 className="mr-1.5 h-4 w-4" />}
                      Verify Chime
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={!ringDeviceId || testingCapture}
                      onClick={handleTestCapture}
                    >
                      {testingCapture ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Camera className="mr-1.5 h-4 w-4" />}
                      Verify Snapshot + QR Decode
                    </Button>
                  </div>

                  {ringArmed && (
                    <p className="text-xs text-amber-600">
                      Device armed — a person_detected webhook for this device will now attempt QR/face
                      check-in against this event for the next 24h.
                    </p>
                  )}

                  {captureError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {captureError}
                    </div>
                  )}

                  {captureResult && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
                      {captureResult.image_base64 && (
                        <img
                          src={captureResult.image_base64}
                          alt="Ring snapshot"
                          className="w-full max-w-sm rounded-lg border border-gray-200"
                        />
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <QrCode className="h-4 w-4 text-gray-500" />
                        {captureResult.qr_result ? (
                          <span className="text-green-700 font-medium">QR decoded: {captureResult.qr_result}</span>
                        ) : (
                          <span className="text-gray-500">No QR code detected in this frame.</span>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </form>
            </Tabs>
          </div>
        </Card>
      </div>

      {event && (
        <CloneEventDialog
          open={cloneOpen}
          onOpenChange={setCloneOpen}
          eventUuid={event.uuid}
          eventTitle={event.title}
        />
      )}
    </AdminLayout>
  );
};

export default EditEvent;

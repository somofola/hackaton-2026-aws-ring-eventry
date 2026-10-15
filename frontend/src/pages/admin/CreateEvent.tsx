
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateEvent } from "@/hooks/useApi";
import { Speaker, Session, Exhibitor, TeamMember, TicketCategory, FloorPlan } from "@/types";
import { ArrowLeft, Info, Tag, Map, Mic, Clock, Building, Users, X, FileText, Globe, Loader2, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SpeakerForm from "@/components/events/SpeakerForm";
import SessionForm from "@/components/events/SessionForm";
import ExhibitorForm from "@/components/events/ExhibitorForm";
import TeamMemberForm from "@/components/events/TeamMemberForm";
import EnhancedTicketCategoryForm from "@/components/events/EnhancedTicketCategoryForm";
import FloorPlanForm from "@/components/events/FloorPlanForm";
import LocationPicker from "@/components/events/LocationPicker";

const CreateEvent = () => {
  const navigate = useNavigate();

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    event_type: "physical" as "virtual" | "physical" | "hybrid",
    virtual_link: "",
    maxAttendees: "",
    tags: "",
    issues_certificate: false,
  });

  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);

  const createEventMutation = useCreateEvent();
  const { toast } = useToast();
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);

  const buildPayload = (status: "draft" | "live") => ({
    ...eventForm,
    status,
    maxAttendees: parseInt(eventForm.maxAttendees) || 0,
    tags: eventForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
    speakers,
    sessions,
    exhibitors,
    teamMembers,
    ticketCategories,
    floorPlans,
    organizerId: "current-user-id",
    organizerName: "Current User",
  });

  const handleSave = async (status: "draft" | "live") => {
    setSaving(status === "draft" ? "draft" : "publish");
    try {
      await createEventMutation.mutateAsync(buildPayload(status));
      toast({ title: status === "draft" ? "Event saved as draft." : "Event is now live!" });
      navigate("/admin/events");
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/events")}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Create New Event</h1>
            <p className="text-gray-600 mt-2">Set up a comprehensive corporate event</p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
          <p className="text-sm text-gray-500 hidden sm:block">Fill in the tabs below, then save as draft or publish.</p>
          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => navigate("/admin/events")} disabled={!!saving}>
              <X className="mr-1.5 h-4 w-4" /> Cancel
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
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="basic" className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /><span className="hidden sm:inline">Basic Info</span></TabsTrigger>
                <TabsTrigger value="tickets" className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tickets</span></TabsTrigger>
                <TabsTrigger value="floorplan" className="flex items-center gap-1.5"><Map className="h-3.5 w-3.5" /><span className="hidden sm:inline">Floor Plan</span></TabsTrigger>
                <TabsTrigger value="speakers" className="flex items-center gap-1.5"><Mic className="h-3.5 w-3.5" /><span className="hidden sm:inline">Speakers</span></TabsTrigger>
                <TabsTrigger value="sessions" className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sessions</span></TabsTrigger>
                <TabsTrigger value="exhibitors" className="flex items-center gap-1.5"><Building className="h-3.5 w-3.5" /><span className="hidden sm:inline">Exhibitors</span></TabsTrigger>
                <TabsTrigger value="team" className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /><span className="hidden sm:inline">Team</span></TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleSubmit}>
                <TabsContent value="basic" className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 pt-2">
                    <Info className="h-5 w-5 text-gray-500" /> Basic Information
                  </h3>
                  <div>
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <LocationPicker
                    locationType={eventForm.event_type}
                    location={eventForm.location}
                    virtualLink={eventForm.virtual_link}
                    onTypeChange={(t) => setEventForm({ ...eventForm, event_type: t })}
                    onLocationChange={(v) => setEventForm({ ...eventForm, location: v })}
                    onVirtualLinkChange={(v) => setEventForm({ ...eventForm, virtual_link: v })}
                    required
                  />
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={eventForm.date}
                        onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={eventForm.time}
                        onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="maxAttendees">Max Attendees</Label>
                      <Input
                        id="maxAttendees"
                        type="number"
                        min={1}
                        value={eventForm.maxAttendees}
                        onChange={(e) => setEventForm({ ...eventForm, maxAttendees: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={eventForm.tags}
                      onChange={(e) => setEventForm({ ...eventForm, tags: e.target.value })}
                      placeholder="technology, networking, business"
                    />
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
                  <EnhancedTicketCategoryForm
                    ticketCategories={ticketCategories}
                    floorPlans={floorPlans}
                    onChange={setTicketCategories}
                    maxAttendees={parseInt(eventForm.maxAttendees) || 0}
                  />
                </TabsContent>
                
                <TabsContent value="floorplan">
                  <FloorPlanForm floorPlans={floorPlans} onChange={setFloorPlans} />
                </TabsContent>
                
                <TabsContent value="speakers">
                  <SpeakerForm speakers={speakers} onChange={setSpeakers} />
                </TabsContent>
                
                <TabsContent value="sessions">
                  <SessionForm sessions={sessions} speakers={speakers} onChange={setSessions} />
                </TabsContent>
                
                <TabsContent value="exhibitors">
                  <ExhibitorForm exhibitors={exhibitors} onChange={setExhibitors} />
                </TabsContent>
                
                <TabsContent value="team">
                  <TeamMemberForm teamMembers={teamMembers} onChange={setTeamMembers} />
                </TabsContent>
                
              </form>
            </Tabs>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default CreateEvent;

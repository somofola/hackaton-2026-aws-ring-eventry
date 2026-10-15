import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Speaker, Session } from "@/types";
import { Plus, Trash2, Edit, Mic, ImagePlus, X, Search, CheckCircle } from "lucide-react";
import { lookupSpeakerByEmail, createEventSpeaker, updateEventSpeaker } from "@/services/eventService";

interface SpeakerFormProps {
  speakers: Speaker[];
  sessions?: Session[];
  onChange: (speakers: Speaker[]) => void;
  onSessionsChange?: (sessions: Session[]) => void;
  eventUuid?: string;
}

const EMPTY_FORM = {
  email: "", name: "", title: "", company: "", bio: "",
  linkedin: "", twitter: "", session_id: "",
};

const SpeakerForm: React.FC<SpeakerFormProps> = ({
  speakers, sessions = [], onChange, onSessionsChange, eventUuid,
}) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Speaker | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [saving, setSaving] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview("");
    setLookupState("idle");
    setOpen(true);
  };

  const openEdit = (s: Speaker) => {
    setEditing(s);
    const currentSession = sessions.find((sess) =>
      sess.speakerIds.map(String).includes(String(s.id))
    );
    setForm({
      email: "",
      name: s.name || "",
      title: s.title || "",
      company: s.company || "",
      bio: s.bio || "",
      linkedin: s.social?.linkedin || "",
      twitter: s.social?.twitter || "",
      session_id: currentSession ? String(currentSession.id) : "",
    });
    setImageFile(null);
    setImagePreview(s.imageUrl || "");
    setLookupState("idle");
    setOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (imageRef.current) imageRef.current.value = "";
  };

  const handleEmailLookup = async () => {
    if (!form.email.trim()) return;
    setLookupState("loading");
    try {
      const result = await lookupSpeakerByEmail(form.email.trim());
      if (result.found && result.user) {
        setForm((p) => ({
          ...p,
          name: result.user!.name || p.name,
          bio: result.user!.bio || p.bio,
        }));
        if (result.user.imageUrl && !imagePreview) {
          setImagePreview(result.user.imageUrl);
        }
        setLookupState("found");
      } else {
        setLookupState("not_found");
      }
    } catch {
      setLookupState("not_found");
    }
  };

  const handleSave = async () => {
    if (editing) {
      // Edit mode
      if (!form.name.trim()) return;
      if (eventUuid) {
        setSaving(true);
        try {
          const sessionIdNum = form.session_id ? parseInt(form.session_id) : null;
          const saved = await updateEventSpeaker(
            eventUuid,
            editing.id,
            {
              name: form.name.trim(),
              title: form.title.trim() || undefined,
              company: form.company.trim() || undefined,
              bio: form.bio.trim() || undefined,
              linkedin: form.linkedin.trim() || undefined,
              twitter: form.twitter.trim() || undefined,
              session_id: sessionIdNum,
            },
            imageFile,
          );
          onChange(speakers.map((s) => s.id === editing.id ? (saved as Speaker) : s));

          if (form.session_id !== "" && onSessionsChange) {
            const speakerId = String(editing.id);
            // Remove speaker from all sessions, then re-add to selected
            const updated = sessions.map((sess) => ({
              ...sess,
              speakerIds: sess.speakerIds.filter((id) => id !== speakerId),
            }));
            if (sessionIdNum) {
              onSessionsChange(
                updated.map((sess) =>
                  String(sess.id) === String(sessionIdNum) && !sess.speakerIds.includes(speakerId)
                    ? { ...sess, speakerIds: [...sess.speakerIds, speakerId] }
                    : sess
                )
              );
            } else {
              onSessionsChange(updated);
            }
          }
          setOpen(false);
        } finally {
          setSaving(false);
        }
      } else {
        // Local-only fallback
        const updated: Speaker = {
          ...editing,
          name: form.name,
          title: form.title,
          company: form.company,
          bio: form.bio,
          imageUrl: imagePreview || editing.imageUrl,
          social: { linkedin: form.linkedin || undefined, twitter: form.twitter || undefined },
        };
        onChange(speakers.map((s) => s.id === editing.id ? updated : s));
        setOpen(false);
      }
      return;
    }

    // Add mode
    if (!form.name.trim() || !form.email.trim()) return;

    if (eventUuid) {
      setSaving(true);
      try {
        const sessionIdNum = form.session_id ? parseInt(form.session_id) : null;
        const saved = await createEventSpeaker(
          eventUuid,
          {
            email: form.email.trim(),
            name: form.name.trim(),
            title: form.title.trim() || undefined,
            company: form.company.trim() || undefined,
            bio: form.bio.trim() || undefined,
            linkedin: form.linkedin.trim() || undefined,
            twitter: form.twitter.trim() || undefined,
            session_id: sessionIdNum,
          },
          imageFile,
        );
        onChange([...speakers, saved as Speaker]);

        if (sessionIdNum && onSessionsChange) {
          const speakerId = String(saved.id);
          onSessionsChange(
            sessions.map((s) =>
              String(s.id) === String(sessionIdNum) && !s.speakerIds.includes(speakerId)
                ? { ...s, speakerIds: [...s.speakerIds, speakerId] }
                : s
            )
          );
        }
        setOpen(false);
      } finally {
        setSaving(false);
      }
    } else {
      const speaker: Speaker = {
        id: Date.now().toString(),
        name: form.name, title: form.title, company: form.company, bio: form.bio,
        imageUrl: imagePreview || undefined,
        social: { linkedin: form.linkedin || undefined, twitter: form.twitter || undefined },
      };
      onChange([...speakers, speaker]);
      setOpen(false);
    }
  };

  const canSave = editing
    ? !!(form.name.trim())
    : !!(form.name.trim() && form.email.trim());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mic className="h-5 w-5 text-gray-500" /> Speakers
        </h3>
        <Button type="button" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Speaker
        </Button>
      </div>

      {speakers.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Mic className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No speakers yet.</p>
          <button type="button" onClick={openAdd} className="mt-2 text-sm text-primary underline">
            Add your first speaker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {speakers.map((s) => {
            const assignedSession = sessions.find((sess) =>
              sess.speakerIds.map(String).includes(String(s.id))
            );
            return (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <Mic className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.title}{s.title && s.company ? " · " : ""}{s.company}</p>
                    {s.bio && <p className="text-xs text-gray-400 truncate mt-0.5">{s.bio}</p>}
                    {assignedSession && (
                      <p className="text-xs text-primary/70 mt-0.5 truncate">Session: {assignedSession.title}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    type="button" variant="outline" size="sm" className="px-2"
                    onClick={() => openEdit(s)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    className="px-2 text-red-500 hover:text-red-600 hover:border-red-300"
                    onClick={() => onChange(speakers.filter((x) => x.id !== s.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Speaker" : "Add Speaker"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">

            {/* Email lookup — only for add mode */}
            {!editing && (
              <div>
                <Label>Email Address <span className="text-red-500">*</span></Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="email"
                    placeholder="speaker@example.com"
                    value={form.email}
                    onChange={(e) => { set("email", e.target.value); setLookupState("idle"); }}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailLookup()}
                  />
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={handleEmailLookup}
                    disabled={!form.email.trim() || lookupState === "loading"}
                    className="shrink-0"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {lookupState === "found" && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Existing account found — details pre-filled
                  </div>
                )}
                {lookupState === "not_found" && (
                  <p className="mt-1.5 text-xs text-gray-400">No existing account — a new speaker account will be created.</p>
                )}
              </div>
            )}

            {/* Profile image */}
            <div>
              <Label>Profile Image</Label>
              {imagePreview ? (
                <div className="relative mt-1 w-20">
                  <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border" />
                  <button
                    type="button" onClick={clearImage}
                    className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:border-gray-300 transition-colors">
                  <ImagePlus className="h-5 w-5 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500">Upload photo · JPG, PNG, WebP · max 250 KB</span>
                  <input
                    ref={imageRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            {/* Name & Title */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input placeholder="Full name" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <Label>Title</Label>
                <Input placeholder="e.g. CEO, CTO" value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div>
                <Label>Company</Label>
                <Input placeholder="Company name" value={form.company} onChange={(e) => set("company", e.target.value)} />
              </div>

              {/* Session selector */}
              {sessions.length > 0 && (
                <div>
                  <Label>Assign to Session</Label>
                  <Select value={form.session_id} onValueChange={(v) => set("session_id", v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="No session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No session</SelectItem>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Bio */}
            <div>
              <Label>Bio</Label>
              <Textarea
                placeholder="Short biography"
                rows={3}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
              />
            </div>

            {/* Social */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>LinkedIn</Label>
                <Input placeholder="https://linkedin.com/in/…" value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} />
              </div>
              <div>
                <Label>Twitter / X</Label>
                <Input placeholder="https://twitter.com/…" value={form.twitter} onChange={(e) => set("twitter", e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? "Saving..." : editing ? "Update Speaker" : "Add Speaker"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpeakerForm;

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Session, Speaker } from "@/types";
import { Plus, Trash2, Edit, Clock, MapPin, Users } from "lucide-react";
import { createEventSession } from "@/services/eventService";

interface SessionFormProps {
  sessions: Session[];
  speakers: Speaker[];
  onChange: (sessions: Session[]) => void;
  eventUuid?: string;
  eventStartDate?: string;
  eventStartTime?: string;
  eventEndDate?: string;
  eventEndTime?: string;
}

const EMPTY = {
  title: "", description: "", startTime: "", endTime: "",
  speakerIds: [] as string[], location: "", capacity: "",
};

/** Build a datetime-local min/max string from separate date + time parts */
const buildDT = (date: string, time: string, fallbackTime: string) => {
  if (!date) return undefined;
  const t = time?.slice(0, 5) || fallbackTime;
  return `${date}T${t}`;
};

/** Format a stored datetime-local or plain time for display */
const fmtTime = (value: string) => {
  if (!value) return "";
  // datetime-local: "2026-03-22T09:00" → show "Mar 22 09:00"
  if (value.includes("T")) {
    const d = new Date(value);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  }
  // plain time: "09:00"
  return value.slice(0, 5);
};

const SessionForm: React.FC<SessionFormProps> = ({
  sessions, speakers, onChange,
  eventUuid, eventStartDate, eventStartTime, eventEndDate, eventEndTime,
}) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [timeError, setTimeError] = useState("");

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setTimeError("");
  };

  const toggleSpeaker = (id: string) =>
    set("speakerIds", form.speakerIds.includes(id)
      ? form.speakerIds.filter((x) => x !== id)
      : [...form.speakerIds, id]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setTimeError(""); setOpen(true); };
  const openEdit = (s: Session) => {
    setEditing(s);
    setForm({
      title: s.title, description: s.description,
      startTime: s.startTime, endTime: s.endTime,
      speakerIds: s.speakerIds, location: s.location,
      capacity: s.capacity?.toString() || "",
    });
    setTimeError("");
    setOpen(true);
  };

  const validateTimes = (): boolean => {
    if (!form.startTime || !form.endTime) {
      setTimeError("Start and end time are required.");
      return false;
    }
    if (form.startTime >= form.endTime) {
      setTimeError("End time must be after start time.");
      return false;
    }
    const minDT = buildDT(eventStartDate || "", eventStartTime || "", "00:00");
    const maxDT = buildDT(eventEndDate || eventStartDate || "", eventEndTime || "", "23:59");
    if (minDT && form.startTime < minDT) {
      setTimeError("Session start cannot be before the event starts.");
      return false;
    }
    if (maxDT && form.endTime > maxDT) {
      setTimeError("Session end cannot be after the event ends.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.location.trim()) return;
    if (!validateTimes()) return;

    if (eventUuid && !editing) {
      setSaving(true);
      try {
        const saved = await createEventSession(eventUuid, {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          startTime: form.startTime,
          endTime: form.endTime,
          location: form.location.trim(),
          capacity: form.capacity ? parseInt(form.capacity) : undefined,
          speakerIds: form.speakerIds.length ? form.speakerIds : undefined,
        });
        onChange([...sessions, saved as Session]);
        setOpen(false);
      } finally {
        setSaving(false);
      }
    } else {
      const session: Session = {
        id: editing?.id || Date.now().toString(),
        title: form.title, description: form.description,
        startTime: form.startTime, endTime: form.endTime,
        speakerIds: form.speakerIds, location: form.location,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
      };
      onChange(editing
        ? sessions.map((s) => s.id === editing.id ? session : s)
        : [...sessions, session]);
      setOpen(false);
    }
  };

  const getSpeakerNames = (ids: string[]) =>
    ids.map((id) => speakers.find((s) => String(s.id) === String(id))?.name).filter(Boolean).join(", ");

  const canSave = !!(form.title.trim() && form.startTime && form.endTime && form.location.trim());

  const minDT = buildDT(eventStartDate || "", eventStartTime || "", "00:00");
  const maxDT = buildDT(eventEndDate || eventStartDate || "", eventEndTime || "", "23:59");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" /> Sessions
        </h3>
        <Button type="button" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No sessions yet.</p>
          <button type="button" onClick={openAdd} className="mt-2 text-sm text-primary underline">
            Add your first session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessions.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{s.title}</p>
                  {s.description && <p className="text-xs text-gray-400 truncate mt-0.5">{s.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
                    </span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.location}</span>
                    {s.capacity && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.capacity} max</span>}
                  </div>
                  {s.speakerIds.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">Speakers: {getSpeakerNames(s.speakerIds)}</p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button type="button" variant="outline" size="sm" className="px-2" onClick={() => openEdit(s)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="sm"
                    className="px-2 text-red-500 hover:text-red-600 hover:border-red-300"
                    onClick={() => onChange(sessions.filter((x) => x.id !== s.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Session" : "Add Session"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            {/* Title */}
            <div>
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Session title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="What this session covers"
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            {/* Date/Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start <span className="text-red-500">*</span></Label>
                <Input
                  type="datetime-local"
                  value={form.startTime}
                  min={minDT}
                  max={maxDT}
                  onChange={(e) => set("startTime", e.target.value)}
                />
              </div>
              <div>
                <Label>End <span className="text-red-500">*</span></Label>
                <Input
                  type="datetime-local"
                  value={form.endTime}
                  min={form.startTime || minDT}
                  max={maxDT}
                  onChange={(e) => set("endTime", e.target.value)}
                />
              </div>
            </div>
            {timeError && <p className="text-xs text-red-500 -mt-2">{timeError}</p>}
            {minDT && maxDT && (
              <p className="text-xs text-gray-400 -mt-2">
                Event runs {fmtTime(minDT)} – {fmtTime(maxDT)}
              </p>
            )}

            {/* Room & Capacity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Room / Location <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. Hall A, Room 204"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Optional"
                  value={form.capacity}
                  onChange={(e) => set("capacity", e.target.value)}
                />
              </div>
            </div>

            {/* Speakers */}
            {speakers.length > 0 && (
              <div>
                <Label>Speakers</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {speakers.map((sp) => (
                    <label key={sp.id} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={form.speakerIds.includes(String(sp.id))}
                        onChange={() => toggleSpeaker(String(sp.id))}
                      />
                      <span className="truncate">{sp.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? "Saving..." : editing ? "Update Session" : "Add Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionForm;

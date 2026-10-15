import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { TeamMember } from "@/types";
import { Plus, Trash2, Edit, User, Mail, Phone, Users, CheckCircle, Send, Loader2 } from "lucide-react";
import {
  createEventTeamMember,
  updateEventTeamMember,
  deleteEventTeamMember,
} from "@/services/eventService";

interface TeamMemberFormProps {
  teamMembers: TeamMember[];
  onChange: (teamMembers: TeamMember[]) => void;
  eventUuid?: string;
}

const TeamMemberForm: React.FC<TeamMemberFormProps> = ({ teamMembers, onChange, eventUuid }) => {
  const [addOpen, setAddOpen]   = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing]   = useState<TeamMember | null>(null);

  // Add state
  const [email, setEmail]     = useState("");
  const [adding, setAdding]   = useState(false);
  const [addResult, setAddResult] = useState<{ name: string | null; invite_sent: boolean } | null>(null);

  // Edit state
  const [editForm, setEditForm] = useState({ name: "", role: "", phone: "" });
  const [saving, setSaving]     = useState(false);

  const openAdd = () => {
    setEmail("");
    setAddResult(null);
    setAddOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditing(m);
    setEditForm({ name: m.name, role: m.role, phone: m.phone || "" });
    setEditOpen(true);
  };

  const handleAdd = async () => {
    if (!email.trim() || !eventUuid) return;
    setAdding(true);
    try {
      const saved = await createEventTeamMember(eventUuid, email.trim());
      onChange([...teamMembers, saved as TeamMember]);
      setAddResult({ name: saved.name ?? null, invite_sent: !!saved.invite_sent });
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async () => {
    if (!editing || !eventUuid) return;
    setSaving(true);
    try {
      const saved = await updateEventTeamMember(eventUuid, editing.id, {
        name:  editForm.name.trim() || undefined,
        role:  editForm.role.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
      });
      onChange(teamMembers.map((m) => m.id === editing.id ? saved as TeamMember : m));
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: TeamMember) => {
    if (eventUuid && /^\d+$/.test(String(m.id))) {
      await deleteEventTeamMember(eventUuid, m.id).catch(() => {});
    }
    onChange(teamMembers.filter((x) => x.id !== m.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-500" /> Team Members
        </h3>
        <Button type="button" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Team Member
        </Button>
      </div>

      {teamMembers.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No team members yet.</p>
          <button type="button" onClick={openAdd} className="mt-2 text-sm text-primary underline">
            Add your first team member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {teamMembers.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt={m.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{m.name || <span className="italic text-gray-400">Invite pending</span>}</p>
                    <p className="text-xs text-gray-500">{m.role}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</span>
                      {m.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button type="button" variant="outline" size="sm" className="px-2" onClick={() => openEdit(m)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="sm"
                    className="px-2 text-red-500 hover:text-red-600 hover:border-red-300"
                    onClick={() => handleDelete(m)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Add dialog ── */}
      <Dialog open={addOpen} onOpenChange={(v) => { if (!adding) { setAddOpen(v); if (!v) { setEmail(""); setAddResult(null); } } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>

          {!addResult ? (
            <>
              <div className="space-y-3 py-2">
                <p className="text-sm text-gray-500">
                  Enter the person's email address. If they have an account they will be added immediately; otherwise an invite link will be sent.
                </p>
                <div>
                  <Label>Email Address <span className="text-red-500">*</span></Label>
                  <Input
                    type="email"
                    placeholder="member@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    disabled={adding}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>Cancel</Button>
                <Button type="button" onClick={handleAdd} disabled={!email.trim() || adding}>
                  {adding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding…</> : "Add Member"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-4 space-y-4">
              {addResult.invite_sent ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                    <Send className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Invite sent!</p>
                    <p className="text-sm text-gray-500 mt-1">
                      An invitation email has been sent to <strong>{email}</strong>. They will complete their profile when they accept.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Team member added!</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <strong>{addResult.name}</strong> has been added to the event team and notified by email.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setAddResult(null); setEmail(""); }}>
                  Add Another
                </Button>
                <Button type="button" className="flex-1" onClick={() => { setAddOpen(false); setAddResult(null); setEmail(""); }}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={editOpen} onOpenChange={(v) => { if (!saving) setEditOpen(v); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input placeholder="Full name" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>Role</Label>
                <Input placeholder="Event Coordinator" value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Phone</Label>
                <Input placeholder="+1 555 000 0000" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleEdit} disabled={saving}>
              {saving ? "Saving..." : "Update Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamMemberForm;

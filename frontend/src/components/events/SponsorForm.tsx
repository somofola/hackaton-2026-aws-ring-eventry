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
import { Sponsor } from "@/types";
import { Plus, Trash2, Edit, Star, ImagePlus, X, Globe } from "lucide-react";
import { createEventSponsor, updateEventSponsor, deleteEventSponsor } from "@/services/eventService";

interface SponsorFormProps {
  sponsors: Sponsor[];
  onChange: (sponsors: Sponsor[]) => void;
  eventUuid?: string;
}

const TIERS = [
  { value: "platinum", label: "Platinum", color: "bg-cyan-100 text-cyan-800" },
  { value: "gold",     label: "Gold",     color: "bg-yellow-100 text-yellow-800" },
  { value: "silver",   label: "Silver",   color: "bg-gray-200 text-gray-700" },
  { value: "bronze",   label: "Bronze",   color: "bg-orange-100 text-orange-800" },
  { value: "partner",  label: "Partner",  color: "bg-purple-100 text-purple-800" },
];

const tierBadge = (tier: string) => {
  const t = TIERS.find((t) => t.value === tier) ?? TIERS[3];
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${t.color}`}>{t.label}</span>;
};

const EMPTY = { name: "", tier: "bronze", website: "", description: "", contactName: "", contactEmail: "" };

const SponsorForm: React.FC<SponsorFormProps> = ({ sponsors, onChange, eventUuid }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    if (logoRef.current) logoRef.current.value = "";
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setLogoFile(null);
    setLogoPreview("");
    setOpen(true);
  };

  const openEdit = (sp: Sponsor) => {
    setEditing(sp);
    setLogoFile(null);
    setLogoPreview(sp.logoUrl || "");
    setForm({
      name: sp.name,
      tier: sp.tier,
      website: sp.website || "",
      description: sp.description || "",
      contactName: sp.contactName || "",
      contactEmail: sp.contactEmail || "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    const payload = {
      name:          form.name.trim(),
      tier:          form.tier,
      website:       form.website.trim() || undefined,
      description:   form.description.trim() || undefined,
      contact_name:  form.contactName.trim() || undefined,
      contact_email: form.contactEmail.trim() || undefined,
    };

    if (eventUuid) {
      setSaving(true);
      try {
        if (editing) {
          const saved = await updateEventSponsor(eventUuid, editing.id, payload, logoFile);
          onChange(sponsors.map((s) => s.id === editing.id ? saved as Sponsor : s));
        } else {
          const saved = await createEventSponsor(eventUuid, payload, logoFile);
          onChange([...sponsors, saved as Sponsor]);
        }
        setOpen(false);
      } finally {
        setSaving(false);
      }
    } else {
      const sponsor: Sponsor = {
        id: editing?.id || Date.now().toString(),
        name: form.name,
        tier: form.tier as Sponsor["tier"],
        website: form.website || undefined,
        description: form.description || undefined,
        logoUrl: logoPreview || undefined,
        contactName: form.contactName || undefined,
        contactEmail: form.contactEmail || undefined,
      };
      onChange(editing ? sponsors.map((s) => s.id === editing.id ? sponsor : s) : [...sponsors, sponsor]);
      setOpen(false);
    }
  };

  const handleDelete = async (sp: Sponsor) => {
    if (eventUuid && /^\d+$/.test(String(sp.id))) {
      await deleteEventSponsor(eventUuid, sp.id).catch(() => {});
    }
    onChange(sponsors.filter((s) => s.id !== sp.id));
  };

  const canSave = !!form.name.trim();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-gray-500" /> Sponsors
        </h3>
        <Button type="button" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Sponsor
        </Button>
      </div>

      {sponsors.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Star className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No sponsors yet.</p>
          <button type="button" onClick={openAdd} className="mt-2 text-sm text-primary underline">
            Add your first sponsor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sponsors.map((sp) => (
            <Card key={sp.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {sp.logoUrl ? (
                    <img src={sp.logoUrl} alt={sp.name} className="w-12 h-12 rounded object-contain bg-gray-50 border shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center shrink-0">
                      <Star className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{sp.name}</p>
                      {tierBadge(sp.tier)}
                    </div>
                    {sp.description && <p className="text-xs text-gray-400 truncate mt-0.5">{sp.description}</p>}
                    {sp.website && (
                      <a href={sp.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 mt-0.5 hover:underline">
                        <Globe className="h-3 w-3" />{sp.website}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button type="button" variant="outline" size="sm" className="px-2" onClick={() => openEdit(sp)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="sm"
                    className="px-2 text-red-500 hover:text-red-600 hover:border-red-300"
                    onClick={() => handleDelete(sp)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Sponsor" : "Add Sponsor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Logo */}
            <div>
              <Label>Logo</Label>
              {logoPreview ? (
                <div className="relative mt-1 w-16">
                  <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded object-contain border bg-gray-50" />
                  <button type="button" onClick={clearLogo}
                    className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg px-4 py-2.5 cursor-pointer hover:border-gray-300 transition-colors w-fit">
                  <ImagePlus className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500">Upload logo</span>
                  <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp"
                    className="hidden" onChange={handleLogoChange} />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sponsor Name <span className="text-red-500">*</span></Label>
                <Input placeholder="Acme Inc" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <Label>Tier</Label>
                <Select value={form.tier} onValueChange={(v) => set("tier", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Website</Label>
                <Input placeholder="https://sponsor.com" value={form.website} onChange={(e) => set("website", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea placeholder="Brief description" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div>
                <Label>Contact Name</Label>
                <Input placeholder="Jane Doe" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input type="email" placeholder="jane@sponsor.com" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? "Saving..." : editing ? "Update Sponsor" : "Add Sponsor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SponsorForm;

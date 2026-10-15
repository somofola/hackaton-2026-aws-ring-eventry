import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Exhibitor } from "@/types";
import { Plus, Trash2, Edit, Building, Globe, ImagePlus, X } from "lucide-react";
import { createEventExhibitor, updateEventExhibitor, deleteEventExhibitor } from "@/services/eventService";

interface ExhibitorFormProps {
  exhibitors: Exhibitor[];
  onChange: (exhibitors: Exhibitor[]) => void;
  eventUuid?: string;
}

const EMPTY = {
  name: "", description: "", website: "",
  boothNumber: "", contactName: "", contactEmail: "", contactPhone: "",
};

const ExhibitorForm: React.FC<ExhibitorFormProps> = ({ exhibitors, onChange, eventUuid }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exhibitor | null>(null);
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

  const openAdd = () => { setEditing(null); setForm(EMPTY); setLogoFile(null); setLogoPreview(""); setOpen(true); };
  const openEdit = (ex: Exhibitor) => {
    setEditing(ex);
    setLogoFile(null);
    setLogoPreview(ex.logoUrl || "");
    setForm({
      name: ex.name,
      description: ex.description,
      website: ex.website || "",
      boothNumber: ex.boothNumber || "",
      contactName: ex.contact.name,
      contactEmail: ex.contact.email,
      contactPhone: ex.contact.phone || "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.contactName.trim() || !form.contactEmail.trim()) return;

    const payload = {
      company_name:  form.name.trim(),
      contact_name:  form.contactName.trim(),
      contact_email: form.contactEmail.trim(),
      contact_phone: form.contactPhone.trim() || undefined,
      website:       form.website.trim() || undefined,
      booth_number:  form.boothNumber.trim() || undefined,
      description:   form.description.trim() || undefined,
    };

    if (eventUuid) {
      setSaving(true);
      try {
        if (editing) {
          const saved = await updateEventExhibitor(eventUuid, editing.id, payload, logoFile);
          onChange(exhibitors.map((e) => e.id === editing.id ? saved as Exhibitor : e));
        } else {
          const saved = await createEventExhibitor(eventUuid, payload, logoFile);
          onChange([...exhibitors, saved as Exhibitor]);
        }
        setOpen(false);
      } finally {
        setSaving(false);
      }
    } else {
      // Local-only fallback
      const exhibitor: Exhibitor = {
        id: editing?.id || Date.now().toString(),
        name: form.name, description: form.description,
        website: form.website || undefined,
        boothNumber: form.boothNumber || undefined,
        contact: { name: form.contactName, email: form.contactEmail, phone: form.contactPhone || undefined },
      };
      onChange(editing ? exhibitors.map((e) => e.id === editing.id ? exhibitor : e) : [...exhibitors, exhibitor]);
      setOpen(false);
    }
  };

  const handleDelete = async (ex: Exhibitor) => {
    if (eventUuid && /^\d+$/.test(String(ex.id))) {
      await deleteEventExhibitor(eventUuid, ex.id).catch(() => {});
    }
    onChange(exhibitors.filter((x) => x.id !== ex.id));
  };

  const canSave = !!(form.name.trim() && form.contactName.trim() && form.contactEmail.trim());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building className="h-5 w-5 text-gray-500" /> Exhibitors
        </h3>
        <Button type="button" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Exhibitor
        </Button>
      </div>

      {exhibitors.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Building className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No exhibitors yet.</p>
          <button type="button" onClick={openAdd} className="mt-2 text-sm text-primary underline">
            Add your first exhibitor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exhibitors.map((ex) => (
            <Card key={ex.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {ex.logoUrl ? (
                    <img src={ex.logoUrl} alt={ex.name} className="w-10 h-10 rounded object-contain bg-gray-50 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
                      <Building className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{ex.name}</p>
                      {ex.boothNumber && (
                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Booth {ex.boothNumber}</span>
                      )}
                    </div>
                    {ex.description && <p className="text-xs text-gray-400 truncate">{ex.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{ex.contact.name} · {ex.contact.email}</p>
                    {ex.website && (
                      <a href={ex.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 mt-0.5 hover:underline">
                        <Globe className="h-3 w-3" />{ex.website}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button type="button" variant="outline" size="sm" className="px-2" onClick={() => openEdit(ex)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="sm"
                    className="px-2 text-red-500 hover:text-red-600 hover:border-red-300"
                    onClick={() => handleDelete(ex)}>
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
            <DialogTitle>{editing ? "Edit Exhibitor" : "Add Exhibitor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            {/* Logo upload */}
            <div>
              <Label>Logo</Label>
              {logoPreview ? (
                <div className="relative mt-1 w-16">
                  <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded object-contain border bg-gray-50" />
                  <button
                    type="button" onClick={clearLogo}
                    className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg px-4 py-2.5 cursor-pointer hover:border-gray-300 transition-colors w-fit">
                  <ImagePlus className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500">Upload logo</span>
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company Name <span className="text-red-500">*</span></Label>
                <Input placeholder="Acme Corp" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <Label>Booth Number</Label>
                <Input placeholder="A101" value={form.boothNumber} onChange={(e) => set("boothNumber", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Website</Label>
                <Input placeholder="https://company.com" value={form.website} onChange={(e) => set("website", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea placeholder="What they exhibit" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
            </div>

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input placeholder="Contact person" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
              </div>
              <div>
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input type="email" placeholder="contact@…" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Phone</Label>
                <Input placeholder="+1 555 000 0000" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? "Saving..." : editing ? "Update Exhibitor" : "Add Exhibitor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExhibitorForm;

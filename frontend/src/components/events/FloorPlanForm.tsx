import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FloorPlan, FloorPlanArea } from "@/types";
import { Plus, Trash2, Map, ImagePlus, X } from "lucide-react";
import { createFloorPlan } from "@/services/eventService";

interface FloorPlanFormProps {
  floorPlans: FloorPlan[];
  onChange: (plans: FloorPlan[]) => void;
  eventUuid?: string;
}

const COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B",
  "#8B5CF6", "#F97316", "#06B6D4", "#84CC16",
];

const EMPTY_AREA: Partial<FloorPlanArea> = { name: "", capacity: 0, x: 0, y: 0, width: 100, height: 100, color: "#3B82F6" };

const CANVAS_W = 800;
const CANVAS_H = 600;

const FloorPlanForm: React.FC<FloorPlanFormProps> = ({ floorPlans, onChange, eventUuid }) => {
  const [planOpen, setPlanOpen] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planImageFile, setPlanImageFile] = useState<File | null>(null);
  const [planImagePreview, setPlanImagePreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [areaOpen, setAreaOpen] = useState(false);
  const [areaTargetId, setAreaTargetId] = useState<string | null>(null);
  const [draftArea, setDraftArea] = useState<Partial<FloorPlanArea>>(EMPTY_AREA);

  // ── Floor plan dialog ─────────────────────────────────────────────────────
  const openPlanDialog = () => {
    setPlanName("");
    setPlanImageFile(null);
    setPlanImagePreview("");
    setPlanOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlanImageFile(file);
    setPlanImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setPlanImageFile(null);
    setPlanImagePreview("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const savePlan = async () => {
    if (!planName.trim()) return;

    if (eventUuid) {
      if (!planImageFile) return;
      setSaving(true);
      try {
        const saved = await createFloorPlan(eventUuid, planName.trim(), planImageFile);
        onChange([...floorPlans, { ...saved, areas: saved.areas ?? [] } as FloorPlan]);
        setPlanOpen(false);
      } finally {
        setSaving(false);
      }
    } else {
      const plan: FloorPlan = {
        id: Date.now().toString(),
        name: planName.trim(),
        imageUrl: planImagePreview || undefined,
        areas: [],
      };
      onChange([...floorPlans, plan]);
      setPlanOpen(false);
    }
  };

  const removePlan = (id: string) => onChange(floorPlans.filter((p) => p.id !== id));

  // ── Area dialog ───────────────────────────────────────────────────────────
  const openAreaDialog = (planId: string) => {
    setAreaTargetId(planId);
    setDraftArea({ ...EMPTY_AREA });
    setAreaOpen(true);
  };

  const saveArea = () => {
    if (!draftArea.name?.trim() || !draftArea.capacity || !areaTargetId) return;
    const area: FloorPlanArea = {
      id: Date.now().toString(),
      name: draftArea.name,
      capacity: draftArea.capacity,
      x: draftArea.x ?? 0,
      y: draftArea.y ?? 0,
      width: draftArea.width ?? 100,
      height: draftArea.height ?? 100,
      color: draftArea.color ?? "#3B82F6",
    };
    onChange(floorPlans.map((p) =>
      p.id === areaTargetId ? { ...p, areas: [...p.areas, area] } : p
    ));
    setAreaOpen(false);
  };

  const removeArea = (planId: string, areaId: string) =>
    onChange(floorPlans.map((p) =>
      p.id === planId ? { ...p, areas: p.areas.filter((a) => a.id !== areaId) } : p
    ));

  const canSavePlan = !!(planName.trim() && (eventUuid ? planImageFile : true));
  const canSaveArea = !!(draftArea.name?.trim() && draftArea.capacity);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Map className="h-5 w-5" /> Floor Plans
        </h3>
        <Button type="button" onClick={openPlanDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Floor Plan
        </Button>
      </div>

      {/* Empty state */}
      {floorPlans.length === 0 && (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Map className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No floor plans yet.</p>
          <button type="button" onClick={openPlanDialog} className="mt-2 text-sm text-primary underline">
            Add your first floor plan
          </button>
        </div>
      )}

      {/* Floor plan cards */}
      {floorPlans.map((plan) => (
        <Card key={plan.id} className="p-4 space-y-4">
          <div className="flex items-start justify-between">
            <p className="font-semibold">{plan.name}</p>
            <Button type="button" variant="outline" size="sm"
              className="text-red-500 hover:text-red-600 hover:border-red-300 px-2"
              onClick={() => removePlan(plan.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Image preview */}
          {plan.imageUrl && (
            <img
              src={plan.imageUrl}
              alt={plan.name}
              className="w-full max-h-48 object-contain rounded-lg border bg-gray-50"
            />
          )}

          {/* Areas overlay canvas (only if areas exist) */}
          {plan.areas.length > 0 && (
            <div className="bg-gray-50 border rounded-lg p-3">
              <div
                className="relative border-2 border-dashed border-gray-300 mx-auto"
                style={{ width: Math.min((plan.width ?? CANVAS_W) / 2, 400), height: Math.min((plan.height ?? CANVAS_H) / 2, 300) }}
              >
                {plan.areas.map((area) => (
                  <div
                    key={area.id}
                    className="absolute border border-white text-white text-xs flex items-center justify-center font-medium overflow-hidden"
                    style={{
                      left: `${(area.x / (plan.width ?? CANVAS_W)) * 100}%`,
                      top: `${(area.y / (plan.height ?? CANVAS_H)) * 100}%`,
                      width: `${(area.width / (plan.width ?? CANVAS_W)) * 100}%`,
                      height: `${(area.height / (plan.height ?? CANVAS_H)) * 100}%`,
                      backgroundColor: area.color,
                    }}
                    title={`${area.name} (${area.capacity})`}
                  >
                    {area.name}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center mt-1">Areas overlay (50% scale)</p>
            </div>
          )}

          {/* Areas list */}
          {plan.areas.length > 0 && (
            <div className="space-y-2">
              {plan.areas.map((area) => (
                <div key={area.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: area.color }} />
                    <span className="font-medium">{area.name}</span>
                    <span className="text-gray-400">· cap. {area.capacity}</span>
                    <span className="text-gray-400">· {area.x},{area.y} {area.width}×{area.height}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="px-2 h-7 text-red-400 hover:text-red-600"
                    onClick={() => removeArea(plan.id, area.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button type="button" variant="outline" size="sm" onClick={() => openAreaDialog(plan.id)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Area
          </Button>
        </Card>
      ))}

      {/* ── Add Floor Plan dialog ──────────────────────────────────────────── */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Floor Plan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="fp-name">Plan Name <span className="text-red-500">*</span></Label>
              <Input
                id="fp-name"
                placeholder="e.g. Main Hall, Conference Room A"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>

            <div>
              <Label>Floor Plan Image {eventUuid && <span className="text-red-500">*</span>}</Label>
              {planImagePreview ? (
                <div className="relative mt-1">
                  <img
                    src={planImagePreview}
                    alt="Preview"
                    className="w-full max-h-40 object-contain rounded-lg border bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 rounded-lg py-6 cursor-pointer hover:border-gray-300 transition-colors">
                  <ImagePlus className="h-6 w-6 text-gray-400" />
                  <span className="text-sm text-gray-500">Click to upload image</span>
                  <span className="text-xs text-gray-400">JPG, PNG, WebP · max 250 KB processed</span>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPlanOpen(false)}>Cancel</Button>
            <Button type="button" onClick={savePlan} disabled={!canSavePlan || saving}>
              {saving ? "Saving..." : "Add Floor Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Area dialog ────────────────────────────────────────────────── */}
      <Dialog open={areaOpen} onOpenChange={setAreaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Area</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ar-name">Area Name <span className="text-red-500">*</span></Label>
                <Input
                  id="ar-name"
                  placeholder="e.g. VIP Section"
                  value={draftArea.name || ""}
                  onChange={(e) => setDraftArea({ ...draftArea, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="ar-cap">Capacity <span className="text-red-500">*</span></Label>
                <Input
                  id="ar-cap"
                  type="number"
                  min="1"
                  placeholder="0"
                  value={draftArea.capacity || ""}
                  onChange={(e) => setDraftArea({ ...draftArea, capacity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {(["x", "y", "width", "height"] as const).map((field) => (
                <div key={field}>
                  <Label htmlFor={`ar-${field}`} className="capitalize">{field}</Label>
                  <Input
                    id={`ar-${field}`}
                    type="number"
                    min="0"
                    value={draftArea[field] ?? 0}
                    onChange={(e) => setDraftArea({ ...draftArea, [field]: parseInt(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>

            <div>
              <Label>Colour</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-7 h-7 rounded border-2 transition-transform ${draftArea.color === c ? "border-gray-800 scale-110" : "border-gray-300"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setDraftArea({ ...draftArea, color: c })}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAreaOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveArea} disabled={!canSaveArea}>Add Area</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FloorPlanForm;

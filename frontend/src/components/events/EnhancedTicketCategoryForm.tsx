
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TicketCategory, FloorPlan } from "@/types";
import { Plus, Trash2, Tag, Ticket } from "lucide-react";
import { createTicketCategory } from "@/services/eventService";

interface EnhancedTicketCategoryFormProps {
  ticketCategories: TicketCategory[];
  floorPlans: FloorPlan[];
  onChange: (categories: TicketCategory[]) => void;
  maxAttendees?: number;
  eventUuid?: string;
}

const EMPTY_CATEGORY: Partial<TicketCategory> = {
  name: "",
  description: "",
  price: 0,
  maxQuantity: 0,
  soldQuantity: 0,
  color: "#3B82F6",
  floorPlanAreas: [],
};

const EnhancedTicketCategoryForm: React.FC<EnhancedTicketCategoryFormProps> = ({
  ticketCategories,
  floorPlans,
  onChange,
  maxAttendees,
  eventUuid,
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<TicketCategory>>(EMPTY_CATEGORY);
  const [saving, setSaving] = useState(false);

  const allocatedQty = ticketCategories.reduce((sum, c) => sum + (c.maxQuantity || 0), 0);
  const remainingQty = maxAttendees && maxAttendees > 0 ? Math.max(0, maxAttendees - allocatedQty) : null;

  const set = (field: keyof TicketCategory, value: any) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const handleOpen = () => {
    setDraft({ ...EMPTY_CATEGORY });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!draft.name?.trim() || !draft.description?.trim()) return;

    if (eventUuid) {
      setSaving(true);
      try {
        const saved = await createTicketCategory(eventUuid, {
          name: draft.name!,
          description: draft.description!,
          price: draft.price ?? 0,
          maxQuantity: draft.maxQuantity ?? 0,
          color: draft.color || "#3B82F6",
          floorPlanAreas: draft.floorPlanAreas || [],
        });
        onChange([...ticketCategories, saved as TicketCategory]);
        setOpen(false);
      } finally {
        setSaving(false);
      }
    } else {
      const newCategory: TicketCategory = {
        id: Date.now().toString(),
        name: draft.name!,
        description: draft.description!,
        price: draft.price ?? 0,
        maxQuantity: draft.maxQuantity ?? 0,
        soldQuantity: 0,
        color: draft.color || "#3B82F6",
        floorPlanAreas: draft.floorPlanAreas || [],
      };
      onChange([...ticketCategories, newCategory]);
      setOpen(false);
    }
  };

  const removeCategory = (id: string) =>
    onChange(ticketCategories.filter((c) => c.id !== id));

  const canSave = !!(draft.name?.trim() && draft.description?.trim());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Tag className="h-5 w-5 text-gray-500" /> Ticket Categories</h3>
        <Button type="button" onClick={handleOpen}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Category list */}
      {ticketCategories.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Tag className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No ticket categories yet.</p>
          <button
            type="button"
            onClick={handleOpen}
            className="mt-2 text-sm text-primary underline"
          >
            Add your first category
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {ticketCategories.map((cat) => (
            <Card key={cat.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: cat.color || "#3B82F6" }}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{cat.name}</p>
                    <p className="text-xs text-gray-500 truncate">{cat.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-600 shrink-0">
                  <span>
                    <span className="font-medium">${cat.price}</span>
                  </span>
                  <span>Qty: {cat.maxQuantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeCategory(cat.id)}
                    className="text-red-500 hover:text-red-600 hover:border-red-300 px-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Category Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Ticket Category</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="cat-name">Category Name <span className="text-red-500">*</span></Label>
                <Input
                  id="cat-name"
                  placeholder="e.g. VIP, General Admission"
                  value={draft.name || ""}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="cat-price">Price ($)</Label>
                <Input
                  id="cat-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={draft.price ?? ""}
                  onChange={(e) => set("price", parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label htmlFor="cat-qty">
                  Max Quantity
                  {remainingQty !== null && (
                    <span className={`ml-1.5 text-xs font-normal ${remainingQty === 0 ? "text-red-500" : "text-gray-400"}`}>
                      ({remainingQty} remaining)
                    </span>
                  )}
                </Label>
                <Input
                  id="cat-qty"
                  type="number"
                  min="1"
                  max={remainingQty !== null ? remainingQty : undefined}
                  placeholder={remainingQty !== null ? `max ${remainingQty}` : "0"}
                  value={draft.maxQuantity ?? ""}
                  onChange={(e) => set("maxQuantity", parseInt(e.target.value) || 0)}
                />
                {remainingQty === 0 && (
                  <p className="text-xs text-red-500 mt-1">All capacity is allocated across existing categories.</p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="cat-desc">Description <span className="text-red-500">*</span></Label>
                <Textarea
                  id="cat-desc"
                  placeholder="Describe what's included in this ticket category"
                  value={draft.description || ""}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="cat-color">Colour</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="cat-color"
                    type="color"
                    value={draft.color || "#3B82F6"}
                    onChange={(e) => set("color", e.target.value)}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">{draft.color || "#3B82F6"}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? "Saving..." : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedTicketCategoryForm;

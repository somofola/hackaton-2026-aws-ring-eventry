
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TicketCategory, FloorPlan } from "@/types";
import { Plus, Trash2, Ticket } from "lucide-react";

interface TicketCategoryFormProps {
  ticketCategories: TicketCategory[];
  floorPlans: FloorPlan[];
  onChange: (categories: TicketCategory[]) => void;
}

const TicketCategoryForm: React.FC<TicketCategoryFormProps> = ({
  ticketCategories,
  floorPlans,
  onChange,
}) => {
  const [newCategory, setNewCategory] = useState<Partial<TicketCategory>>({
    name: "",
    description: "",
    price: 0,
    maxQuantity: 0,
    color: "#3B82F6",
    floorPlanAreas: [],
  });

  const colors = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B", 
    "#8B5CF6", "#F97316", "#06B6D4", "#84CC16"
  ];

  const handleAddCategory = () => {
    if (newCategory.name && newCategory.price !== undefined && newCategory.maxQuantity) {
      const category: TicketCategory = {
        id: Date.now().toString(),
        name: newCategory.name,
        description: newCategory.description || "",
        price: newCategory.price,
        maxQuantity: newCategory.maxQuantity,
        soldQuantity: 0,
        color: newCategory.color || "#3B82F6",
        floorPlanAreas: newCategory.floorPlanAreas || [],
      };
      
      onChange([...ticketCategories, category]);
      setNewCategory({
        name: "",
        description: "",
        price: 0,
        maxQuantity: 0,
        color: "#3B82F6",
        floorPlanAreas: [],
      });
    }
  };

  const handleRemoveCategory = (id: string) => {
    onChange(ticketCategories.filter(category => category.id !== id));
  };

  const handleAreaAssignment = (categoryId: string, areaId: string) => {
    onChange(ticketCategories.map(category => {
      if (category.id === categoryId) {
        const areas = category.floorPlanAreas || [];
        const isAssigned = areas.includes(areaId);
        return {
          ...category,
          floorPlanAreas: isAssigned 
            ? areas.filter(id => id !== areaId)
            : [...areas, areaId]
        };
      }
      return category;
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Ticket className="mr-2 h-5 w-5" />
          Ticket Categories
        </h3>
        
        {/* Add New Category */}
        <Card className="p-4 mb-4">
          <h4 className="font-medium mb-3">Add New Category</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g., VIP, General Admission"
              />
            </div>
            <div>
              <Label htmlFor="categoryPrice">Price ($)</Label>
              <Input
                id="categoryPrice"
                type="number"
                step="0.01"
                value={newCategory.price}
                onChange={(e) => setNewCategory({ ...newCategory, price: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          
          <div className="mt-4">
            <Label htmlFor="categoryDescription">Description</Label>
            <Textarea
              id="categoryDescription"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              placeholder="Brief description of what this ticket includes"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="categoryQuantity">Max Quantity</Label>
              <Input
                id="categoryQuantity"
                type="number"
                value={newCategory.maxQuantity}
                onChange={(e) => setNewCategory({ ...newCategory, maxQuantity: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="categoryColor">Category Color</Label>
              <div className="flex space-x-2 mt-1">
                {colors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded border-2 ${newCategory.color === color ? 'border-gray-800' : 'border-gray-300'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCategory({ ...newCategory, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <Button onClick={handleAddCategory} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </Card>
        
        {/* Existing Categories */}
        {ticketCategories.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Current Categories</h4>
            {ticketCategories.map((category) => (
              <Card key={category.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      <h5 className="font-medium">{category.name}</h5>
                      <Badge variant="outline">${category.price}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                    <p className="text-sm">
                      Sold: {category.soldQuantity}/{category.maxQuantity}
                    </p>
                    
                    {floorPlans.length > 0 && (
                      <div className="mt-3">
                        <Label className="text-sm">Assigned Floor Plan Areas:</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {floorPlans.flatMap(plan => plan.areas).map(area => (
                            <button
                              key={area.id}
                              type="button"
                              onClick={() => handleAreaAssignment(category.id, area.id)}
                              className={`px-2 py-1 text-xs rounded ${
                                category.floorPlanAreas?.includes(area.id)
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {area.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketCategoryForm;

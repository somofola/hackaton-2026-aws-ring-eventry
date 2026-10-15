import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Globe, Layers } from "lucide-react";

type LocationType = "virtual" | "physical" | "hybrid";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationPickerProps {
  locationType: LocationType;
  location: string;
  virtualLink: string;
  onTypeChange: (type: LocationType) => void;
  onLocationChange: (location: string) => void;
  onVirtualLinkChange: (link: string) => void;
  onCoordsChange?: (lat: number, lng: number) => void;
  required?: boolean;
}

const TYPE_OPTIONS: { value: LocationType; label: string; icon: React.ElementType }[] = [
  { value: "physical", label: "Physical", icon: MapPin  },
  { value: "virtual",  label: "Virtual",  icon: Globe   },
  { value: "hybrid",   label: "Hybrid",   icon: Layers  },
];

const LocationPicker: React.FC<LocationPickerProps> = ({
  locationType,
  location,
  virtualLink,
  onTypeChange,
  onLocationChange,
  onVirtualLinkChange,
  onCoordsChange,
  required,
}) => {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const showAddress = locationType === "physical" || locationType === "hybrid";
  const showVirtual = locationType === "virtual"  || locationType === "hybrid";

  // Nominatim autocomplete
  useEffect(() => {
    if (!showAddress || !location.trim() || location.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [location, showAddress]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-3">
      {/* Type toggle */}
      <div>
        <Label>
          Location Type{required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="flex gap-2 mt-1.5">
          {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onTypeChange(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                locationType === value
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Physical address input with autocomplete */}
      {showAddress && (
        <div ref={containerRef} className="relative">
          <Label htmlFor="location">
            Venue Address{required && locationType === "physical" && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="relative mt-1">
            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              id="location"
              className="pl-9"
              placeholder="Search for venue address…"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              required={required && locationType === "physical"}
              autoComplete="off"
            />
            {loading && (
              <span className="absolute right-3 top-2.5 text-xs text-gray-400">Searching…</span>
            )}
          </div>
          {showDropdown && suggestions.length > 0 && (
            <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto text-sm">
              {suggestions.map((s) => (
                <li
                  key={s.place_id}
                  className="flex items-start gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  onMouseDown={() => {
                    onLocationChange(s.display_name);
                    onCoordsChange?.(parseFloat(s.lat), parseFloat(s.lon));
                    setShowDropdown(false);
                    setSuggestions([]);
                  }}
                >
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
                  <span className="leading-snug">{s.display_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Virtual link input */}
      {showVirtual && (
        <div>
          <Label htmlFor="virtual_link">
            Meeting Link / Platform{required && locationType === "virtual" && <span className="text-red-500 ml-1">*</span>}
            {locationType === "hybrid" && <span className="text-xs text-gray-400 ml-1 font-normal">(optional)</span>}
          </Label>
          <div className="relative mt-1">
            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              id="virtual_link"
              className="pl-9"
              placeholder="https://meet.example.com/room or Zoom / Teams / Google Meet"
              value={virtualLink}
              onChange={(e) => onVirtualLinkChange(e.target.value)}
              required={required && locationType === "virtual"}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;

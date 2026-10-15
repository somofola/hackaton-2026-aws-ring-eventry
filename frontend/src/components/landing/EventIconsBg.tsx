import React from "react";
import {
  Calendar, Ticket, Users, MapPin, Mic, Clock, QrCode, Camera,
  Bell, PartyPopper, Music, Gift, Coffee, Star, Mail, ScanFace,
} from "lucide-react";

const ICONS = [
  Calendar, Ticket, Users, MapPin, Mic, Clock, QrCode, Camera,
  Bell, PartyPopper, Music, Gift, Coffee, Star, Mail, ScanFace,
];

const SIZES = ["h-6 w-6", "h-8 w-8", "h-10 w-10", "h-12 w-12", "h-16 w-16"];

const ROTATIONS = ["rotate-0", "rotate-6", "-rotate-6", "rotate-12", "-rotate-12"];

interface EventIconsBgProps {
  count?: number;
  className?: string;
}

const EventIconsBg: React.FC<EventIconsBgProps> = ({ count = 140, className = "" }) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none absolute inset-0 overflow-hidden text-primary/[0.03] select-none ${className}`}
  >
    <div className="flex h-full w-full flex-wrap content-between items-center justify-between gap-x-10 gap-y-8 p-6">
      {Array.from({ length: count }).map((_, i) => {
        const Icon = ICONS[(i * 7) % ICONS.length];
        return (
          <Icon
            key={i}
            className={`${SIZES[(i * 3) % SIZES.length]} ${ROTATIONS[(i * 5) % ROTATIONS.length]}`}
            strokeWidth={1.5}
          />
        );
      })}
    </div>
  </div>
);

export default EventIconsBg;

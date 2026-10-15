
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, QrCode } from "lucide-react";
import { Event, EventEnrollment } from "@/types";
import QRCode from "react-qr-code";

interface EventBadgeProps {
  event: Event;
  enrollment: EventEnrollment;
}

const EventBadge: React.FC<EventBadgeProps> = ({ event, enrollment }) => {
  return (
    <Card className="max-w-md mx-auto p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-primary">{event.title}</h2>
          <Badge variant={enrollment.checkedIn ? "default" : "secondary"}>
            {enrollment.checkedIn ? "Checked In" : "Enrolled"}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center justify-center space-x-2">
            <User className="h-4 w-4" />
            <span>{enrollment.userName}</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(event.date).toLocaleDateString()} at {event.start_time}</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>{event.location}</span>
          </div>
        </div>
        
        {enrollment.qrCode && (
          <div className="bg-white p-4 rounded-lg border">
            <QRCode
              value={enrollment.qrCode}
              size={200}
              className="mx-auto"
            />
            <div className="flex items-center justify-center mt-2 text-xs text-gray-500">
              <QrCode className="h-3 w-3 mr-1" />
              Event Check-in Code
            </div>
          </div>
        )}
        
        {enrollment.checkedIn && enrollment.checkedInAt && (
          <div className="text-xs text-green-600">
            Checked in at {new Date(enrollment.checkedInAt).toLocaleString()}
          </div>
        )}
      </div>
    </Card>
  );
};

export default EventBadge;

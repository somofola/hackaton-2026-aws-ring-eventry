
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEvent } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CheckInScanner from "@/components/events/CheckInScanner";
import AdminLayout from "@/components/layout/AdminLayout";

const EventCheckIn = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(uuid || "");

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">Loading event...</div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">Event not found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/events/" + uuid + "/manage")}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <p className="text-gray-600">Event Check-in</p>
          </div>
        </div>

        <CheckInScanner 
          event={event} 
          teamMemberName="Team Member" // In a real app, this would come from auth context
        />
      </div>
    </AdminLayout>
  );
};

export default EventCheckIn;

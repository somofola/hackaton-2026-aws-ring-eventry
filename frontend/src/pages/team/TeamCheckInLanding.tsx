
import React from "react";
import TeamLayout from "@/components/layout/TeamLayout";
import { Button } from "@/components/ui/button";
import { CalendarSearch } from "lucide-react";
import { Link } from "react-router-dom";

const TeamCheckInLanding = () => {
  return (
    <TeamLayout>
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <CalendarSearch className="h-12 w-12 text-primary mb-2" />
        <h1 className="text-2xl font-bold text-center text-gray-900">Select an Event to Start Check-in</h1>
        <p className="text-gray-600 text-center max-w-md">
          You haven't selected an event to check-in attendees yet.<br />
          Please choose an event from your assigned events list.
        </p>
        <Link to="/team/events">
          <Button size="lg" className="mt-4">
            Browse My Events
          </Button>
        </Link>
      </div>
    </TeamLayout>
  );
};

export default TeamCheckInLanding;

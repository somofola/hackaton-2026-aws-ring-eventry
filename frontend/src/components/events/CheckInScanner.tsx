
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import RingCheckInView from "@/components/events/RingCheckInView";
import { useEventEnrollments } from "@/hooks/useApi";
import { fetchMyRingDevices, RingDevice } from "@/services/ringDeviceService";
import { Event } from "@/types";
import { Users, UserCheck, QrCode, XCircle } from "lucide-react";

interface CheckInScannerProps {
  event: Event;
  teamMemberName: string;
}

const CheckInScanner: React.FC<CheckInScannerProps> = ({ event, teamMemberName }) => {
  const [ringDeviceId, setRingDeviceId] = useState(() => localStorage.getItem("ring_test_device_id") || "");
  const [ringDevices, setRingDevices] = useState<RingDevice[]>([]);

  const { data: enrollments = [], refetch } = useEventEnrollments(event.uuid);

  React.useEffect(() => {
    fetchMyRingDevices(event.id).then(setRingDevices).catch(() => setRingDevices([]));
  }, [event.id]);

  const checkedInCount = enrollments.filter((e) => e.checked_in).length;
  const totalEnrolled = enrollments.length;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <QrCode className="mr-2 h-5 w-5" />
            Event Check-in Scanner
          </h3>
          <Badge variant="outline">
            <Users className="mr-1 h-3 w-3" />
            {checkedInCount}/{totalEnrolled} checked in
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="max-w-sm mx-auto space-y-1.5">
            <Label htmlFor="ring_counter_device_id">Ring Device</Label>
            <select
              id="ring_counter_device_id"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={ringDeviceId}
              onChange={(e) => {
                setRingDeviceId(e.target.value);
                localStorage.setItem("ring_test_device_id", e.target.value);
              }}
            >
              <option value="">Select a device...</option>
              {ringDevices.map((d) => (
                <option key={d.id} value={d.device_id}>
                  {d.name} {d.location ? `(${d.location})` : ""}
                </option>
              ))}
            </select>
            {ringDevices.length === 0 && (
              <p className="text-xs text-gray-500">No Ring devices assigned or onboarded yet.</p>
            )}
          </div>
          <RingCheckInView
            eventUuid={event.uuid}
            ringDeviceId={ringDeviceId}
            checkedInBy={teamMemberName}
            onCheckedIn={() => refetch()}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h4 className="font-semibold mb-4 flex items-center">
          <Users className="mr-2 h-4 w-4" />
          Attendee List ({totalEnrolled} total)
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {enrollments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No enrollments found for this event</p>
          ) : (
            enrollments.map((enrollment) => (
              <div key={enrollment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{enrollment.user_name}</div>
                  <div className="text-sm text-gray-500">{enrollment.user_email}</div>
                  {enrollment.checked_in_at && (
                    <div className="text-xs text-gray-400">
                      Checked in: {new Date(enrollment.checked_in_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <div>
                  {enrollment.checked_in ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <UserCheck className="mr-1 h-3 w-3" /> Checked In
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="mr-1 h-3 w-3" /> Pending
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default CheckInScanner;

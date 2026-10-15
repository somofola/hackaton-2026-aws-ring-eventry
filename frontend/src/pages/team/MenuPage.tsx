import React from "react";
import { Home, Calendar, QrCode, Settings, Bell, HelpCircle } from "lucide-react";
import MobileMenuPage from "@/components/layout/MobileMenuPage";

const links = [
  { name: "Dashboard", path: "/team/dashboard", icon: Home },
  { name: "My Events", path: "/team/events", icon: Calendar },
  { name: "Check-in Scanner", path: "/team/checkin", icon: QrCode },
  { name: "Notifications", path: "/team/notifications", icon: Bell },
  { name: "Support", path: "/team/settings?tab=support", icon: HelpCircle },
  { name: "Settings", path: "/team/settings", icon: Settings },
];

const TeamMenuPage: React.FC = () => (
  <MobileMenuPage title="Team Menu" links={links} dashboardPath="/team/dashboard" />
);

export default TeamMenuPage;

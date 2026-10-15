import React from "react";
import {
  Home,
  Calendar,
  QrCode,
  Settings,
  Bell,
  HelpCircle,
} from "lucide-react";
import MobileMenuPage from "@/components/layout/MobileMenuPage";

const links = [
  { name: "Dashboard", path: "/user/dashboard", icon: Home },
  { name: "Events", path: "/user/events", icon: Calendar },
  { name: "QR Codes", path: "/user/qr", icon: QrCode },
  { name: "Notifications", path: "/user/notifications", icon: Bell },
  { name: "Support", path: "/user/settings?tab=support", icon: HelpCircle },
  { name: "Settings", path: "/user/settings", icon: Settings },
];

const UserMenuPage: React.FC = () => (
  <MobileMenuPage title="Menu" links={links} dashboardPath="/user/dashboard" />
);

export default UserMenuPage;

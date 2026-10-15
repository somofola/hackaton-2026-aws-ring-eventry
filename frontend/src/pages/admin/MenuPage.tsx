import React from "react";
import {
  Home,
  Users,
  QrCode,
  Calendar,
  DollarSign,
  HelpCircle,
  Edit,
  BarChart3,
  Settings,
  Bell,
} from "lucide-react";
import MobileMenuPage from "@/components/layout/MobileMenuPage";

const links = [
  { name: "Dashboard", path: "/admin/dashboard", icon: Home },
  { name: "Users", path: "/admin/users", icon: Users },
  { name: "QR Codes", path: "/admin/qr-codes", icon: QrCode },
  { name: "Events", path: "/admin/events", icon: Calendar },
  { name: "Payments", path: "/admin/payments", icon: DollarSign },
  { name: "Contents", path: "/admin/content", icon: Edit },
  { name: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { name: "Notifications", path: "/admin/notifications", icon: Bell },
  { name: "Support", path: "/admin/settings?tab=support", icon: HelpCircle },
  { name: "Settings", path: "/admin/settings", icon: Settings },
];

const AdminMenuPage: React.FC = () => (
  <MobileMenuPage title="Admin Menu" links={links} dashboardPath="/admin/dashboard" />
);

export default AdminMenuPage;

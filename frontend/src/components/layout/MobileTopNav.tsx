import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Menu } from "lucide-react";
import { APP_LOGO } from "@/lib/logo";
import { BRAND_NAME } from "@/lib/brand";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";
import { useUserProfile } from "@/hooks/useUserProfile";
import NotificationBell from "./NotificationBell";

interface MobileTopNavProps {
  basePath?: string;
  title?: string;
  dashboardPath?: string;
  gradientClass?: string;
  showBackButton?: boolean;
  showMenuButton?: boolean;
}

const MobileTopNav: React.FC<MobileTopNavProps> = ({
  basePath,
  title,
  dashboardPath,
  gradientClass = "from-primary to-secondary",
  showBackButton = true,
  showMenuButton = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useUserProfile();
  const [isNativeApp, setIsNativeApp] = useState(false);

  // Determine effective basePath and dashboardPath
  const effectiveBasePath = basePath || dashboardPath?.split('/').slice(0, -1).join('/') || "/user";
  const effectiveDashboardPath = dashboardPath || `${basePath}/dashboard`;

  // Get page title from current path
  const getPageTitle = () => {
    if (title) return title;

    const path = location.pathname.replace(effectiveBasePath, "").split("/")[1];
    if (!path) return "Dashboard";

    const titleMap: Record<string, string> = {
      dashboard: "Dashboard",
      cards: "Business Cards",
      network: "My Network",
      events: "Events",
      qr: "QR Codes",
      notifications: "Notifications",
      settings: "Settings",
      menu: "Menu",
      users: "Users",
      "qr-codes": "QR Codes",
      blog: "Blogs",
      faqs: "FAQs",
      content: "Contents",
      analytics: "Analytics",
      checkin: "Check-in Scanner",
      payments: "Payments",
    };

    return titleMap[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  const isDashboard = location.pathname === effectiveDashboardPath;
  const isMenuPage = location.pathname.replace(effectiveBasePath, "").split("/")[1] === "menu";
  // Native app: only Dashboard and Menu show the app logo/name in the header —
  // every other page shows just the page title, to save vertical space.
  const showBrand = !isNativeApp || isDashboard || isMenuPage;

  // Detect if running as native app
  useEffect(() => {
    setIsNativeApp(Capacitor.isNativePlatform());
  }, []);

  // Set status bar color to match nav gradient
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const configureStatusBar = async () => {
      try {
        // Use blue-600 color consistently
        const bgColor = "2563EB";

        console.log(`[StatusBar] Setting color to #${bgColor}`);

        // Ensure status bar doesn't overlay web view
        await StatusBar.setOverlaysWebView({ overlay: false });

        // Set background color
        await StatusBar.setBackgroundColor({ color: bgColor });

        // Set light text/icons for contrast
        await StatusBar.setStyle({ style: "LIGHT" });

        console.log(`[StatusBar] Configuration complete`);
      } catch (error) {
        console.error("[StatusBar] Error:", error);
      }
    };

    configureStatusBar();
  }, []);

  const initials = currentUser?.name
    ? currentUser.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header
      className="bg-blue-600 text-white shadow-md sticky top-0 z-40 m-0"
      style={{ paddingBottom: 0, margin: 0 }}
    >
      <div className="px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">

          {showBrand && (
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
              <img src={APP_LOGO} alt={BRAND_NAME} className="rounded-lg" />
            </div>
          )}

          <div className="flex flex-col min-w-0">
            {showBrand && (
              <span className="text-lg font-bold leading-tight truncate">{BRAND_NAME}</span>
            )}
            <span className={`text-sm leading-tight truncate ${showBrand ? "text-white/70" : "text-lg font-bold text-white"}`}>
              {getPageTitle()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {showMenuButton && !isNativeApp && (
            <button
              onClick={() => navigate(`${effectiveBasePath}/menu`)}
              className="text-white/90 hover:text-white p-2 flex-shrink-0"
              aria-label="Menu"
            >
              <Menu size={26} />
            </button>
          )}

          {showBackButton && isNativeApp && !isDashboard && (
            <button
              onClick={() => navigate(effectiveDashboardPath)}
              className="text-white/90 hover:text-white p-2 flex-shrink-0"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={26} />
            </button>
          )}

          <NotificationBell basePath={effectiveBasePath} bellClassName="relative p-2 rounded-full text-white hover:text-white/80 hover:bg-white/10 transition-colors focus:outline-none" />

          <button
            onClick={() => navigate(`${effectiveBasePath}/settings`)}
            className="flex items-center gap-2 text-white/90 hover:text-white p-2 rounded-full hover:bg-white/10"
            aria-label="User settings"
          >
            <div className="h-9 w-9 rounded-full overflow-hidden bg-white/30 flex items-center justify-center text-sm font-semibold border-2 border-white">
              {currentUser?.profile_image_url ? (
                <img src={currentUser.profile_image_url} alt={currentUser.name} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileTopNav;


import React, { ReactNode, useState, useEffect, useRef } from "react";
import { APP_LOGO } from "@/lib/logo";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home,
  Menu,
  Settings,
  Users,
  Edit,
  X,
  Calendar,
  DollarSign,
  BarChart3,
  LogOut,
  Video,
  MoreHorizontal,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { authService } from "@/services/authService";
import NotificationBell from "@/components/layout/NotificationBell";
import MobileTopNav from "@/components/layout/MobileTopNav";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useUserProfile } from "@/hooks/useUserProfile";
import { BRAND_NAME } from "@/lib/brand";

interface AdminLayoutProps {
  children: ReactNode;
}

const SIDEBAR_EXPANDED_WIDTH = "w-64";
const SIDEBAR_COLLAPSED_WIDTH = "w-16";

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const currentUser = useUserProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const { pullDistance, refreshing } = usePullToRefresh(mainRef);

  // Prevent body-level scrollbar while dashboard shell is mounted —
  // only the <main> region should scroll, otherwise tall pages (e.g. BlogEdit
  // with WysiwygEditor) show a double scrollbar.
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const initials = currentUser?.name
    ? currentUser.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".dropdown-trigger")) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen((prev) => !prev);
      setIsSidebarCollapsed(false);
    } else if (!isSidebarOpen) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/");
  };

  const isCollapsed = isSidebarCollapsed && !isMobile;
  const sidebarWidth = !isSidebarOpen
    ? "w-0 -ml-64"
    : isMobile
      ? "w-64"
      : isCollapsed
        ? SIDEBAR_COLLAPSED_WIDTH
        : SIDEBAR_EXPANDED_WIDTH;

  const adminNavLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: Home },
    { name: "Users", path: "/admin/users", icon: Users },
    { name: "Ring Devices", path: "/admin/ring-devices", icon: Video },
    { name: "Events", path: "/admin/events", icon: Calendar },
    { name: "Payments", path: "/admin/payments", icon: DollarSign },
    { name: "Contents", path: "/admin/content", icon: Edit },
    { name: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    { name: "Settings", path: "/admin/settings", icon: Settings },
  ];

  const mobileNavLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: Home },
    { name: "Users", path: "/admin/users", icon: Users },
    { name: "Events", path: "/admin/events", icon: Calendar },
    { name: "Menu", path: "/admin/menu", icon: MoreHorizontal },
  ];

  const isDashboardRoute = location.pathname === "/admin/dashboard";
  const isMenuRoute = location.pathname === "/admin/menu";
  const showHeader = !isMobile;

  return (
    <>
      {/* Mobile Top Navigation */}
      {isMobile && !isMenuRoute && (
        <MobileTopNav
          basePath="/admin"
          gradientClass="from-red-600 to-red-700"
        />
      )}

      <div className="flex h-screen bg-gray-50 w-full overflow-hidden">
        {/* Sidebar */}
        <aside
        className={`transition-all duration-300 ease-in-out h-screen fixed md:relative z-30 shadow-lg bg-gradient-to-b from-primary to-accent text-white ${sidebarWidth}`}
      >
        {isSidebarOpen && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`p-6 pr-2 flex items-center justify-between ${isCollapsed ? "px-2" : ""}`}>
              <NavLink to="/admin/dashboard" className="flex items-center group">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform duration-200">
                  <img src={APP_LOGO} alt="Eventry Logo" className="rounded-lg" />
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span className="text-xl font-bold">{BRAND_NAME}</span>
                    <span className="text-xs text-white/70">Admin Panel</span>
                  </div>
                )}
              </NavLink>
              {isMobile && (
                <button onClick={() => setIsSidebarOpen(false)} className="text-white hover:text-white/80 ml-2">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Navigation */}
            <nav className={`flex-1 flex flex-col min-h-0 mt-6 ${isCollapsed ? "px-1" : "px-3"}`}>
              <div className="flex-1 min-h-0 space-y-1 overflow-y-auto pr-1">
                {adminNavLinks.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      onClick={() => isMobile && setIsSidebarOpen(false)}
                      className={`flex items-center ${isCollapsed ? "justify-center" : ""} px-4 py-3 text-sm rounded-md transition-all ${
                        isActive
                          ? "bg-white/20 font-medium shadow-md"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <item.icon size={18} className="flex-shrink-0" />
                      {!isCollapsed && <span className="ml-3">{item.name}</span>}
                    </NavLink>
                  );
                })}
              </div>

              {/* Bottom logout */}
              <div className={`shrink-0 pt-4 mt-4 border-t border-white/20 mb-4 ${isCollapsed ? "flex justify-center" : "px-1"}`}>
                {isCollapsed ? (
                  <button className="text-white/80 hover:text-white p-2" onClick={handleLogout}>
                    <LogOut size={18} />
                  </button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full text-blue-300 hover:text-white border-white/30 hover:bg-white/20 hover:border-white/40 justify-start transition-all"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Top Navigation */}
        {showHeader && (
        <header className="bg-white shadow-sm z-10 border-b border-primary/10 flex-shrink-0">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleSidebar}
                className="text-gray-500 hover:text-primary transition-colors hidden md:inline-flex"
              >
                {isCollapsed ? <X size={20} /> : <Menu size={24} />}
              </button>
              <div className="flex items-center md:hidden">
                <div className="w-6 h-6 bg-gradient-to-r from-secondary to-primary rounded flex items-center justify-center mr-2">
                  <img src={APP_LOGO} alt="Eventry Logo" className="rounded-lg" />
                </div>
                <span className="text-lg font-bold text-gray-800">{BRAND_NAME}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell basePath="/admin" />
              <div className="relative dropdown-trigger">
                <button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <div className="h-7 w-7 rounded-full overflow-hidden bg-gradient-to-r from-primary to-accent text-white flex items-center justify-center flex-shrink-0 ring-2 ring-white">
                    {currentUser?.profile_image_url ? (
                      <img src={currentUser.profile_image_url} alt={currentUser.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold">{initials}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-800 max-w-[80px] truncate">
                    {currentUser?.name ? currentUser.name.split(" ")[0] : "Admin"}
                  </span>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <button
                      onClick={() => { setDropdownOpen(false); navigate("/admin/settings"); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); handleLogout(); }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        )}

        {/* Page Content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8 min-h-0 pb-20 md:pb-8">
          {(pullDistance > 0 || refreshing) && (
            <div className="flex items-center justify-center transition-all duration-150 pointer-events-none" style={{ height: refreshing ? 44 : pullDistance, overflow: "hidden" }}>
              <div className={`w-8 h-8 rounded-full border-2 border-primary border-t-transparent ${refreshing ? "animate-spin" : ""}`} style={{ transform: refreshing ? undefined : `rotate(${(pullDistance / 36) * 360}deg)` }} />
            </div>
          )}
          <div className="max-w-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <div className="flex justify-around py-2">
            {mobileNavLinks.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={`flex flex-col items-center px-2 py-2 text-xs transition-all ${
                    isActive ? "text-primary" : "text-gray-500 hover:text-primary"
                  }`}
                >
                  <item.icon size={20} className="mb-1" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
    </>
  );
};

export default AdminLayout;

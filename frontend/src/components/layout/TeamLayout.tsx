import React, { useState, useEffect, useRef } from "react";
import { APP_LOGO } from "@/lib/logo";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  QrCode,
  Calendar,
  Home,
  LogOut,
  Settings,
  Menu,
  Users,
  X,
  MoreHorizontal,
} from "lucide-react";
import { authService } from "@/services/authService";
import NotificationBell from "@/components/layout/NotificationBell";
import MobileTopNav from "@/components/layout/MobileTopNav";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useUserProfile } from "@/hooks/useUserProfile";
import { BRAND_NAME } from "@/lib/brand";

interface TeamLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_EXPANDED_WIDTH = "w-64";
const SIDEBAR_COLLAPSED_WIDTH = "w-16";

const TeamLayout: React.FC<TeamLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mainRef = useRef<HTMLElement>(null);
  const { pullDistance, refreshing } = usePullToRefresh(mainRef);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const currentUser = useUserProfile();

  const initials = currentUser?.name
    ? currentUser.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "TM";

  useEffect(() => {
    if (isMobile !== undefined) {
      setIsSidebarOpen(!isMobile);
      setIsSidebarCollapsed(false);
    }
  }, [isMobile]);

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

  const navigationItems = [
    { href: "/team/dashboard", label: "Dashboard", icon: Home },
    { href: "/team/events", label: "My Events", icon: Calendar },
    { href: "/team/checkin", label: "Check-in Scanner", icon: QrCode },
    { href: "/team/settings", label: "Settings", icon: Settings },
  ];

  const mobileNavLinks = [
    { href: "/team/dashboard", label: "Dashboard", icon: Home },
    { href: "/team/events", label: "Events", icon: Calendar },
    { href: "/team/checkin", label: "Check-in", icon: QrCode },
    { href: "/team/menu", label: "Menu", icon: MoreHorizontal },
  ];

  const isDashboardRoute = location.pathname === "/team/dashboard";
  const isMenuRoute = location.pathname === "/team/menu";
  const showHeader = !isMobile;

  const isCollapsed = isSidebarCollapsed && !isMobile;
  const sidebarWidth =
    !isSidebarOpen
      ? "w-0 -ml-64"
      : isMobile
        ? "w-64"
        : isCollapsed
          ? SIDEBAR_COLLAPSED_WIDTH
          : SIDEBAR_EXPANDED_WIDTH;


  return (
    <>
      {/* Mobile Top Navigation */}
      {isMobile && !isMenuRoute && (
        <MobileTopNav
          basePath="/team"
          gradientClass="from-blue-600 to-blue-700"
        />
      )}

      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <aside
        className={`transition-all duration-300 ease-in-out h-screen fixed md:relative z-30 shadow-lg bg-gradient-to-b from-primary to-secondary text-white ${sidebarWidth}`}
      >
        {isSidebarOpen && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`p-6 pr-2 flex items-center justify-between ${isCollapsed ? "px-2" : ""}`}>
              <Link to="/team/dashboard" className="flex items-center group">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                  <img
                    src={APP_LOGO}
                    alt="Eventry Logo"
                    className="rounded-lg"
                  />
                </div>
                {!isCollapsed && (
                  <div>
                    <div className="text-xl font-bold">{BRAND_NAME}</div>
                    <div className="text-xs text-white/70">Team Portal</div>
                  </div>
                )}
              </Link>

              {/* Mobile close button */}
              {isMobile && (
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-white hover:text-white/80 ml-2"
                >
                  <X size={20} />
                </button>
              )}
            </div>


            {/* Badge */}
            {/*{!isCollapsed && (
              <div className="px-6 mt-2">
                <Badge className="bg-white/20 text-white border-white/30">
                  <Users className="mr-1 h-3 w-3" />
                  Team Member
                </Badge>
              </div>
            )}*/}

            {/* Navigation */}
            <nav className={`flex-1 flex flex-col min-h-0 mt-6 ${isCollapsed ? "px-1" : "px-3"}`}>
              <div className="flex-1 min-h-0 space-y-1 overflow-y-auto pr-1">
                {navigationItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => isMobile && setIsSidebarOpen(false)}
                      className={`flex items-center ${isCollapsed ? "justify-center" : ""
                        } px-4 py-3 text-sm rounded-md transition-all ${isActive
                          ? "bg-white/20 font-medium shadow-md"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                        }`}
                    >
                      <item.icon size={18} />
                      {!isCollapsed && <span className="ml-3">{item.label}</span>}
                    </Link>

                  );
                })}
              </div>

              {/* Bottom Profile Section */}
              <div className="shrink-0 pt-4 mt-4 border-t border-white/20 px-4 mb-4">
                {!isCollapsed ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-blue-300 hover:text-white border-white/30 hover:bg-white/20"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <Button variant="ghost" size="icon" className="text-white/80" asChild>
                      <Link to="/team/settings"><Settings /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white/80" onClick={handleLogout}>
                      <LogOut />
                    </Button>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-white/20 text-white">CC</AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        {showHeader && (
        <header className="bg-white shadow-sm border-b border-primary/10 z-10">
          <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-3">
              <button onClick={toggleSidebar} className="text-gray-500 hover:text-primary hidden md:inline-flex">
                {isCollapsed ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="md:hidden flex items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-secondary to-primary rounded flex items-center justify-center mr-2">
                  <img
                    src={APP_LOGO}
                    alt="Eventry Logo"
                    className="rounded-lg"
                  />
                </div>
                <span className="text-lg font-bold text-gray-800">{BRAND_NAME}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell basePath="/team" />
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
                    {currentUser?.name ? currentUser.name.split(" ")[0] : "Team"}
                  </span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <button
                      onClick={() => { setDropdownOpen(false); navigate("/team/settings"); }}
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
        <main ref={mainRef} className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          {(pullDistance > 0 || refreshing) && (
            <div className="flex items-center justify-center transition-all duration-150 pointer-events-none" style={{ height: refreshing ? 44 : pullDistance, overflow: "hidden" }}>
              <div className={`w-8 h-8 rounded-full border-2 border-primary border-t-transparent ${refreshing ? "animate-spin" : ""}`} style={{ transform: refreshing ? undefined : `rotate(${(pullDistance / 36) * 360}deg)` }} />
            </div>
          )}
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <div className="flex justify-around py-2">
            {mobileNavLinks.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex flex-col items-center px-3 py-2 text-xs transition-all ${isActive ? "text-primary" : "text-gray-500 hover:text-primary"
                    }`}
                >
                  <item.icon size={20} className="mb-1" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
    </>
  );
};

export default TeamLayout;

import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, LucideIcon } from "lucide-react";
import { authService } from "@/services/authService";
import MobileTopNav from "./MobileTopNav";

export interface MobileMenuLink {
  name: string;
  path: string;
  icon: LucideIcon;
}

interface MobileMenuPageProps {
  title: string;
  links: MobileMenuLink[];
  dashboardPath: string;
  gradientClass?: string;
}

const MobileMenuPage: React.FC<MobileMenuPageProps> = ({
  title,
  links,
  dashboardPath,
  gradientClass = "from-primary to-secondary",
}) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    authService.logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <MobileTopNav
        title={title}
        dashboardPath={dashboardPath}
        gradientClass={gradientClass}
        showBackButton={true}
        showMenuButton={false}
      />

      <nav className="flex-1 p-4 space-y-2">
        {links.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-between bg-white rounded-lg shadow-sm border px-4 py-4 transition-all active:scale-[0.98] ${
                isActive
                  ? "border-primary/50 bg-primary/5"
                  : "border-gray-100 hover:border-primary/30"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-md bg-gradient-to-br from-primary/10 to-secondary/10 text-primary flex items-center justify-center">
                <item.icon size={20} />
              </span>
              <span className="text-sm font-medium text-gray-800">{item.name}</span>
            </span>
            <ChevronRight size={18} className="text-gray-400" />
          </NavLink>
        ))}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between bg-white rounded-lg shadow-sm border border-red-100 px-4 py-4 mt-4 active:scale-[0.98]"
        >
          <span className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
              <LogOut size={20} />
            </span>
            <span className="text-sm font-medium text-red-600">Logout</span>
          </span>
          <ChevronRight size={18} className="text-red-300" />
        </button>
      </nav>
    </div>
  );
};

export default MobileMenuPage;

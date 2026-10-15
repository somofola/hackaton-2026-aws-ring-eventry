// src/components/auth/PrivateRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/services/api";
import {
  getCurrentUser,
  isAuthenticatedSync,
} from "../../services/authService";
import type { User } from "../../services/authService";
import { Capacitor } from "@capacitor/core";

interface PrivateRouteProps {
  user_type: string;
}

const PrivateRoute = ({ user_type }: PrivateRouteProps) => {
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const validateToken = async () => {
      try {
        const { data } = await api.get("/auth/validate-token");
        if (cancelled) return;
        // Hydrate user from server response — authoritative source on web
        // since the HttpOnly cookie is not JS-readable.
        if (data?.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.name?.split(" ")[0] ?? "",
            last_name: data.user.name?.split(" ").slice(1).join(" ") ?? "",
            user_type: data.user.role || user_type,
            is_verified: !!data.user.email_verified_at,
            force_password_change: !!data.user.force_password_change,
            company: data.user.company ?? undefined,
          } as User);
        } else {
          const cached = await getCurrentUser(user_type);
          setUser(cached);
        }
        setIsTokenValid(true);
      } catch {
        if (cancelled) return;
        setIsTokenValid(false);
      }
    };

    validateToken();
    return () => { cancelled = true; };
  }, [location.pathname, user_type]);

  // First-paint gate — sync best-effort check before the network round-trip.
  if (isTokenValid === null) {
    const fastAuth = isAuthenticatedSync(user_type);
    if (!fastAuth) {
      return (
        <Navigate
          to={Capacitor.isNativePlatform() ? "/splash" : "/login"}
          replace
        />
      );
    }
    return null;
  }

  if (!isTokenValid || !user) {
    return (
      <Navigate
        to={Capacitor.isNativePlatform() ? "/splash" : "/login"}
        replace
      />
    );
  }

  if (user.user_type !== user_type) {
    const redirectPath =
      user.user_type === "admin"
        ? "/admin/dashboard"
        : user.user_type === "team"
        ? "/team/dashboard"
        : "/user/dashboard";

    return <Navigate to={redirectPath} replace />;
  }

  if (
    user_type === "user" &&
    user.force_password_change &&
    location.pathname !== "/user/change-password"
  ) {
    return <Navigate to="/user/change-password" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;

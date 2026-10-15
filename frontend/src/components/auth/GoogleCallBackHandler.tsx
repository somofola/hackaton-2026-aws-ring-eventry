// GoogleCallbackHandler.tsx
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { authService, saveAuthData } from "@/services/authService";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: "user" | "team" | "admin";
  is_verified: boolean;
  avatar?: string;
  phone?: string;
  bio?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
}

export interface LoginResponse {
  token: string;
  access: string;
  refresh: string;
  user: User;
  user_type: string;
}

const GoogleCallbackHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
   const processed = useRef(false); //to prevevt double load

  useEffect(() => {

    if (processed.current) return; // already handled
    processed.current = true;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      toast({
        title: "Login failed",
        description: "No code found in Google response",
        variant: "destructive",
      });
      navigate("/login", { replace: true });
      return;
    }

    const handleGoogleCallback = async () => {
      try {
        const data = await authService.googleCallback(code,state);

         // ✅ Prefer user_type, then role, fallback "user"
        const allowedUserTypes = ["user", "team", "admin"] as const;
        type AllowedUserType = typeof allowedUserTypes[number];
        const getUserType = (type: any): AllowedUserType => {
          return allowedUserTypes.includes(type) ? type : "user";
        };
        const userType = getUserType(data.user?.user_type || data.user_type);

        //console.log("Google callback data:", data);

        const authResponse: LoginResponse = {
          token: data.token,
          access: data.token,
          refresh: data.refresh || "unused-in-demo",
          user_type: data.user_type || "user",
          user: {
            id: data.user?.id || "",
            email: data.user?.email || "",
            first_name: data.user?.first_name || data.user?.email?.split("@")[0] || "",
            last_name: data.user?.last_name || "",
            user_type: userType,
            is_verified: data.user?.is_verified ?? true,
          },
        };

        if (data?.token) {
          await saveAuthData(authResponse);

          toast({
            title: "Login successful",
            description: `Welcome, ${authResponse.user.first_name}`,
            variant: "success",
          });

          navigate(`/${authResponse.user_type}/dashboard`, { replace: true });
        } else {
          throw new Error("Invalid response from backend");
        }
      } catch (err: any) {
        toast({
          title: "Login failed",
          description: err?.response?.data?.message || err.message,
          variant: "destructive",
        });
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    handleGoogleCallback();
    // 🚨 empty deps = only run once
  }, []); 

  if (loading) {
    return <p className="text-center mt-10">Processing Google login...</p>;
  }

  return null;
};

export default GoogleCallbackHandler;

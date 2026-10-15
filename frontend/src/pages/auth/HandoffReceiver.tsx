import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { saveAuthData } from "@/services/authService";
import api from "@/services/api";
import Preloader from "@/components/ui/preloader";

/**
 * Receives a one-time handoff token from the mobile app and exchanges it
 * for a full Sanctum session, then redirects the user to their destination.
 */
const HandoffReceiver = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const redirect = searchParams.get("redirect") || "/user/billing";

    if (!token) {
      setError("Missing session token.");
      return;
    }

    api
      .get(`/auth/handoff/${token}`)
      .then(({ data }) => {
        const userType = data.user_type || "user";

        saveAuthData({
          token: data.token,
          access: data.token,
          refresh: "nan",
          user_type: userType,
          user: {
            id: data.id,
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            user_type: userType,
            is_verified: data.is_verified ?? true,
          },
        });

        navigate(redirect, { replace: true });
      })
      .catch(() => {
        setError("Session link has expired or is invalid. Please log in.");
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <a href="/login" className="text-primary underline text-sm">
          Go to login
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Preloader size={80} logoSize={60} message="Signing you in..." />
    </div>
  );
};

export default HandoffReceiver;

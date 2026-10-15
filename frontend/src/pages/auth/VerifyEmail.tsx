import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import  api  from "@/services/api";
import { toast } from "@/components/ui/use-toast";
import { BRAND_NAME } from "@/lib/brand";
import { APP_LOGO } from "@/lib/logo";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"awaiting" | "verifying" | "error">("awaiting");
  const [message, setMessage] = useState("Please wait a moment.");

  useEffect(() => {
    const uid = searchParams.get("uid");
    const token = searchParams.get("token");

    if (uid && token) {
      setStatus("verifying");

      const verify = async () => {
        try {
          await api.post("/auth/verify-email", { uid, token });
          toast({
            title: "Verified Successfully",
            description: "Email verified successfully! Redirecting...",
            variant: "success",
          });
          const redirect = localStorage.getItem("eventry_post_verify_redirect");
          localStorage.removeItem("eventry_post_verify_redirect");
          navigate(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login");
        } catch (err) {
          // Wait 3 seconds before showing the error message
          setTimeout(() => {
            setStatus("error");
            setMessage("Verification failed or link expired. Please request a new verification email.");
            toast({
              title: "Verification Failed",
              description: "Verification failed or link expired.",
              variant: "destructive",
            });
          }, 3000);
        }
      };

      verify();
      return;
    }

    // Native app, no uid/token in URL yet: this is the post-signup "check your
    // inbox" screen. There's nothing to keep polling for, so auto-bounce to
    // login after 15s instead of leaving the user stranded on the screen.
    if (Capacitor.isNativePlatform()) {
      const timer = setTimeout(() => navigate("/splash"), 15000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, navigate]);

  const Layout = ({ title, message }: { title: string; message: string }) => (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center mb-5">
          <div className="flex items-center space-x-4 mb-1">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
              <img src={APP_LOGO} alt="Eventry Logo" className="rounded-lg" />
            </div>
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              {BRAND_NAME}
            </span>
          </div>
        </Link>

        <h2 className="text-center text-xl font-bold text-gray-900">{title}</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div
          className={`bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 ${
            status === "error" ? "border border-grey-400" : ""
          }`}
        >
          <p className={`text-sm ${status === "error" ? "text-red-600" : "text-gray-600"}`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );

  if (status === "verifying")
    return <Layout title="Verifying your email..." message={message} />;

  if (status === "error")
    return <Layout title="Verification Failed" message={message} />;

  return (
    <Layout
      title="Email Verification"
      message="A verification link has been sent to your email. Please check your inbox or spam folder and click the link to verify your account."
    />
  );
}

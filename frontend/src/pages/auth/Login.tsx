
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { authService } from "@/services/authService";
import { toast } from "@/components/ui/use-toast";
import SocialLoginButton from "@/components/auth/SocialLoginButton";
import { initPushNotifications } from "@/services/pushService";
import { BRAND_NAME } from "@/lib/brand";
import { APP_LOGO } from "@/lib/logo";

const handleSocialLogin = async (provider: "google" | "microsoft" | "linkedin" | "apple") => {
  try {
    let response;

    switch (provider) {
      case "google":
        response = await authService.googleLogin();
        break;
      case "microsoft":
        response = await authService.microsoftLogin();
        break;
      case "linkedin":
        response = await authService.linkedinLogin();
        break;
      case "apple":
        response = await authService.appleLogin();
        break;
    }

    const data = await response;
    window.location.href = data.url;
  } catch (err) {
    toast({
      title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} login failed`,
      description: "Please try again later",
      variant: "destructive",
    });
    console.error(`${provider} redirect failed`, err);
  }
};


const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Apple's callback is a top-level redirect (not an XHR like the other SSO
  // providers), so errors come back as a query param instead of a JSON body.
  useEffect(() => {
    const ssoError = searchParams.get("sso_error");
    if (ssoError) {
      toast({ title: "Sign-in failed", description: ssoError, variant: "destructive" });
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  //Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      const response = await authService.emailLogin(formData.email, formData.password);

      if (response?.user) {
        initPushNotifications().catch(() => {});
        const redirect = searchParams.get("redirect");
        const eventMatch = redirect?.match(/^\/events\/(.+)$/);
        if (eventMatch && response.user.user_type === "user") {
          navigate(`/user/events/${eventMatch[1]}`);
        } else {
          navigate(`/${response.user.user_type}/dashboard`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center mb-5">
          <div className="flex items-center space-x-4 mb-1">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
              <img
                src={APP_LOGO}
                alt="Eventry Logo"
                className="rounded-lg"
              />
            </div>
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              {BRAND_NAME}
            </span>
          </div>
        </Link>
        <h2 className="text-center text-xl font-bold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-primary hover:text-primary/80"
          >
            Create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <div className="text-sm">
                  <Link
                    to="/password-reset"
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>
              <div className="mt-1">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <SocialLoginButton provider="google" onClick={() => handleSocialLogin("google")} />
              <SocialLoginButton provider="microsoft" onClick={() => handleSocialLogin("microsoft")} />
              <SocialLoginButton provider="linkedin" onClick={() => handleSocialLogin("linkedin")} />
              <SocialLoginButton provider="apple" onClick={() => handleSocialLogin("apple")} />
            </div>
          </div>
        </div>

        {/* Notification */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800">Notifications</h3>
          <div className="mt-2 text-xs text-yellow-700">
            <p className="mb-1">No new notification</p>
            <p className="mt-1 text-xs text-yellow-800">(None)</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;

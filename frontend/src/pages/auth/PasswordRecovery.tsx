import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import { APP_LOGO } from "@/lib/logo";

const PasswordRecovery = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validLink, setValidLink] = useState<boolean | null>(null);

  // Validate that token + email are present in the URL
  useEffect(() => {
    setValidLink(!!(token && email));
  }, [token, email]);

  const passwordsMatch = password === confirmation;
  const strongEnough = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch || !strongEnough) return;

    setIsLoading(true);
    const ok = await authService.resetPassword(email, token, password, confirmation);
    setIsLoading(false);

    if (ok) {
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  // Invalid / missing link
  if (validLink === false) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow sm:rounded-xl text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">Invalid reset link</h2>
            <p className="text-sm text-gray-500">
              This password reset link is invalid or has expired.
              Please request a new one.
            </p>
            <Link to="/password-reset">
              <Button className="w-full">Request new link</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
              <img src={APP_LOGO} alt="Eventry" className="rounded-lg" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              {BRAND_NAME}
            </span>
          </div>
        </Link>
        <h2 className="text-center text-2xl font-bold text-gray-900">Set a new password</h2>
        <p className="text-center text-sm text-gray-500 mt-2">
          Resetting password for <strong>{email}</strong>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow sm:rounded-xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* New password */}
            <div>
              <Label htmlFor="password">New password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={password && !strongEnough ? "border-red-400" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && !strongEnough && (
                <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters.</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <Label htmlFor="confirmation">Confirm new password</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmation"
                  type={showConfirmation ? "text" : "password"}
                  required
                  placeholder="Repeat your new password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className={confirmation && !passwordsMatch ? "border-red-400" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmation((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmation && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !strongEnough || !passwordsMatch}
            >
              {isLoading ? "Changing password..." : "Change Password"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Remembered your password?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordRecovery;

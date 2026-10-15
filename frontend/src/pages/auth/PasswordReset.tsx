import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";
import { CheckCircle } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import { APP_LOGO } from "@/lib/logo";

const PasswordReset = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const ok = await authService.forgotPassword(email);
    if (ok) setSent(true);
    setIsLoading(false);
  };

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
        <h2 className="text-center text-2xl font-bold text-gray-900">Forgot your password?</h2>
        <p className="text-center text-sm text-gray-500 mt-2">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow sm:rounded-xl">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900">Check your inbox</h3>
              <p className="text-sm text-gray-500">
                If <strong>{email}</strong> is associated with an account, you'll receive a
                password reset link shortly. The link expires in 60 minutes.
              </p>
              <p className="text-sm text-gray-400">Didn't get it? Check your spam folder.</p>
              <Button variant="outline" className="w-full mt-2" onClick={() => setSent(false)}>
                Try a different email
              </Button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            Remember your password?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;

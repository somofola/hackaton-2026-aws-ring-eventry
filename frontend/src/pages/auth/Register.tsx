import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import TermsContent from "@/components/TermsContent";
import PrivacyContent from "@/components/PrivacyContent";
import SocialLoginButton from "@/components/auth/SocialLoginButton";
import { authService } from "@/services/authService";
import { toast } from "@/components/ui/use-toast";
import { BRAND_NAME } from "@/lib/brand";
import { APP_LOGO } from "@/lib/logo";

const handleSocialRegister = async (provider: "google" | "microsoft" | "linkedin" | "apple") => {
  try {
    let response;

    switch (provider) {
      case "google":
        response = await authService.googleRegister();
        break;
      case "microsoft":
        response = await authService.microsoftRegister();
        break;
      case "linkedin":
        response = await authService.linkedinRegister();
        break;
      case "apple":
        response = await authService.appleRegister();
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

const Register = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    user_type: "user",
    password: "",
    confirmPassword: "",
  });

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openModal = (type: "terms" | "policy") => {
    if (type === "terms") setShowTermsModal(true);
    else setShowPolicyModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Terms Required",
        description:
          "Please agree to the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.emailRegister(formData.name, formData.email, formData.password, formData.user_type); // Handles auth + redirects
      /* 
        toast({
          title: "Login successful",
          description: `Welcome, ${response.user.first_name}`,
          variant: "success",
        });

        // ✅ Redirect based on user_type
        navigate(`/${response.user.user_type}/dashboard`);
      } */
      /*  if (response?.user) {
         toast({
           title: "Awaiting Email Verification",
           description: `${response.message}`,
           variant: "success",
         }); // "Please check your email..."
         navigate('/verify-email');
       } else {
         toast({
           title: "Registration failed",
           description: "An error occurred during registration. Please try again.",
           variant: "destructive",
         });
       } */
      if (!response) return;

      toast({
        title: response.label === "success" ? "Awaiting Email Verification" : "Registration Failed",
        description: response.message,
        variant: response.label === "success" ? "success" : "destructive",
      });

      if (response.label === "success") {
        setTimeout(() => {
          navigate("/verify-email", { replace: true });
        }, 50);
      }
    } catch (err) {
      toast({
        title: "Registration failed",
        description: "An error occurred during registration. Please try again.",
        variant: "destructive",
      });
      //console.error("Registration error:", err);
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
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:text-primary/80"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@example.com"
              />
            </div>

            <div>
              <Label htmlFor="userType">I am a</Label>
              <select
                id="userType"
                name="user_type"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formData.user_type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, user_type: e.target.value }))
                }
              >
                <option value="user">User</option>
                <option value="team">Team member</option>
              </select>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                name="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
              />
              <div className="text-sm text-gray-600">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => openModal("terms")}
                  className="text-primary hover:underline"
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => openModal("policy")}
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </button>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !agreedToTerms}
              >
                {isLoading ? "Creating account..." : "Create account"}
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
              <SocialLoginButton provider="google" onClick={() => handleSocialRegister("google")} />
              <SocialLoginButton provider="microsoft" onClick={() => handleSocialRegister("microsoft")} />
              <SocialLoginButton provider="linkedin" onClick={() => handleSocialRegister("linkedin")} />
              <SocialLoginButton provider="apple" onClick={() => handleSocialRegister("apple")} />
            </div>
          </div>
        </div>
      </div>

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white max-w-2xl w-full rounded-lg shadow-lg overflow-auto max-h-[90vh]">
            <div className="sticky top-0 z-10 bg-white flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Terms of Service</h2>
              <button
                onClick={() => setShowTermsModal(false)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>
            <div className="p-4 text-sm prose max-w-none">
              <TermsContent />
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white max-w-2xl w-full rounded-lg shadow-lg overflow-auto max-h-[90vh]">
            <div className="sticky top-0 z-10 bg-white flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Privacy Policy</h2>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>
            <div className="p-4 text-sm prose max-w-none">
              <PrivacyContent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;

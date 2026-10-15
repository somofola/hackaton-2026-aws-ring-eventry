import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { BRAND_NAME } from "@/lib/brand";
import { APP_LOGO } from "@/lib/logo";
import { authService, consumeJustLoggedOut } from "@/services/authService";
import { v4 as uuidv4 } from "uuid";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { LogIn, UserPlus, Mail, Lock, KeyRound, User as UserIcon, ArrowLeft, Sparkles, ShieldCheck, Fingerprint } from "lucide-react";
import NativePermissionsModal, { NATIVE_PERMISSIONS_KEY } from "@/components/NativePermissionsModal";
import splashPreloadBg from "@/assets/splash-preload.jpg";
import splashLoadedBg from "@/assets/splash-loaded.jpg";

const Splash = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const [appUuid, setAppUuid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [mode, setMode] = useState<"choose" | "login" | "register">("choose");

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    user_type: "user",
    pin: "",
  });

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    pin: "",
  });

  const [loginPin, setLoginPin] = useState("");

  const [showPermissions, setShowPermissions] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const afterLogin = (userType: string) => {
    const dest = `/${userType}/dashboard`;
    if (!localStorage.getItem(NATIVE_PERMISSIONS_KEY)) {
      setPendingRoute(dest);
      setShowPermissions(true);
    } else {
      navigate(dest);
    }
  };

  useEffect(() => {
    // Check secure storage for existing UUID
    const checkUuid = async () => {
      try {
        const { value } = await SecureStoragePlugin.get({ key: "app_uuid" });
        if (value) setAppUuid(value);
      } catch {
        setAppUuid(null);
      }
    };
    checkUuid();

    // Skip preload animation when arriving from logout
    if (consumeJustLoggedOut()) {
      setProgress(100);
      setLoading(false);
      return;
    }

    // Pick random duration between 1s and 5s
    const duration = Math.floor(Math.random() * 4 + 1) * 1000; // ms - 1 to 4 seconds
    const step = 100 / (duration / 60); // how much progress increases each tick

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setLoading(false);
          return 100;
        }
        return prev + step;
      });
    }, 60);

    return () => clearInterval(timer);
  }, []);

  const handleRegisterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setRegisterData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAppRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    let appUuidValue = "";
    try {
      const appUuidResult = await SecureStoragePlugin.get({ key: "app_uuid" });
      appUuidValue = appUuidResult?.value || "";
    } catch {
      appUuidValue = uuidv4();
      await SecureStoragePlugin.set({ key: "app_uuid", value: appUuidValue });
    }

    if (registerData.pin.length < 6 || !/^\d+$/.test(registerData.pin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be at least 6 digits and numbers only.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.appRegister(
        registerData.name,
        registerData.email,
        registerData.password,
        registerData.user_type || "user",
        appUuidValue,
        registerData.pin
      );

      /* if (response?.user) {
        //navigate(`/${response.user.user_type}/dashboard`); --verify email first
        toast({
          title: "Awaiting Email Verification",
          description: `${response.message}`,
          variant: "success",
        }); // "Please check your email..."
        navigate('/verify-email');
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

    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginData.pin.length < 6 || !/^\d+$/.test(loginData.pin)) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a valid 6-digit pin.",
        variant: "destructive",
      });
      return;
    }

    const appUuidValue = uuidv4();
    await SecureStoragePlugin.set({ key: "app_uuid", value: appUuidValue });

    setIsLoading(true);
    try {
      const response = await authService.appEmailLogin(
        loginData.email,
        loginData.password,
        loginData.pin,
        appUuidValue
      );

      if (response?.user) {
        setAppUuid(appUuidValue);
        afterLogin(response.user.user_type);
      }
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginPin.length < 6 || !/^\d+$/.test(loginPin)) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a valid 6-digit pin.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { value: savedAppId } = await SecureStoragePlugin.get({
        key: "app_uuid",
      });

      if (!savedAppId) {
        toast({
          title: "Login failed",
          description: "No app ID found. Please register first.",
          variant: "destructive",
        });
        return;
      }

      const response = await authService.appPinLogin(savedAppId, loginPin);

      if (response?.user) {
        toast({
          title: "Login successful",
          description: `Welcome, ${response.user.first_name}`,
          variant: "success",
        });
        afterLogin(response.user.user_type);
      }
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetApp = async () => {
    await SecureStoragePlugin.remove({ key: "app_uuid" });
    setAppUuid(null);
    setLoginPin("");
    setMode("choose");
    toast({ title: "App reset", description: "Registration cleared." });
  };

  const backgroundImage = loading ? splashPreloadBg : splashLoadedBg;

  const headingText = !appUuid
    ? mode === "register"
      ? "Create your account"
      : mode === "login"
        ? "Welcome back"
        : "Hello there"
    : "Enter your PIN";

  const subheadingText = !appUuid
    ? mode === "register"
      ? "Join Eventry in seconds"
      : mode === "login"
        ? "Sign in to continue"
        : "Sign in or create an account to get started"
    : "Use your 6-digit PIN to unlock";

  return (
    <div className="min-h-[100dvh] relative flex flex-col overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 bg-cover bg-center scale-110"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/90 via-blue-900/85 to-slate-950/95 z-0" />
      <div className="absolute inset-0 z-0 [background:radial-gradient(120%_60%_at_50%_0%,rgba(99,102,241,0.45),transparent_60%),radial-gradient(80%_50%_at_50%_100%,rgba(14,165,233,0.35),transparent_60%)]" />

      {loading ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/50 to-accent/50 blur-2xl animate-pulse" />
            <div className="absolute inset-0 rounded-3xl ring-1 ring-white/30 bg-white/95 shadow-2xl flex items-center justify-center">
              <div className="w-[78%] h-[78%] bg-gradient-to-br from-primary to-accent rounded-2xl overflow-hidden">
                <img src={APP_LOGO} alt="Eventry Logo" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-tight drop-shadow-2xl text-center">
            {BRAND_NAME}
          </h1>
          <p className="mt-3 text-blue-100/80 text-base flex items-center justify-center gap-2 text-center">
            <Sparkles className="w-4 h-4" />
            Getting things ready
          </p>
          <div className="w-56 mt-10 space-y-2 mx-auto">
            <Progress value={progress} className="w-full h-1.5 bg-white/15" />
            <p className="text-blue-100/60 text-[10px] tracking-[0.2em] uppercase text-center">{Math.min(100, Math.round(progress))}%</p>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col pt-[env(safe-area-inset-top)]">
          {/* Hero */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-4 text-center">
            <div className="relative mb-5">
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/40 to-accent/40 blur-2xl" />
              <div className="relative w-20 h-20 rounded-3xl bg-white/95 ring-1 ring-white/30 shadow-2xl flex items-center justify-center">
                <div className="w-[78%] h-[78%] rounded-2xl bg-gradient-to-br from-primary to-accent overflow-hidden">
                  <img src={APP_LOGO} alt="Eventry Logo" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
              {BRAND_NAME}
            </h1>
            <p className="mt-2 text-blue-100/80 text-sm max-w-xs">
              {!appUuid && mode === "choose"
                ? "Your digital business card & event companion"
                : subheadingText}
            </p>
          </div>

          {/* Bottom sheet */}
          <div className="bg-white rounded-t-[2rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.5)] px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-8 duration-500">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />

            {!appUuid && mode !== "choose" && (
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setMode("choose")}
                  className="inline-flex items-center gap-1 text-sm text-gray-500 active:text-gray-900 -ml-1 px-1 py-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {mode === "login" ? "Sign in" : "Register"}
                </span>
                <span className="w-10" />
              </div>
            )}

            {(appUuid || mode === "choose") && (
              <h2 className="text-center text-lg font-bold text-gray-900 mb-1">{headingText}</h2>
            )}
            {(appUuid || mode === "choose") && (
              <p className="text-center text-sm text-gray-500 mb-5">{subheadingText}</p>
            )}

            {!appUuid ? (
              <>
                {mode === "choose" && (
                  <div className="space-y-3">
                    <Button
                      onClick={() => setMode("register")}
                      className="w-full h-14 bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2 rounded-2xl text-base"
                    >
                      <UserPlus className="w-5 h-5" />
                      Get Started
                    </Button>
                    <Button
                      onClick={() => setMode("login")}
                      variant="outline"
                      className="w-full h-14 border-2 border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold flex items-center justify-center gap-2 rounded-2xl text-base"
                    >
                      <LogIn className="w-5 h-5" />
                      I already have an account
                    </Button>
                    <div className="flex items-center justify-center gap-1.5 pt-3 text-xs text-gray-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      End-to-end secure · PIN protected
                    </div>
                  </div>
                )}

                {mode === "login" && (
                  <form className="space-y-4" onSubmit={handleEmailPasswordLogin}>
                    <div className="space-y-1.5">
                      <Label htmlFor="loginEmail" className="text-xs font-medium text-gray-700">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input id="loginEmail" name="email" type="email" required value={loginData.email} onChange={handleLoginChange} className="pl-10 h-12 rounded-xl" placeholder="you@example.com" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="loginPassword" className="text-xs font-medium text-gray-700">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input id="loginPassword" name="password" type="password" required value={loginData.password} onChange={handleLoginChange} className="pl-10 h-12 rounded-xl" placeholder="••••••••" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="loginPin" className="text-xs font-medium text-gray-700">Create a PIN</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input id="loginPin" name="pin" type="password" inputMode="numeric" minLength={6} maxLength={6} required value={loginData.pin} onChange={handleLoginChange} className="pl-10 h-12 rounded-xl tracking-widest" placeholder="6-digit PIN" />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-[3.25rem] bg-gradient-to-r from-blue-600 to-indigo-600 active:scale-[0.98] transition-transform rounded-2xl font-semibold shadow-lg text-base" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                )}

                {mode === "register" && (
                  <form className="space-y-3.5" onSubmit={handleAppRegister}>
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium text-gray-700">Name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input id="name" name="name" type="text" required value={registerData.name} onChange={handleRegisterChange} className="pl-10 h-12 rounded-xl" placeholder="Jane Doe" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-medium text-gray-700">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input id="email" name="email" type="email" required value={registerData.email} onChange={handleRegisterChange} className="pl-10 h-12 rounded-xl" placeholder="you@example.com" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="userType" className="text-xs font-medium text-gray-700">I am a</Label>
                      <select id="userType" name="user_type" className="w-full h-12 px-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none text-sm" value={registerData.user_type} onChange={handleRegisterChange}>
                        <option value="user">User</option>
                        <option value="team">Team member</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-xs font-medium text-gray-700">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input id="password" name="password" type="password" required value={registerData.password} onChange={handleRegisterChange} className="pl-10 h-12 rounded-xl" placeholder="••••••••" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pin" className="text-xs font-medium text-gray-700">PIN (min 6 digits)</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input id="pin" name="pin" type="password" inputMode="numeric" minLength={6} maxLength={6} required value={registerData.pin} onChange={handleRegisterChange} className="pl-10 h-12 rounded-xl tracking-widest" placeholder="••••••" />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-[3.25rem] bg-gradient-to-r from-emerald-500 to-teal-600 active:scale-[0.98] transition-transform rounded-2xl font-semibold shadow-lg text-base" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <form className="space-y-6" onSubmit={handleAppLogin}>
                <div className="flex items-center justify-center -mt-2 mb-1">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Fingerprint className="w-7 h-7 text-primary" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-center gap-2">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <Input
                        key={idx}
                        id={`pin-${idx}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        aria-label={`PIN digit ${idx + 1}`}
                        className="text-center text-2xl font-bold h-14 w-12 rounded-2xl border-gray-200 bg-gray-50 shadow-sm focus:ring-2 focus:ring-primary/40 focus:border-primary focus:bg-white"
                        value={loginPin[idx] || ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          let newPin = loginPin;

                          if (value) {
                            newPin =
                              loginPin.substring(0, idx) +
                              value +
                              loginPin.substring(idx + 1);

                            setLoginPin(newPin);

                            const next = document.getElementById(`pin-${idx + 1}`) as HTMLInputElement;
                            if (next) next.focus();
                          } else {
                            newPin =
                              loginPin.substring(0, idx) +
                              " " +
                              loginPin.substring(idx + 1);

                            setLoginPin(newPin.trim());
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !loginPin[idx]) {
                            const prev = document.getElementById(`pin-${idx - 1}`) as HTMLInputElement;
                            if (prev) prev.focus();
                            const newPin =
                              loginPin.substring(0, idx - 1) +
                              loginPin.substring(idx);
                            setLoginPin(newPin);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full h-[3.25rem] bg-gradient-to-r from-blue-600 to-indigo-600 active:scale-[0.98] transition-transform rounded-2xl font-semibold shadow-lg text-base" disabled={isLoading}>
                  {isLoading ? "Unlocking..." : "Unlock"}
                </Button>
                <button
                  type="button"
                  onClick={resetApp}
                  className="w-full text-sm font-medium text-gray-500 active:text-red-600 transition-colors py-2"
                >
                  Forgot PIN? Reset app
                </button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <p className="text-[11px] text-gray-400 tracking-wide">
                Digital Business Cards · Event Management
              </p>
            </div>
          </div>
        </div>
      )}

      {showPermissions && pendingRoute && (
        <NativePermissionsModal
          onComplete={() => {
            setShowPermissions(false);
            navigate(pendingRoute);
          }}
        />
      )}
    </div>
  );
};

export default Splash;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert } from "lucide-react";
import api from "@/services/api";
import { getCurrentUserSync as getCurrentUser } from "@/services/authService";

const ForceChangePassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await api.post("/user/force-change-password", {
        password,
        password_confirmation: confirm,
      });

      // Clear the flag in localStorage
      const user = getCurrentUser("user");
      if (user) {
        user.force_password_change = false;
        localStorage.setItem("auth_user_user", JSON.stringify(user));
      }

      toast({ title: "Password updated", description: "Your password has been set. Welcome!" });
      navigate("/user/dashboard", { replace: true });
    } catch (err: any) {
      toast({
        title: "Failed to update password",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-amber-100 rounded-full p-3">
              <ShieldAlert className="h-7 w-7 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-xl">Set Your Password</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Your account was created with a temporary password. Please set a new password to continue.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</> : "Set Password & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForceChangePassword;

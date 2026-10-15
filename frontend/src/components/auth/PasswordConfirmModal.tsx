// src/components/auth/PasswordConfirmModal.tsx
//
// SECURITY: Sensitive-op re-auth prompt. Listens for
// `eventry:password-confirm-required` (dispatched by api.ts on HTTP 423),
// prompts user for their current password, POSTs /auth/confirm-password,
// then retries the original request and resolves/rejects the original
// caller's promise via the saved deferred attached to the event detail.
//
// Frontend contract (callers): if a 423 is observed, callers should await
// a global retry resolution by simply re-issuing the request after the
// `eventry:password-confirmed` event fires. For ergonomic callers we also
// retry the original axios config directly and dispatch the success event.

import { useEffect, useRef, useState } from "react";
import api from "@/services/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

type PendingConfig = any; // AxiosRequestConfig â€” typed loosely to avoid axios re-import here.

export default function PasswordConfirmModal() {
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const pendingRef = useRef<PendingConfig | null>(null);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ config: PendingConfig }>;
            pendingRef.current = ce.detail?.config ?? null;
            setPassword("");
            setOpen(true);
        };
        window.addEventListener("eventry:password-confirm-required", handler);
        return () => window.removeEventListener("eventry:password-confirm-required", handler);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;
        setSubmitting(true);
        try {
            await api.post("/auth/confirm-password", { password });

            // Retry original request if we captured one.
            const cfg = pendingRef.current;
            pendingRef.current = null;

            setOpen(false);
            setPassword("");
            setSubmitting(false);

            toast({
                title: "Confirmed",
                description: "You can continue.",
                variant: "success",
            });

            window.dispatchEvent(new CustomEvent("eventry:password-confirmed"));

            if (cfg) {
                try {
                    await api(cfg);
                } catch {
                    // Original request still failed â€” caller handles its own error toast.
                }
            }
        } catch (err: any) {
            setSubmitting(false);
            toast({
                title: "Confirmation failed",
                description: err?.response?.data?.message || "Invalid password.",
                variant: "destructive",
            });
        }
    };

    const handleCancel = () => {
        pendingRef.current = null;
        setOpen(false);
        setPassword("");
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Confirm your password
                    </DialogTitle>
                    <DialogDescription>
                        This action is sensitive. Re-enter your password to continue.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            autoComplete="current-password"
                            disabled={submitting}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting || !password}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}


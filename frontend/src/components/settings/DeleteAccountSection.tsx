// src/components/settings/DeleteAccountSection.tsx
//
// Self-service in-app account deletion (App Store §5.1.1(v) / Play account-
// deletion policy). Shared across user/team/admin Settings pages.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";

interface DeleteAccountSectionProps {
    userType: "user" | "team" | "admin";
    loginPath?: string;
}

export default function DeleteAccountSection({ userType, loginPath = "/login" }: DeleteAccountSectionProps) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const canConfirm = confirmText.trim().toUpperCase() === "DELETE";

    const handleClose = () => {
        if (submitting) return;
        setOpen(false);
        setConfirmText("");
    };

    const handleDelete = async () => {
        if (!canConfirm) return;
        setSubmitting(true);
        const result = await authService.deleteAccount(userType);
        setSubmitting(false);
        if (result.success) {
            setOpen(false);
            navigate(loginPath, { replace: true });
        }
    };

    return (
        <>
            <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Delete Account</h3>
                <p className="text-sm text-gray-500 mb-3">
                    Deactivates your account immediately and permanently deletes it and all associated data
                    after a 60-day grace period. Log back in during that window to cancel.
                </p>
                <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setOpen(true)}
                >
                    Delete Account
                </Button>
            </div>

            <AlertDialog open={open} onOpenChange={(o) => !o && handleClose()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your account will be deactivated immediately and permanently deleted — cards, QR
                            codes, event enrollments, billing history included — in 60 days. Logging back in
                            before then cancels the deletion. Type <strong>DELETE</strong> to confirm.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2 py-2">
                        <Label htmlFor="delete-confirm">Confirmation</Label>
                        <Input
                            id="delete-confirm"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            autoComplete="off"
                            disabled={submitting}
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleClose} disabled={submitting}>
                            Cancel
                        </AlertDialogCancel>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={!canConfirm || submitting}
                            onClick={handleDelete}
                        >
                            {submitting ? "Deleting..." : "Delete Account"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

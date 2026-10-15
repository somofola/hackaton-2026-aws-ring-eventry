import React, { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { ExternalRegistration } from "@/types";
import { BRAND_NAME } from "@/lib/brand";

interface Props {
  open: boolean;
  registration: ExternalRegistration | null;
  onClose: () => void;
}

/**
 * Shown after a successful Eventry enrollment in an event sourced from a
 * 3rd-party platform. Hands the user off to the origin so they can complete
 * registration there with their Eventry details pre-filled via query string.
 */
const ExternalRegistrationModal: React.FC<Props> = ({ open, registration, onClose }) => {
  const opened = useRef(false);

  useEffect(() => {
    if (!open || !registration) {
      opened.current = false;
      return;
    }
    if (registration.embed_mode === "new_tab" && !opened.current) {
      window.open(registration.url, "_blank", "noopener,noreferrer");
      opened.current = true;
    }
  }, [open, registration]);

  if (!registration) return null;

  const originLabel = registration.origin === "generic" ? "the event organiser" : registration.origin;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Complete registration on {originLabel}</DialogTitle>
          <DialogDescription>
            You're enrolled on {BRAND_NAME}. Finalise your 3rd-party ticket below — your details are pre-filled.
          </DialogDescription>
        </DialogHeader>

        {registration.embed_mode === "iframe" ? (
          <div className="flex-1 min-h-[480px] bg-gray-50 rounded-md overflow-hidden border">
            <iframe
              src={registration.url}
              title="3rd-party registration"
              className="w-full h-[60vh]"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 gap-3">
            <ExternalLink className="h-10 w-10 text-primary" />
            <p className="text-gray-700 max-w-md">
              {originLabel} doesn't allow embedding. We opened the registration page in a new tab. If it didn't open,
              tap the button below.
            </p>
          </div>
        )}

        <DialogFooter className="flex-row justify-between items-center gap-2 mt-4">
          <a href={registration.url} target="_blank" rel="noreferrer">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Open in new tab
            </Button>
          </a>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalRegistrationModal;

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventUuid: string;
  eventTitle: string;
  /** Where to navigate after clone. Defaults to /admin/events */
  onSuccess?: (newUuid: string) => void;
}

type Stage = "confirm" | "cloning";

export default function CloneEventDialog({
  open, onOpenChange, eventUuid, eventTitle, onSuccess,
}: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("confirm");
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStage("confirm");
      setProgress(0);
    }
  }, [open]);

  // Cleanup interval on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startClone = async () => {
    setStage("cloning");
    setProgress(0);

    // Animate progress to 80% while request is in-flight
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 80) { clearInterval(timerRef.current!); return 80; }
        return p + 4;
      });
    }, 80);

    try {
      const { data } = await api.post(`/events/${eventUuid}/clone`);
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      // Brief pause at 100% so the user sees completion, then navigate to edit
      setTimeout(() => {
        onOpenChange(false);
        toast({ title: "Event cloned successfully." });
        if (onSuccess) {
          onSuccess(data.uuid);
        } else {
          navigate(`/admin/events/${data.uuid}/edit`);
        }
      }, 400);
    } catch {
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(0);
      setStage("confirm");
      toast({ title: "Failed to clone event.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (stage !== "cloning") onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Clone Event
          </DialogTitle>
          {stage === "confirm" && (
            <DialogDescription>
              This will create a draft copy of{" "}
              <span className="font-semibold text-gray-800">"{eventTitle}"</span> with
              sessions (including speaker assignments), ticket categories, exhibitors, sponsors, and floor plans.
              Enrolled users and payments will not be copied.
            </DialogDescription>
          )}
        </DialogHeader>

        {stage === "confirm" && (
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={startClone}>
              <Copy className="mr-2 h-4 w-4" /> Clone Event
            </Button>
          </DialogFooter>
        )}

        {stage === "cloning" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Cloning event…
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-right text-xs text-gray-400">{progress}%</p>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}

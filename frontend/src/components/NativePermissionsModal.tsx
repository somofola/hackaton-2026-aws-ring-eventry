import React, { useState } from "react";
import { Camera } from "@capacitor/camera";
import { Filesystem } from "@capacitor/filesystem";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { Bell, Camera as CameraIcon, FolderOpen, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const NATIVE_PERMISSIONS_KEY = "native_permissions_done";

interface PermissionStep {
  id: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
  request: () => Promise<void>;
}

interface Props {
  onComplete: () => void;
}

const NativePermissionsModal: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [requesting, setRequesting] = useState(false);

  const permissions: PermissionStep[] = [
    {
      id: "notifications",
      icon: <Bell className="h-9 w-9 text-blue-500" />,
      color: "bg-blue-50 border-blue-100",
      title: "Push Notifications",
      description:
        "Receive event reminders, check-in alerts, and important updates so you never miss anything.",
      request: async () => {
        const result = await PushNotifications.requestPermissions();
        if (result.receive === "granted") {
          await PushNotifications.register();
        }
      },
    },
    {
      id: "camera",
      icon: <CameraIcon className="h-9 w-9 text-green-500" />,
      color: "bg-green-50 border-green-100",
      title: "Camera Access",
      description:
        "Scan QR codes for event check-ins and take photos for your digital business card profile.",
      request: async () => {
        await Camera.requestPermissions({ permissions: ["camera"] });
      },
    },
    {
      id: "media",
      icon: <FolderOpen className="h-9 w-9 text-amber-500" />,
      color: "bg-amber-50 border-amber-100",
      title: "Photos & Files",
      description:
        "Save and share your digital business card, event badges, and certificates to your device.",
      request: async () => {
        if (Capacitor.getPlatform() === "ios") {
          await Camera.requestPermissions({ permissions: ["photos"] });
        } else {
          await Filesystem.requestPermissions();
        }
      },
    },
  ];

  const current = permissions[step];
  const isLast = step === permissions.length - 1;

  const advance = () => {
    if (isLast) {
      localStorage.setItem(NATIVE_PERMISSIONS_KEY, "true");
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleAllow = async () => {
    setRequesting(true);
    try {
      await current.request();
    } catch {
      // permission denied or unsupported — proceed anyway
    } finally {
      setRequesting(false);
      advance();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-5">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header bar */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 pt-8 pb-6 text-center">
          <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-1">
            Step {step + 1} of {permissions.length}
          </p>
          <h1 className="text-white text-xl font-bold">App Permissions</h1>
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-4">
            {permissions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-8 bg-white"
                    : i < step
                    ? "w-4 bg-white/50"
                    : "w-4 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Permission card */}
        <div className="px-6 py-7 text-center">
          <div
            className={`w-20 h-20 rounded-2xl border flex items-center justify-center mx-auto mb-5 ${current.color}`}
          >
            {current.icon}
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">{current.title}</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{current.description}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-8 space-y-3">
          <Button
            className="w-full h-12 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700"
            onClick={handleAllow}
            disabled={requesting}
          >
            {requesting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Requesting…</>
            ) : (
              <>Allow Access <ChevronRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full h-10 text-gray-400 text-sm hover:text-gray-600"
            onClick={advance}
            disabled={requesting}
          >
            {isLast ? "Continue without" : "Skip for now"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NativePermissionsModal;

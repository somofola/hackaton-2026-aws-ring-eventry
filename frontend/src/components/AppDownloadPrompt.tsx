import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const APP_DOWNLOAD_DISMISSED_KEY = "app_download_prompt_dismissed";
const APP_DOWNLOAD_LINK_ANDROID = "https://play.google.com/store/apps/details?id=com.passmobilegeneral.app";
const APP_DOWNLOAD_LINK_IOS = "https://apps.apple.com/app/pass-mobile-extreme/id6739156789";

export const AppDownloadPrompt: React.FC = () => {
  const isMobile = useIsMobile();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show on web platform, mobile browsers only
    if (Capacitor.isNativePlatform() || !isMobile) {
      return;
    }

    // Check if user dismissed it before
    const wasDismissed = localStorage.getItem(APP_DOWNLOAD_DISMISSED_KEY);
    if (!wasDismissed) {
      setShowPrompt(true);
    }
  }, [isMobile]);

  const handleDismiss = () => {
    localStorage.setItem(APP_DOWNLOAD_DISMISSED_KEY, "true");
    setShowPrompt(false);
  };

  const openAppStore = (platform: "ios" | "android") => {
    const url = platform === "ios" ? APP_DOWNLOAD_LINK_IOS : APP_DOWNLOAD_LINK_ANDROID;
    window.open(url, "_blank");
    handleDismiss();
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">Get the App</h2>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Download Pass Mobile Extreme for a better experience with offline access, faster performance, and exclusive mobile features.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => openAppStore("android")}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Download on Google Play
          </Button>
          <Button
            onClick={() => openAppStore("ios")}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          >
            Download on App Store
          </Button>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full mt-4 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};

export default AppDownloadPrompt;

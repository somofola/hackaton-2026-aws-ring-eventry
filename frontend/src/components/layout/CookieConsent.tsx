import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";

const websiteUrl = (import.meta.env.VITE_WEBSITE_URL || "https://eventry.app").replace(/\/$/, "");

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem("cookie-consent");
    if (!hasConsented) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Cookie className="h-6 w-6 text-primary flex-shrink-0" />
            <div className="text-sm text-gray-700">
              <p className="mb-2">
                We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                By clicking "Accept All", you consent to our use of cookies.
              </p>
              <p className="text-xs text-gray-500">
                Read our{" "}
                <a href={`${websiteUrl}/privacy`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a href={`${websiteUrl}/terms`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Terms of Service
                </a>{" "}
                for more information.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="text-gray-600 hover:text-gray-800"
            >
              Decline
            </Button> */}
            <Button
              size="sm"
              onClick={handleAccept}
              className="bg-primary hover:bg-primary/90"
            >
              Accept All
            </Button>
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={handleDecline}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="h-4 w-4" />
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
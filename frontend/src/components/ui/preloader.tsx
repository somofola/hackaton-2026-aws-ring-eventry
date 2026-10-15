// components/preloader.tsx
import React from "react";
import { Capacitor } from "@capacitor/core";

const PRELOADER_LOGO = Capacitor.isNativePlatform()
    ? "/logo-mobile-white.png"
    : "/logo_lite.png";

interface PreloaderProps {
    size?: number; // outer circle size in px (default 80 → h-20 w-20)
    logoSize?: number; // logo size in px (default 40 → h-10 w-10)
    message?: string;   // optional loading message
}

const Preloader: React.FC<PreloaderProps> = ({ size = 80, logoSize = 60, message = ''}) => {
    return (
        <div className="flex flex-col justify-center items-center py-20">
            <div
                className="relative"
                style={{ height: size, width: size }}
            >
                {/* Spinner Ring */}
                <div className="absolute inset-0 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>

                {/* Centered Logo */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <img
                        src={PRELOADER_LOGO}
                        alt="Loading..."
                        style={{ height: logoSize, width: logoSize }}
                        className="object-contain"
                    />
                </div>
            </div>

            {/* Message outside and below */}
            {message && (
                <div className="mt-6">
                    <p className="text-sm text-gray-600 font-medium text-center">
                        {message}
                    </p>
                </div>
            )}
        </div>
    );
};

export default Preloader;

import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useLocation, useNavigate } from "react-router-dom";

/* CapacitorApp.addListener('backButton', () => {
  console.log("💥 Back button pressed");
}); */

const CapacitorBackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const removeListenerRef = useRef(null);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;

    const addListener = async () => {
      const listener = await CapacitorApp.addListener("backButton", () => {
        const path = location.pathname;

        // Exit on dashboard/home-level routes
        const exitPaths = [
          "/",
          "/user/dashboard",
          "/admin/dashboard",
          "/team/dashboard",
        ];

        if (exitPaths.includes(path)) {
          CapacitorApp.exitApp();
        } else {
          navigate(-1); // Go back
        }
      });

      removeListenerRef.current = listener.remove;
    };

    addListener();

    return () => {
      if (removeListenerRef.current) {
        removeListenerRef.current();
      }
    };
  }, [location, navigate]);

  return null;
};

export default CapacitorBackButtonHandler;

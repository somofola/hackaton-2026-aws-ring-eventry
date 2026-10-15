// src/hooks/useTrackPreviousPath.ts
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useTrackPreviousPath = () => {
  const location = useLocation();

  useEffect(() => {
    sessionStorage.setItem("previousPath", location.pathname);
  }, [location.pathname]);
};
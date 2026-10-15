// src/services/api.ts
import axios from "axios";
import { clearAuthData } from "@/services/authService";
import { tokenStorage, detectRoleFromPath } from "@/services/tokenStorage";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://eventry.app/backend/api";

// SECURITY (F-12): withCredentials enables HttpOnly auth cookie on web.
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ---------------------
// Request Interceptor
// ---------------------
api.interceptors.request.use(async (config) => {
  const role = detectRoleFromPath();
  // Hint to backend so AuthTokenFromCookie picks the right per-role cookie
  // when Origin/Referer doesn't include the role prefix.
  config.headers["X-App-Role"] = role;

  // Attach Bearer when available. Required for:
  //   - Native (Capacitor) WKWebView — cookies unreliable cross-origin.
  //   - Web cross-site frontends (e.g. workers.dev → api.eventry.app) where
  //     Chrome's third-party cookie phase-out blocks the HttpOnly cookie.
  // Backend accepts both cookie and Bearer; harmless to send Bearer alongside.
  const token = tokenStorage.getTokenSync(role) || (await tokenStorage.getToken(role));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Web same-site: HttpOnly cookie still rides on withCredentials as fallback.

  return config;
});

// ---------------------
// Response Interceptor
// ---------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      const role = detectRoleFromPath();
      await clearAuthData(role);
    }

    // SECURITY: sensitive-op re-auth. Backend returned 423 — UI should prompt
    // for password, POST /auth/confirm-password, then retry the original call.
    if (status === 423 && error.response?.data?.code === "password_confirmation_required") {
      window.dispatchEvent(new CustomEvent("eventry:password-confirm-required", {
        detail: { config: error.config },
      }));
    }

    return Promise.reject(error);
  }
);

export default api;

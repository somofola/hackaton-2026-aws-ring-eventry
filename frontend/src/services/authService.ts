// src/services/authService.ts
import api from "./api";
import { toast } from "@/components/ui/use-toast";
import { tokenStorage, detectRoleFromPath } from "@/services/tokenStorage";
import { clearProfileCache } from "@/hooks/useUserProfile";

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    user_type: "user" | "team" | "admin";
    is_verified: boolean;
    avatar?: string;
    phone?: string;
    bio?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
    company?: string;
    force_password_change?: boolean;
}

export interface LoginResponse {
    user_type: string;
    token: string;
    access: string;
    refresh: string;
    user: User;
    message?: string;
}

// ---------------------
// Logout flag
// ---------------------
let _justLoggedOut = false;
export const consumeJustLoggedOut = () => { const v = _justLoggedOut; _justLoggedOut = false; return v; };


// ---------------------
// Storage Helpers
// SECURITY (F-12): tokens moved out of localStorage. Web relies on the
// HttpOnly cookie set by the backend; native uses secure storage.
// ---------------------
export const saveAuthData = async (response: LoginResponse): Promise<void> => {
    const { user } = response;
    const role = user.user_type || "user";
    // Web: the token is on the response cookie — `response.access` body field
    // is still useful so native can persist it for future requests.
    if (response.access) {
        await tokenStorage.setToken(role, response.access);
    }
    await tokenStorage.setUser(role, user);
};

export const clearAuthData = async (userType?: string): Promise<void> => {
    const role = userType || "user";
    await tokenStorage.clearToken(role);
    await tokenStorage.clearUser(role);
    clearProfileCache();
};

export const clearAllAuthData = async (): Promise<void> => {
    await tokenStorage.clearAllTokens();
    for (const r of ["user", "team", "admin"]) {
        await tokenStorage.clearUser(r);
    }
    clearProfileCache();
};

export const getAccessToken = async (userType?: string): Promise<string | null> =>
    tokenStorage.getToken(userType || "user");

export const getCurrentUser = async (userType?: string): Promise<User | null> =>
    tokenStorage.getUser<User>(userType || "user");

/** Sync variant — UI gating only, never trust for security. */
export const getCurrentUserSync = (userType?: string): User | null =>
    tokenStorage.getUserSync<User>(userType || "user");

export const getCurrentUserFromURL = async (): Promise<User | null> =>
    getCurrentUser(detectRoleFromPath());

export const getCurrentUserFromURLSync = (): User | null =>
    getCurrentUserSync(detectRoleFromPath());

/**
 * Probe `/auth/validate-token` — the only authoritative check, since on web
 * the token is HttpOnly and not JS-readable.
 */
export const isAuthenticated = async (userType?: string): Promise<boolean> => {
    // Native fast-path: a cached token is necessary (though not sufficient).
    if (tokenStorage.isNative()) {
        const t = await tokenStorage.getToken(userType || "user");
        if (!t) return false;
    }
    try {
        const { data } = await api.get("/auth/validate-token");
        return !!data?.valid;
    } catch {
        return false;
    }
};

/** Best-effort sync check — for first-paint gating. */
export const isAuthenticatedSync = (userType?: string): boolean => {
    const role = userType || "user";
    if (tokenStorage.isNative()) {
        return !!tokenStorage.getTokenSync(role);
    }
    // Web: cached user record implies a recent session. Final answer comes
    // from /auth/validate-token in PrivateRoute.
    return !!tokenStorage.getUserSync(role);
};

export const isAuthenticatedForCurrentPath = async (): Promise<boolean> =>
    isAuthenticated(detectRoleFromPath());

export const isAuthenticatedForCurrentPathSync = (): boolean =>
    isAuthenticatedSync(detectRoleFromPath());

// ---------------------
// API Calls
// ---------------------
export const authService = {
    emailLogin: async (
        email: string,
        password: string,
    ): Promise<LoginResponse | null> => {
        try {
            const { data } = await api.post("/auth/login", { email, password });

            const user: User = {
                id: data.id || email,
                email,
                first_name: data.first_name || data.name?.split(" ")[0] || email.split("@")[0],
                last_name: data.last_name || data.name?.split(" ").slice(1).join(" ") || "",
                user_type: data.user_type || "user",
                is_verified: data.is_verified ?? true,
                force_password_change: data.force_password_change ?? false,
                company: data.company ?? undefined,
            };

            const authResponse: LoginResponse = {
                token: data.token,
                access: data.token,
                refresh: data.refresh || "nan",
                user_type: data.user_type,
                user,
            };

            await saveAuthData(authResponse);

            if (data.deletion_cancelled) {
                toast({
                    title: "Account deletion cancelled",
                    description: "You logged back in before the grace period ended, so your account deletion request was cancelled.",
                    variant: "success",
                });
            } else {
                toast({
                    title: "Login successful",
                    description: `Welcome, ${user.first_name}`,
                    variant: "success",
                });
            }
            return authResponse;
        } catch (error: any) {
            toast({
                title: "Login failed",
                description: error?.response?.data?.message || error.message,
                variant: "destructive",
            });
            return null;
        }
    },

    emailRegister: async (
        name: string,
        email: string,
        password: string,
        user_type: string,
    ): Promise<{ label: string; message: string } | null> => {
        try {
            if (user_type && !["user", "team"].includes(user_type)) {
                toast({
                    title: "Invalid user type",
                    description: `User type must be one of user or team.`,
                    variant: "destructive",
                });
                return null;
            }

            const { data } = await api.post("/auth/register", { name, email, password, user_type });

            if (data.status === "success") {
                return {
                    label: "success",
                    message: data.message || "Registration successful. Please verify your email."
                };
            }

            return {
                label: "error",
                message: data.message || "Registration failed"
            };
        } catch (error: any) {
            return {
                label: "error",
                message: error?.response?.data?.message || "Registration failed"
            };
        }
    },

    appRegister: async (
        name: string,
        email: string,
        password: string,
        user_type: string,
        app_id: string,
        pin: string
    ): Promise<{ label: string; message: string } | null> => {
        try {
            if (user_type && !["user", "team"].includes(user_type)) {
                toast({
                    title: "Invalid user type",
                    description: `User type must be one of user or team.`,
                    variant: "destructive",
                });
                return null;
            }

            const { data } = await api.post("/auth/app/register", { name, email, password, user_type, app_id, pin });

            if (data.status === "success") {
                return {
                    label: "success",
                    message: data.message || "Registration successful. Please verify your email."
                };
            }

            return {
                label: "error",
                message: data.message || "Registration failed"
            };

        } catch (error: any) {
            return {
                label: "error",
                message: error?.response?.data?.message || "Registration failed"
            };
        }
    },

    appEmailLogin: async (
        email: string,
        password: string,
        pin: string,
        appId: string
    ): Promise<LoginResponse | null> => {
        try {
            const { data } = await api.post("/auth/app/login/email", { email, password, pin, appId });

            const user: User = {
                id: data.id || email,
                email,
                first_name: data.first_name || email.split("@")[0],
                last_name: data.last_name || "",
                user_type: data.user_type || "user",
                is_verified: data.is_verified ?? true,
                company: data.company ?? undefined,
            };

            const authResponse: LoginResponse = {
                token: data.token,
                access: data.token,
                refresh: data.refresh || "nan",
                user_type: data.user_type,
                user,
            };

            await saveAuthData(authResponse);

            toast({
                title: "Login successful",
                description: `Welcome, ${user.first_name}`,
                variant: "success",
            });
            return authResponse;
        } catch (error: any) {
            toast({
                title: "Login failed",
                description: error?.response?.data?.message || error.message,
                variant: "destructive",
            });
            return null;
        }
    },

    appPinLogin: async (
        savedAppId: string,
        loginPin: string,
    ): Promise<LoginResponse | null> => {
        try {
            const { data } = await api.post("/auth/app/login/pin", { savedAppId, loginPin });

            const user: User = {
                id: data.id || savedAppId,
                email: data.email,
                first_name: (data.name || "").split(" ")[0] || "",
                last_name: "",
                user_type: data.user_type || "user",
                is_verified: data.is_verified ?? true,
            };

            const authResponse: LoginResponse = {
                token: data.token,
                access: data.token,
                refresh: data.refresh || "nan",
                user_type: data.user_type || "user",
                user,
            };
            await saveAuthData(authResponse);
            return authResponse;
        } catch (error: any) {
            toast({
                title: "Login failed",
                description: error?.response?.data?.message || error.message,
                variant: "destructive",
            });
            return null;
        }
    },

    //add SSO
    appleLogin: async () => {
        const response = await api.get('/auth/apple/redirect?flow=login')
        return response.data
    },
    appleRegister: async () => {
        const response = await api.get('/auth/apple/redirect?flow=register')
        return response.data
    },

    googleLogin: async () => {
        const response = await api.get('/auth/google/redirect?flow=login')
        return response.data
    },
    googleRegister: async () => {
        const response = await api.get('/auth/google/redirect?flow=register')
        return response.data
    },
    googleCallback: async (code: string, state: string): Promise<LoginResponse | null> => {
        try {
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            const state = params.get("state");

            if (!code) throw new Error("Missing code from Google");
            if (!state) throw new Error("Missing state from Google");

            const { data } = await api.post('/auth/google/callback', { code, state });

            if (data.status && data.status !== 200) {
                toast({
                    title: "Login failed",
                    description: data.message || "Invalid response from Google login",
                    variant: "destructive",
                });
                return null;
            }

            return data;

        } catch (error: any) {
            toast({
                title: "Login failed",
                description: error?.response?.data?.message || error.message,
                variant: "destructive",
            });
            return null;
        }
    },

    microsoftLogin: async () => {
        const response = await api.get('/auth/microsoft/redirect?flow=login')
        return response.data
    },
    microsoftRegister: async () => {
        const response = await api.get('/auth/microsoft/redirect?flow=register')
        return response.data
    },
    microsoftCallback: async (code: string, state: string): Promise<LoginResponse | null> => {
        try {
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            const state = params.get("state");

            if (!code) throw new Error("Missing code from Microsoft");
            if (!state) throw new Error("Missing state from Microsoft");

            const { data } = await api.post('/auth/microsoft/callback', { code, state });

            if (data.status && data.status !== 200) {
                toast({
                    title: "Login failed",
                    description: data.message || "Invalid response from Microsoft login",
                    variant: "destructive",
                });
                return null;
            }

            return data;

        } catch (error: any) {
            toast({
                title: "Login failed",
                description: error?.response?.data?.message || error.message,
                variant: "destructive",
            });
            return null;
        }
    },

    linkedinLogin: async () => {
        const response = await api.get('/auth/linkedin/redirect?flow=login')
        return response.data
    },
    linkedinRegister: async () => {
        const response = await api.get('/auth/linkedin/redirect?flow=register')
        return response.data
    },
    linkedinCallback: async (code: string, state: string): Promise<LoginResponse | null> => {
        try {
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            const state = params.get("state");

            if (!code) throw new Error("Missing code from LinkedIn");
            if (!state) throw new Error("Missing state from LinkedIn");

            const { data } = await api.post('/auth/linkedin/callback', { code, state });

            if (data.status && data.status !== 200) {
                toast({
                    title: "Login failed",
                    description: data.message || "Invalid response from LinkedIn login",
                    variant: "destructive",
                });
                return null;
            }

            return data;

        } catch (error: any) {

            const backendData = error.response?.data;

            const message =
                backendData?.error ||
                backendData?.message ||
                error.message ||
                "Unexpected error occurred";

            toast({
                title: "Login failed",
                description: message,
                variant: "destructive",
            });
            return null;
        }
    },

    /**
     * Legacy refresh kept for compatibility — backend issues a new token on
     * each login and sliding-window extends it via ExtendSanctumToken.
     */
    refreshAccessToken: async (userType?: string) => {
        try {
            // Cookie-based: no refresh token client-side; rely on server extension.
            const { data } = await api.post("/auth/refresh", {});
            if (data?.access) {
                await tokenStorage.setToken(userType || "user", data.access);
            }
            return data?.access ?? null;
        } catch {
            await clearAuthData(userType);
            return null;
        }
    },

    updateProfile: async (profileData: Partial<User>, userType?: string): Promise<User | null> => {
        try {
            const { data } = await api.put("/auth/profile", profileData);

            const currentUser = await getCurrentUser(userType);
            if (currentUser) {
                const merged = { ...currentUser, ...data };
                await tokenStorage.setUser(userType || "user", merged);
            }

            return data;
        } catch (error: any) {
            toast({
                title: "Update failed",
                description: error?.response?.data?.message || error.message,
                variant: "destructive",
            });
            return null;
        }
    },

    logout: async (userType?: string): Promise<void> => {
        try {
            // Server clears cookies for every role on logout.
            await api.post("/auth/logout");
        } catch (err) {
            //console.error("Logout error:", err);
        } finally {
            await clearAuthData(userType);
            _justLoggedOut = true;
            toast({
                title: "Logged out",
                description: `Logged out successfully`,
                variant: "info",
            });
        }
    },

    /**
     * Self-service account deletion (App Store §5.1.1(v) / Play account-deletion policy).
     * Backend requires a fresh password confirmation (POST /auth/confirm-password) —
     * callers must confirm the password first or handle the 423 password-confirm-required flow.
     */
    deleteAccount: async (userType?: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const { data } = await api.delete("/auth/account");
            await clearAuthData(userType);
            _justLoggedOut = true;
            toast({
                title: "Account scheduled for deletion",
                description: data?.message || "Your account has been deactivated and will be permanently deleted after the grace period. Log back in to cancel.",
                variant: "info",
            });
            return { success: true, message: data?.message };
        } catch (err: any) {
            const message = err?.response?.data?.message || "Failed to delete account.";
            toast({
                title: "Account deletion failed",
                description: message,
                variant: "destructive",
            });
            return { success: false, message };
        }
    },

    /** Send password reset email to a valid email address */
    forgotPassword: async (email: string): Promise<boolean> => {
        try {
            await api.post("/auth/forgot-password", { email });
            toast({
                title: "Email sent",
                description: "If an account exists for that email, a reset link has been sent.",
                variant: "success",
            });
            return true;
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.response?.data?.message || "Failed to send reset email.",
                variant: "destructive",
            });
            return false;
        }
    },

    /** Reset password using token received from email link */
    resetPassword: async (
        email: string,
        token: string,
        password: string,
        password_confirmation: string,
    ): Promise<boolean> => {
        try {
            await api.post("/auth/reset-password", { email, token, password, password_confirmation });
            toast({
                title: "Password reset",
                description: "Your password has been changed successfully. Please log in.",
                variant: "success",
            });
            return true;
        } catch (error: any) {
            toast({
                title: "Reset failed",
                description: error?.response?.data?.message || "Invalid or expired reset link.",
                variant: "destructive",
            });
            return false;
        }
    },
};

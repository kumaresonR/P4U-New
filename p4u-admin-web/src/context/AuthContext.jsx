import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loginPublic } from "../lib/api/adminApi";
import { ensureTokenFresh } from "../lib/api/client";
import { clearTokens, getAccessToken, getStoredRoles, setTokens } from "../lib/api/tokenStorage";

const AuthContext = createContext(null);

function decodeJwtExpMs(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessTokenState] = useState(() => getAccessToken());
  const [roles, setRolesState] = useState(() => getStoredRoles());
  const [isInitializing, setIsInitializing] = useState(true);

  const syncFromStorage = useCallback(() => {
    setAccessTokenState(getAccessToken());
    setRolesState(getStoredRoles());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const INIT_TIMEOUT_MS = 12_000;

    const runInit = async () => {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setAccessTokenState(null);
          setRolesState([]);
        }
        return;
      }
      const exp = decodeJwtExpMs(token);
      const isExpired = exp != null && exp <= Date.now();
      if (isExpired) {
        try {
          await ensureTokenFresh();
        } catch {
          clearTokens();
        }
      }
      if (!cancelled) syncFromStorage();
    };

    (async () => {
      let timeoutId;
      try {
        await Promise.race([
          runInit(),
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("Session check timed out")), INIT_TIMEOUT_MS);
          }),
        ]);
      } catch {
        // Keep session state on transient refresh/network failures.
      } finally {
        if (timeoutId != null) clearTimeout(timeoutId);
        if (!cancelled) setIsInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [syncFromStorage]);

  const login = useCallback(async (username, password) => {
    const res = await loginPublic({ username, password });
    const token = res.accessToken ?? res.access_token;
    if (!token) {
      throw new Error("Login response did not include an access token.");
    }
    const refresh = res.refreshToken ?? res.refresh_token;
    const roleList = (res.roles || []).map((r) => String(r).toUpperCase());
    if (!roleList.includes("ADMIN")) {
      throw new Error("This account does not have ADMIN access.");
    }
    setTokens(token, refresh, roleList);
    setAccessTokenState(token);
    setRolesState(roleList);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("p4u-admin-token-updated"));
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setAccessTokenState(null);
    setRolesState([]);
  }, []);

  useEffect(() => {
    const sync = () => syncFromStorage();
    window.addEventListener("p4u-admin-token-updated", sync);
    return () => window.removeEventListener("p4u-admin-token-updated", sync);
  }, [syncFromStorage]);

  const value = useMemo(
    () => ({
      isInitializing,
      isAuthenticated: Boolean(accessToken),
      roles,
      login,
      logout,
    }),
    [isInitializing, accessToken, roles, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

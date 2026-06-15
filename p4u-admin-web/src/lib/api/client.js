import { buildApiUrl } from "./config";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./tokenStorage";

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function decodeJwtExpMs(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

let refreshInFlight = null;

async function refreshAccessToken() {
  const rt = getRefreshToken();
  if (!rt) throw new Error("No refresh token");
  const url = buildApiUrl(`/api/auth/public/refresh?refreshToken=${encodeURIComponent(rt)}`);
  const res = await fetch(url, { method: "POST", headers: { Accept: "application/json" } });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  if (!res.ok) {
    throw new Error((data && data.message) || "Refresh failed");
  }
  const access = data.accessToken ?? data.access_token;
  const nextRefresh = data.refreshToken ?? data.refresh_token;
  if (!access) throw new Error("No access token in refresh response");
  setTokens(access, nextRefresh !== undefined ? nextRefresh : undefined, undefined);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("p4u-admin-token-updated"));
  }
}

/** Refresh access token when near expiry (used by apiRequest and uploadFile). */
export async function ensureTokenFresh() {
  const access = getAccessToken();
  const refresh = getRefreshToken();
  if (!access || !refresh) return;
  const exp = decodeJwtExpMs(access);
  if (exp != null && exp - Date.now() > 120_000) return;
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  await refreshInFlight;
}

function forceLoginRedirect() {
  clearTokens();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("p4u-admin-token-updated"));
    const onLogin =
      window.location.pathname === "/login" || window.location.pathname === "/";
    if (!onLogin) {
      window.location.assign("/login");
    }
  }
}

/**
 * @param {string} path - Absolute path starting with /api/...
 * @param {RequestInit & { skipAuth?: boolean, jsonBody?: unknown, _retry401?: boolean }} options
 */
export async function apiRequest(path, options = {}) {
  const { skipAuth = false, jsonBody, headers: extraHeaders, _retry401 = false, ...rest } = options;
  const url = buildApiUrl(path);

  if (!skipAuth) {
    try {
      await ensureTokenFresh();
    } catch {
      /* fall through; request may still work or we'll handle 401 */
    }
  }

  /** @type {Record<string, string>} */
  const headers = {
    Accept: "application/json",
    ...(extraHeaders || {}),
  };

  if (jsonBody !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, {
      ...rest,
      headers,
      body: jsonBody !== undefined ? JSON.stringify(jsonBody) : rest.body,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ApiError(
      0,
      msg === "Failed to fetch"
        ? "Network error: check the API gateway URL, CORS, and that services are running."
        : msg,
      e,
    );
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (res.status === 401 && !skipAuth && !_retry401 && getRefreshToken()) {
    try {
      await refreshAccessToken();
      return apiRequest(path, { ...options, _retry401: true });
    } catch {
      /* Keep current session on transient auth/gateway failures. */
    }
  }

  if (res.status === 401 && !skipAuth) {
    // For admin APIs, any unauthorized response should end the session and return to login.
    // This avoids stale-token loops where pages keep showing "Invalid or missing token".
    forceLoginRedirect();
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error?.message)) || res.statusText || "Request failed";
    throw new ApiError(res.status, message, data);
  }

  return data;
}

export const api = {
  get(path, params) {
    const q =
      params && Object.keys(params).length
        ? `?${new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, v == null ? "" : String(v)]),
          )}`
        : "";
    return apiRequest(`${path}${q}`, { method: "GET" });
  },
  post(path, jsonBody, opts) {
    return apiRequest(path, { method: "POST", jsonBody, ...opts });
  },
  patch(path, jsonBody) {
    return apiRequest(path, { method: "PATCH", jsonBody });
  },
  delete(path) {
    return apiRequest(path, { method: "DELETE" });
  },
};

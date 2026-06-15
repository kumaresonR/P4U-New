/**
 * API base URL for the P4U gateway.
 * - Dev: leave unset and use Vite proxy so requests go to `/api/...` on the dev server.
 * - Prod: set VITE_API_GATEWAY_URL to the gateway origin (e.g. https://api.example.com).
 */
export function apiBaseUrl() {
  const raw = import.meta.env.VITE_API_GATEWAY_URL;
  if (raw != null && String(raw).trim() !== "") {
    return String(raw).replace(/\/$/, "");
  }
  return "";
}

export function buildApiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = apiBaseUrl();
  return base ? `${base}${p}` : p;
}

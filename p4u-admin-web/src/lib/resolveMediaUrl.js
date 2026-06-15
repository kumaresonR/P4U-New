import { buildApiUrl } from "./api/config";

/**
 * Resolve gateway-served static paths for img src (same rules as user-web `lib/media.ts`).
 * - `/uploads`, `/vendor-uploads`, `/socio-uploads` → `buildApiUrl` (Vite proxies or absolute gateway in prod).
 * - Absolute URLs with those paths → rewritten through `buildApiUrl` so dev hostnames still work.
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) {
    try {
      const parsed = new URL(u);
      const p = parsed.pathname;
      if (p.startsWith("/uploads") || p.startsWith("/vendor-uploads") || p.startsWith("/socio-uploads")) {
        return buildApiUrl(`${parsed.pathname}${parsed.search}`);
      }
    } catch {
      return u;
    }
    return u;
  }
  const path = u.startsWith("/") ? u : `/${u}`;
  return buildApiUrl(path);
}

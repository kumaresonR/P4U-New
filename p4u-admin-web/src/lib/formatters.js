export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

export function formatInrAmount(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function shortJson(value) {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  try {
    const s = JSON.stringify(value);
    return s.length > 48 ? `${s.slice(0, 45)}…` : s;
  } catch {
    return String(value);
  }
}

/** Normalize vendor categoriesJson to a list of string slugs/ids for display. */
export function normalizeVendorCategories(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          if (typeof item.slug === "string") return item.slug.trim();
          if (typeof item.name === "string") return item.name.trim();
        }
        return null;
      })
      .filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      return normalizeVendorCategories(JSON.parse(value));
    } catch {
      const t = value.trim();
      return t ? [t] : [];
    }
  }
  return [];
}

/** Turn a slug like "home-services" into "Home Services". */
export function categorySlugToLabel(slug) {
  if (!slug) return "";
  return String(slug)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

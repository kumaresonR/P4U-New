/**
 * Matches admin-management-services `platform-variable-value.ts` semantics for JSON `value` / `isActive`.
 * @param {{ isActive?: boolean, value?: unknown } | null | undefined} row
 * @param {boolean} [defaultWhenMissing=true]
 */
export function isPlatformVariableRowAllowingAction(row, defaultWhenMissing = true) {
  if (!row) return defaultWhenMissing;
  if (row.isActive === false) return false;
  return parsePlatformJsonValueAsEnabled(row.value, defaultWhenMissing);
}

function parsePlatformJsonValueAsEnabled(value, defaultWhenMissing) {
  if (value == null) return defaultWhenMissing;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return !Number.isNaN(value) && value !== 0;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "" || s === "null") return defaultWhenMissing;
    if (s === "true" || s === "yes" || s === "1") return true;
    if (s === "false" || s === "no" || s === "0") return false;
    const n = Number(s);
    if (!Number.isNaN(n)) return n !== 0;
    return defaultWhenMissing;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    if (typeof value.enabled === "boolean") return value.enabled;
    if (value.amount !== undefined && value.amount !== null && value.amount !== "") {
      return parsePlatformJsonValueAsEnabled(value.amount, defaultWhenMissing);
    }
    if (value.text !== undefined && value.text !== null) {
      return parsePlatformJsonValueAsEnabled(value.text, defaultWhenMissing);
    }
  }
  return defaultWhenMissing;
}

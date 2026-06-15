import React from "react";

const CHIP =
  "px-8 py-2 radius-16 border border-primary-600 text-primary-600 text-xs fw-medium bg-primary-50 d-inline-block";

/** @param {number} n @param {string} plural e.g. "services", "categories" */
function countLine(n, plural) {
  if (n === 1) {
    if (plural.endsWith("ies")) return `${n} ${plural.slice(0, -3)}y`;
    if (plural.endsWith("s")) return `${n} ${plural.slice(0, -1)}`;
  }
  return `${n} ${plural}`;
}

/**
 * Table cell: "{n} {countSuffix}" line + primary-bordered chips (matches Categories list).
 *
 * @param {{
 *   strings?: string[],
 *   items?: unknown[],
 *   getLabel?: (item: unknown) => string,
 *   getKey?: (item: unknown, index: number) => string,
 *   countSuffix: string,
 *   emptyLabel?: string,
 * }} props
 */
export default function CountAndChips({
  strings,
  items,
  getLabel,
  getKey,
  countSuffix,
  emptyLabel = "—",
}) {
  /** @type {{ key: string, label: string }[]} */
  let rows = [];
  if (strings?.length) {
    rows = strings
      .filter((s) => s != null && String(s).trim() !== "")
      .map((s, i) => ({ key: `s-${i}-${String(s)}`, label: String(s).trim() }));
  } else if (items?.length && getLabel) {
    rows = items
      .map((it, i) => {
        const label = (getLabel(it) || "").trim();
        const key = getKey ? getKey(it, i) : `i-${i}`;
        return { key: String(key), label };
      })
      .filter((r) => r.label);
  }

  if (!rows.length) {
    return <span className="text-secondary-light">{emptyLabel}</span>;
  }

  return (
    <div>
      <span className="text-primary-600 fw-semibold text-sm">
        {countLine(rows.length, countSuffix)}
      </span>
      <div className="d-flex flex-wrap gap-1 mt-4">
        {rows.map((r) => (
          <span key={r.key} className={CHIP}>
            {r.label}
          </span>
        ))}
      </div>
    </div>
  );
}

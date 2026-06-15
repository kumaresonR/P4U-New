/**
 * Effective unit price for catalog products (admin list matches storefront logic).
 * finalPrice may be 0 while sellPrice holds the list amount — avoid `??` / || pitfalls with "0" strings.
 */
export function parseMoney(v) {
  if (v == null || v === "") return NaN;
  const x = Number.parseFloat(String(v).trim().replace(/,/g, ""));
  return Number.isFinite(x) ? x : NaN;
}

/** @param {Record<string, unknown>} row */
export function resolveAdminProductUnitPrice(row) {
  const meta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {};

  const fp = parseMoney(row.finalPrice);
  const sp = parseMoney(row.sellPrice);
  const bp = parseMoney(row.price);
  const mfp = parseMoney(meta.finalPrice);
  const msp = parseMoney(meta.sellPrice);
  const mp = parseMoney(meta.price);

  if (Number.isFinite(fp) && fp > 0) return fp;
  if (Number.isFinite(mfp) && mfp > 0) return mfp;
  if (Number.isFinite(sp) && sp > 0) return sp;
  if (Number.isFinite(msp) && msp > 0) return msp;
  if (Number.isFinite(bp) && bp > 0) return bp;
  if (Number.isFinite(mp) && mp > 0) return mp;

  if (Number.isFinite(fp)) return fp;
  if (Number.isFinite(sp)) return sp;
  if (Number.isFinite(bp)) return bp;
  return 0;
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { listPointsSettlements } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "welcome", label: "Welcome" },
  { value: "post_like", label: "Post like" },
  { value: "post_share", label: "Post share" },
  { value: "story_like", label: "Story like" },
  { value: "customer_referral", label: "Customer referral" },
  { value: "vendor_referral", label: "Vendor referral" },
  { value: "redeemed", label: "Redeemed" },
  { value: "order_reward", label: "Order / other" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const FETCH_LIMIT = 100;
const MAX_ROWS = 4000;

function toYmdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  return { from: toYmdLocal(start), to: toYmdLocal(end) };
}

function startOfLocalDay(ymd) {
  if (!ymd || typeof ymd !== "string") return null;
  const parts = ymd.split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, mo, d] = parts;
  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

function endOfLocalDay(ymd) {
  if (!ymd || typeof ymd !== "string") return null;
  const parts = ymd.split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, mo, d] = parts;
  return new Date(y, mo - 1, d, 23, 59, 59, 999);
}

function localDayBounds(fromYmd, toYmd) {
  let start = fromYmd ? startOfLocalDay(fromYmd) : null;
  let end = toYmd ? endOfLocalDay(toYmd) : null;
  if (start && end && start.getTime() > end.getTime()) {
    start = toYmd ? startOfLocalDay(toYmd) : null;
    end = fromYmd ? endOfLocalDay(fromYmd) : null;
  }
  return { start, end };
}

function parseMeta(m) {
  if (m == null) return {};
  if (typeof m === "string") {
    try {
      return JSON.parse(m) || {};
    } catch {
      return {};
    }
  }
  return typeof m === "object" && !Array.isArray(m) ? m : {};
}

function inferTag(item, meta) {
  const s = `${meta.reason || ""} ${meta.type || ""} ${item.reason || ""} ${item.type || ""} ${item.settlementType || ""}`.toLowerCase();
  if (s.includes("welcome")) return "welcome";
  if (s.includes("customer") && s.includes("ref")) return "customer_referral";
  if (s.includes("vendor") && s.includes("ref")) return "vendor_referral";
  if (s.includes("post") && s.includes("like")) return "post_like";
  if (s.includes("post") && s.includes("share")) return "post_share";
  if (s.includes("story") && s.includes("like")) return "story_like";
  if (s.includes("redeem")) return "redeemed";
  return "order_reward";
}

function customerDisplayId(cid) {
  if (!cid) return "—";
  const hex = String(cid).replace(/-/g, "");
  return `CUST-${hex.slice(0, 8).toUpperCase()}`;
}

function transactionDisplayId(row, meta, tag) {
  const fromMeta = meta.transactionRef || meta.transactionId || meta.pointTransactionId;
  if (fromMeta && String(fromMeta).trim()) return String(fromMeta).trim();
  const prefix = tag === "welcome" ? "W" : tag === "redeemed" ? "R" : "P";
  const raw = String(row.id || "").replace(/-/g, "");
  return `PT-${prefix}-${raw.slice(0, 8).toUpperCase()}`;
}

function formatTs(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatExpiry(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

async function fetchAllPointsRows() {
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && all.length < MAX_ROWS) {
    const res = await listPointsSettlements({ limit: FETCH_LIMIT, offset });
    const items = res.items || [];
    all.push(...items);
    total = typeof res.total === "number" ? res.total : all.length;
    offset += items.length;
    if (items.length === 0) break;
  }
  return all;
}

function SortTh({ label, sortKey, activeKey, dir, onSort }) {
  const active = activeKey === sortKey;
  return (
    <th className='cursor-pointer user-select-none' onClick={() => onSort(sortKey)} title='Sort'>
      <span className='d-inline-flex align-items-center gap-4'>
        {label}
        <Icon
          icon={active ? (dir === "asc" ? "mdi:arrow-up" : "mdi:arrow-down") : "mdi:unfold-more-horizontal"}
          className={`text-lg ${active ? "text-primary-600" : "text-secondary-light opacity-50"}`}
        />
      </span>
    </th>
  );
}

function typePill(tag) {
  const t = String(tag || "").toLowerCase();
  if (t === "welcome") return { cls: "bg-primary-50 text-primary-700", label: "welcome" };
  if (t === "redeemed") return { cls: "bg-danger-50 text-danger-700", label: "redeemed" };
  if (t === "post_like" || t === "story_like") return { cls: "bg-neutral-200 text-secondary-light", label: t.replace(/_/g, " ") };
  return { cls: "bg-neutral-100 text-secondary-light", label: t.replace(/_/g, " ") };
}

export default function PointsReportLayer() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const all = await fetchAllPointsRows();
      setRawRows(all);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setRawRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const enriched = useMemo(() => {
    return rawRows.map((item) => {
      const meta = parseMeta(item.metadata);
      const tag = inferTag(item, meta);
      const cid = meta.customerId || meta.customerProfileId || meta.customer_id || null;
      const customerName =
        meta.customerName ||
        meta.fullName ||
        item.customerName ||
        item.userName ||
        item.name ||
        "—";
      const description =
        meta.description || item.description || meta.reason || item.reason || meta.note || "—";
      const points = Number(item.amount ?? item.points ?? meta.points ?? 0) || 0;
      const expiresAt = meta.expiresAt || meta.expiryDate || meta.pointsExpireAt || meta.expires_at || null;
      const expiredFlag = meta.expired === true || meta.isExpired === true;
      return {
        raw: item,
        meta,
        tag,
        txId: transactionDisplayId(item, meta, tag),
        createdAt: item.createdAt,
        customerName,
        customerId: customerDisplayId(cid),
        points,
        description,
        expiresAt,
        expired: expiredFlag,
      };
    });
  }, [rawRows]);

  const { start: rangeStart, end: rangeEnd } = useMemo(() => localDayBounds(fromDate, toDate), [fromDate, toDate]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      const created = new Date(r.createdAt);
      if (isNaN(created.getTime())) return false;
      if (rangeStart && created < rangeStart) return false;
      if (rangeEnd && created > rangeEnd) return false;
      if (typeFilter && r.tag !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          r.txId.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.customerId.toLowerCase().includes(q) ||
          String(r.description).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enriched, rangeStart, rangeEnd, typeFilter, search]);

  const kpis = useMemo(() => {
    let totalIssued = 0;
    let totalRedeemed = 0;
    let welcome = 0;
    let referral = 0;
    filtered.forEach((r) => {
      const p = r.points;
      if (r.tag === "redeemed") totalRedeemed += Math.abs(p);
      else if (p > 0) totalIssued += p;
      if (r.tag === "welcome") welcome += Math.max(0, p);
      if (r.tag === "customer_referral" || r.tag === "vendor_referral") referral += Math.max(0, p);
    });
    return { totalIssued, totalRedeemed, welcome, referral };
  }, [filtered]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...filtered];
    const cmp = (a, b) => {
      switch (key) {
        case "txId":
          return mul * String(a.txId).localeCompare(String(b.txId));
        case "createdAt":
          return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "customer":
          return mul * String(a.customerName).localeCompare(String(b.customerName));
        case "customerId":
          return mul * String(a.customerId).localeCompare(String(b.customerId));
        case "type":
          return mul * String(a.tag).localeCompare(String(b.tag));
        case "points":
          return mul * (a.points - b.points);
        case "description":
          return mul * String(a.description).localeCompare(String(b.description));
        case "expiresAt": {
          const ta = a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
          const tb = b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
          return mul * (ta - tb);
        }
        default:
          return 0;
      }
    };
    arr.sort(cmp);
    return arr;
  }, [filtered, sort]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, fromDate, toDate, pageSize, sort.key, sort.dir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "createdAt" ? "desc" : "asc" },
    );
  };

  const exportCsv = () => {
    const header = [
      "Transaction ID",
      "Date",
      "Customer",
      "Customer ID",
      "Type",
      "Points",
      "Description",
      "Expires At",
      "Expired",
    ];
    const lines = sorted.map((r) => [
      r.txId,
      formatTs(r.createdAt),
      r.customerName,
      r.customerId,
      r.tag,
      r.points,
      r.description,
      r.expiresAt ? formatExpiry(r.expiresAt) : "",
      r.expired ? "yes" : "",
    ]);
    const csv = toCsv([header, ...lines]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `points-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtPts = (n) => Number(n || 0).toLocaleString("en-IN");

  return (
    <div>
      <div className='row g-16 mb-24'>
        <KpiCard label='Total Issued' value={fmtPts(kpis.totalIssued)} icon='mdi:arrow-up-bold' />
        <KpiCard label='Total Redeemed' value={fmtPts(kpis.totalRedeemed)} icon='mdi:arrow-down-bold' />
        <KpiCard label='Welcome Bonuses' value={fmtPts(kpis.welcome)} icon='mdi:star-outline' />
        <KpiCard label='Referral Bonuses' value={fmtPts(kpis.referral)} icon='mdi:gift-outline' />
      </div>

      <div className='card radius-12 p-0 mb-0'>
        <div className='card-body p-24'>
          <div className='d-flex flex-wrap align-items-center gap-12 mb-20 w-100'>
            <div className='input-group flex-grow-1' style={{ minWidth: 260, maxWidth: 560 }}>
              <span className='input-group-text bg-white border-end-0 h-40-px d-flex align-items-center'>
                <Icon icon='mdi:magnify' className='text-secondary-light' />
              </span>
              <input
                type='search'
                className='form-control border-start-0 h-40-px radius-8'
                placeholder='Search by customer, description, transaction ID…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete='off'
              />
            </div>
            <div className='d-flex flex-wrap align-items-center gap-10 ms-xl-auto'>
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='pr-from'>
                From
              </label>
              <input
                id='pr-from'
                type='date'
                className='form-control h-40-px radius-8'
                style={{ width: 158, minWidth: 140 }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='pr-to'>
                To
              </label>
              <input
                id='pr-to'
                type='date'
                className='form-control h-40-px radius-8'
                style={{ width: 158, minWidth: 140 }}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              <select
                className='form-select h-40-px radius-8'
                style={{ minWidth: 140, maxWidth: 200 }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label='Transaction type'
              >
                {TYPE_FILTER_OPTIONS.map((s) => (
                  <option key={s.value || "all"} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type='button'
                className='btn btn-outline-secondary h-40-px radius-8 d-inline-flex align-items-center gap-8 px-14 flex-shrink-0'
                onClick={exportCsv}
              >
                <Icon icon='mdi:tray-arrow-down' className='text-lg' />
                Export CSV
              </button>
            </div>
          </div>

          {error && (
            <div className='alert alert-danger radius-12 mb-16' role='alert'>
              {error}
            </div>
          )}

          {loading ? (
            <p className='text-secondary-light mb-0'>Loading points transactions…</p>
          ) : (
            <>
              <div className='table-responsive scroll-sm' style={{ overflowX: "auto" }}>
                <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle' style={{ minWidth: 1080 }}>
                  <thead>
                    <tr>
                      <SortTh label='TRANSACTION ID' sortKey='txId' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='DATE' sortKey='createdAt' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='CUSTOMER' sortKey='customer' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='CUSTOMER ID' sortKey='customerId' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='TYPE' sortKey='type' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='POINTS' sortKey='points' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <th>DESCRIPTION</th>
                      <SortTh label='EXPIRES AT' sortKey='expiresAt' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <th>EXPIRED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageSlice.length === 0 ? (
                      <tr>
                        <td colSpan='9' className='text-center py-40 text-secondary-light'>
                          No points transactions in this period.
                        </td>
                      </tr>
                    ) : (
                      pageSlice.map((r) => {
                        const pill = typePill(r.tag);
                        const pos = r.points >= 0;
                        return (
                          <tr key={r.raw.id}>
                            <td className='fw-semibold'>{r.txId}</td>
                            <td>{formatTs(r.createdAt)}</td>
                            <td>{r.customerName}</td>
                            <td>{r.customerId}</td>
                            <td>
                              <span className={`px-12 py-4 radius-pill text-xs fw-medium ${pill.cls}`}>{pill.label}</span>
                            </td>
                            <td className={`fw-semibold ${pos ? "text-success-600" : "text-danger-600"}`}>
                              {pos ? "+" : ""}
                              {fmtPts(r.points)}
                            </td>
                            <td style={{ maxWidth: 280 }} className='text-wrap'>
                              {r.description}
                            </td>
                            <td>{r.expiresAt ? formatExpiry(r.expiresAt) : "—"}</td>
                            <td>{r.expired ? "Yes" : "—"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className='d-flex flex-wrap align-items-center justify-content-between gap-12 mt-20'>
                <span className='text-secondary-light text-sm'>{sorted.length} records</span>
                <div className='d-flex flex-wrap align-items-center gap-12'>
                  <div className='d-flex align-items-center gap-8'>
                    <select
                      className='form-select form-select-sm radius-8 h-40-px'
                      style={{ width: 72 }}
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      aria-label='Rows per page'
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <span className='text-secondary-light text-sm text-nowrap'>per page</span>
                  </div>
                  <div className='d-flex align-items-center gap-8'>
                    <button
                      type='button'
                      className='btn btn-light border radius-8 h-40-px px-10'
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, Math.min(totalPages, p) - 1))}
                      aria-label='Previous page'
                    >
                      <Icon icon='mdi:chevron-left' className='text-xl' />
                    </button>
                    <span className='text-sm text-secondary-light text-nowrap px-6'>
                      {safePage} / {totalPages}
                    </span>
                    <button
                      type='button'
                      className='btn btn-light border radius-8 h-40-px px-10'
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, Math.max(1, p) + 1))}
                      aria-label='Next page'
                    >
                      <Icon icon='mdi:chevron-right' className='text-xl' />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon }) {
  return (
    <div className='col-sm-6 col-xl-3'>
      <div className='radius-12 p-20 bg-base border h-100' style={{ borderColor: "var(--neutral-200, #e5e7eb)" }}>
        <div className='d-flex align-items-center justify-content-between gap-12'>
          <div>
            <div className='text-secondary-light text-sm mb-6'>{label}</div>
            <div className='h5 fw-bold mb-0 text-primary-light'>{value}</div>
          </div>
          <span className='w-44-px h-44-px radius-10 d-flex align-items-center justify-content-center bg-neutral-100 text-secondary-light flex-shrink-0'>
            <Icon icon={icon} className='text-xl' />
          </span>
        </div>
      </div>
    </div>
  );
}

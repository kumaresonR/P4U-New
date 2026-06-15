import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { listCashSettlements, listOrders, listVendors } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "settled", label: "Settled" },
  { value: "hold", label: "On hold" },
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
  start.setDate(start.getDate() - 90);
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

const SETTLED = new Set(["completed", "settled", "paid", "success", "done", "processed"]);
const PENDING = new Set(["pending", "processing", "created", "in_progress"]);
const ON_HOLD = new Set(["on_hold", "hold", "paused", "frozen"]);

function settlementBucket(status) {
  const s = String(status || "")
    .toLowerCase()
    .trim();
  if (SETTLED.has(s)) return "settled";
  if (ON_HOLD.has(s)) return "hold";
  return "pending";
}

function formatMoney(n) {
  const x = Number(n) || 0;
  return `₹${x.toLocaleString("en-IN", { minimumFractionDigits: x % 1 ? 1 : 0, maximumFractionDigits: 2 })}`;
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

function settlementDisplayId(row) {
  const meta = parseMeta(row.metadata);
  if (meta.settlementRef && String(meta.settlementRef).trim()) return String(meta.settlementRef).trim();
  const raw = String(row.id || "").replace(/-/g, "");
  return `SET-${raw.slice(0, 8).toUpperCase()}`;
}

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

async function fetchAllCashSettlements() {
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && all.length < MAX_ROWS) {
    const res = await listCashSettlements({ limit: FETCH_LIMIT, offset });
    const items = res.items || [];
    all.push(...items);
    total = typeof res.total === "number" ? res.total : all.length;
    offset += items.length;
    if (items.length === 0) break;
  }
  return all;
}

async function fetchAllOrders() {
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && all.length < MAX_ROWS) {
    const res = await listOrders({ limit: FETCH_LIMIT, offset });
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

function statusPill(status) {
  const b = settlementBucket(status);
  if (b === "settled") return { cls: "bg-success-100 text-success-700", label: "settled" };
  if (b === "hold") return { cls: "bg-warning-100 text-warning-700", label: "on hold" };
  return { cls: "bg-info-100 text-info-700", label: String(status || "pending").toLowerCase() };
}

export default function SettlementReportLayer() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [orderRefById, setOrderRefById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [settlements, vProd, vSvc, orders] = await Promise.all([
        fetchAllCashSettlements(),
        listVendors({ limit: 200, offset: 0, vendorKind: "product" }).then((r) => r.items || []),
        listVendors({ limit: 200, offset: 0, vendorKind: "service" }).then((r) => r.items || []),
        fetchAllOrders(),
      ]);
      setRows(settlements);
      setVendors([...vProd, ...vSvc]);
      const m = {};
      orders.forEach((o) => {
        if (o?.id) m[o.id] = o.orderRef || o.id;
      });
      setOrderRefById(m);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach((v) => {
      m[v.id] = v.businessName || v.ownerName || "—";
    });
    return m;
  }, [vendors]);

  const { start: rangeStart, end: rangeEnd } = useMemo(() => localDayBounds(fromDate, toDate), [fromDate, toDate]);

  const enriched = useMemo(() => {
    return rows.map((row) => {
      const meta = parseMeta(row.metadata);
      const orderAmount = Number(meta.orderAmount ?? meta.orderTotal ?? meta.grandTotal ?? meta.totalOrderValue ?? 0);
      const commission = Number(meta.commission ?? meta.commissionAmount ?? meta.platformCommission ?? meta.platformFee ?? 0);
      const netPayout = Number(meta.netPayout ?? meta.vendorPayout ?? meta.payoutAmount ?? row.amount ?? 0);
      const settledOn = meta.settledAt ?? meta.settledOn ?? meta.paidAt ?? null;
      const bucket = settlementBucket(row.status);
      const orderRef = meta.orderRef ?? meta.orderReference ?? (row.orderId ? orderRefById[row.orderId] : null) ?? row.orderId ?? "—";
      return {
        row,
        meta,
        settlementId: settlementDisplayId(row),
        createdAt: row.createdAt,
        vendorName: meta.vendorName || vendorMap[row.vendorId] || "—",
        orderRef: orderRef || "—",
        orderAmount,
        commission,
        netPayout,
        settledOn,
        status: row.status,
        bucket,
      };
    });
  }, [rows, vendorMap, orderRefById]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      const created = new Date(r.createdAt);
      if (isNaN(created.getTime())) return false;
      if (rangeStart && created < rangeStart) return false;
      if (rangeEnd && created > rangeEnd) return false;

      if (statusFilter === "pending" && r.bucket !== "pending") return false;
      if (statusFilter === "settled" && r.bucket !== "settled") return false;
      if (statusFilter === "hold" && r.bucket !== "hold") return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const sid = r.settlementId.toLowerCase();
        const oid = String(r.row.orderId || "").toLowerCase();
        const oref = String(r.orderRef || "").toLowerCase();
        const vname = String(r.vendorName || "").toLowerCase();
        return sid.includes(q) || oid.includes(q) || oref.includes(q) || vname.includes(q);
      }
      return true;
    });
  }, [enriched, rangeStart, rangeEnd, statusFilter, search]);

  const kpis = useMemo(() => {
    let totalSettled = 0;
    let pending = 0;
    let commission = 0;
    let onHold = 0;
    filtered.forEach((r) => {
      commission += r.commission;
      const amt = r.netPayout;
      if (r.bucket === "settled") totalSettled += amt;
      else if (r.bucket === "hold") onHold += amt;
      else pending += amt;
    });
    return { totalSettled, pending, commission, onHold };
  }, [filtered]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...filtered];
    const cmp = (a, b) => {
      switch (key) {
        case "settlementId":
          return mul * String(a.settlementId).localeCompare(String(b.settlementId));
        case "createdAt":
          return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "vendor":
          return mul * String(a.vendorName).localeCompare(String(b.vendorName));
        case "orderRef":
          return mul * String(a.orderRef).localeCompare(String(b.orderRef));
        case "orderAmount":
          return mul * (a.orderAmount - b.orderAmount);
        case "commission":
          return mul * (a.commission - b.commission);
        case "netPayout":
          return mul * (a.netPayout - b.netPayout);
        case "settledOn": {
          const ta = a.settledOn ? new Date(a.settledOn).getTime() : 0;
          const tb = b.settledOn ? new Date(b.settledOn).getTime() : 0;
          return mul * (ta - tb);
        }
        case "status":
          return mul * String(a.status).localeCompare(String(b.status));
        default:
          return 0;
      }
    };
    arr.sort(cmp);
    return arr;
  }, [filtered, sort]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, fromDate, toDate, pageSize, sort.key, sort.dir]);

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
      "Settlement ID",
      "Date",
      "Vendor",
      "Order ID",
      "Order Amount (₹)",
      "Commission (₹)",
      "Net Payout (₹)",
      "Settled On",
      "Status",
    ];
    const lines = sorted.map((r) => [
      r.settlementId,
      formatTs(r.createdAt),
      r.vendorName,
      r.orderRef,
      r.orderAmount,
      r.commission,
      r.netPayout,
      r.settledOn ? formatTs(r.settledOn) : "",
      r.status,
    ]);
    const csv = toCsv([header, ...lines]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settlement-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className='row g-16 mb-24'>
        <KpiCard label='Total Settled' value={formatMoney(kpis.totalSettled)} icon='mdi:check-circle-outline' />
        <KpiCard label='Pending' value={formatMoney(kpis.pending)} icon='mdi:clock-outline' />
        <KpiCard label='Total Commission' value={formatMoney(kpis.commission)} icon='mdi:currency-inr' />
        <KpiCard label='On Hold' value={formatMoney(kpis.onHold)} icon='mdi:alert-outline' />
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
                placeholder='Search by vendor, order ID, settlement ID…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete='off'
              />
            </div>
            <div className='d-flex flex-wrap align-items-center gap-10 ms-xl-auto'>
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='sr-from'>
                From
              </label>
              <input
                id='sr-from'
                type='date'
                className='form-control h-40-px radius-8'
                style={{ width: 158, minWidth: 140 }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='sr-to'>
                To
              </label>
              <input
                id='sr-to'
                type='date'
                className='form-control h-40-px radius-8'
                style={{ width: 158, minWidth: 140 }}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              <select
                className='form-select h-40-px radius-8'
                style={{ width: 140, minWidth: 120 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label='Settlement status'
              >
                {STATUS_OPTIONS.map((s) => (
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
            <p className='text-secondary-light mb-0'>Loading settlements…</p>
          ) : (
            <>
              <div className='table-responsive scroll-sm' style={{ overflowX: "auto" }}>
                <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle' style={{ minWidth: 1040 }}>
                  <thead>
                    <tr>
                      <SortTh label='SETTLEMENT ID' sortKey='settlementId' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='DATE' sortKey='createdAt' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='VENDOR' sortKey='vendor' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='ORDER ID' sortKey='orderRef' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='ORDER AMOUNT (₹)' sortKey='orderAmount' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='COMMISSION (₹)' sortKey='commission' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='NET PAYOUT (₹)' sortKey='netPayout' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='SETTLED ON' sortKey='settledOn' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='STATUS' sortKey='status' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {pageSlice.length === 0 ? (
                      <tr>
                        <td colSpan='9' className='text-center py-40 text-secondary-light'>
                          No records found
                        </td>
                      </tr>
                    ) : (
                      pageSlice.map((r) => {
                        const pill = statusPill(r.status);
                        return (
                          <tr key={r.row.id}>
                            <td className='fw-semibold'>{r.settlementId}</td>
                            <td>{formatTs(r.createdAt)}</td>
                            <td>{r.vendorName}</td>
                            <td>{r.orderRef}</td>
                            <td>{formatMoney(r.orderAmount)}</td>
                            <td>{formatMoney(r.commission)}</td>
                            <td className='fw-semibold'>{formatMoney(r.netPayout)}</td>
                            <td>{r.settledOn ? formatTs(r.settledOn) : "—"}</td>
                            <td>
                              <span className={`px-12 py-4 radius-pill text-xs fw-medium text-capitalize ${pill.cls}`}>{pill.label}</span>
                            </td>
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

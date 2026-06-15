import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { listCustomerReferrals } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
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

function formatDateShort(d) {
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

async function fetchAllReferrals() {
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && all.length < MAX_ROWS) {
    const res = await listCustomerReferrals({ limit: FETCH_LIMIT, offset });
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
  const s = String(status || "").toLowerCase();
  if (s === "active") return { cls: "bg-success-50 text-success-700", label: "active" };
  if (s === "completed") return { cls: "bg-neutral-200 text-secondary-light", label: "completed" };
  if (s === "pending") return { cls: "bg-warning-50 text-warning-700", label: "pending" };
  return { cls: "bg-neutral-100 text-secondary-light", label: s || "—" };
}

export default function ReferralReportLayer() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [rows, setRows] = useState([]);
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
      const all = await fetchAllReferrals();
      setRows(all);
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

  const { start: rangeStart, end: rangeEnd } = useMemo(() => localDayBounds(fromDate, toDate), [fromDate, toDate]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const created = new Date(r.createdAt);
      if (isNaN(created.getTime())) return false;
      if (rangeStart && created < rangeStart) return false;
      if (rangeEnd && created > rangeEnd) return false;
      if (statusFilter && String(r.status || "").toLowerCase() !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          String(r.referredName || "").toLowerCase().includes(q) ||
          String(r.referredEmail || "").toLowerCase().includes(q) ||
          String(r.referredPhone || "").toLowerCase().includes(q) ||
          String(r.referralCode || "").toLowerCase().includes(q) ||
          String(r.ownCode || "").toLowerCase().includes(q) ||
          String(r.referredCustomerDisplayId || "").toLowerCase().includes(q) ||
          String(r.referrerName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, rangeStart, rangeEnd, statusFilter, search]);

  const kpis = useMemo(() => {
    const totalReferrals = filtered.length;
    const activeReferred = filtered.filter((r) => String(r.referredStatus || "").toLowerCase() === "active").length;
    const referrerSet = new Set(filtered.map((r) => r.referrerCustomerId).filter(Boolean));
    const uniqueReferrers = referrerSet.size;
    const avgPerReferrer = uniqueReferrers > 0 ? (totalReferrals / uniqueReferrers).toFixed(1) : "0";
    return { totalReferrals, activeReferred, uniqueReferrers, avgPerReferrer };
  }, [filtered]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...filtered];
    const cmp = (a, b) => {
      switch (key) {
        case "createdAt":
          return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "referredName":
          return mul * String(a.referredName).localeCompare(String(b.referredName));
        case "referredCustomerDisplayId":
          return mul * String(a.referredCustomerDisplayId).localeCompare(String(b.referredCustomerDisplayId));
        case "referralCode":
          return mul * String(a.referralCode).localeCompare(String(b.referralCode));
        case "walletPoints":
          return mul * (Number(a.walletPoints) - Number(b.walletPoints));
        case "rewardPointsEarned":
          return mul * (Number(a.rewardPointsEarned) - Number(b.rewardPointsEarned));
        case "referredJoinedAt": {
          const ta = a.referredJoinedAt ? new Date(a.referredJoinedAt).getTime() : 0;
          const tb = b.referredJoinedAt ? new Date(b.referredJoinedAt).getTime() : 0;
          return mul * (ta - tb);
        }
        case "referredStatus":
          return mul * String(a.referredStatus).localeCompare(String(b.referredStatus));
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
      "Referral date",
      "Customer ID",
      "Referred user",
      "Email",
      "Mobile",
      "Referral code used",
      "Own code",
      "Wallet points",
      "Referrer reward (pts)",
      "Referrer",
      "Joined on",
      "Status",
    ];
    const lines = sorted.map((r) => [
      formatDateShort(r.createdAt),
      r.referredCustomerDisplayId,
      r.referredName,
      r.referredEmail,
      r.referredPhone,
      r.referralCode,
      r.ownCode,
      r.walletPoints,
      r.rewardPointsEarned,
      r.referrerName,
      formatDateShort(r.referredJoinedAt),
      r.referredStatus,
    ]);
    const csv = toCsv([header, ...lines]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referral-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className='row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-16 mb-24'>
        <div className='col'>
          <KpiCard label='Total Referrals' value={kpis.totalReferrals.toLocaleString("en-IN")} icon='mdi:gift-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Active Referred' value={kpis.activeReferred.toLocaleString("en-IN")} icon='mdi:check-decagram-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Unique Referrers' value={kpis.uniqueReferrers.toLocaleString("en-IN")} icon='mdi:account-multiple-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Avg per Referrer' value={kpis.avgPerReferrer} icon='mdi:chart-timeline-variant' />
        </div>
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
                placeholder='Search by name, email, referral code…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete='off'
              />
            </div>
            <div className='d-flex flex-wrap align-items-center gap-10 ms-xl-auto'>
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='rr-from'>
                From
              </label>
              <input
                id='rr-from'
                type='date'
                className='form-control h-40-px radius-8'
                style={{ width: 158, minWidth: 140 }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='rr-to'>
                To
              </label>
              <input
                id='rr-to'
                type='date'
                className='form-control h-40-px radius-8'
                style={{ width: 158, minWidth: 140 }}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              <select
                className='form-select h-40-px radius-8'
                style={{ minWidth: 160, maxWidth: 200 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label='Referral row status'
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
            <p className='text-secondary-light mb-0'>Loading referrals…</p>
          ) : (
            <>
              <div className='table-responsive scroll-sm' style={{ overflowX: "auto" }}>
                <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle' style={{ minWidth: 1100 }}>
                  <thead>
                    <tr>
                      <SortTh label='DATE' sortKey='createdAt' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='CUSTOMER ID' sortKey='referredCustomerDisplayId' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='REFERRED USER' sortKey='referredName' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <th>EMAIL</th>
                      <th>MOBILE</th>
                      <SortTh label='CODE USED' sortKey='referralCode' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <th>OWN CODE</th>
                      <SortTh label='WALLET PTS' sortKey='walletPoints' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='REFERRER REWARD' sortKey='rewardPointsEarned' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <th>REFERRER</th>
                      <SortTh label='JOINED ON' sortKey='referredJoinedAt' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='STATUS' sortKey='referredStatus' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {pageSlice.length === 0 ? (
                      <tr>
                        <td colSpan='12' className='text-center py-40 text-secondary-light'>
                          No referral rows in this period.
                        </td>
                      </tr>
                    ) : (
                      pageSlice.map((r) => {
                        const pill = statusPill(r.referredStatus);
                        return (
                          <tr key={r.id}>
                            <td>{formatDateShort(r.createdAt)}</td>
                            <td className='fw-semibold'>{r.referredCustomerDisplayId}</td>
                            <td>{r.referredName}</td>
                            <td>{r.referredEmail || "—"}</td>
                            <td>{r.referredPhone || "—"}</td>
                            <td>{r.referralCode}</td>
                            <td>{r.ownCode}</td>
                            <td>{Number(r.walletPoints || 0).toLocaleString("en-IN")}</td>
                            <td className='fw-semibold text-success-600'>+{Number(r.rewardPointsEarned || 0).toLocaleString("en-IN")}</td>
                            <td>
                              <div className='text-xs text-secondary-light'>{r.referrerDisplayId}</div>
                              <div className='fw-medium'>{r.referrerName}</div>
                            </td>
                            <td>{formatDateShort(r.referredJoinedAt)}</td>
                            <td>
                              <span className={`px-12 py-4 radius-pill text-xs fw-medium ${pill.cls}`}>{pill.label}</span>
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
  );
}

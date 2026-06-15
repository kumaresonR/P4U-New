import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { listCustomers, listOccupations } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
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

function profileCompleteness(c, meta) {
  let n = 0;
  const add = (ok, w) => {
    if (ok) n += w;
  };
  const addr = meta.addressJson || meta.address || {};
  add(Boolean(c?.fullName?.trim()), 18);
  add(Boolean(c?.email?.trim()), 18);
  add(Boolean(c?.phone?.trim()), 18);
  add(Boolean(c?.occupationId) || Boolean(meta?.occupation), 12);
  add(Boolean(c?.status), 8);
  add(Boolean(addr?.city || addr?.address || addr?.line1), 14);
  add(Boolean(meta?.referralCode), 6);
  add(Boolean(meta?.wallet != null || meta?.walletBalance != null), 6);
  return Math.min(100, Math.round(n));
}

function customerDisplayId(c) {
  const hex = String(c.id || "").replace(/-/g, "");
  return `CUST-${hex.slice(0, 8).toUpperCase()}`;
}

function formatJoined(d) {
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

async function fetchAllCustomers() {
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && all.length < MAX_ROWS) {
    const res = await listCustomers({ limit: FETCH_LIMIT, offset });
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
  if (s === "active") return { cls: "bg-success-100 text-success-700", label: "active" };
  if (s === "inactive") return { cls: "bg-neutral-200 text-secondary-light", label: "inactive" };
  if (s === "suspended") return { cls: "bg-warning-100 text-warning-700", label: "suspended" };
  return { cls: "bg-neutral-200 text-secondary-light", label: s || "—" };
}

function kycPill(kyc) {
  const k = String(kyc || "not_started").toLowerCase();
  return { cls: "bg-neutral-200 text-secondary-light", label: k.replace(/_/g, " ") };
}

export default function CustomerReportLayer() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [customers, setCustomers] = useState([]);
  const [occupationMap, setOccupationMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [sort, setSort] = useState({ key: "fullName", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    listOccupations({ purpose: "all" })
      .then((res) => {
        const om = {};
        (res.items || []).forEach((o) => {
          om[o.id] = o.name;
        });
        setOccupationMap(om);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const all = await fetchAllCustomers();
      setCustomers(all);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { start: rangeStart, end: rangeEnd } = useMemo(() => localDayBounds(fromDate, toDate), [fromDate, toDate]);

  const enriched = useMemo(() => {
    return customers.map((c) => {
      const meta = parseMeta(c.metadata);
      const wallet = Number(meta.wallet ?? meta.walletBalance ?? 0) || 0;
      const referral = meta.referralCode || meta.referral_code || "";
      const profilePct = profileCompleteness(c, meta);
      const kyc = meta.kycStatus || meta.kyc_status || "not_started";
      const occupation =
        (c.occupationId && occupationMap[c.occupationId]) || (meta.occupation ? String(meta.occupation) : null);
      return {
        raw: c,
        custId: customerDisplayId(c),
        fullName: c.fullName || "—",
        email: c.email || "—",
        phone: c.phone || "—",
        occupation: occupation || "—",
        walletPoints: wallet,
        referralCode: referral || "—",
        profilePct,
        kyc,
        registeredOn: c.createdAt,
        status: c.status || "—",
      };
    });
  }, [customers, occupationMap]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      const created = new Date(r.registeredOn);
      if (isNaN(created.getTime())) return false;
      if (rangeStart && created < rangeStart) return false;
      if (rangeEnd && created > rangeEnd) return false;

      const st = String(r.raw.status || "").toLowerCase();
      if (st === "deleted") return false;
      if (statusFilter && st !== statusFilter.toLowerCase()) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          r.custId.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          String(r.referralCode).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enriched, rangeStart, rangeEnd, statusFilter, search]);

  const kpis = useMemo(() => {
    let active = 0;
    let walletSum = 0;
    let kycVerified = 0;
    filtered.forEach((r) => {
      walletSum += r.walletPoints;
      if (String(r.raw.status || "").toLowerCase() === "active") active++;
      const k = String(r.kyc || "").toLowerCase();
      if (k === "verified" || k === "approved") kycVerified++;
    });
    return {
      total: filtered.length,
      active,
      walletSum,
      kycVerified,
    };
  }, [filtered]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...filtered];
    const cmp = (a, b) => {
      switch (key) {
        case "custId":
          return mul * String(a.custId).localeCompare(String(b.custId));
        case "fullName":
          return mul * String(a.fullName).localeCompare(String(b.fullName));
        case "email":
          return mul * String(a.email).localeCompare(String(b.email));
        case "phone":
          return mul * String(a.phone).localeCompare(String(b.phone));
        case "occupation":
          return mul * String(a.occupation).localeCompare(String(b.occupation));
        case "walletPoints":
          return mul * (a.walletPoints - b.walletPoints);
        case "referralCode":
          return mul * String(a.referralCode).localeCompare(String(b.referralCode));
        case "profilePct":
          return mul * (a.profilePct - b.profilePct);
        case "kyc":
          return mul * String(a.kyc).localeCompare(String(b.kyc));
        case "registeredOn":
          return mul * (new Date(a.registeredOn).getTime() - new Date(b.registeredOn).getTime());
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
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "fullName" ? "asc" : "desc" },
    );
  };

  const exportCsv = () => {
    const header = [
      "Customer ID",
      "Name",
      "Email",
      "Mobile",
      "Occupation",
      "Wallet Points",
      "Referral Code",
      "Profile %",
      "KYC",
      "Registered On",
      "Status",
    ];
    const lines = sorted.map((r) => [
      r.custId,
      r.fullName,
      r.email,
      r.phone,
      r.occupation,
      r.walletPoints,
      r.referralCode,
      `${r.profilePct}%`,
      r.kyc,
      formatJoined(r.registeredOn),
      r.status,
    ]);
    const csv = toCsv([header, ...lines]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <p className='text-secondary-light text-lg mb-20'>
        {kpis.total} customers in selected period
      </p>

      <div className='row g-16 mb-24'>
        <KpiCard label='Total Customers' value={kpis.total.toLocaleString("en-IN")} icon='mdi:account-outline' />
        <KpiCard label='Active' value={kpis.active.toLocaleString("en-IN")} icon='mdi:account-plus-outline' />
        <KpiCard label='Total Wallet Points' value={kpis.walletSum.toLocaleString("en-IN")} icon='mdi:wallet-outline' />
        <KpiCard label='KYC Verified' value={kpis.kycVerified.toLocaleString("en-IN")} icon='mdi:chart-timeline-variant' />
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
                placeholder='Search by name, email, mobile, referral code…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete='off'
              />
            </div>
            <div className='d-flex flex-wrap align-items-center gap-10 ms-xl-auto'>
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='cr-from'>
                From
              </label>
              <input
                id='cr-from'
                type='date'
                className='form-control h-40-px radius-8'
                style={{ width: 158, minWidth: 140 }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='cr-to'>
                To
              </label>
              <input
                id='cr-to'
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
                aria-label='Customer status'
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
            <p className='text-secondary-light mb-0'>Loading customers…</p>
          ) : (
            <>
              <div className='table-responsive scroll-sm' style={{ overflowX: "auto" }}>
                <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle' style={{ minWidth: 1180 }}>
                  <thead>
                    <tr>
                      <SortTh label='CUSTOMER ID' sortKey='custId' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='NAME' sortKey='fullName' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='EMAIL' sortKey='email' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='MOBILE' sortKey='phone' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='OCCUPATION' sortKey='occupation' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='WALLET POINTS' sortKey='walletPoints' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='REFERRAL CODE' sortKey='referralCode' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='PROFILE %' sortKey='profilePct' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='KYC' sortKey='kyc' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='REGISTERED ON' sortKey='registeredOn' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='STATUS' sortKey='status' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {pageSlice.length === 0 ? (
                      <tr>
                        <td colSpan='11' className='text-center py-40 text-secondary-light'>
                          No customers in this period.
                        </td>
                      </tr>
                    ) : (
                      pageSlice.map((r) => {
                        const sp = statusPill(r.status);
                        const kp = kycPill(r.kyc);
                        return (
                          <tr key={r.raw.id}>
                            <td className='fw-semibold'>{r.custId}</td>
                            <td className='fw-medium'>{r.fullName}</td>
                            <td>{r.email}</td>
                            <td>{r.phone}</td>
                            <td>{r.occupation}</td>
                            <td>{r.walletPoints.toLocaleString("en-IN")}</td>
                            <td>{r.referralCode}</td>
                            <td>{r.profilePct}%</td>
                            <td>
                              <span className={`px-12 py-4 radius-pill text-xs fw-medium ${kp.cls}`}>{kp.label}</span>
                            </td>
                            <td>{formatJoined(r.registeredOn)}</td>
                            <td>
                              <span className={`px-12 py-4 radius-pill text-xs fw-medium text-capitalize ${sp.cls}`}>{sp.label}</span>
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

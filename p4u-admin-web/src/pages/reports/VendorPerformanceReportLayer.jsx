import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import { deleteVendor, listOrders, listVendors } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "deactivated", label: "Deactivated" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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

function normalizeVendorTabStatus(v) {
  const s = String(v?.status || "").trim().toLowerCase();
  if (!s) return "pending";
  if (s === "active") return "verified";
  if (s === "pending" || s === "not_verified") return "pending";
  if (s === "rejected") return "rejected";
  if (s === "suspended") return "deactivated";
  if (s.includes("delete")) return "deleted";
  if (s.includes("reject")) return "rejected";
  if (s.includes("suspend") || s.includes("deactive")) return "deactivated";
  return "pending";
}

function formatMoney(n) {
  const x = Number(n) || 0;
  return `₹${x.toLocaleString("en-IN", { minimumFractionDigits: x % 1 ? 1 : 0, maximumFractionDigits: 2 })}`;
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

const VENDOR_PAGE = 200;
const MAX_VENDORS = 2000;
const ORDER_PAGE = 200;
const MAX_ORDERS = 4000;

async function fetchAllProductVendors() {
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && all.length < MAX_VENDORS) {
    const res = await listVendors({ limit: VENDOR_PAGE, offset, vendorKind: "product" });
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
  while (offset < total && all.length < MAX_ORDERS) {
    const res = await listOrders({ limit: ORDER_PAGE, offset });
    const items = res.items || [];
    all.push(...items);
    total = typeof res.total === "number" ? res.total : all.length;
    offset += items.length;
    if (items.length === 0) break;
  }
  return all;
}

function SortTh({ label, sortKey, activeKey, dir, onSort, className = "" }) {
  const active = activeKey === sortKey;
  return (
    <th className={`cursor-pointer user-select-none ${className}`} onClick={() => onSort(sortKey)} title='Sort'>
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

export default function VendorPerformanceReportLayer() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [sort, setSort] = useState({ key: "businessName", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [v, o] = await Promise.all([fetchAllProductVendors(), fetchAllOrders()]);
      setVendors(v);
      setOrders(o);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setVendors([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { start: rangeStart, end: rangeEnd } = useMemo(() => localDayBounds(fromDate, toDate), [fromDate, toDate]);

  const ordersInRange = useMemo(() => {
    return orders.filter((o) => {
      const created = new Date(o.createdAt);
      if (isNaN(created.getTime())) return false;
      if (rangeStart && created < rangeStart) return false;
      if (rangeEnd && created > rangeEnd) return false;
      return true;
    });
  }, [orders, rangeStart, rangeEnd]);

  const statsByVendor = useMemo(() => {
    const m = new Map();
    ordersInRange.forEach((o) => {
      const vid = o.vendorId;
      if (!vid) return;
      const cur = m.get(vid) || { orderCount: 0, revenue: 0 };
      cur.orderCount += 1;
      cur.revenue += Number(o.totalAmount || 0);
      m.set(vid, cur);
    });
    return m;
  }, [ordersInRange]);

  const globalOrderCount = ordersInRange.length;
  const globalRevenue = useMemo(() => ordersInRange.reduce((s, o) => s + Number(o.totalAmount || 0), 0), [ordersInRange]);

  const vendorRows = useMemo(() => {
    return vendors.map((v) => ({ ...v, __status: normalizeVendorTabStatus(v) }));
  }, [vendors]);

  const filtered = useMemo(() => {
    return vendorRows.filter((v) => {
      if (statusFilter && v.__status !== statusFilter) return false;
      if (v.__status === "deleted") return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          (v.businessName || "").toLowerCase().includes(q) ||
          (v.ownerName || "").toLowerCase().includes(q) ||
          (v.email || "").toLowerCase().includes(q) ||
          (v.phone || "").includes(q) ||
          (v.vendorRef || "").toLowerCase().includes(q) ||
          String(v.id || "")
            .toLowerCase()
            .includes(q)
        );
      }
      return true;
    });
  }, [vendorRows, statusFilter, search]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...filtered];
    const st = (id) => statsByVendor.get(id) || { orderCount: 0, revenue: 0 };
    const cmp = (a, b) => {
      switch (key) {
        case "vendorRef":
          return mul * String(a.vendorRef || a.id).localeCompare(String(b.vendorRef || b.id));
        case "businessName":
          return mul * String(a.businessName || "").localeCompare(String(b.businessName || ""));
        case "ownerName":
          return mul * String(a.ownerName || "").localeCompare(String(b.ownerName || ""));
        case "email":
          return mul * String(a.email || "").localeCompare(String(b.email || ""));
        case "phone":
          return mul * String(a.phone || "").localeCompare(String(b.phone || ""));
        case "plan":
          return mul * String(a.membershipStatus || "").localeCompare(String(b.membershipStatus || ""));
        case "commission":
          return mul * (Number(a.commissionRate || 0) - Number(b.commissionRate || 0));
        case "orders":
          return mul * (st(a.id).orderCount - st(b.id).orderCount);
        case "revenue":
          return mul * (st(a.id).revenue - st(b.id).revenue);
        case "rating":
          return 0;
        case "joined":
          return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "status":
          return mul * String(a.kycStatus || "").localeCompare(String(b.kycStatus || ""));
        default:
          return 0;
      }
    };
    arr.sort(cmp);
    return arr;
  }, [filtered, sort, statsByVendor]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, fromDate, toDate, pageSize, sort.key, sort.dir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  const displayIndexStart = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const displayIndexEnd = Math.min(sorted.length, safePage * pageSize);

  const kpis = useMemo(() => {
    const n = filtered.length;
    return {
      totalVendors: n,
      revenue: globalRevenue,
      orders: globalOrderCount,
      avgRating: 0,
    };
  }, [filtered.length, globalRevenue, globalOrderCount]);

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "businessName" ? "asc" : "desc" },
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vendor? This cannot be undone.")) return;
    try {
      await deleteVendor(id);
      toast.success("Vendor deleted.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const exportCsv = () => {
    const header = [
      "Vendor ID",
      "Business Name",
      "Contact",
      "Email",
      "Mobile",
      "Plan",
      "Commission %",
      "Orders",
      "Revenue",
      "Rating",
      "Joined On",
      "KYC",
    ];
    const rows = sorted.map((v, i) => {
      const st = statsByVendor.get(v.id) || { orderCount: 0, revenue: 0 };
      return [
        v.vendorRef || `VEND${String(i + 1).padStart(7, "0")}`,
        v.businessName,
        v.ownerName,
        v.email,
        v.phone,
        v.membershipStatus || "No Plan",
        v.commissionRate != null ? `${v.commissionRate}%` : "0%",
        st.orderCount,
        st.revenue,
        "—",
        formatJoined(v.createdAt),
        v.kycStatus,
      ];
    });
    const csv = toCsv([header, ...rows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendor-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const vendorDisplayId = (v, sortedIndex) => {
    if (v.vendorRef && String(v.vendorRef).trim()) return String(v.vendorRef).trim();
    return `VEND${String(sortedIndex + 1).padStart(7, "0")}`;
  };

  const kycBadge = (v) => {
    const k = String(v.kycStatus || "").toLowerCase();
    if (k === "verified") {
      return <span className='px-12 py-4 radius-pill text-xs fw-medium bg-danger-50 text-danger-600'>verified</span>;
    }
    return <span className='px-12 py-4 radius-pill text-xs fw-medium bg-neutral-200 text-secondary-light'>{k || "—"}</span>;
  };

  return (
    <div>
      <p className='text-secondary-light mb-20'>{kpis.totalVendors} vendors</p>

      <div className='row g-16 mb-24'>
        <KpiCard label='Total Vendors' value={String(kpis.totalVendors)} icon='mdi:store-outline' />
        <KpiCard label='Total Revenue' value={formatMoney(kpis.revenue)} icon='mdi:currency-inr' />
        <KpiCard label='Total Orders' value={String(kpis.orders)} icon='mdi:cart-outline' />
        <KpiCard label='Avg Rating' value={`★ ${kpis.avgRating.toFixed(1)}`} icon='mdi:star-outline' />
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
                placeholder='Search by name, business, email…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete='off'
              />
            </div>
            <div className='d-flex flex-wrap align-items-center gap-10 ms-xl-auto'>
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='vp-from'>
                From
              </label>
              <input
                id='vp-from'
                type='date'
                className='form-control h-40-px radius-8'
                style={{ width: 158, minWidth: 140 }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                title='Orders from'
              />
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='vp-to'>
                To
              </label>
              <input
                id='vp-to'
                type='date'
                className='form-control h-40-px radius-8'
                style={{ width: 158, minWidth: 140 }}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                title='Orders to'
              />
              <select
                className='form-select h-40-px radius-8'
                style={{ width: 140, minWidth: 120 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label='Vendor status'
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
            <p className='text-secondary-light mb-0'>Loading vendors…</p>
          ) : (
            <>
              <div className='table-responsive scroll-sm' style={{ overflowX: "auto" }}>
                <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle' style={{ minWidth: 1100 }}>
                  <thead>
                    <tr>
                      <SortTh label='VENDOR ID' sortKey='vendorRef' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='BUSINESS NAME' sortKey='businessName' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='CONTACT NAME' sortKey='ownerName' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='EMAIL' sortKey='email' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='MOBILE' sortKey='phone' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='PLAN' sortKey='plan' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='COMMISSION %' sortKey='commission' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='ORDERS' sortKey='orders' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='REVENUE (₹)' sortKey='revenue' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='RATING' sortKey='rating' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='JOINED ON' sortKey='joined' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='STATUS' sortKey='status' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <th className='text-end'>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageSlice.length === 0 ? (
                      <tr>
                        <td colSpan='13' className='text-center py-40 text-secondary-light'>
                          No vendors match your filters.
                        </td>
                      </tr>
                    ) : (
                      pageSlice.map((v, i) => {
                        const st = statsByVendor.get(v.id) || { orderCount: 0, revenue: 0 };
                        const globalIdx = (safePage - 1) * pageSize + i;
                        return (
                          <tr key={v.id}>
                            <td className='fw-semibold'>{vendorDisplayId(v, globalIdx)}</td>
                            <td>{v.businessName || "—"}</td>
                            <td>{v.ownerName || "—"}</td>
                            <td>{v.email || "—"}</td>
                            <td>{v.phone || "—"}</td>
                            <td>{v.membershipStatus?.trim() ? v.membershipStatus : "No Plan"}</td>
                            <td>{v.commissionRate != null && v.commissionRate !== "" ? `${Number(v.commissionRate)}%` : "0%"}</td>
                            <td>{st.orderCount}</td>
                            <td>{formatMoney(st.revenue)}</td>
                            <td className='text-secondary-light'>—</td>
                            <td>{formatJoined(v.createdAt)}</td>
                            <td>{kycBadge(v)}</td>
                            <td className='text-end'>
                              <button
                                type='button'
                                className='btn btn-light border-0 rounded-circle d-inline-flex align-items-center justify-content-center text-danger-600'
                                style={{ width: 36, height: 36 }}
                                title='Delete vendor'
                                onClick={() => void handleDelete(v.id)}
                              >
                                <Icon icon='mdi:trash-can-outline' className='text-xl' />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className='d-flex flex-wrap align-items-center justify-content-between gap-12 mt-20'>
                <span className='text-secondary-light text-sm'>
                  {sorted.length === 0 ? "0" : `${displayIndexStart}-${displayIndexEnd}`} of {sorted.length}
                </span>
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

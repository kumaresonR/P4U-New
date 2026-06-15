import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  listClassifiedProducts,
  listClassifiedVendors,
  listClassifiedCategories,
  listClassifiedServices,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending review" },
  { value: "rejected", label: "Rejected" },
  { value: "inactive", label: "Inactive" },
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
  start.setMonth(start.getMonth() - 3);
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

function deriveListingStatus(row) {
  const meta = parseMeta(row.metadata);
  const raw = (meta.approvalStatus || meta.status || "").toString().trim().toLowerCase();
  if (raw === "pending" || raw === "approved" || raw === "rejected") return raw;
  if (row.isActive === false) return "inactive";
  return "approved";
}

function displayAdId(row) {
  const meta = parseMeta(row.metadata);
  if (meta.adId && String(meta.adId).trim()) return String(meta.adId).trim();
  if (meta.listingRef && String(meta.listingRef).trim()) return String(meta.listingRef).trim();
  const compact = String(row.id || "").replace(/-/g, "");
  return `CLA-${compact.slice(0, 8).toUpperCase()}`;
}

function formatPostedDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(n) {
  const x = Number(n) || 0;
  return `₹${x.toLocaleString("en-IN", { minimumFractionDigits: x % 1 ? 1 : 0, maximumFractionDigits: 2 })}`;
}

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

async function fetchAllClassifiedProducts() {
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && all.length < MAX_ROWS) {
    const res = await listClassifiedProducts({ purpose: "all", limit: FETCH_LIMIT, offset });
    const items = res.items || [];
    all.push(...items);
    total = typeof res.total === "number" ? res.total : all.length;
    offset += items.length;
    if (items.length === 0) break;
  }
  return all;
}

async function fetchLookupMaps() {
  const [vRes, cRes, sRes] = await Promise.all([
    listClassifiedVendors({ purpose: "all", limit: 200, offset: 0 }),
    listClassifiedCategories({ purpose: "all", limit: 200, offset: 0 }),
    listClassifiedServices({ purpose: "all", limit: 200, offset: 0 }),
  ]);
  const vendors = {};
  (vRes.items || []).forEach((v) => {
    vendors[v.id] = v;
  });
  const categories = {};
  (cRes.items || []).forEach((c) => {
    categories[c.id] = c;
  });
  const services = {};
  (sRes.items || []).forEach((s) => {
    services[s.id] = s;
  });
  return { vendors, categories, services };
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
  if (s === "approved") return { cls: "bg-neutral-200 text-secondary-light", label: "approved" };
  if (s === "pending") return { cls: "bg-warning-50 text-warning-700", label: "pending" };
  if (s === "rejected") return { cls: "bg-danger-50 text-danger-700", label: "rejected" };
  if (s === "inactive") return { cls: "bg-neutral-100 text-secondary-light", label: "inactive" };
  return { cls: "bg-neutral-100 text-secondary-light", label: s || "—" };
}

export default function ClassifiedAdsReportLayer() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [rawProducts, setRawProducts] = useState([]);
  const [vendors, setVendors] = useState({});
  const [categories, setCategories] = useState({});
  const [services, setServices] = useState({});
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
      const [products, maps] = await Promise.all([fetchAllClassifiedProducts(), fetchLookupMaps()]);
      setRawProducts(products);
      setVendors(maps.vendors);
      setCategories(maps.categories);
      setServices(maps.services);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setRawProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const enriched = useMemo(() => {
    return rawProducts.map((p) => {
      const meta = parseMeta(p.metadata);
      const vendor = p.vendorId ? vendors[p.vendorId] : null;
      const vmeta = vendor ? parseMeta(vendor.metadata) : {};
      const category = p.categoryId ? categories[p.categoryId] : null;
      const service = p.serviceId ? services[p.serviceId] : null;
      const status = deriveListingStatus(p);
      const city = (meta.city || meta.cityName || vmeta.city || "").toString() || "—";
      const area = (meta.area || meta.areaName || vmeta.area || "").toString() || "—";
      const pointsAwarded = Number(meta.pointsAwarded ?? meta.listingPoints ?? 0) || 0;
      const postedBy = vendor?.displayName ? "Vendor" : "—";
      const vendorLabel = vendor?.displayName || "—";
      return {
        raw: p,
        adId: displayAdId(p),
        createdAt: p.createdAt,
        title: p.name || "—",
        categoryName: category?.name || "—",
        serviceName: service?.name || "",
        city,
        area,
        price: Number(p.price ?? 0) || 0,
        postedBy,
        vendorLabel,
        status,
        pointsAwarded,
      };
    });
  }, [rawProducts, vendors, categories, services]);

  const { start: rangeStart, end: rangeEnd } = useMemo(() => localDayBounds(fromDate, toDate), [fromDate, toDate]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      const created = new Date(r.createdAt);
      if (isNaN(created.getTime())) return false;
      if (rangeStart && created < rangeStart) return false;
      if (rangeEnd && created > rangeEnd) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          r.title.toLowerCase().includes(q) ||
          r.categoryName.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.area.toLowerCase().includes(q) ||
          r.vendorLabel.toLowerCase().includes(q) ||
          r.adId.toLowerCase().includes(q) ||
          (r.serviceName && r.serviceName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [enriched, rangeStart, rangeEnd, statusFilter, search]);

  const kpis = useMemo(() => {
    let totalValue = 0;
    let active = 0;
    let pending = 0;
    let pointsSum = 0;
    filtered.forEach((r) => {
      totalValue += r.price;
      if (r.status === "approved") active += 1;
      if (r.status === "pending") pending += 1;
      pointsSum += r.pointsAwarded;
    });
    return {
      totalAds: filtered.length,
      activeAds: active,
      pendingReview: pending,
      totalListingValue: totalValue,
      totalPoints: pointsSum,
    };
  }, [filtered]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...filtered];
    const cmp = (a, b) => {
      switch (key) {
        case "adId":
          return mul * String(a.adId).localeCompare(String(b.adId));
        case "createdAt":
          return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "title":
          return mul * String(a.title).localeCompare(String(b.title));
        case "categoryName":
          return mul * String(a.categoryName).localeCompare(String(b.categoryName));
        case "city":
          return mul * String(a.city).localeCompare(String(b.city));
        case "area":
          return mul * String(a.area).localeCompare(String(b.area));
        case "price":
          return mul * (a.price - b.price);
        case "vendorLabel":
          return mul * String(a.vendorLabel).localeCompare(String(b.vendorLabel));
        case "status":
          return mul * String(a.status).localeCompare(String(b.status));
        case "pointsAwarded":
          return mul * (a.pointsAwarded - b.pointsAwarded);
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
      "Ad ID",
      "Posted On",
      "Title",
      "Category",
      "City",
      "Area",
      "Price (INR)",
      "Posted By",
      "Vendor",
      "Status",
      "Points Awarded",
    ];
    const lines = sorted.map((r) => [
      r.adId,
      formatPostedDate(r.createdAt),
      r.title,
      r.categoryName,
      r.city,
      r.area,
      r.price,
      r.postedBy,
      r.vendorLabel,
      r.status,
      r.pointsAwarded,
    ]);
    const csv = toCsv([header, ...lines]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `classified-ads-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className='row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-5 g-16 mb-24'>
        <div className='col'>
          <KpiCard label='Total Ads' value={kpis.totalAds.toLocaleString("en-IN")} icon='mdi:bullhorn-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Active Ads' value={kpis.activeAds.toLocaleString("en-IN")} icon='mdi:check-decagram-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Pending Review' value={kpis.pendingReview.toLocaleString("en-IN")} icon='mdi:clock-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Total Listing Value' value={formatMoney(kpis.totalListingValue)} icon='mdi:eye-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Points Awarded' value={kpis.totalPoints.toLocaleString("en-IN")} icon='mdi:star-circle-outline' />
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
                placeholder='Search by title, category, city, user…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete='off'
              />
            </div>
            <div className='d-flex flex-wrap align-items-center gap-10 ms-xl-auto'>
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='car-from'>
                From
              </label>
              <input
                id='car-from'
                type='date'
                className='form-control h-40-px radius-8'
                style={{ width: 158, minWidth: 140 }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='car-to'>
                To
              </label>
              <input
                id='car-to'
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
                aria-label='Listing status'
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
            <p className='text-secondary-light mb-0'>Loading classified listings…</p>
          ) : (
            <>
              <div className='table-responsive scroll-sm' style={{ overflowX: "auto" }}>
                <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle' style={{ minWidth: 1020 }}>
                  <thead>
                    <tr>
                      <SortTh label='AD ID' sortKey='adId' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='POSTED ON' sortKey='createdAt' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='TITLE' sortKey='title' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='CATEGORY' sortKey='categoryName' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='CITY' sortKey='city' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='AREA' sortKey='area' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='PRICE (₹)' sortKey='price' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='POSTED BY' sortKey='vendorLabel' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='STATUS' sortKey='status' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='POINTS' sortKey='pointsAwarded' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {pageSlice.length === 0 ? (
                      <tr>
                        <td colSpan='10' className='text-center py-40 text-secondary-light'>
                          No classified ads in this period.
                        </td>
                      </tr>
                    ) : (
                      pageSlice.map((r) => {
                        const pill = statusPill(r.status);
                        return (
                          <tr key={r.raw.id}>
                            <td className='fw-semibold'>{r.adId}</td>
                            <td>{formatPostedDate(r.createdAt)}</td>
                            <td style={{ maxWidth: 220 }} className='text-wrap'>
                              {r.title}
                            </td>
                            <td>{r.categoryName}</td>
                            <td>{r.city}</td>
                            <td>{r.area}</td>
                            <td>{formatMoney(r.price)}</td>
                            <td>
                              <span className='text-secondary-light text-xs'>{r.postedBy}</span>
                              <div className='fw-medium'>{r.vendorLabel}</div>
                            </td>
                            <td>
                              <span className={`px-12 py-4 radius-pill text-xs fw-medium ${pill.cls}`}>{pill.label}</span>
                            </td>
                            <td className='fw-semibold'>{r.pointsAwarded > 0 ? r.pointsAwarded.toLocaleString("en-IN") : "—"}</td>
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

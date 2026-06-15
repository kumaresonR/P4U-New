import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { listOrders, listVendors, getCustomer } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "placed", label: "Placed" },
  { value: "paid", label: "Paid" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In Progress" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const COMPLETED_STATUSES = new Set(["completed", "delivered"]);

/** Local calendar YYYY-MM-DD (avoids `toISOString` day shift in non-UTC zones). */
function toYmdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { from: toYmdLocal(start), to: toYmdLocal(end) };
}

/** Start of local calendar day for `YYYY-MM-DD`. */
function startOfLocalDay(ymd) {
  if (!ymd || typeof ymd !== "string") return null;
  const parts = ymd.split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, mo, d] = parts;
  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

/** End of local calendar day for `YYYY-MM-DD`. */
function endOfLocalDay(ymd) {
  if (!ymd || typeof ymd !== "string") return null;
  const parts = ymd.split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, mo, d] = parts;
  return new Date(y, mo - 1, d, 23, 59, 59, 999);
}

/** If user picks from > to, treat range as swapped so filters still work. */
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

function statusPill(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "delivered") return { cls: "bg-success-100 text-success-700", label: s === "delivered" ? "delivered" : "completed" };
  if (s === "cancelled" || s === "canceled") return { cls: "bg-danger-100 text-danger-700", label: "cancelled" };
  if (s === "paid") return { cls: "bg-info-100 text-info-700", label: "paid" };
  if (s === "accepted") return { cls: "bg-info-100 text-info-700", label: "accepted" };
  if (s === "in_progress") return { cls: "bg-warning-100 text-warning-700", label: "in progress" };
  return { cls: "bg-primary-50 text-primary-700", label: (status || "placed").toLowerCase().replace(/_/g, " ") };
}

function formatMoney(n) {
  const x = Number(n) || 0;
  return `₹${x.toLocaleString("en-IN", { minimumFractionDigits: x % 1 ? 1 : 0, maximumFractionDigits: 2 })}`;
}

function formatOrderDate(d) {
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

function lineItems(meta) {
  const r = meta.lines ?? meta.items ?? meta.lineItems ?? meta.orderItems;
  return Array.isArray(r) ? r : [];
}

function itemQtySum(meta) {
  const lines = lineItems(meta);
  if (!lines.length) return null;
  return lines.reduce((s, r) => s + Number(r.quantity || r.qty || 1), 0);
}

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

const PAGE = 200;
const MAX_ROWS = 4000;

async function fetchAllOrders() {
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && all.length < MAX_ROWS) {
    const res = await listOrders({ limit: PAGE, offset });
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

export default function SalesReportLayer() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [vendors, setVendors] = useState([]);
  const [customerById, setCustomerById] = useState({});
  const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });

  useEffect(() => {
    listVendors({ limit: 200, offset: 0 })
      .then((r) => setVendors(r.items || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const all = await fetchAllOrders();
      setOrders(all);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!orders.length) return;
    let cancelled = false;
    const ids = [...new Set(orders.map((o) => o.customerId).filter(Boolean))];
    setCustomerById((prev) => {
      const pending = ids.filter((id) => !(id in prev));
      if (!pending.length) return prev;
      Promise.all(
        pending.map((id) =>
          getCustomer(id)
            .then((c) => [id, c ? { fullName: c.fullName ?? c.full_name ?? "", phone: c.phone ?? "" } : null])
            .catch(() => [id, null]),
        ),
      ).then((pairs) => {
        if (cancelled) return;
        setCustomerById((p) => ({ ...p, ...Object.fromEntries(pairs) }));
      });
      return prev;
    });
    return () => {
      cancelled = true;
    };
  }, [orders]);

  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach((v) => {
      m[v.id] = v.businessName || v.ownerName || "Vendor";
    });
    return m;
  }, [vendors]);

  const filtered = useMemo(() => {
    const { start: rangeStart, end: rangeEnd } = localDayBounds(fromDate, toDate);
    return orders.filter((o) => {
      const s = String(o.status || "")
        .toLowerCase()
        .trim();
      if (statusFilter && s !== statusFilter.toLowerCase()) return false;

      const created = new Date(o.createdAt);
      if (isNaN(created.getTime())) return false;
      if (rangeStart && created < rangeStart) return false;
      if (rangeEnd && created > rangeEnd) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const m = parseMeta(o.metadata);
        const cached = o.customerId ? customerById[o.customerId] : null;
        const name = (m.customerName || m.customer_name || cached?.fullName || "").toLowerCase();
        const phone = String(m.customerPhone || m.customer_phone || cached?.phone || "");
        const pay = String(m.paymentRefId || m.paymentReferenceId || m.paymentRef || m.razorpayPaymentId || "").toLowerCase();
        const orderRef = String(o.orderRef || "").toLowerCase();
        const idStr = String(o.id || "").toLowerCase();
        const vendorName = (vendorMap[o.vendorId] || "").toLowerCase();
        const vendorId = String(o.vendorId || "").toLowerCase();
        return (
          orderRef.includes(q) ||
          idStr.includes(q) ||
          name.includes(q) ||
          phone.toLowerCase().includes(q) ||
          vendorName.includes(q) ||
          vendorId.includes(q) ||
          pay.includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, fromDate, toDate, search, customerById, vendorMap]);

  const rowModel = useMemo(() => {
    return filtered.map((o) => {
      const m = parseMeta(o.metadata);
      const cached = o.customerId ? customerById[o.customerId] : null;
      const customer = m.customerName || m.customer_name || cached?.fullName || "—";
      const vendor = vendorMap[o.vendorId] || "—";
      const iq = itemQtySum(m);
      const subtotal = Number(m.subtotal || m.itemMrp || 0) || 0;
      const tax = Number(m.taxAmount || m.tax || m.taxOnProduct || 0) || 0;
      const disc = Number(m.discount || m.totalDiscount || 0) || 0;
      const platformFee = Number(m.platformFee ?? 0) || 0;
      const gstPf = Number(m.gstOnPlatformFee ?? (platformFee ? platformFee * 0.18 : 0)) || 0;
      const points = Number(m.pointsRedeemed ?? m.pointsUsed ?? m.points ?? 0) || 0;
      const grand = Number(o.totalAmount || 0) || 0;
      const paymentRef = m.paymentRefId || m.paymentReferenceId || m.paymentRef || m.razorpayPaymentId || "—";
      return {
        order: o,
        meta: m,
        orderRef: o.orderRef || o.id,
        createdAt: o.createdAt,
        customer,
        vendor,
        items: iq,
        subtotal,
        discount: disc,
        tax,
        platformFee,
        gstPf,
        points,
        grand,
        paymentRef,
        status: o.status,
      };
    });
  }, [filtered, customerById, vendorMap]);

  const sortedRows = useMemo(() => {
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...rowModel];
    const cmp = (a, b) => {
      switch (key) {
        case "orderRef":
          return mul * String(a.orderRef).localeCompare(String(b.orderRef));
        case "createdAt":
          return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "customer":
          return mul * String(a.customer).localeCompare(String(b.customer));
        case "vendor":
          return mul * String(a.vendor).localeCompare(String(b.vendor));
        case "items":
          return mul * ((a.items ?? -1) - (b.items ?? -1));
        case "subtotal":
          return mul * (a.subtotal - b.subtotal);
        case "discount":
          return mul * (a.discount - b.discount);
        case "tax":
          return mul * (a.tax - b.tax);
        case "platformFee":
          return mul * (a.platformFee - b.platformFee);
        case "gstPf":
          return mul * (a.gstPf - b.gstPf);
        case "points":
          return mul * (a.points - b.points);
        case "grand":
          return mul * (a.grand - b.grand);
        case "paymentRef":
          return mul * String(a.paymentRef).localeCompare(String(b.paymentRef));
        case "status":
          return mul * String(a.status).localeCompare(String(b.status));
        default:
          return 0;
      }
    };
    arr.sort(cmp);
    return arr;
  }, [rowModel, sort]);

  const kpis = useMemo(() => {
    let revenue = 0;
    let completed = 0;
    filtered.forEach((o) => {
      revenue += Number(o.totalAmount || 0);
      if (COMPLETED_STATUSES.has((o.status || "").toLowerCase())) completed++;
    });
    const n = filtered.length;
    const avg = n ? revenue / n : 0;
    const completionPct = n ? (completed / n) * 100 : 0;
    return { revenue, n, avg, completionPct, completed };
  }, [filtered]);

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "createdAt" ? "desc" : "asc" },
    );
  };

  const exportCsv = () => {
    const header = [
      "Order ID",
      "Date",
      "Customer",
      "Vendor",
      "Items",
      "Subtotal (₹)",
      "Discount (₹)",
      "Tax (₹)",
      "Platform Fee (₹)",
      "GST on PF (₹)",
      "Points Used",
      "Grand Total (₹)",
      "Payment Ref",
      "Status",
    ];
    const rows = sortedRows.map((r) => [
      r.orderRef,
      formatOrderDate(r.createdAt),
      r.customer,
      r.vendor,
      r.items ?? "",
      r.subtotal,
      r.discount || "",
      r.tax,
      r.platformFee,
      r.gstPf,
      r.points || "",
      r.grand,
      r.paymentRef,
      r.status,
    ]);
    const csv = toCsv([header, ...rows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <p className='text-secondary-light mb-20'>
        {kpis.n} orders · {formatMoney(kpis.revenue)} revenue
      </p>

      <div className='row g-16 mb-24'>
        <KpiCard label='Total Revenue' value={formatMoney(kpis.revenue)} icon='mdi:currency-inr' />
        <KpiCard label='Total Orders' value={String(kpis.n)} icon='mdi:cart-outline' />
        <KpiCard label='Avg Order Value' value={kpis.n ? formatMoney(kpis.avg) : "₹0"} icon='mdi:trending-up' />
        <KpiCard label='Completion Rate' value={`${kpis.completionPct.toFixed(1)}%`} icon='mdi:percent-outline' />
      </div>

      <div className='card radius-12 p-0 mb-0'>
        <div className='card-body p-24'>
          <div className='d-flex flex-wrap align-items-center gap-12 mb-20 w-100'>
            <div className='input-group sales-report-search flex-grow-1' style={{ minWidth: 260, maxWidth: 560 }}>
              <span className='input-group-text bg-white border-end-0 h-40-px d-flex align-items-center'>
                <Icon icon='mdi:magnify' className='text-secondary-light' />
              </span>
              <input
                type='search'
                className='form-control border-start-0 h-40-px'
                placeholder='Search by order ID, customer, vendor…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete='off'
              />
            </div>
            <div className='d-flex flex-wrap align-items-center gap-10 ms-xl-auto'>
              <label className='d-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap d-none d-md-flex' htmlFor='sales-from-date'>
                From
              </label>
              <input
                id='sales-from-date'
                type='date'
                className='form-control h-40-px radius-8 sales-report-date'
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                title='From date'
              />
              <label className='d-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap d-none d-md-flex' htmlFor='sales-to-date'>
                To
              </label>
              <input
                id='sales-to-date'
                type='date'
                className='form-control h-40-px radius-8 sales-report-date'
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                title='To date'
              />
              <select
                className='form-select radius-8 h-40-px sales-report-status'
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label='Order status'
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
          <style>{`
            .sales-report-search { max-width: 100%; }
            .sales-report-date { width: 158px; min-width: 140px; }
            .sales-report-status { width: 132px; min-width: 120px; }
          `}</style>

          {error && (
            <div className='alert alert-danger radius-12 mb-16' role='alert'>
              {error}
            </div>
          )}

          {loading ? (
            <p className='text-secondary-light mb-0'>Loading sales data…</p>
          ) : (
            <div className='table-responsive scroll-sm' style={{ overflowX: "auto" }}>
              <table className='table bordered-table sm-table mb-0 text-nowrap' style={{ minWidth: 1320 }}>
                <thead>
                  <tr>
                    <SortTh label='ORDER ID' sortKey='orderRef' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='DATE' sortKey='createdAt' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='CUSTOMER' sortKey='customer' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='VENDOR' sortKey='vendor' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='ITEMS' sortKey='items' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='SUBTOTAL (₹)' sortKey='subtotal' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='DISCOUNT (₹)' sortKey='discount' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='TAX (₹)' sortKey='tax' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='PLATFORM FEE (₹)' sortKey='platformFee' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='GST ON PF (₹)' sortKey='gstPf' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='POINTS USED' sortKey='points' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='GRAND TOTAL (₹)' sortKey='grand' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='PAYMENT REF' sortKey='paymentRef' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    <SortTh label='STATUS' sortKey='status' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan='14' className='text-center py-40 text-secondary-light'>
                        No orders match your filters.
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((r) => {
                      const pill = statusPill(r.status);
                      return (
                        <tr key={r.order.id}>
                          <td className='fw-semibold'>{r.orderRef}</td>
                          <td>{formatOrderDate(r.createdAt)}</td>
                          <td>{r.customer}</td>
                          <td>{r.vendor}</td>
                          <td>{r.items != null ? r.items : "—"}</td>
                          <td>{formatMoney(r.subtotal)}</td>
                          <td>{r.discount > 0 ? formatMoney(r.discount) : "—"}</td>
                          <td>{formatMoney(r.tax)}</td>
                          <td>{formatMoney(r.platformFee)}</td>
                          <td>{formatMoney(r.gstPf)}</td>
                          <td>{r.points > 0 ? r.points : "—"}</td>
                          <td className='fw-semibold'>{formatMoney(r.grand)}</td>
                          <td className='text-xs' style={{ maxWidth: 140 }}>
                            {String(r.paymentRef).length > 24 ? `${String(r.paymentRef).slice(0, 22)}…` : r.paymentRef}
                          </td>
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
          )}

          {!loading && orders.length >= MAX_ROWS && (
            <p className='text-secondary-light text-sm mt-16 mb-0'>Loaded up to {MAX_ROWS} most recent orders. Narrow the date range or contact support for larger exports.</p>
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

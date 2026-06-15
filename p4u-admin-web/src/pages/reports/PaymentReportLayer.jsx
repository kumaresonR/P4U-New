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

const CANCELLED_STATUSES = new Set(["cancelled", "canceled", "failed", "payment_failed", "refunded"]);

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const FETCH_LIMIT = 200;
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
  start.setDate(start.getDate() - 30);
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

function paymentStatusPill(status) {
  const s = (status || "").toLowerCase();
  if (s === "cancelled" || s === "canceled" || s === "failed" || s === "payment_failed") {
    return { cls: "bg-danger-50 text-danger-700", label: s.replace(/_/g, " ") };
  }
  if (s === "completed" || s === "delivered") return { cls: "bg-success-50 text-success-700", label: s };
  if (s === "paid") return { cls: "bg-success-50 text-success-700", label: "paid" };
  return { cls: "bg-primary-50 text-primary-700", label: (status || "placed").toLowerCase().replace(/_/g, " ") };
}

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
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

function gatewayOrderIdFromMeta(m) {
  const v =
    m.razorpayOrderId ??
    m.razorpay_order_id ??
    m.gatewayOrderId ??
    m.providerOrderId ??
    m.providerRef ??
    m.orderProviderId ??
    "";
  const s = String(v).trim();
  return s || "—";
}

function paymentRefFromMeta(m) {
  const v =
    m.paymentRefId ??
    m.paymentReferenceId ??
    m.paymentRef ??
    m.razorpayPaymentId ??
    m.razorpay_payment_id ??
    "";
  const s = String(v).trim();
  return s || "—";
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

export default function PaymentReportLayer() {
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  const { start: rangeStart, end: rangeEnd } = useMemo(() => localDayBounds(fromDate, toDate), [fromDate, toDate]);

  const filteredOrders = useMemo(() => {
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
        const pay = paymentRefFromMeta(m).toLowerCase();
        const gw = gatewayOrderIdFromMeta(m).toLowerCase();
        const orderRef = String(o.orderRef || "").toLowerCase();
        const idStr = String(o.id || "").toLowerCase();
        const vendorName = (vendorMap[o.vendorId] || "").toLowerCase();
        return (
          orderRef.includes(q) ||
          idStr.includes(q) ||
          name.includes(q) ||
          phone.toLowerCase().includes(q) ||
          vendorName.includes(q) ||
          pay.includes(q) ||
          gw.includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, fromDate, toDate, search, customerById, vendorMap, rangeStart, rangeEnd]);

  const rowModel = useMemo(() => {
    return filteredOrders.map((o) => {
      const m = parseMeta(o.metadata);
      const cached = o.customerId ? customerById[o.customerId] : null;
      const customer = m.customerName || m.customer_name || cached?.fullName || "—";
      const vendor = vendorMap[o.vendorId] || "—";
      const subtotal = Number(m.subtotal ?? m.itemTotal ?? m.itemMrp ?? 0) || 0;
      const platformFee = Number(m.platformFee ?? m.platform_fee ?? 0) || 0;
      const gstPf =
        Number(m.gstOnPlatformFee ?? m.gst_on_platform_fee ?? m.gstPf ?? (platformFee ? platformFee * 0.18 : 0)) || 0;
      const fromTotal = Number(o.totalAmount ?? 0) || 0;
      const computedLine = subtotal + platformFee + gstPf;
      const total = fromTotal > 0 ? fromTotal : computedLine;
      const paymentRef = paymentRefFromMeta(m);
      const gatewayOrderId = gatewayOrderIdFromMeta(m);
      const st = String(o.status || "").toLowerCase();
      return {
        order: o,
        orderRef: o.orderRef || o.id,
        createdAt: o.createdAt,
        customer,
        vendor,
        subtotal,
        platformFee,
        gstPf,
        total,
        paymentRef,
        gatewayOrderId,
        status: o.status,
        isCancelled: CANCELLED_STATUSES.has(st),
      };
    });
  }, [filteredOrders, customerById, vendorMap]);

  const kpis = useMemo(() => {
    const totalTx = rowModel.length;
    const cancelled = rowModel.filter((r) => r.isCancelled).length;
    const successful = totalTx - cancelled;
    const rate = totalTx > 0 ? ((successful / totalTx) * 100).toFixed(1) : "0.0";
    return { totalTx, successful, cancelled, rate };
  }, [rowModel]);

  const sorted = useMemo(() => {
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
        case "subtotal":
          return mul * (a.subtotal - b.subtotal);
        case "platformFee":
          return mul * (a.platformFee - b.platformFee);
        case "gstPf":
          return mul * (a.gstPf - b.gstPf);
        case "total":
          return mul * (a.total - b.total);
        case "paymentRef":
          return mul * String(a.paymentRef).localeCompare(String(b.paymentRef));
        case "gatewayOrderId":
          return mul * String(a.gatewayOrderId).localeCompare(String(b.gatewayOrderId));
        case "status":
          return mul * String(a.status).localeCompare(String(b.status));
        default:
          return 0;
      }
    };
    arr.sort(cmp);
    return arr;
  }, [rowModel, sort]);

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
      "Order ID",
      "Date",
      "Customer",
      "Vendor",
      "Subtotal (INR)",
      "Platform fee (INR)",
      "GST on PF (INR)",
      "Total (INR)",
      "Payment ref",
      "Gateway order ID",
      "Status",
    ];
    const lines = sorted.map((r) => [
      r.orderRef,
      formatOrderDate(r.createdAt),
      r.customer,
      r.vendor,
      r.subtotal,
      r.platformFee,
      r.gstPf,
      r.total,
      r.paymentRef,
      r.gatewayOrderId,
      r.status,
    ]);
    const csv = toCsv([header, ...lines]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className='row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-16 mb-24'>
        <div className='col'>
          <KpiCard label='Total Transactions' value={kpis.totalTx.toLocaleString("en-IN")} icon='mdi:credit-card-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Successful' value={kpis.successful.toLocaleString("en-IN")} icon='mdi:check-decagram-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Success Rate' value={`${kpis.rate}%`} icon='mdi:percent-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Cancelled' value={kpis.cancelled.toLocaleString("en-IN")} icon='mdi:close-circle-outline' />
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
                placeholder='Search by order ID, customer, payment ref…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete='off'
              />
            </div>
            <div className='d-flex flex-wrap align-items-center gap-10 ms-xl-auto'>
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='pay-from'>
                From
              </label>
              <input
                id='pay-from'
                type='date'
                className='form-control h-40-px radius-8'
                style={{ width: 158, minWidth: 140 }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <label className='d-none d-md-flex align-items-center gap-6 mb-0 text-secondary-light text-sm text-nowrap' htmlFor='pay-to'>
                To
              </label>
              <input
                id='pay-to'
                type='date'
                className='form-control h-40-px radius-8'
                style={{ width: 158, minWidth: 140 }}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              <select
                className='form-select h-40-px radius-8'
                style={{ minWidth: 140, maxWidth: 200 }}
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

          {error && (
            <div className='alert alert-danger radius-12 mb-16' role='alert'>
              {error}
            </div>
          )}

          {loading ? (
            <p className='text-secondary-light mb-0'>Loading payment transactions…</p>
          ) : (
            <>
              <div className='table-responsive scroll-sm' style={{ overflowX: "auto" }}>
                <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle' style={{ minWidth: 1180 }}>
                  <thead>
                    <tr>
                      <SortTh label='ORDER ID' sortKey='orderRef' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='DATE' sortKey='createdAt' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='CUSTOMER' sortKey='customer' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='VENDOR' sortKey='vendor' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='SUBTOTAL (₹)' sortKey='subtotal' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='PLATFORM FEE (₹)' sortKey='platformFee' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='GST ON PF (₹)' sortKey='gstPf' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='TOTAL (₹)' sortKey='total' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='PAYMENT REF' sortKey='paymentRef' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='GATEWAY ORDER ID' sortKey='gatewayOrderId' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='STATUS' sortKey='status' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {pageSlice.length === 0 ? (
                      <tr>
                        <td colSpan='11' className='text-center py-40 text-secondary-light'>
                          No payment transactions in this period.
                        </td>
                      </tr>
                    ) : (
                      pageSlice.map((r) => {
                        const pill = paymentStatusPill(r.status);
                        const pr = String(r.paymentRef);
                        const gw = String(r.gatewayOrderId);
                        return (
                          <tr key={r.order.id}>
                            <td className='fw-semibold' style={{ maxWidth: 200 }} title={r.orderRef}>
                              <span className='text-truncate d-inline-block' style={{ maxWidth: 190 }}>
                                {r.orderRef}
                              </span>
                            </td>
                            <td>{formatOrderDate(r.createdAt)}</td>
                            <td>{r.customer}</td>
                            <td>{r.vendor}</td>
                            <td>{formatMoney(r.subtotal)}</td>
                            <td>{formatMoney(r.platformFee)}</td>
                            <td>{formatMoney(r.gstPf)}</td>
                            <td className='fw-semibold'>{formatMoney(r.total)}</td>
                            <td title={pr}>{pr.length > 22 ? `${pr.slice(0, 20)}…` : pr}</td>
                            <td title={gw}>{gw.length > 22 ? `${gw.slice(0, 20)}…` : gw}</td>
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
              {!loading && orders.length >= MAX_ROWS && (
                <p className='text-secondary-light text-sm mt-16 mb-0'>
                  Loaded up to {MAX_ROWS} most recent orders. Narrow the date range for a smaller export.
                </p>
              )}
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

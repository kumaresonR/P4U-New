import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { listOrders, listVendors, getCustomer } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const TABS = { orders: "orders", vendor: "vendor" };

const PAGE = 200;
const MAX_ROWS = 4000;
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
  start.setDate(start.getDate() - 180);
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

function stripToAmount(n) {
  if (n == null) return 0;
  if (typeof n === "number") return Number.isFinite(n) ? n : 0;
  const s = String(n).replace(/[₹$€£\s]/g, "").replace(/,/g, "");
  const x = parseFloat(s);
  return Number.isFinite(x) ? x : 0;
}

function formatMoney(n) {
  const x = stripToAmount(n);
  return `₹${x.toLocaleString("en-IN", { minimumFractionDigits: x % 1 ? 1 : 0, maximumFractionDigits: 2 })}`;
}

function formatOrderDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function unknownVendorLabel(vendorId) {
  const raw = String(vendorId || "").replace(/-/g, "");
  const digits = raw.replace(/\D/g, "");
  let pad = digits.slice(-7);
  if (!pad) {
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
    pad = String(h % 10000000).padStart(7, "0");
  } else {
    pad = pad.padStart(7, "0").slice(-7);
  }
  return `Unknown vendor (VEND${pad})`;
}

function vendorDisplayName(vendorMap, vendorId) {
  const n = vendorMap[vendorId];
  if (n) return n;
  return unknownVendorLabel(vendorId);
}

/** Product / item GST only — excludes GST on platform fee when metadata splits it. */
function productTaxFromMeta(m) {
  const pf = stripToAmount(m.platformFee ?? m.platform_fee ?? 0);
  const gstPf =
    stripToAmount(m.gstOnPlatformFee ?? m.gst_on_platform_fee ?? (pf ? pf * 0.18 : 0)) || 0;

  const explicit = m.taxOnProduct ?? m.productTax ?? m.productGst ?? m.itemGst ?? m.item_tax;
  if (explicit !== undefined && explicit !== null && explicit !== "") {
    return stripToAmount(explicit);
  }

  const lump = stripToAmount(m.taxAmount ?? m.tax ?? m.taxOnProduct ?? m.totalTax ?? 0);
  if (lump > 0 && gstPf > 0 && lump + 1e-6 >= gstPf) {
    const net = lump - gstPf;
    if (net >= -1e-6) return Math.max(0, net);
  }
  return Math.max(0, lump);
}

function taxStatusPill(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "delivered") return { cls: "bg-success-50 text-success-700", label: s };
  if (s === "cancelled" || s === "canceled") return { cls: "bg-danger-50 text-danger-700", label: "cancelled" };
  if (s === "placed" || s === "paid" || s === "accepted" || s === "in_progress") {
    return { cls: "bg-warning-50 text-warning-800", label: s.replace(/_/g, " ") };
  }
  return { cls: "bg-neutral-200 text-secondary-light", label: (status || "placed").toLowerCase().replace(/_/g, " ") };
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

function KpiCard({ label, value, icon }) {
  return (
    <div className='card border radius-12 h-100'>
      <div className='card-body p-16'>
        <div className='d-flex justify-content-between align-items-start mb-8'>
          <span className='text-xs text-secondary-light text-uppercase fw-semibold'>{label}</span>
          <Icon icon={icon} className='text-xl text-secondary-light' />
        </div>
        <div className='h4 fw-bold mb-0 text-primary-light'>{value}</div>
      </div>
    </div>
  );
}

function buildRow(o, vendorMap, customerById) {
  const m = parseMeta(o.metadata);
  const cached = o.customerId ? customerById[o.customerId] : null;
  const customer = m.customerName || m.customer_name || cached?.fullName || "—";
  const vendor = vendorDisplayName(vendorMap, o.vendorId);
  const subtotal = stripToAmount(m.subtotal ?? m.itemTotal ?? m.itemMrp ?? 0);
  const platformFee = stripToAmount(m.platformFee ?? m.platform_fee ?? 0);
  const gstPf =
    stripToAmount(m.gstOnPlatformFee ?? m.gst_on_platform_fee ?? (platformFee ? platformFee * 0.18 : 0)) || 0;
  const productTax = productTaxFromMeta(m);
  const orderTotal =
    stripToAmount(o.totalAmount) || subtotal + productTax + platformFee + gstPf;

  return {
    order: o,
    orderRef: o.orderRef || o.id,
    createdAt: o.createdAt,
    customer,
    vendor,
    vendorId: o.vendorId,
    subtotal,
    productTax,
    platformFee,
    gstPf,
    orderTotal,
    status: o.status,
  };
}

export default function TaxReportLayer() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [customerById, setCustomerById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(TABS.orders);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);

  const [sortO, setSortO] = useState({ key: "createdAt", dir: "desc" });
  const [sortV, setSortV] = useState({ key: "vendor", dir: "asc" });
  const [pageO, setPageO] = useState(1);
  const [pageV, setPageV] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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
    listVendors({ limit: 200, offset: 0 })
      .then((r) => setVendors(r.items || []))
      .catch(() => {});
  }, []);

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
      m[v.id] = v.businessName || v.ownerName || "";
    });
    return m;
  }, [vendors]);

  const filteredOrders = useMemo(() => {
    const { start: rangeStart, end: rangeEnd } = localDayBounds(fromDate, toDate);
    return orders.filter((o) => {
      const created = new Date(o.createdAt);
      if (isNaN(created.getTime())) return false;
      if (rangeStart && created < rangeStart) return false;
      if (rangeEnd && created > rangeEnd) return false;
      return true;
    });
  }, [orders, fromDate, toDate]);

  const rows = useMemo(() => {
    return filteredOrders.map((o) => buildRow(o, vendorMap, customerById));
  }, [filteredOrders, vendorMap, customerById]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const m = parseMeta(r.order.metadata);
      const cached = r.order.customerId ? customerById[r.order.customerId] : null;
      const name = (m.customerName || m.customer_name || cached?.fullName || "").toLowerCase();
      const phone = String(m.customerPhone || m.customer_phone || cached?.phone || "");
      return (
        String(r.orderRef).toLowerCase().includes(q) ||
        String(r.order.id || "").toLowerCase().includes(q) ||
        name.includes(q) ||
        phone.toLowerCase().includes(q) ||
        String(r.vendor).toLowerCase().includes(q) ||
        String(r.vendorId || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, customerById]);

  const kpis = useMemo(() => {
    let productTax = 0;
    let gstPf = 0;
    for (const r of filteredRows) {
      productTax += r.productTax;
      gstPf += r.gstPf;
    }
    const totalTax = productTax + gstPf;
    return {
      totalTax,
      productTax,
      gstPf,
      orderCount: filteredRows.length,
    };
  }, [filteredRows]);

  const sortedOrders = useMemo(() => {
    const { key, dir } = sortO;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...filteredRows];
    arr.sort((a, b) => {
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
        case "productTax":
          return mul * (a.productTax - b.productTax);
        case "platformFee":
          return mul * (a.platformFee - b.platformFee);
        case "gstPf":
          return mul * (a.gstPf - b.gstPf);
        case "orderTotal":
          return mul * (a.orderTotal - b.orderTotal);
        case "status":
          return mul * String(a.status).localeCompare(String(b.status));
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredRows, sortO]);

  const sortedVendorView = useMemo(() => {
    const { key, dir } = sortV;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...filteredRows];
    arr.sort((a, b) => {
      switch (key) {
        case "vendor":
          return mul * String(a.vendor).localeCompare(String(b.vendor));
        case "subtotal":
          return mul * (a.subtotal - b.subtotal);
        case "productTax":
          return mul * (a.productTax - b.productTax);
        case "platformFee":
          return mul * (a.platformFee - b.platformFee);
        case "gstPf":
          return mul * (a.gstPf - b.gstPf);
        case "orderTotal":
          return mul * (a.orderTotal - b.orderTotal);
        case "status":
          return mul * String(a.status).localeCompare(String(b.status));
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredRows, sortV]);

  useEffect(() => {
    setPageO(1);
  }, [search, fromDate, toDate, pageSize, sortO.key, sortO.dir]);

  useEffect(() => {
    setPageV(1);
  }, [search, fromDate, toDate, pageSize, sortV.key, sortV.dir]);

  const totalPagesO = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const totalPagesV = Math.max(1, Math.ceil(sortedVendorView.length / pageSize));
  const safePageO = Math.min(Math.max(1, pageO), totalPagesO);
  const safePageV = Math.min(Math.max(1, pageV), totalPagesV);

  const sliceO = useMemo(() => {
    const s = (safePageO - 1) * pageSize;
    return sortedOrders.slice(s, s + pageSize);
  }, [sortedOrders, safePageO, pageSize]);

  const sliceV = useMemo(() => {
    const s = (safePageV - 1) * pageSize;
    return sortedVendorView.slice(s, s + pageSize);
  }, [sortedVendorView, safePageV, pageSize]);

  const toggleSortO = (key) => {
    setSortO((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "createdAt" ? "desc" : "asc" },
    );
  };

  const toggleSortV = (key) => {
    setSortV((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "vendor" ? "asc" : "desc" },
    );
  };

  const exportCsv = () => {
    if (tab === TABS.orders) {
      const header = [
        "Order ID",
        "Date",
        "Customer",
        "Vendor",
        "Subtotal (₹)",
        "Product tax (₹)",
        "Platform fee (₹)",
        "GST on PF (₹)",
        "Order total (₹)",
        "Status",
      ];
      const lines = sortedOrders.map((r) => [
        r.orderRef,
        formatOrderDate(r.createdAt),
        r.customer,
        r.vendor,
        r.subtotal,
        r.productTax,
        r.platformFee,
        r.gstPf,
        r.orderTotal,
        r.status,
      ]);
      downloadCsv(`tax-report-orders-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...lines]));
    } else {
      const header = [
        "Vendor",
        "Subtotal (₹)",
        "Product tax (₹)",
        "Platform fee (₹)",
        "GST on PF (₹)",
        "Order total (₹)",
        "Status",
      ];
      const lines = sortedVendorView.map((r) => [
        r.vendor,
        r.subtotal,
        r.productTax,
        r.platformFee,
        r.gstPf,
        r.orderTotal,
        r.status,
      ]);
      downloadCsv(`tax-report-vendor-view-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...lines]));
    }
  };

  return (
    <div>
      <div className='row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-16 mb-24'>
        <div className='col'>
          <KpiCard label='Total Tax Collected' value={formatMoney(kpis.totalTax)} icon='mdi:file-document-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Product Tax' value={formatMoney(kpis.productTax)} icon='mdi:currency-usd' />
        </div>
        <div className='col'>
          <KpiCard label='GST on Platform Fee' value={formatMoney(kpis.gstPf)} icon='mdi:percent-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Total Orders' value={kpis.orderCount.toLocaleString("en-IN")} icon='mdi:cart-outline' />
        </div>
      </div>

      <div className='card radius-12 p-0 mb-16'>
        <div className='card-body p-16 d-flex flex-wrap align-items-center justify-content-between gap-12'>
          <ul className='nav nav-pills gap-8 mb-0 flex-wrap'>
            <li className='nav-item'>
              <button
                type='button'
                className={`nav-link radius-8 px-16 py-10 ${tab === TABS.orders ? "active" : ""}`}
                onClick={() => setTab(TABS.orders)}
              >
                Orders ({filteredRows.length})
              </button>
            </li>
            <li className='nav-item'>
              <button
                type='button'
                className={`nav-link radius-8 px-16 py-10 ${tab === TABS.vendor ? "active" : ""}`}
                onClick={() => setTab(TABS.vendor)}
              >
                Vendor-wise ({filteredRows.length})
              </button>
            </li>
          </ul>
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
                placeholder='Search by order ID, customer, vendor…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete='off'
              />
            </div>
            <div className='d-flex flex-wrap align-items-center gap-10 ms-xl-auto'>
              <input type='date' className='form-control h-40-px radius-8' style={{ width: 158 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} title='From' />
              <input type='date' className='form-control h-40-px radius-8' style={{ width: 158 }} value={toDate} onChange={(e) => setToDate(e.target.value)} title='To' />
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
            <p className='text-secondary-light mb-0'>Loading tax data…</p>
          ) : (
            <>
              {tab === TABS.orders && (
                <div className='table-responsive scroll-sm'>
                  <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle'>
                    <thead>
                      <tr>
                        <SortTh label='ORDER ID' sortKey='orderRef' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='DATE' sortKey='createdAt' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='CUSTOMER' sortKey='customer' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='VENDOR' sortKey='vendor' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='SUBTOTAL (₹)' sortKey='subtotal' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='PRODUCT TAX (₹)' sortKey='productTax' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='PLATFORM FEE (₹)' sortKey='platformFee' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='GST ON PF (₹)' sortKey='gstPf' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='ORDER TOTAL (₹)' sortKey='orderTotal' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='STATUS' sortKey='status' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                      </tr>
                    </thead>
                    <tbody>
                      {sliceO.length === 0 ? (
                        <tr>
                          <td colSpan='10' className='text-center py-40 text-secondary-light'>
                            No orders in this period.
                          </td>
                        </tr>
                      ) : (
                        sliceO.map((r) => {
                          const pill = taxStatusPill(r.status);
                          return (
                            <tr key={r.order.id}>
                              <td className='fw-semibold'>{r.orderRef}</td>
                              <td>{formatOrderDate(r.createdAt)}</td>
                              <td>{r.customer}</td>
                              <td>{r.vendor}</td>
                              <td>{formatMoney(r.subtotal)}</td>
                              <td>{formatMoney(r.productTax)}</td>
                              <td>{formatMoney(r.platformFee)}</td>
                              <td>{formatMoney(r.gstPf)}</td>
                              <td className='fw-semibold'>{formatMoney(r.orderTotal)}</td>
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
              )}

              {tab === TABS.vendor && (
                <div className='table-responsive scroll-sm'>
                  <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle'>
                    <thead>
                      <tr>
                        <SortTh label='VENDOR' sortKey='vendor' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                        <SortTh label='SUBTOTAL (₹)' sortKey='subtotal' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                        <SortTh label='PRODUCT TAX (₹)' sortKey='productTax' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                        <SortTh label='PLATFORM FEE (₹)' sortKey='platformFee' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                        <SortTh label='GST ON PF (₹)' sortKey='gstPf' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                        <SortTh label='ORDER TOTAL (₹)' sortKey='orderTotal' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                        <SortTh label='STATUS' sortKey='status' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                      </tr>
                    </thead>
                    <tbody>
                      {sliceV.length === 0 ? (
                        <tr>
                          <td colSpan='7' className='text-center py-40 text-secondary-light'>
                            No orders in this period.
                          </td>
                        </tr>
                      ) : (
                        sliceV.map((r) => {
                          const pill = taxStatusPill(r.status);
                          return (
                            <tr key={`${r.order.id}-v`}>
                              <td className='fw-semibold'>{r.vendor}</td>
                              <td>{formatMoney(r.subtotal)}</td>
                              <td>{formatMoney(r.productTax)}</td>
                              <td>{formatMoney(r.platformFee)}</td>
                              <td>{formatMoney(r.gstPf)}</td>
                              <td className='fw-semibold'>{formatMoney(r.orderTotal)}</td>
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
              )}

              <div className='d-flex flex-wrap align-items-center justify-content-between gap-12 mt-20'>
                <span className='text-secondary-light text-sm'>
                  {(() => {
                    const sortedLen = tab === TABS.orders ? sortedOrders.length : sortedVendorView.length;
                    const sp = tab === TABS.orders ? safePageO : safePageV;
                    if (sortedLen === 0) return "0 of 0";
                    const start = (sp - 1) * pageSize + 1;
                    const end = Math.min(sp * pageSize, sortedLen);
                    return `${start}-${end} of ${sortedLen}`;
                  })()}
                </span>
                <div className='d-flex flex-wrap align-items-center gap-12'>
                  <div className='d-flex align-items-center gap-8'>
                    <select className='form-select form-select-sm radius-8 h-40-px' style={{ width: 72 }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
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
                      disabled={(tab === TABS.orders ? safePageO : safePageV) <= 1}
                      onClick={() =>
                        tab === TABS.orders ? setPageO((p) => Math.max(1, p - 1)) : setPageV((p) => Math.max(1, p - 1))
                      }
                    >
                      <Icon icon='mdi:chevron-left' className='text-xl' />
                    </button>
                    <span className='text-sm text-secondary-light text-nowrap px-6'>
                      {tab === TABS.orders ? safePageO : safePageV} / {tab === TABS.orders ? totalPagesO : totalPagesV}
                    </span>
                    <button
                      type='button'
                      className='btn btn-light border radius-8 h-40-px px-10'
                      disabled={(tab === TABS.orders ? safePageO : safePageV) >= (tab === TABS.orders ? totalPagesO : totalPagesV)}
                      onClick={() =>
                        tab === TABS.orders
                          ? setPageO((p) => Math.min(totalPagesO, p + 1))
                          : setPageV((p) => Math.min(totalPagesV, p + 1))
                      }
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

      {!loading && orders.length >= MAX_ROWS && (
        <p className='text-secondary-light text-sm mt-16 mb-0'>Loaded up to {MAX_ROWS} orders. Narrow the date range for full exports.</p>
      )}
    </div>
  );
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

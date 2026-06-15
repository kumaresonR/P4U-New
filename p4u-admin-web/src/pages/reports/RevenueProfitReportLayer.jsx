import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { listOrders, listVendors, getCustomer } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const TABS = { orders: "orders", vendors: "vendors", products: "products" };

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

function lineItems(meta) {
  const r = meta.lines ?? meta.items ?? meta.lineItems ?? meta.orderItems;
  return Array.isArray(r) ? r : [];
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

function orderStatusPill(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "delivered") return { cls: "bg-success-50 text-success-700", label: s };
  if (s === "cancelled" || s === "canceled") return { cls: "bg-danger-50 text-danger-700", label: "cancelled" };
  return { cls: "bg-neutral-200 text-secondary-light", label: (status || "placed").toLowerCase().replace(/_/g, " ") };
}

function commissionSourcePill(source) {
  if (source === "plan") return { cls: "bg-primary-50 text-primary-700", label: "Plan Level" };
  return { cls: "bg-warning-50 text-warning-800", label: "Vendor Level" };
}

function redemptionSourcePill(source) {
  if (source === "plan") return { cls: "bg-primary-50 text-primary-700", label: "Plan Level" };
  if (source === "vendor") return { cls: "bg-warning-50 text-warning-800", label: "Vendor Level" };
  return { cls: "bg-neutral-100 text-secondary-light", label: "—" };
}

function inferCommissionSource(m) {
  const raw = String(m.commissionSource || m.commissionTier || m.commissionFrom || "").toLowerCase();
  if (raw.includes("plan") || raw.includes("tier")) return "plan";
  if (m.vendorPlanId || m.planId || m.vendor_plan_id) return "plan";
  if (raw.includes("vendor")) return "vendor";
  return m.vendorPlanId || m.planId ? "plan" : "vendor";
}

function inferRedemptionSource(m) {
  const raw = String(m.redemptionSource || m.pointsRedemptionSource || "").toLowerCase();
  if (raw.includes("plan")) return "plan";
  if (raw.includes("vendor")) return "vendor";
  if (m.vendorPlanId || m.planId) return "plan";
  return "plan";
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

function buildOrderRow(o, m, vendorMap, customerLabel) {
  const vendor = vendorMap[o.vendorId] || "—";
  const subtotal = Number(m.subtotal ?? m.itemTotal ?? m.itemMrp ?? 0) || 0;
  const platformFee = Number(m.platformFee ?? m.platform_fee ?? 0) || 0;
  const gstPf =
    Number(m.gstOnPlatformFee ?? m.gst_on_platform_fee ?? (platformFee ? platformFee * 0.18 : 0)) || 0;
  const orderTotal = Number(o.totalAmount ?? 0) || subtotal + platformFee + gstPf;

  const vendorRate = o.vendorId && vendorMap.__rates?.[o.vendorId] != null ? Number(vendorMap.__rates[o.vendorId]) : 0;
  const commissionPct =
    Number(m.commissionPercent ?? m.commission_pct ?? m.commissionRate ?? vendorRate ?? 0) || 0;

  const rawComm = m.p4uCommission ?? m.p4u_commission ?? m.platformCommission ?? m.commissionAmount ?? m.commission;
  let commissionAmt;
  if (rawComm !== undefined && rawComm !== null && rawComm !== "") {
    commissionAmt = Number(rawComm);
    if (!Number.isFinite(commissionAmt)) {
      commissionAmt = subtotal > 0 ? (subtotal * commissionPct) / 100 : 0;
    }
  } else {
    commissionAmt = subtotal > 0 ? (subtotal * commissionPct) / 100 : 0;
  }

  const maxRedemptionPct = Number(m.maxRedemptionPercent ?? m.maxPointsRedemptionPercent ?? m.planMaxRedemption ?? 0) || 0;
  const pointsUsed = Number(m.pointsRedeemed ?? m.pointsUsed ?? m.points ?? 0) || 0;
  const commissionSource = inferCommissionSource(m);
  const redemptionSource = inferRedemptionSource(m);

  return {
    order: o,
    meta: m,
    orderRef: o.orderRef || o.id,
    createdAt: o.createdAt,
    vendor,
    vendorId: o.vendorId,
    customer: customerLabel,
    subtotal,
    commissionPct,
    commissionSource,
    commissionAmt,
    maxRedemptionPct,
    redemptionSource,
    pointsUsed,
    platformFee,
    gstPf,
    platformFeesGst: platformFee + gstPf,
    orderTotal,
    status: o.status,
  };
}

export default function RevenueProfitReportLayer() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [customerById, setCustomerById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(TABS.orders);
  const [searchOrders, setSearchOrders] = useState("");
  const [searchVendors, setSearchVendors] = useState("");
  const [searchProducts, setSearchProducts] = useState("");
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [sortO, setSortO] = useState({ key: "createdAt", dir: "desc" });
  const [sortV, setSortV] = useState({ key: "totalRevenue", dir: "desc" });
  const [sortP, setSortP] = useState({ key: "revenue", dir: "desc" });
  const [pageO, setPageO] = useState(1);
  const [pageV, setPageV] = useState(1);
  const [pageP, setPageP] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    listVendors({ limit: 200, offset: 0 })
      .then((r) => setVendors(r.items || []))
      .catch(() => {});
  }, []);

  const vendorMap = useMemo(() => {
    const m = { __rates: {} };
    vendors.forEach((v) => {
      const name = v.businessName || v.ownerName || "Vendor";
      m[v.id] = name;
      if (v.commissionRate != null && v.commissionRate !== "") {
        m.__rates[v.id] = Number(v.commissionRate);
      }
    });
    return m;
  }, [vendors]);

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

  const { start: rangeStart, end: rangeEnd } = useMemo(() => localDayBounds(fromDate, toDate), [fromDate, toDate]);

  const baseFilteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const created = new Date(o.createdAt);
      if (isNaN(created.getTime())) return false;
      if (rangeStart && created < rangeStart) return false;
      if (rangeEnd && created > rangeEnd) return false;
      return true;
    });
  }, [orders, rangeStart, rangeEnd]);

  const orderRows = useMemo(() => {
    return baseFilteredOrders.map((o) => {
      const m = parseMeta(o.metadata);
      const cached = o.customerId ? customerById[o.customerId] : null;
      const customer = m.customerName || m.customer_name || cached?.fullName || "—";
      return buildOrderRow(o, m, vendorMap, customer);
    });
  }, [baseFilteredOrders, customerById, vendorMap]);

  const filteredOrderRows = useMemo(() => {
    if (!searchOrders.trim()) return orderRows;
    const q = searchOrders.toLowerCase().trim();
    return orderRows.filter(
      (r) =>
        String(r.orderRef).toLowerCase().includes(q) ||
        String(r.vendor).toLowerCase().includes(q) ||
        String(r.customer).toLowerCase().includes(q),
    );
  }, [orderRows, searchOrders]);

  const kpis = useMemo(() => {
    let totalOrderRevenue = 0;
    let commissionRevenue = 0;
    let platformFeesGst = 0;
    let pointsRedeemed = 0;
    filteredOrderRows.forEach((r) => {
      totalOrderRevenue += r.orderTotal;
      commissionRevenue += r.commissionAmt;
      platformFeesGst += r.platformFeesGst;
      pointsRedeemed += r.pointsUsed;
    });
    const netProfit = commissionRevenue + platformFeesGst;
    return { totalOrderRevenue, commissionRevenue, platformFeesGst, netProfit, pointsRedeemed };
  }, [filteredOrderRows]);

  const vendorAggregates = useMemo(() => {
    const m = {};
    filteredOrderRows.forEach((r) => {
      const k = r.vendorId || r.vendor;
      if (!m[k]) {
        m[k] = {
          vendor: r.vendor,
          orders: 0,
          totalRevenue: 0,
          commissionRevenue: 0,
          platformFees: 0,
          netProfit: 0,
        };
      }
      m[k].orders += 1;
      m[k].totalRevenue += r.orderTotal;
      m[k].commissionRevenue += r.commissionAmt;
      m[k].platformFees += r.platformFeesGst;
      m[k].netProfit += r.commissionAmt + r.platformFeesGst;
    });
    return Object.values(m);
  }, [filteredOrderRows]);

  const filteredVendorRows = useMemo(() => {
    if (!searchVendors.trim()) return vendorAggregates;
    const q = searchVendors.toLowerCase().trim();
    return vendorAggregates.filter((r) => String(r.vendor).toLowerCase().includes(q));
  }, [vendorAggregates, searchVendors]);

  const productAggregates = useMemo(() => {
    const m = {};
    filteredOrderRows.forEach((r) => {
      const lines = lineItems(r.meta);
      const sub = r.subtotal > 0 ? r.subtotal : r.orderTotal || 1;
      if (!lines.length) {
        const key = `${r.vendor}|__whole__`;
        if (!m[key]) {
          m[key] = {
            product: "—",
            vendor: r.vendor,
            qty: 1,
            revenue: r.orderTotal,
            commissionPct: r.commissionPct,
            commission: r.commissionAmt,
          };
        } else {
          m[key].qty += 1;
          m[key].revenue += r.orderTotal;
          m[key].commission += r.commissionAmt;
        }
        return;
      }
      lines.forEach((line) => {
        const qty = Number(line.quantity || line.qty || 1) || 1;
        const lineTotal =
          Number(line.lineTotal ?? line.total ?? line.amount ?? (Number(line.price || line.unitPrice || 0) * qty)) || 0;
        const title = line.title || line.name || line.productName || line.productTitle || "—";
        const pid = line.productId || line.id || title;
        const key = `${r.vendor}|${pid}|${title}`;
        const share = sub > 0 ? lineTotal / sub : 0;
        if (!m[key]) {
          m[key] = {
            product: title,
            vendor: r.vendor,
            qty: 0,
            revenue: 0,
            commissionPct: r.commissionPct,
            commission: 0,
          };
        }
        m[key].qty += qty;
        m[key].revenue += lineTotal;
        m[key].commission += share * r.commissionAmt;
      });
    });
    return Object.values(m);
  }, [filteredOrderRows]);

  const filteredProductRows = useMemo(() => {
    if (!searchProducts.trim()) return productAggregates;
    const q = searchProducts.toLowerCase().trim();
    return productAggregates.filter(
      (r) => String(r.product).toLowerCase().includes(q) || String(r.vendor).toLowerCase().includes(q),
    );
  }, [productAggregates, searchProducts]);

  const sortedOrders = useMemo(() => {
    const { key, dir } = sortO;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...filteredOrderRows];
    const cmp = (a, b) => {
      switch (key) {
        case "orderRef":
          return mul * String(a.orderRef).localeCompare(String(b.orderRef));
        case "createdAt":
          return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "vendor":
          return mul * String(a.vendor).localeCompare(String(b.vendor));
        case "customer":
          return mul * String(a.customer).localeCompare(String(b.customer));
        case "subtotal":
          return mul * (a.subtotal - b.subtotal);
        case "commissionPct":
          return mul * (a.commissionPct - b.commissionPct);
        case "commissionAmt":
          return mul * (a.commissionAmt - b.commissionAmt);
        case "maxRedemptionPct":
          return mul * (a.maxRedemptionPct - b.maxRedemptionPct);
        case "pointsUsed":
          return mul * (a.pointsUsed - b.pointsUsed);
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
    };
    arr.sort(cmp);
    return arr;
  }, [filteredOrderRows, sortO]);

  const sortedVendors = useMemo(() => {
    const { key, dir } = sortV;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...filteredVendorRows];
    arr.sort((a, b) => {
      switch (key) {
        case "vendor":
          return mul * String(a.vendor).localeCompare(String(b.vendor));
        case "orders":
          return mul * (a.orders - b.orders);
        case "totalRevenue":
          return mul * (a.totalRevenue - b.totalRevenue);
        case "commissionRevenue":
          return mul * (a.commissionRevenue - b.commissionRevenue);
        case "platformFees":
          return mul * (a.platformFees - b.platformFees);
        case "netProfit":
          return mul * (a.netProfit - b.netProfit);
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredVendorRows, sortV]);

  const sortedProducts = useMemo(() => {
    const { key, dir } = sortP;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...filteredProductRows];
    arr.sort((a, b) => {
      switch (key) {
        case "product":
          return mul * String(a.product).localeCompare(String(b.product));
        case "vendor":
          return mul * String(a.vendor).localeCompare(String(b.vendor));
        case "qty":
          return mul * (a.qty - b.qty);
        case "revenue":
          return mul * (a.revenue - b.revenue);
        case "commissionPct":
          return mul * (a.commissionPct - b.commissionPct);
        case "commission":
          return mul * (a.commission - b.commission);
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredProductRows, sortP]);

  useEffect(() => {
    setPageO(1);
  }, [searchOrders, fromDate, toDate, pageSize, sortO.key, sortO.dir]);
  useEffect(() => {
    setPageV(1);
  }, [searchVendors, fromDate, toDate, pageSize, sortV.key, sortV.dir]);
  useEffect(() => {
    setPageP(1);
  }, [searchProducts, fromDate, toDate, pageSize, sortP.key, sortP.dir]);

  const totalPagesO = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const totalPagesV = Math.max(1, Math.ceil(sortedVendors.length / pageSize));
  const totalPagesP = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const safePageO = Math.min(Math.max(1, pageO), totalPagesO);
  const safePageV = Math.min(Math.max(1, pageV), totalPagesV);
  const safePageP = Math.min(Math.max(1, pageP), totalPagesP);

  const sliceO = useMemo(() => {
    const s = (safePageO - 1) * pageSize;
    return sortedOrders.slice(s, s + pageSize);
  }, [sortedOrders, safePageO, pageSize]);
  const sliceV = useMemo(() => {
    const s = (safePageV - 1) * pageSize;
    return sortedVendors.slice(s, s + pageSize);
  }, [sortedVendors, safePageV, pageSize]);
  const sliceP = useMemo(() => {
    const s = (safePageP - 1) * pageSize;
    return sortedProducts.slice(s, s + pageSize);
  }, [sortedProducts, safePageP, pageSize]);

  const toggleSortO = (key) => {
    setSortO((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "createdAt" ? "desc" : "asc" },
    );
  };
  const toggleSortV = (key) => {
    setSortV((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "totalRevenue" ? "desc" : "asc" },
    );
  };
  const toggleSortP = (key) => {
    setSortP((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "revenue" ? "desc" : "asc" },
    );
  };

  const exportCsv = () => {
    if (tab === TABS.orders) {
      const header = [
        "Order ID",
        "Date",
        "Vendor",
        "Customer",
        "Subtotal",
        "Commission %",
        "Commission source",
        "Commission ₹",
        "Max redemption %",
        "Redemption source",
        "Points used",
        "Platform fee ₹",
        "GST on PF ₹",
        "Order total ₹",
        "Status",
      ];
      const lines = sortedOrders.map((r) => [
        r.orderRef,
        formatOrderDate(r.createdAt),
        r.vendor,
        r.customer,
        r.subtotal,
        r.commissionPct,
        r.commissionSource === "plan" ? "Plan Level" : "Vendor Level",
        r.commissionAmt,
        r.maxRedemptionPct,
        r.redemptionSource === "plan" ? "Plan Level" : "Vendor Level",
        r.pointsUsed,
        r.platformFee,
        r.gstPf,
        r.orderTotal,
        r.status,
      ]);
      downloadCsv(`revenue-profit-orders-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...lines]));
    } else if (tab === TABS.vendors) {
      const header = ["Vendor", "Orders", "Total revenue", "Commission revenue", "Platform fees + GST", "Net profit"];
      const lines = sortedVendors.map((r) => [
        r.vendor,
        r.orders,
        r.totalRevenue,
        r.commissionRevenue,
        r.platformFees,
        r.netProfit,
      ]);
      downloadCsv(`revenue-profit-vendors-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...lines]));
    } else {
      const header = ["Product", "Vendor", "Qty sold", "Revenue", "Commission %", "P4U commission"];
      const lines = sortedProducts.map((r) => [r.product, r.vendor, r.qty, r.revenue, r.commissionPct, r.commission]);
      downloadCsv(`revenue-profit-products-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...lines]));
    }
  };

  const tabCounts = {
    orders: filteredOrderRows.length,
    vendors: filteredVendorRows.length,
    products: filteredProductRows.length,
  };

  return (
    <div>
      <div className='row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-5 g-16 mb-24'>
        <div className='col'>
          <KpiCard label='Total Order Revenue' value={formatMoney(kpis.totalOrderRevenue)} icon='mdi:currency-inr' iconCls='text-success-600' />
        </div>
        <div className='col'>
          <KpiCard label='Commission Revenue' value={formatMoney(kpis.commissionRevenue)} icon='mdi:percent-outline' iconCls='text-success-600' />
        </div>
        <div className='col'>
          <KpiCard label='Platform Fees + GST' value={formatMoney(kpis.platformFeesGst)} icon='mdi:storefront-outline' iconCls='text-primary-600' />
        </div>
        <div className='col'>
          <KpiCard label='Net Profit' value={formatMoney(kpis.netProfit)} icon='mdi:trending-up' iconCls='text-success-600' />
        </div>
        <div className='col'>
          <KpiCard
            label='Points Redeemed'
            value={kpis.pointsRedeemed.toLocaleString("en-IN")}
            icon='mdi:package-variant'
            iconCls='text-warning-600'
          />
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
                Detailed Orders ({tabCounts.orders})
              </button>
            </li>
            <li className='nav-item'>
              <button
                type='button'
                className={`nav-link radius-8 px-16 py-10 ${tab === TABS.vendors ? "active" : ""}`}
                onClick={() => setTab(TABS.vendors)}
              >
                Vendor-wise ({tabCounts.vendors})
              </button>
            </li>
            <li className='nav-item'>
              <button
                type='button'
                className={`nav-link radius-8 px-16 py-10 ${tab === TABS.products ? "active" : ""}`}
                onClick={() => setTab(TABS.products)}
              >
                Product-wise ({tabCounts.products})
              </button>
            </li>
          </ul>
          <button
            type='button'
            className='btn btn-outline-secondary h-40-px radius-8 d-inline-flex align-items-center gap-8 px-14'
            onClick={exportCsv}
          >
            <Icon icon='mdi:tray-arrow-down' className='text-lg' />
            Export CSV
          </button>
        </div>
      </div>

      <div className='card radius-12 p-0 mb-0'>
        <div className='card-body p-24'>
          {tab === TABS.orders && (
            <div className='d-flex flex-wrap align-items-center gap-12 mb-20 w-100'>
              <div className='input-group flex-grow-1' style={{ minWidth: 260, maxWidth: 560 }}>
                <span className='input-group-text bg-white border-end-0 h-40-px d-flex align-items-center'>
                  <Icon icon='mdi:magnify' className='text-secondary-light' />
                </span>
                <input
                  type='search'
                  className='form-control border-start-0 h-40-px radius-8'
                  placeholder='Search by order, vendor, or customer…'
                  value={searchOrders}
                  onChange={(e) => setSearchOrders(e.target.value)}
                  autoComplete='off'
                />
              </div>
              <div className='d-flex flex-wrap align-items-center gap-10 ms-xl-auto'>
                <input type='date' className='form-control h-40-px radius-8' style={{ width: 158 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <input type='date' className='form-control h-40-px radius-8' style={{ width: 158 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <button type='button' className='btn btn-outline-secondary h-40-px radius-8 d-inline-flex align-items-center gap-8 px-14' onClick={exportCsv}>
                  <Icon icon='mdi:tray-arrow-down' />
                  Export CSV
                </button>
              </div>
            </div>
          )}

          {tab === TABS.vendors && (
            <div className='d-flex flex-wrap align-items-center gap-12 mb-20 w-100'>
              <div className='input-group flex-grow-1' style={{ minWidth: 260, maxWidth: 400 }}>
                <span className='input-group-text bg-white border-end-0 h-40-px d-flex align-items-center'>
                  <Icon icon='mdi:magnify' className='text-secondary-light' />
                </span>
                <input
                  type='search'
                  className='form-control border-start-0 h-40-px radius-8'
                  placeholder='Search by vendor…'
                  value={searchVendors}
                  onChange={(e) => setSearchVendors(e.target.value)}
                />
              </div>
              <div className='d-flex flex-wrap align-items-center gap-10 ms-xl-auto'>
                <input type='date' className='form-control h-40-px radius-8' style={{ width: 158 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <input type='date' className='form-control h-40-px radius-8' style={{ width: 158 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <button type='button' className='btn btn-outline-secondary h-40-px radius-8 d-inline-flex align-items-center gap-8 px-14' onClick={exportCsv}>
                  <Icon icon='mdi:tray-arrow-down' />
                  Export CSV
                </button>
              </div>
            </div>
          )}

          {tab === TABS.products && (
            <div className='d-flex flex-wrap align-items-center gap-12 mb-20 w-100'>
              <div className='input-group flex-grow-1' style={{ minWidth: 260, maxWidth: 480 }}>
                <span className='input-group-text bg-white border-end-0 h-40-px d-flex align-items-center'>
                  <Icon icon='mdi:magnify' className='text-secondary-light' />
                </span>
                <input
                  type='search'
                  className='form-control border-start-0 h-40-px radius-8'
                  placeholder='Search by product or vendor…'
                  value={searchProducts}
                  onChange={(e) => setSearchProducts(e.target.value)}
                />
              </div>
              <div className='d-flex flex-wrap align-items-center gap-10 ms-xl-auto'>
                <input type='date' className='form-control h-40-px radius-8' style={{ width: 158 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <input type='date' className='form-control h-40-px radius-8' style={{ width: 158 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <button type='button' className='btn btn-outline-secondary h-40-px radius-8 d-inline-flex align-items-center gap-8 px-14' onClick={exportCsv}>
                  <Icon icon='mdi:tray-arrow-down' />
                  Export CSV
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className='alert alert-danger radius-12 mb-16' role='alert'>
              {error}
            </div>
          )}

          {loading ? (
            <p className='text-secondary-light mb-0'>Loading revenue data…</p>
          ) : (
            <>
              {tab === TABS.orders && (
                <div className='table-responsive scroll-sm' style={{ overflowX: "auto" }}>
                  <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle' style={{ minWidth: 1320 }}>
                    <thead>
                      <tr>
                        <SortTh label='ORDER ID' sortKey='orderRef' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='DATE' sortKey='createdAt' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='VENDOR' sortKey='vendor' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='CUSTOMER' sortKey='customer' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='SUBTOTAL (₹)' sortKey='subtotal' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='COMM. %' sortKey='commissionPct' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <th>COMM. SOURCE</th>
                        <SortTh label='COMM. (₹)' sortKey='commissionAmt' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='MAX RED. %' sortKey='maxRedemptionPct' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <th>RED. SOURCE</th>
                        <SortTh label='POINTS' sortKey='pointsUsed' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='PLATFORM FEE (₹)' sortKey='platformFee' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='GST ON PF (₹)' sortKey='gstPf' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='ORDER TOTAL (₹)' sortKey='orderTotal' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                        <SortTh label='STATUS' sortKey='status' activeKey={sortO.key} dir={sortO.dir} onSort={toggleSortO} />
                      </tr>
                    </thead>
                    <tbody>
                      {sliceO.length === 0 ? (
                        <tr>
                          <td colSpan='15' className='text-center py-40 text-secondary-light'>
                            No orders in this period.
                          </td>
                        </tr>
                      ) : (
                        sliceO.map((r) => {
                          const pill = orderStatusPill(r.status);
                          const cs = commissionSourcePill(r.commissionSource);
                          const rs = redemptionSourcePill(r.redemptionSource);
                          return (
                            <tr key={r.order.id}>
                              <td className='fw-semibold'>{r.orderRef}</td>
                              <td>{formatOrderDate(r.createdAt)}</td>
                              <td>{r.vendor}</td>
                              <td>{r.customer}</td>
                              <td>{formatMoney(r.subtotal)}</td>
                              <td>{r.commissionPct > 0 ? `${r.commissionPct}%` : "0%"}</td>
                              <td>
                                <span className={`px-10 py-4 radius-pill text-xs fw-medium ${cs.cls}`}>{cs.label}</span>
                              </td>
                              <td className='fw-medium'>{formatMoney(r.commissionAmt)}</td>
                              <td>{r.maxRedemptionPct > 0 ? `${r.maxRedemptionPct}%` : "0%"}</td>
                              <td>
                                <span className={`px-10 py-4 radius-pill text-xs fw-medium ${rs.cls}`}>{rs.label}</span>
                              </td>
                              <td>{r.pointsUsed}</td>
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

              {tab === TABS.vendors && (
                <div className='table-responsive scroll-sm'>
                  <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle'>
                    <thead>
                      <tr>
                        <SortTh label='VENDOR' sortKey='vendor' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                        <SortTh label='ORDERS' sortKey='orders' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                        <SortTh label='TOTAL REVENUE' sortKey='totalRevenue' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                        <SortTh label='COMM. REVENUE' sortKey='commissionRevenue' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                        <SortTh label='PLATFORM FEES' sortKey='platformFees' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                        <SortTh label='NET PROFIT' sortKey='netProfit' activeKey={sortV.key} dir={sortV.dir} onSort={toggleSortV} />
                      </tr>
                    </thead>
                    <tbody>
                      {sliceV.length === 0 ? (
                        <tr>
                          <td colSpan='6' className='text-center py-40 text-secondary-light'>
                            No vendors in this period.
                          </td>
                        </tr>
                      ) : (
                        sliceV.map((r, i) => (
                          <tr key={`${r.vendor}-${i}`}>
                            <td className='fw-semibold'>{r.vendor}</td>
                            <td>{r.orders}</td>
                            <td>{formatMoney(r.totalRevenue)}</td>
                            <td>{formatMoney(r.commissionRevenue)}</td>
                            <td>{formatMoney(r.platformFees)}</td>
                            <td className='fw-semibold text-success-600'>{formatMoney(r.netProfit)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === TABS.products && (
                <div className='table-responsive scroll-sm'>
                  <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle'>
                    <thead>
                      <tr>
                        <SortTh label='PRODUCT' sortKey='product' activeKey={sortP.key} dir={sortP.dir} onSort={toggleSortP} />
                        <SortTh label='VENDOR' sortKey='vendor' activeKey={sortP.key} dir={sortP.dir} onSort={toggleSortP} />
                        <SortTh label='QTY SOLD' sortKey='qty' activeKey={sortP.key} dir={sortP.dir} onSort={toggleSortP} />
                        <SortTh label='REVENUE' sortKey='revenue' activeKey={sortP.key} dir={sortP.dir} onSort={toggleSortP} />
                        <SortTh label='COMM. %' sortKey='commissionPct' activeKey={sortP.key} dir={sortP.dir} onSort={toggleSortP} />
                        <SortTh label='P4U COMMISSION' sortKey='commission' activeKey={sortP.key} dir={sortP.dir} onSort={toggleSortP} />
                      </tr>
                    </thead>
                    <tbody>
                      {sliceP.length === 0 ? (
                        <tr>
                          <td colSpan='6' className='text-center py-40 text-secondary-light'>
                            No product lines in this period.
                          </td>
                        </tr>
                      ) : (
                        sliceP.map((r, i) => (
                          <tr key={`${r.vendor}-${r.product}-${i}`}>
                            <td>{r.product}</td>
                            <td>{r.vendor}</td>
                            <td>{r.qty}</td>
                            <td>{formatMoney(r.revenue)}</td>
                            <td>{r.commissionPct > 0 ? `${Number(r.commissionPct)}%` : "0%"}</td>
                            <td className='fw-medium text-success-600'>{formatMoney(r.commission)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <PaginationFooter
                sortedLen={tab === TABS.orders ? sortedOrders.length : tab === TABS.vendors ? sortedVendors.length : sortedProducts.length}
                pageSize={pageSize}
                setPageSize={setPageSize}
                safePage={tab === TABS.orders ? safePageO : tab === TABS.vendors ? safePageV : safePageP}
                totalPages={tab === TABS.orders ? totalPagesO : tab === TABS.vendors ? totalPagesV : totalPagesP}
                setPage={tab === TABS.orders ? setPageO : tab === TABS.vendors ? setPageV : setPageP}
              />

              {!loading && orders.length >= MAX_ROWS && (
                <p className='text-secondary-light text-sm mt-16 mb-0'>Loaded up to {MAX_ROWS} orders. Narrow the date range for full exports.</p>
              )}
            </>
          )}
        </div>
      </div>
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

function PaginationFooter({ sortedLen, pageSize, setPageSize, safePage, totalPages, setPage }) {
  const start = sortedLen === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, sortedLen);
  return (
    <div className='d-flex flex-wrap align-items-center justify-content-between gap-12 mt-20'>
      <span className='text-secondary-light text-sm'>
        {start}-{end} of {sortedLen}
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
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <Icon icon='mdi:chevron-right' className='text-xl' />
          </button>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, iconCls = "" }) {
  return (
    <div className='radius-12 p-20 bg-base border h-100' style={{ borderColor: "var(--neutral-200, #e5e7eb)" }}>
      <div className='d-flex align-items-center justify-content-between gap-12'>
        <div>
          <div className='text-secondary-light text-sm mb-6'>{label}</div>
          <div className='h5 fw-bold mb-0 text-primary-light'>{value}</div>
        </div>
        <span className={`w-44-px h-44-px radius-10 d-flex align-items-center justify-content-center bg-neutral-100 flex-shrink-0 ${iconCls}`}>
          <Icon icon={icon} className='text-xl' />
        </span>
      </div>
    </div>
  );
}

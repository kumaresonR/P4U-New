import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import { listOrders, listVendors, getCustomer, updateOrder, getOrderStats } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import OrderDetailModal from "./OrderDetailModal";

const STATUS_OPTIONS = [
  { value: "", label: "Status" },
  { value: "placed", label: "Placed" },
  { value: "paid", label: "Paid" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In Progress" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const ACTIVE_STATUSES = new Set(["placed", "paid", "accepted", "in_progress", "delivered", "pending", "created", "order_await_completion"]);
const COMPLETED_STATUSES = new Set(["completed"]);

function parseMeta(m) {
  if (m == null) return {};
  if (typeof m === "string") {
    try { return JSON.parse(m) || {}; } catch { return {}; }
  }
  return typeof m === "object" && !Array.isArray(m) ? m : {};
}

function statusPill(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "delivered") return { cls: "bg-success-100 text-success-700", label: "Completed" };
  if (s === "cancelled" || s === "canceled") return { cls: "bg-danger-100 text-danger-700", label: "Cancelled" };
  if (s === "paid") return { cls: "bg-info-100 text-info-700", label: "Paid" };
  if (s === "accepted") return { cls: "bg-info-100 text-info-700", label: "Accepted" };
  if (s === "in_progress") return { cls: "bg-warning-100 text-warning-700", label: "In Progress" };
  return { cls: "bg-info-100 text-info-700", label: (status || "Placed").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
}

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

const OrderListLayer = () => {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [vendors, setVendors] = useState([]);
  const [customerById, setCustomerById] = useState({});
  const [modal, setModal] = useState(null); // { orderId, mode }
  const [globalStats, setGlobalStats] = useState(null);

  useEffect(() => {
    listVendors({ limit: 200, offset: 0 }).then((r) => setVendors(r.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    getOrderStats(params)
      .then((s) => setGlobalStats(s))
      .catch(() => setGlobalStats(null));
  }, [statusFilter, fromDate, toDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listOrders({ limit, offset });
      setOrders(res.items || []);
      setTotal(typeof res.total === "number" ? res.total : 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => { load(); }, [load]);

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
    return () => { cancelled = true; };
  }, [orders]);

  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach((v) => { m[v.id] = v.businessName || v.ownerName || "Vendor"; });
    return m;
  }, [vendors]);

  const filtered = useMemo(() => orders.filter((o) => {
    const s = (o.status || "").toLowerCase();
    if (statusFilter && s !== statusFilter) return false;
    if (fromDate) { const d = new Date(o.createdAt); if (isNaN(d) || d < new Date(fromDate)) return false; }
    if (toDate) { const d = new Date(o.createdAt); const end = new Date(toDate); end.setHours(23, 59, 59, 999); if (isNaN(d) || d > end) return false; }
    if (search.trim()) {
      const q = search.toLowerCase();
      const m = parseMeta(o.metadata);
      const cached = o.customerId ? customerById[o.customerId] : null;
      const name = (m.customerName || m.customer_name || cached?.fullName || "").toLowerCase();
      const phone = m.customerPhone || m.customer_phone || cached?.phone || "";
      return (o.orderRef || "").toLowerCase().includes(q) || name.includes(q) || phone.includes(q) || (vendorMap[o.vendorId] || "").toLowerCase().includes(q);
    }
    return true;
  }), [orders, statusFilter, fromDate, toDate, search, customerById, vendorMap]);

  const stats = useMemo(() => {
    if (globalStats && typeof globalStats.total === "number") {
      return {
        total: globalStats.total,
        revenue: Number(globalStats.revenue || 0),
        active: Number(globalStats.active || 0),
        completed: Number(globalStats.completed || 0),
      };
    }
    let revenue = 0, active = 0, completed = 0;
    filtered.forEach((o) => {
      const s = (o.status || "").toLowerCase();
      revenue += Number(o.totalAmount || 0);
      if (ACTIVE_STATUSES.has(s)) active++;
      if (COMPLETED_STATUSES.has(s)) completed++;
    });
    return { total: filtered.length, revenue, active, completed };
  }, [filtered, globalStats]);

  const cancel = async (o) => {
    if (!window.confirm(`Cancel order ${o.orderRef || o.id}?`)) return;
    try {
      const updated = await updateOrder(o.id, { status: "cancelled" });
      setOrders((prev) => prev.map((r) => r.id === o.id ? { ...r, ...updated } : r));
      toast.success("Order cancelled.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const exportCsv = () => {
    const header = ["Order ID", "Customer", "Vendor", "Subtotal", "Tax", "Discount", "Total", "Status", "Created At"];
    const rows = filtered.map((o) => {
      const m = parseMeta(o.metadata);
      const cached = o.customerId ? customerById[o.customerId] : null;
      const name = m.customerName || m.customer_name || cached?.fullName || "";
      return [
        o.orderRef || o.id,
        name,
        vendorMap[o.vendorId] || "",
        m.subtotal || m.itemMrp || "",
        m.taxAmount || m.tax || m.taxOnProduct || "",
        m.discount || m.totalDiscount || "",
        o.totalAmount || "",
        o.status || "",
        o.createdAt || "",
      ];
    });
    const csv = toCsv([header, ...rows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageFrom = total === 0 ? 0 : offset + 1;
  const pageTo = offset + orders.length;
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div>
      <div className="mb-24">
        <h3 className="fw-bold mb-0">Orders</h3>
        <span className="text-secondary-light">{total} total orders</span>
      </div>

      <div className="row g-16 mb-24">
        <StatCard title="Total Orders" value={stats.total} icon="mdi:cart-outline" iconCls="bg-neutral-100 text-secondary-light" cardCls="bg-neutral-50" />
        <StatCard title="Revenue" value={`₹${stats.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon="mdi:currency-inr" iconCls="bg-success-100 text-success-600" cardCls="bg-success-50" valueCls="text-success-600" />
        <StatCard title="Active" value={stats.active} icon="mdi:clock-outline" iconCls="bg-warning-100 text-warning-600" cardCls="bg-warning-50" valueCls="text-warning-600" />
        <StatCard title="Completed" value={stats.completed} icon="mdi:check-circle-outline" iconCls="bg-info-100 text-info-600" cardCls="bg-info-50" valueCls="text-info-600" />
      </div>

      <div className="card radius-12 p-0">
        <div className="card-body p-24">
          <div className="p4u-admin-filter-row gap-12 mb-20">
            <div className="input-group radius-8 p4u-filter-search" style={{ minWidth: 160, maxWidth: 300 }}>
              <span className="input-group-text bg-white border-end-0"><Icon icon="mdi:magnify" /></span>
              <input type="text" className="form-control border-start-0 h-40-px" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="form-select radius-8 h-40-px" style={{ minWidth: 130, maxWidth: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
            </select>
            <input type="date" className="form-control radius-8 h-40-px" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="From date" />
            <input type="date" className="form-control radius-8 h-40-px" value={toDate} onChange={(e) => setToDate(e.target.value)} title="To date" />
            <div className="p4u-admin-filter-row__end gap-8">
              <button type="button" className="btn btn-outline-secondary radius-8 d-flex align-items-center gap-8" onClick={exportCsv}>
                <Icon icon="mdi:download-outline" /> Export CSV
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger radius-12 mb-16">{error}</div>}

          {loading ? (
            <p className="text-secondary-light mb-0">Loading orders...</p>
          ) : (
            <>
              <div className="table-responsive scroll-sm" style={{ overflowX: "auto" }}>
                <table className="table bordered-table sm-table mb-0 text-nowrap" style={{ minWidth: 1040 }}>
                  <thead>
                    <tr>
                      <th>ORDER ID</th>
                      <th>CUSTOMER</th>
                      <th>VENDOR</th>
                      <th>SUBTOTAL</th>
                      <th>TAX</th>
                      <th>DISCOUNT</th>
                      <th>TOTAL</th>
                      <th>STATUS</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan="9" className="text-center py-4">No orders found.</td></tr>
                    ) : (
                      filtered.map((o) => {
                        const m = parseMeta(o.metadata);
                        const cached = o.customerId ? customerById[o.customerId] : null;
                        const custName = m.customerName || m.customer_name || cached?.fullName || "—";
                        const vendorName = vendorMap[o.vendorId] || "—";
                        const sb = statusPill(o.status);
                        const subtotal = Number(m.subtotal || m.itemMrp || 0) || 0;
                        const tax = Number(m.taxAmount || m.tax || m.taxOnProduct || 0) || 0;
                        const disc = Number(m.discount || m.totalDiscount || 0) || 0;
                        const totalAmt = Number(o.totalAmount || 0) || 0;
                        const isCancelled = (o.status || "").toLowerCase() === "cancelled";
                        return (
                          <tr key={o.id}>
                            <td className="fw-semibold">{o.orderRef || "—"}</td>
                            <td>{custName}</td>
                            <td>{vendorName}</td>
                            <td>₹{subtotal.toLocaleString("en-IN")}</td>
                            <td>₹{tax.toLocaleString("en-IN")}</td>
                            <td className={disc > 0 ? "text-success-600" : ""}>{disc > 0 ? `-₹${disc.toLocaleString("en-IN")}` : "—"}</td>
                            <td className="fw-bold">₹{totalAmt.toLocaleString("en-IN")}</td>
                            <td><span className={`px-12 py-4 radius-pill text-xs fw-medium ${sb.cls}`}>{sb.label}</span></td>
                            <td>
                              <div className="d-flex align-items-center gap-12">
                                <button type="button" className="btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-secondary-light" style={{ width: 36, height: 36 }} title="View" onClick={() => setModal({ orderId: o.id, mode: "view", customerName: custName, vendorName })}>
                                  <Icon icon="mdi:eye-outline" className="text-xl" />
                                </button>
                                <button type="button" className="btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-secondary-light" style={{ width: 36, height: 36 }} title="Edit" onClick={() => setModal({ orderId: o.id, mode: "edit", customerName: custName, vendorName })}>
                                  <Icon icon="mdi:pencil-outline" className="text-xl" />
                                </button>
                                {!isCancelled && (
                                  <button type="button" className="btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-danger-600" style={{ width: 36, height: 36 }} title="Cancel" onClick={() => cancel(o)}>
                                    <Icon icon="mdi:cancel" className="text-xl" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p4u-admin-filter-row align-items-center justify-content-between gap-2 mt-24">
                <span>Showing {pageFrom} to {pageTo} of {total} entries</span>
                <div className="d-flex gap-2 align-items-center">
                  <button type="button" className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 h-32-px text-md d-flex align-items-center justify-content-center" disabled={!canPrev} onClick={() => setOffset(Math.max(0, offset - limit))}><Icon icon="ep:d-arrow-left" /></button>
                  <span className="page-link fw-semibold radius-8 border-0 h-32-px w-32-px text-md bg-primary-600 text-white d-flex align-items-center justify-content-center mb-0">{Math.floor(offset / limit) + 1}</span>
                  <button type="button" className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 h-32-px text-md d-flex align-items-center justify-content-center" disabled={!canNext} onClick={() => setOffset(offset + limit)}><Icon icon="ep:d-arrow-right" /></button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modal && (
        <OrderDetailModal
          orderId={modal.orderId}
          initialMode={modal.mode}
          customerName={modal.customerName}
          vendorName={modal.vendorName}
          onClose={() => setModal(null)}
          onSaved={(row) => setOrders((prev) => prev.map((r) => r.id === row.id ? { ...r, ...row } : r))}
        />
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, iconCls, cardCls = "", valueCls = "" }) => (
  <div className="col-sm-6 col-xl-3">
    <div className={`radius-12 p-16 ${cardCls}`}>
      <div className="d-flex align-items-center gap-12">
        <span className={`w-40-px h-40-px radius-8 d-flex align-items-center justify-content-center ${iconCls}`}>
          <Icon icon={icon} className="text-xl" />
        </span>
        <div>
          <div className="text-secondary-light text-sm">{title}</div>
          <div className={`h5 fw-bold mb-0 ${valueCls}`}>{value}</div>
        </div>
      </div>
    </div>
  </div>
);

export default OrderListLayer;

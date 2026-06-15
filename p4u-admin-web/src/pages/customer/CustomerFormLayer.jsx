import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getCustomer,
  updateCustomer,
  listOrdersForCustomer,
  listVendors,
  listOccupations,
  listPointsSettlements,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const TEAL = "#0d9488";
const TEAL_SOFT = "#ccfbf1";

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const p = s.split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function customerDisplayRef(id) {
  if (!id) return "—";
  const hex = String(id).replace(/-/g, "").slice(-8).toUpperCase();
  return `CUST-${hex}`;
}

function formatJoin(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatShortDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
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

function profileCompleteness(c, meta, addr) {
  let n = 0;
  const add = (ok, w) => {
    if (ok) n += w;
  };
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

function orderStatusPill(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "delivered") return { cls: "bg-success-100 text-success-700", label: "Completed" };
  if (s === "cancelled" || s === "canceled") return { cls: "bg-danger-100 text-danger-700", label: "Cancelled" };
  return { cls: "bg-neutral-100 text-secondary-light", label: (status || "Placed").replace(/_/g, " ") };
}

const TABS = [
  { id: "profile", label: "Profile", icon: "mdi:file-document-outline" },
  { id: "kyc", label: "KYC", icon: "mdi:shield-check-outline" },
  { id: "orders", label: "Orders", icon: "mdi:cart-outline" },
  { id: "points", label: "Points", icon: "mdi:chart-bubble" },
];

const CustomerFormLayer = ({ isEdit = false, isView = false, customerId, onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const back = () => (onCancel ? onCancel() : navigate(-1));

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editing, setEditing] = useState(Boolean(isEdit));
  const [activeTab, setActiveTab] = useState("profile");
  const [occMap, setOccMap] = useState({});

  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [orderOffset, setOrderOffset] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [orderFrom, setOrderFrom] = useState("");
  const [orderTo, setOrderTo] = useState("");
  const [vendors, setVendors] = useState([]);

  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointRows, setPointRows] = useState([]);
  const [pointFilter, setPointFilter] = useState("all");
  const [pointsFrom, setPointsFrom] = useState("");
  const [pointsTo, setPointsTo] = useState("");

  const apply = useCallback((row) => {
    setCustomer(row);
    setEditStatus(row.status || "active");
  }, []);

  useEffect(() => {
    listOccupations({ purpose: "all" })
      .then((res) => {
        const om = {};
        (res.items || []).forEach((o) => {
          om[o.id] = o.name;
        });
        setOccMap(om);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!customerId) {
      setLoading(false);
      setLoadError("Missing customer id.");
      return;
    }
    let c = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const row = await getCustomer(customerId);
        if (!c) apply(row);
      } catch (e) {
        if (!c) {
          const msg = e instanceof ApiError ? e.message : String(e);
          setLoadError(msg);
          toast.error(msg);
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [customerId, apply]);

  useEffect(() => {
    setEditing(Boolean(isEdit));
  }, [isEdit, customerId]);

  const orderLimit = 10;

  useEffect(() => {
    if (!customerId || activeTab !== "orders") return;
    let c = false;
    (async () => {
      setOrdersLoading(true);
      try {
        const [oRes, vRes] = await Promise.all([
          listOrdersForCustomer(customerId, { limit: orderLimit, offset: orderOffset }),
          vendors.length ? Promise.resolve({ items: vendors }) : listVendors({ limit: 200, offset: 0 }),
        ]);
        if (c) return;
        setOrders(oRes.items || []);
        setOrdersTotal(typeof oRes.total === "number" ? oRes.total : 0);
        if (!vendors.length && vRes.items) setVendors(vRes.items || []);
      } catch (e) {
        if (!c) toast.error(e instanceof ApiError ? e.message : String(e));
      } finally {
        if (!c) setOrdersLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [customerId, activeTab, orderOffset]);

  useEffect(() => {
    setOrderOffset(0);
  }, [customerId]);

  useEffect(() => {
    if (!customerId || activeTab !== "points") return;
    let c = false;
    (async () => {
      setPointsLoading(true);
      try {
        const res = await listPointsSettlements({ limit: 400, offset: 0 });
        if (c) return;
        const items = res.items || [];
        const filtered = items.filter((r) => {
          const m = r.metadata || {};
          return (
            String(m.customerId || "") === customerId ||
            String(m.customerProfileId || "") === customerId ||
            String(m.userId || "") === customerId
          );
        });
        setPointRows(filtered);
      } catch {
        if (!c) setPointRows([]);
      } finally {
        if (!c) setPointsLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [customerId, activeTab]);

  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach((v) => {
      m[v.id] = v.businessName || v.ownerName || "Vendor";
    });
    return m;
  }, [vendors]);

  const meta = customer?.metadata || {};
  const addr = meta.address || meta.deliveryAddress || meta.addressJson || {};

  const pct = customer ? profileCompleteness(customer, meta, addr) : 0;

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const s = (o.status || "").toLowerCase();
      if (orderStatus && s !== orderStatus.toLowerCase()) return false;
      if (orderFrom) {
        const d = new Date(o.createdAt);
        if (Number.isNaN(d.getTime()) || d < new Date(orderFrom)) return false;
      }
      if (orderTo) {
        const d = new Date(o.createdAt);
        const end = new Date(orderTo);
        end.setHours(23, 59, 59, 999);
        if (Number.isNaN(d.getTime()) || d > end) return false;
      }
      if (!orderSearch.trim()) return true;
      const q = orderSearch.toLowerCase();
      const m = parseMeta(o.metadata);
      return (
        (o.orderRef || "").toLowerCase().includes(q) ||
        (vendorMap[o.vendorId] || "").toLowerCase().includes(q) ||
        String(m.vendorName || "").toLowerCase().includes(q)
      );
    });
  }, [orders, orderSearch, orderStatus, orderFrom, orderTo, vendorMap]);

  const orderStats = useMemo(() => {
    let pageTotal = 0;
    let rated = 0;
    filteredOrders.forEach((o) => {
      pageTotal += Number(o.totalAmount || 0) || 0;
      const m = parseMeta(o.metadata);
      if (m.rated || m.rating) rated += 1;
    });
    return {
      count: filteredOrders.length,
      pageTotal,
      rated: `${rated}/${filteredOrders.length || 1}`,
    };
  }, [filteredOrders]);

  const walletPts = Number(meta.wallet ?? meta.walletBalance ?? meta.points ?? 0) || 0;

  const filteredPoints = useMemo(() => {
    return pointRows.filter((r) => {
      const amt = Number(r.amount || 0);
      if (pointFilter === "earned" && amt <= 0) return false;
      if (pointFilter === "redeemed" && amt >= 0) return false;
      if (pointsFrom) {
        const d = new Date(r.createdAt);
        if (Number.isNaN(d.getTime()) || d < new Date(pointsFrom)) return false;
      }
      if (pointsTo) {
        const d = new Date(r.createdAt);
        const end = new Date(pointsTo);
        end.setHours(23, 59, 59, 999);
        if (Number.isNaN(d.getTime()) || d > end) return false;
      }
      return true;
    });
  }, [pointRows, pointFilter, pointsFrom, pointsTo]);

  const kycStarted = Boolean(meta.kycStatus || meta.kycDocuments || meta.panUrl || meta.aadhaarUrl);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!customerId || (!editing && isView)) return;
    setSubmitting(true);
    try {
      const updated = await updateCustomer(customerId, { status: editStatus.trim() || "active" });
      apply(updated);
      toast.success("Customer updated.");
      setEditing(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const exportOrdersCsv = () => {
    const esc = (v) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filteredOrders.map((o) => {
      const m = parseMeta(o.metadata);
      return [
        o.orderRef || o.id,
        vendorMap[o.vendorId] || "",
        m.subtotal || "",
        m.taxAmount || m.tax || "",
        m.discount || "",
        o.totalAmount || "",
        o.status || "",
        o.createdAt || "",
      ].map(esc);
    });
    const csv = [["Order ID", "Vendor", "Subtotal", "Tax", "Discount", "Total", "Status", "Created"], ...rows]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-orders-${customerId?.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const occupationLabel = customer ? occMap[customer.occupationId] || meta.occupation || "—" : "—";
  const statusLower = String(customer?.status || "").toLowerCase();
  const isActive = statusLower === "active";

  const labelCls = "text-secondary-light text-xs text-uppercase fw-semibold mb-6 d-block";
  const valueCls = "fw-semibold text-primary-light text-md";

  const canPrevOrders = orderOffset > 0;
  const canNextOrders = orderOffset + orderLimit < ordersTotal;
  const orderPage = Math.floor(orderOffset / orderLimit) + 1;
  const orderPages = Math.max(1, Math.ceil(ordersTotal / orderLimit));

  return (
    <div className="customer-detail-modal">
      {loading ? (
        <p className="text-secondary-light text-sm mb-0 py-40 text-center">Loading customer...</p>
      ) : loadError ? (
        <div className="alert alert-danger radius-12 py-12 px-16 text-sm">{loadError}</div>
      ) : customer ? (
        <>
          <div className="d-flex align-items-start gap-12 mb-20">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0 cd-avatar"
              style={{ width: 56, height: 56, background: TEAL, fontSize: "1.25rem" }}
            >
              {initials(customer.fullName)}
            </div>
            <div className="flex-grow-1 min-w-0">
              <div className="d-flex flex-wrap align-items-center gap-10 mb-4">
                <h4 className="fw-bold mb-0 text-primary-light">{customer.fullName || "—"}</h4>
                <div className="d-flex align-items-center gap-8" style={{ minWidth: 100 }}>
                  <div className="progress flex-grow-1 rounded-pill" style={{ height: 6, maxWidth: 100 }}>
                    <div
                      className="progress-bar rounded-pill"
                      role="progressbar"
                      style={{ width: `${pct}%`, backgroundColor: TEAL }}
                    />
                  </div>
                  <span className="text-secondary-light text-xs fw-medium">{pct}%</span>
                </div>
              </div>
              <p className="text-secondary-light text-sm mb-8 font-mono">{customerDisplayRef(customer.id)}</p>
              <div className="d-flex flex-wrap align-items-center gap-10">
                <span
                  className="px-12 py-4 rounded-pill text-xs fw-semibold"
                  style={{
                    background: isActive ? TEAL_SOFT : "#fee2e2",
                    color: isActive ? TEAL : "#b91c1c",
                  }}
                >
                  {(customer.status || "—").charAt(0).toUpperCase() + (customer.status || "").slice(1)}
                </span>
                <span className="text-secondary-light text-sm">Joined {formatJoin(customer.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="cd-tab-bar d-flex flex-wrap gap-4 p-6 rounded-3 mb-20 bg-neutral-100">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`btn border-0 rounded-3 px-16 py-8 d-inline-flex align-items-center gap-8 text-sm fw-medium ${
                  activeTab === t.id ? "bg-white text-primary-600 shadow-sm" : "bg-transparent text-secondary-light"
                }`}
              >
                <Icon icon={t.icon} className="text-lg" />
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "profile" && (
            <div className="mb-20">
              <div className="row g-16 mb-20">
                <div className="col-md-6">
                  <label className={labelCls}>Full Name *</label>
                  <div className={valueCls}>{customer.fullName || "—"}</div>
                </div>
                <div className="col-md-6">
                  <label className={labelCls}>Status</label>
                  <div>
                    {editing ? (
                      <select
                        className="form-select radius-10"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        disabled={submitting}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    ) : (
                      <span
                        className="px-12 py-4 rounded-pill text-xs fw-semibold d-inline-block"
                        style={{ background: isActive ? TEAL_SOFT : "#fee2e2", color: isActive ? TEAL : "#b91c1c" }}
                      >
                        {(customer.status || "—").charAt(0).toUpperCase() + (customer.status || "").slice(1)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <label className={labelCls}>Email *</label>
                  <div className={`${valueCls} d-flex align-items-center gap-8`}>
                    <Icon icon="mdi:email-outline" className="text-secondary-light" />
                    {customer.email || "—"}
                  </div>
                </div>
                <div className="col-md-6">
                  <label className={labelCls}>Mobile</label>
                  <div className={`${valueCls} d-flex align-items-center gap-8`}>
                    <Icon icon="mdi:phone-outline" className="text-secondary-light" />
                    {customer.phone || "—"}
                  </div>
                </div>
                <div className="col-md-6">
                  <label className={labelCls}>Occupation</label>
                  <div className={valueCls}>{occupationLabel}</div>
                </div>
              </div>

              <div className="row g-12">
                <div className="col-md-4">
                  <div className="radius-12 p-16 text-center border h-100" style={{ background: "#fff7ed", borderColor: "#fed7aa" }}>
                    <Icon icon="mdi:star-circle-outline" className="text-warning-600 text-2xl mb-8" />
                    <div className="fw-bold text-xl text-primary-light">{walletPts}</div>
                    <div className="text-secondary-light text-xs text-uppercase fw-semibold mt-4">Wallet Points</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="radius-12 p-16 text-center border h-100" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                    <Icon icon="mdi:gift-outline" className="text-success-600 text-2xl mb-8" />
                    <div className="fw-bold text-md text-primary-light text-break">{meta.referralCode || "—"}</div>
                    <div className="text-secondary-light text-xs text-uppercase fw-semibold mt-4">Referral Code</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="radius-12 p-16 text-center border h-100" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
                    <Icon icon="mdi:calendar-month-outline" className="text-primary-600 text-2xl mb-8" />
                    <div className="fw-bold text-md text-primary-light">{formatJoin(customer.createdAt)}</div>
                    <div className="text-secondary-light text-xs text-uppercase fw-semibold mt-4">Member Since</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "kyc" && (
            <div className="py-40 text-center mb-20">
              {kycStarted ? (
                <p className="text-secondary-light mb-0">KYC metadata is attached to this profile. Expand metadata in admin tools if needed.</p>
              ) : (
                <>
                  <Icon icon="mdi:shield-check-outline" className="text-neutral-300 mb-12" style={{ fontSize: 48 }} />
                  <h6 className="fw-semibold text-secondary-light mb-8">No KYC documents submitted yet</h6>
                  <span className="px-12 py-4 rounded-pill bg-neutral-100 text-secondary-light text-xs fw-medium">KYC Not Started</span>
                </>
              )}
            </div>
          )}

          {activeTab === "orders" && (
            <div className="mb-20">
              <div className="p4u-admin-filter-row gap-10 mb-16">
                <div className="input-group radius-10 p4u-filter-search" style={{ minWidth: 160, maxWidth: 300 }}>
                  <span className="input-group-text bg-white border-end-0">
                    <Icon icon="mdi:magnify" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 h-40-px"
                    placeholder="Search order ID or vendor..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                </div>
                <select className="form-select radius-10 h-40-px" style={{ minWidth: 120, maxWidth: 180 }} value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
                  <option value="">All…</option>
                  <option value="completed">Completed</option>
                  <option value="placed">Placed</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <input type="date" className="form-control radius-10 h-40-px" value={orderFrom} onChange={(e) => setOrderFrom(e.target.value)} title="From date" />
                <input type="date" className="form-control radius-10 h-40-px" value={orderTo} onChange={(e) => setOrderTo(e.target.value)} title="To date" />
                <div className="p4u-admin-filter-row__end gap-8">
                  <button type="button" className="btn btn-outline-secondary radius-10 d-flex align-items-center gap-8" onClick={exportOrdersCsv}>
                    <Icon icon="mdi:download-outline" /> Export
                  </button>
                </div>
              </div>

              <div className="row g-12 mb-16">
                <div className="col-md-4">
                  <div className="radius-12 p-14 border bg-base text-center">
                    <div className="fw-bold text-xl text-primary-light">{orderStats.count}</div>
                    <div className="text-secondary-light text-xs">Total Orders</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="radius-12 p-14 border bg-base text-center">
                    <div className="fw-bold text-xl text-success-600">₹{orderStats.pageTotal.toLocaleString("en-IN")}</div>
                    <div className="text-secondary-light text-xs">Page Total</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="radius-12 p-14 border bg-base text-center">
                    <div className="fw-bold text-xl text-warning-600">{orderStats.rated}</div>
                    <div className="text-secondary-light text-xs">Rated</div>
                  </div>
                </div>
              </div>

              {ordersLoading ? (
                <p className="text-secondary-light text-sm">Loading orders…</p>
              ) : (
                <div className="d-flex flex-column gap-12">
                  {filteredOrders.length === 0 ? (
                    <p className="text-secondary-light text-sm mb-0">No orders for this customer.</p>
                  ) : (
                    filteredOrders.map((o) => {
                      const m = parseMeta(o.metadata);
                      const pill = orderStatusPill(o.status);
                      const line = Array.isArray(m.lines) && m.lines[0] ? m.lines[0] : null;
                      const lineLabel = line ? `${line.title || line.name || "Item"} ×${line.qty || line.quantity || 1}` : "—";
                      const sub = Number(m.subtotal || m.itemMrp || 0) || 0;
                      const tax = Number(m.taxAmount || m.tax || 0) || 0;
                      const disc = Number(m.discount || m.totalDiscount || 0) || 0;
                      const totalAmt = Number(o.totalAmount || 0) || 0;
                      return (
                        <div key={o.id} className="radius-12 border p-16 bg-base">
                          <div className="d-flex justify-content-between align-items-start flex-wrap gap-8 mb-8">
                            <span className="fw-semibold text-sm">{o.orderRef || o.id}</span>
                            <span className={`px-10 py-2 rounded-pill text-xs fw-medium ${pill.cls}`}>{pill.label}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-8 mb-6">
                            <span className="fw-bold">{vendorMap[o.vendorId] || m.vendorName || "—"}</span>
                            <span className="fw-bold">₹{totalAmt.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="mb-8">
                            <span className="px-8 py-2 rounded-pill bg-neutral-100 text-secondary-light text-xs d-inline-flex align-items-center gap-4">
                              <Icon icon="mdi:package-variant" /> {lineLabel}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between text-xs text-secondary-light flex-wrap gap-8">
                            <span>
                              Sub: ₹{sub.toLocaleString("en-IN")} · Tax: ₹{tax.toLocaleString("en-IN")} · Disc: -₹
                              {disc.toLocaleString("en-IN")}
                            </span>
                            <span>{m.rated || m.rating ? "Rated" : "Not rated"} · {formatShortDate(o.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <div className="p4u-admin-filter-row justify-content-between align-items-center mt-16 gap-8">
                <span className="text-secondary-light text-sm">
                  Page {orderPage} of {orderPages}
                </span>
                <div className="d-flex gap-8">
                  <button
                    type="button"
                    className="btn btn-light border radius-8"
                    disabled={!canPrevOrders}
                    onClick={() => setOrderOffset(Math.max(0, orderOffset - orderLimit))}
                  >
                    <Icon icon="mdi:chevron-left" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-light border radius-8"
                    disabled={!canNextOrders}
                    onClick={() => setOrderOffset(orderOffset + orderLimit)}
                  >
                    <Icon icon="mdi:chevron-right" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "points" && (
            <div className="mb-20">
              <div className="p4u-admin-filter-row gap-8 mb-16">
                {["all", "earned", "redeemed"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setPointFilter(f)}
                    className={`btn btn-sm radius-10 px-16 py-8 ${pointFilter === f ? "text-white border-0" : "btn-outline-secondary"}`}
                    style={pointFilter === f ? { background: TEAL } : {}}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <div className="p4u-admin-filter-row__end gap-8">
                  <input type="date" className="form-control form-control-sm radius-10" style={{ maxWidth: 150 }} value={pointsFrom} onChange={(e) => setPointsFrom(e.target.value)} />
                  <input type="date" className="form-control form-control-sm radius-10" style={{ maxWidth: 150 }} value={pointsTo} onChange={(e) => setPointsTo(e.target.value)} />
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm radius-10 d-flex align-items-center gap-6"
                    onClick={() => {
                      const esc = (v) => {
                        const s = v == null ? "" : String(v);
                        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                      };
                      const rows = filteredPoints.map((r) => {
                        const m = r.metadata || {};
                        return [r.id, m.description || "", r.amount, r.createdAt].map(esc).join(",");
                      });
                      const csv = ["id,description,amount,created", ...rows].join("\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `customer-points-${customerId?.slice(0, 8)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Icon icon="mdi:download-outline" /> Export
                  </button>
                </div>
              </div>

              <div className="row g-12 mb-16">
                <div className="col-md-6">
                  <div className="radius-12 p-16 border text-center" style={{ background: "#f0fdfa", borderColor: "#99f6e4" }}>
                    <div className="fw-bold text-2xl" style={{ color: TEAL }}>
                      {walletPts}
                    </div>
                    <div className="text-secondary-light text-xs text-uppercase fw-semibold mt-4">Current Balance</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="radius-12 p-16 border bg-base text-center">
                    <div className="fw-bold text-2xl text-primary-light">{pointRows.length}</div>
                    <div className="text-secondary-light text-xs text-uppercase fw-semibold mt-4">Total Transactions</div>
                  </div>
                </div>
              </div>

              {pointsLoading ? (
                <p className="text-secondary-light text-sm">Loading points…</p>
              ) : filteredPoints.length === 0 ? (
                <p className="text-secondary-light text-sm mb-0">No point movements found for this customer.</p>
              ) : (
                <div className="d-flex flex-column gap-10">
                  {filteredPoints.map((r) => {
                    const m = r.metadata || {};
                    const amt = Number(r.amount || 0);
                    const tag = m.tag || m.reason || (amt >= 0 ? "credit" : "debit");
                    return (
                      <div key={r.id} className="d-flex align-items-center justify-content-between flex-wrap gap-10 radius-10 border p-12 bg-base">
                        <div className="d-flex align-items-center gap-10 min-w-0">
                          <span className="px-8 py-2 rounded-pill text-xs fw-semibold" style={{ background: TEAL_SOFT, color: TEAL }}>
                            {String(tag)}
                          </span>
                          <div className="min-w-0">
                            <div className="fw-medium text-sm text-primary-light text-truncate">{m.description || m.note || "Points adjustment"}</div>
                            <div className="text-secondary-light text-xs">{formatShortDate(r.createdAt)}</div>
                          </div>
                        </div>
                        <span className="fw-bold" style={{ color: amt >= 0 ? TEAL : "#dc2626" }}>
                          {amt >= 0 ? "+" : ""}
                          {amt}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="d-flex justify-content-between align-items-center mt-12 text-secondary-light text-sm">
                <span>Page 1 of 1</span>
                <div className="d-flex gap-4">
                  <button type="button" className="btn btn-light btn-sm border rounded-circle p-4" disabled>
                    <Icon icon="mdi:chevron-left" />
                  </button>
                  <button type="button" className="btn btn-light btn-sm border rounded-circle p-4" disabled>
                    <Icon icon="mdi:chevron-right" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="border-top pt-16 mt-8">
            <div className="d-flex align-items-center gap-10 mb-16">
              <span className="text-secondary-light text-sm fw-medium flex-grow-1">Profile Completeness</span>
              <span className="text-secondary-light text-sm fw-semibold">{pct}%</span>
            </div>
            <div className="progress rounded-pill mb-16" style={{ height: 8 }}>
              <div className="progress-bar rounded-pill" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
            </div>
            <div className="d-flex justify-content-end gap-10 flex-wrap">
              <button type="button" className="btn btn-light border radius-10 px-20" onClick={back}>
                Close
              </button>
              {isView && !editing ? (
                <button type="button" className="btn radius-10 px-20 text-white border-0" style={{ background: TEAL }} onClick={() => setEditing(true)}>
                  Edit
                </button>
              ) : null}
              {editing ? (
                <>
                  <button
                    type="button"
                    className="btn btn-light border radius-10 px-20"
                    onClick={() => {
                      if (isEdit) back();
                      else setEditing(false);
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="button" className="btn radius-10 px-20 text-white border-0" style={{ background: TEAL }} disabled={submitting} onClick={onSubmit}>
                    {submitting ? "Saving…" : "Save"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default CustomerFormLayer;

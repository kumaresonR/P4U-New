import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import { getOrder, updateOrder } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const STEPS = ["placed", "paid", "accepted", "in_progress", "delivered", "completed"];
const STEP_LABELS = {
  placed: "Placed",
  paid: "Paid",
  accepted: "Accepted",
  in_progress: "In Progress",
  delivered: "Delivered",
  completed: "Completed",
};
const STATUS_OPTIONS = ["placed", "paid", "accepted", "in_progress", "delivered", "completed", "cancelled"];

function parseMeta(m) {
  if (m == null) return {};
  if (typeof m === "string") {
    try { return JSON.parse(m) || {}; } catch { return {}; }
  }
  return typeof m === "object" && !Array.isArray(m) ? m : {};
}

function statusIndex(status) {
  const s = (status || "").toLowerCase();
  if (s === "pending" || s === "created") return 0;
  return STEPS.indexOf(s);
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

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, "0");
  const min = String(dt.getMinutes()).padStart(2, "0");
  const ss = String(dt.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}:${ss}`;
}

const OrderDetailModal = ({ orderId, initialMode = "view", onClose, onSaved, customerName, vendorName }) => {
  const [mode, setMode] = useState(initialMode);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    setLoading(true);
    getOrder(orderId)
      .then((row) => { if (!cancelled) { setOrder(row); setStatus(row?.status || ""); } })
      .catch((e) => { if (!cancelled) toast.error(e instanceof ApiError ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  const meta = useMemo(() => parseMeta(order?.metadata), [order]);
  const items = useMemo(() => {
    const r = meta.lines ?? meta.items ?? meta.lineItems ?? meta.orderItems;
    return Array.isArray(r) ? r : [];
  }, [meta]);

  const currentIdx = statusIndex(order?.status);
  const pill = statusPill(order?.status);

  const itemTotal = Number(meta.subtotal ?? meta.itemMrp ?? items.reduce((s, r) => s + Number(r.unitPrice || r.price || 0) * Number(r.quantity || r.qty || 1), 0)) || 0;
  const discount = Number(meta.totalDiscount ?? meta.discount ?? 0) || 0;
  const points = Number(meta.pointsRedeemed ?? meta.points ?? 0) || 0;
  const platformFee = Number(meta.platformFee ?? 0) || 0;
  const gstOnFee = Number(meta.gstOnPlatformFee ?? (platformFee ? platformFee * 0.18 : 0)) || 0;
  const productTax = Number(meta.taxOnProduct ?? meta.taxAmount ?? meta.tax ?? 0) || 0;
  const grandTotal = Number(order?.totalAmount ?? meta.totalOrderValue ?? 0) || 0;
  const paymentRef = meta.paymentRefId || meta.paymentReferenceId || meta.paymentRef || order?.paymentRef || "—";

  const save = async () => {
    if (!orderId) return;
    setSaving(true);
    try {
      const updated = await updateOrder(orderId, { status });
      toast.success("Order updated.");
      setOrder(updated);
      onSaved && onSaved(updated);
      onClose && onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
      onClick={onClose}
    >
      <div
        className="bg-white radius-12 shadow-lg"
        style={{ width: "min(720px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-24">
          {loading ? (
            <p className="text-secondary-light mb-0">Loading order...</p>
          ) : !order ? (
            <p className="text-secondary-light mb-0">Order not found.</p>
          ) : (
            <>
              <div className="d-flex align-items-start justify-content-between mb-16">
                <div className="d-flex gap-12 align-items-center">
                  <span className="bg-success-600 text-white w-48-px h-48-px radius-8 d-flex align-items-center justify-content-center">
                    <Icon icon="mdi:cart-outline" className="text-2xl" />
                  </span>
                  <div>
                    <h4 className="fw-bold mb-0">{order.orderRef || order.id}</h4>
                    <span className="text-secondary-light text-sm">{formatDate(order.createdAt)}</span>
                    <div className="mt-4">
                      <span className={`px-12 py-4 radius-pill text-xs fw-medium ${pill.cls}`}>{pill.label}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="border-0 bg-transparent p-8 text-secondary-light lh-1"
                  aria-label="Close"
                  onClick={onClose}
                >
                  <Icon icon="mdi:close" className="text-2xl" />
                </button>
              </div>

              <div className="d-flex gap-2 mb-24 mt-16">
                {STEPS.map((s, i) => {
                  const done = currentIdx >= 0 && i <= currentIdx;
                  return (
                    <div key={s} className="flex-fill">
                      <div className={`h-6-px radius-pill ${done ? "bg-success-600" : "bg-neutral-200"}`} style={{ height: 6 }} />
                      <span className={`text-xs mt-6 d-block ${done ? "text-primary-light fw-semibold" : "text-secondary-light"}`}>{STEP_LABELS[s]}</span>
                    </div>
                  );
                })}
              </div>

              <div className="row g-12 mb-20">
                <div className="col-6">
                  <div className="border radius-8 p-12 d-flex align-items-center gap-8">
                    <Icon icon="mdi:account-outline" className="text-2xl text-primary-600" />
                    <div>
                      <div className="text-secondary-light text-xs">Customer</div>
                      <div className="fw-semibold">{customerName || meta.customerName || meta.customer_name || "—"}</div>
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="border radius-8 p-12 d-flex align-items-center gap-8">
                    <Icon icon="mdi:storefront-outline" className="text-2xl text-primary-600" />
                    <div>
                      <div className="text-secondary-light text-xs">Vendor</div>
                      <div className="fw-semibold">{vendorName || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-8 mb-12">
                <Icon icon="mdi:package-variant-closed" className="text-xl text-primary-600" />
                <h6 className="fw-semibold mb-0">Order Items</h6>
              </div>
              <div className="border radius-8 p-12 mb-16">
                {items.length === 0 ? (
                  <span className="text-secondary-light text-sm">No line items.</span>
                ) : (
                  items.map((row, i) => {
                    const name = row.name || row.productName || row.title || (row.metadata && row.metadata.productName) || "—";
                    const qty = row.quantity || row.qty || 1;
                    const price = Number(row.lineTotal || row.total || row.finalPrice || (Number(row.unitPrice || row.price || 0) * qty)) || 0;
                    return (
                      <div key={i} className={`d-flex align-items-center justify-content-between ${i > 0 ? "mt-12 pt-12 border-top" : ""}`}>
                        <div className="d-flex gap-12 align-items-center">
                          <div className="bg-neutral-100 radius-8" style={{ width: 48, height: 48 }} />
                          <div>
                            <div className="fw-semibold">{name}</div>
                            <div className="text-secondary-light text-xs">Qty: {qty}</div>
                          </div>
                        </div>
                        <span className="fw-semibold">₹{price.toLocaleString("en-IN")}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border radius-8 p-16 mb-16">
                <Row label="Item Total (MRP)" value={`₹${itemTotal.toLocaleString("en-IN")}`} />
                <Row label="Discount" value={`-₹${discount.toLocaleString("en-IN")}`} valueClass="text-success-600" show={discount > 0} />
                <Row label="Points Redeemed" value={`${points} pts`} valueClass="text-primary-600" show={points > 0} />
                <Row label="Platform Fee" value={`₹${platformFee.toLocaleString("en-IN")}`} show={platformFee > 0} />
                <Row label="GST on Platform Fee (18%)" value={`₹${gstOnFee.toFixed(2)}`} show={gstOnFee > 0} />
                <Row label="Product Tax" value={`₹${productTax.toLocaleString("en-IN")}`} show={productTax > 0} />
                <div className="d-flex justify-content-between py-12 mt-8 border-top">
                  <span className="fw-bold">Grand Total</span>
                  <span className="fw-bold">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="d-flex justify-content-between mt-8">
                  <span className="text-secondary-light">Payment Ref ID</span>
                  <span className="text-secondary-light">{paymentRef}</span>
                </div>
              </div>

              {mode === "edit" && (
                <div className="border border-primary-200 bg-primary-50 radius-8 p-16 mb-16">
                  <label className="form-label text-sm fw-semibold">Update Order Status</label>
                  <select className="form-select radius-8" value={status} onChange={(e) => setStatus(e.target.value)} disabled={saving}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="d-flex justify-content-end gap-12">
                {mode === "view" ? (
                  <>
                    <button type="button" className="btn btn-outline-secondary radius-8 px-24 py-8" onClick={onClose}>Close</button>
                    <button type="button" className="btn btn-primary radius-8 px-24 py-8" onClick={() => setMode("edit")}>Edit Status</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-outline-secondary radius-8 px-24 py-8" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="button" className="btn btn-primary radius-8 px-24 py-8" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, valueClass = "", show = true }) => {
  if (!show) return null;
  return (
    <div className="d-flex justify-content-between py-6">
      <span className="text-secondary-light">{label}</span>
      <span className={`fw-medium ${valueClass}`}>{value}</span>
    </div>
  );
};

export default OrderDetailModal;

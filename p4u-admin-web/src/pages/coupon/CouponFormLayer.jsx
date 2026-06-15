import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  createCoupon,
  fetchCouponById,
  updateCoupon,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

function pad(n) {
  return String(n).padStart(2, "0");
}

function isoToDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(s) {
  if (!s || !String(s).trim()) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function stringifyJson(v) {
  if (v == null) return "";
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function parseDiscountJson(text) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    throw new Error("Invalid JSON in discount");
  }
}

const empty = () => ({
  code: "",
  title: "",
  status: "active",
  discountJsonText: "",
  validFromLocal: "",
  validToLocal: "",
});

const CouponFormLayer = ({ isEdit = false, isView = false, couponId, onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(Boolean(couponId));
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const apply = useCallback((row) => {
    setForm({
      code: row.code || "",
      title: row.title || "",
      status: row.status || "active",
      discountJsonText: stringifyJson(row.discountJson),
      validFromLocal: isoToDatetimeLocal(row.validFrom),
      validToLocal: isoToDatetimeLocal(row.validTo),
    });
  }, []);

  useEffect(() => {
    if (!couponId) {
      setLoading(false);
      return;
    }
    let c = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const row = await fetchCouponById(couponId);
        if (!row) {
          if (!c) {
            setLoadError("Coupon not found. Open edit from the coupons list.");
            toast.error("Coupon not found");
          }
        } else if (!c) apply(row);
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
  }, [couponId, apply]);

  const handleChange = (e) => {
    if (isView) return;
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;
    let discountJson;
    try {
      discountJson = parseDiscountJson(form.discountJsonText);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      return;
    }
    const body = {
      code: form.code.trim(),
      title: form.title.trim(),
      status: form.status.trim() || "active",
      discountJson,
      validFrom: datetimeLocalToIso(form.validFromLocal),
      validTo: datetimeLocalToIso(form.validToLocal),
    };
    if (!body.code || !body.title) {
      toast.error("Code and title are required.");
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit && couponId) {
        await updateCoupon(couponId, body);
        toast.success("Coupon updated.");
      } else {
        await createCoupon(body);
        toast.success("Coupon created.");
      }
      if (onSuccess) onSuccess(); else navigate("/coupons");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const dis = isView || submitting || loading;

  return (
    <div className="card h-100 p-0 radius-12">
      <div className="card-header border-bottom bg-base py-16 px-24">
        <h4 className="text-lg fw-semibold mb-0">
          {isView ? "View Coupon" : isEdit ? "Edit Coupon" : "Add Coupon"}
        </h4>
      </div>
      <div className="card-body p-24">
        {loadError && couponId && !loading && (
          <div className="alert alert-danger radius-12 mb-16" role="alert">
            {loadError}
          </div>
        )}
        {loading ? (
          <p className="text-secondary-light mb-0">Loading coupon...</p>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="row">
              <div className="col-md-6 mb-20">
                <label className="form-label fw-semibold text-sm mb-8">
                  Code <span className="text-danger-600">*</span>
                </label>
                <input
                  name="code"
                  className="form-control radius-8"
                  value={form.code}
                  onChange={handleChange}
                  disabled={dis}
                  maxLength={64}
                  required
                />
              </div>
              <div className="col-md-6 mb-20">
                <label className="form-label fw-semibold text-sm mb-8">
                  Title <span className="text-danger-600">*</span>
                </label>
                <input
                  name="title"
                  className="form-control radius-8"
                  value={form.title}
                  onChange={handleChange}
                  disabled={dis}
                  maxLength={255}
                  required
                />
              </div>
              <div className="col-md-6 mb-20">
                <label className="form-label fw-semibold text-sm mb-8">Status</label>
                <input
                  name="status"
                  className="form-control radius-8"
                  value={form.status}
                  onChange={handleChange}
                  disabled={dis}
                  maxLength={32}
                />
              </div>
              <div className="col-md-6 mb-20">
                <label className="form-label fw-semibold text-sm mb-8">Valid from</label>
                <input
                  type="datetime-local"
                  name="validFromLocal"
                  className="form-control radius-8"
                  value={form.validFromLocal}
                  onChange={handleChange}
                  disabled={dis}
                />
              </div>
              <div className="col-md-6 mb-20">
                <label className="form-label fw-semibold text-sm mb-8">Valid to</label>
                <input
                  type="datetime-local"
                  name="validToLocal"
                  className="form-control radius-8"
                  value={form.validToLocal}
                  onChange={handleChange}
                  disabled={dis}
                />
              </div>
              <div className="col-12 mb-20">
                <label className="form-label fw-semibold text-sm mb-8">Discount (JSON)</label>
                <textarea
                  name="discountJsonText"
                  className="form-control radius-8 text-sm"
                  style={{ fontFamily: "monospace" }}
                  rows={6}
                  value={form.discountJsonText}
                  onChange={handleChange}
                  disabled={dis}
                />
              </div>
            </div>
            <div className="d-flex justify-content-between mt-24">
              <button
                type="button"
                onClick={() => (onCancel ? onCancel() : navigate(-1))}
                className="btn border border-danger-600 text-danger-600 radius-8 px-56 py-12 d-flex align-items-center gap-2"
              >
                <Icon icon="mdi:close-circle-outline" className="text-xl" /> {isView ? "Back" : "Cancel"}
              </button>
              {!isView && (
                <button
                  type="submit"
                  disabled={dis}
                  className="btn btn-primary radius-8 px-56 py-12 d-flex align-items-center gap-2"
                >
                  <Icon icon="lucide:save" className="text-xl" /> {submitting ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CouponFormLayer;

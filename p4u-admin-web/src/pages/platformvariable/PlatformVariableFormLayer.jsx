import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { createPlatformVariable, updatePlatformVariable, listPlatformVariables } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const VARIABLE_TYPES = [
  "PLATFORM_FEE", "VENDOR_PENALTY", "CUSTOMER_PENALTY", "WELCOME_BONUS",
  "WELCOME_BONUS_AMOUNT", "WELCOME_BONUS_MIN_ORDER_VALUE", "REFERRAL_BONUS",
  "VENDOR_REFERRAL_BONUS", "BONUS_PER_LIKES", "BONUS_PER_VIEWS", "BONUS_PER_SHARES",
  "POINTS_PER_RUPPEE", "ADVERTISEMENT_PER_POSTS", "BRONZE_CUT", "SILVER_CUT",
  "GOLD_CUT", "PLATINUM_CUT", "PLATINUM_CUT", "POINTS_VALIDITY",
  "POINTS_VALIDITY_MESSAGE", "POINTS_UTILIZATION_COOLDOWN_TIMER",
  "BRANDED_PRODUCT_PERCENTAGE_CUT", "ORDER_CANCELLATION_NOTE_CUSTOMER",
  "VENDOR_APP_VERSION", "CUSTOMER_APP_VERSION",
];
const CURRENCY_TYPES = ["Ruppees", "Points", "None"];
const VALUE_TYPES = ["FLAT", "PERCENTAGE", "TEXT"];

const emptyForm = () => ({
  variableType: "PLATFORM_FEE",
  currencyType: "",
  valueType: "FLAT",
  value: "0",
  description: "",
});

const PlatformVariableFormLayer = ({ isEdit = false, isView = false, variableId, onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(Boolean(variableId));
  const [submitting, setSubmitting] = useState(false);
  const [existingRow, setExistingRow] = useState(null);

  useEffect(() => {
    if (!variableId) { setLoading(false); return; }
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listPlatformVariables({ limit: 200, offset: 0 });
        const row = (res.items || []).find((r) => r.id === variableId);
        if (!c && row) {
          setExistingRow(row);
          const v = typeof row.value === "object" && row.value !== null ? row.value : {};
          setFormData({
            variableType: row.key || "",
            currencyType: v.currencyType || "",
            valueType: v.valueType || "FLAT",
            value: v.amount != null ? String(v.amount) : (v.text || ""),
            description: v.description || "",
          });
        }
      } catch (e) {
        if (!c) toast.error(e instanceof ApiError ? e.message : String(e));
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => { c = true; };
  }, [variableId]);

  const handleChange = (e) => {
    if (isView) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;
    setSubmitting(true);
    try {
      const payload = {
        key: formData.variableType,
        value: {
          currencyType: formData.currencyType || "None",
          valueType: formData.valueType,
          amount: formData.valueType !== "TEXT" ? Number(formData.value) || 0 : undefined,
          text: formData.valueType === "TEXT" ? formData.value : undefined,
          description: formData.description,
        },
        category: "platform",
      };
      if (isEdit && variableId) {
        await updatePlatformVariable(variableId, payload);
        toast.success("Variable updated.");
      } else {
        await createPlatformVariable(payload);
        toast.success("Variable created.");
      }
      if (onSuccess) onSuccess(); else navigate("/platform-variables");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => setFormData(emptyForm());
  const disabled = isView || submitting || loading;
  const title = isView ? "View Platform Variable" : isEdit ? "Edit Platform Variable" : "Add Platform Variable";

  return (
    <div className="card h-100 p-0 radius-12 border-0 shadow-none">
      <div className="card-body p-24">
        <div className="d-flex align-items-start justify-content-between mb-16">
          <div>
            <h4 className="fw-bold mb-4 text-primary-light">{title}</h4>
            <p className="text-secondary-light mb-0">
              Configure platform variable details. Layout matches Customer module style.
            </p>
          </div>
          <span className="px-12 py-4 rounded-pill text-xs fw-semibold bg-neutral-100 text-secondary-light">
            {isView ? "Read only" : isEdit ? "Update mode" : "Create mode"}
          </span>
        </div>

        <div className="d-flex flex-wrap gap-4 p-6 rounded-3 mb-20 bg-neutral-100">
          <button type="button" className="btn border-0 rounded-3 px-16 py-8 bg-white text-primary-600 shadow-sm text-sm fw-medium">
            <Icon icon="mdi:file-document-outline" className="text-lg me-6" />
            Variable
          </button>
        </div>

        {loading ? <p className="text-secondary-light">Loading...</p> : (
          <form onSubmit={handleSubmit}>
            <div className="row g-16">
              <div className="col-md-6">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Variable Type</label>
                <select className="form-control radius-8 form-select mb-8" value={VARIABLE_TYPES.includes(formData.variableType) ? formData.variableType : "__custom__"} onChange={(e) => { if (e.target.value !== "__custom__") setFormData((p) => ({ ...p, variableType: e.target.value })); else setFormData((p) => ({ ...p, variableType: "" })); }} disabled={disabled}>
                  {VARIABLE_TYPES.map((v) => (<option key={v} value={v}>{v}</option>))}
                  <option value="__custom__">-- Custom (type below) --</option>
                </select>
                {!VARIABLE_TYPES.includes(formData.variableType) && (
                  <input type="text" className="form-control radius-8" name="variableType" value={formData.variableType} onChange={handleChange} disabled={disabled} placeholder="Enter custom variable type..." />
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Currency Type</label>
                <select className="form-control radius-8 form-select" name="currencyType" value={formData.currencyType} onChange={handleChange} disabled={disabled}>
                  <option value="">Select...</option>
                  {CURRENCY_TYPES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Value Type</label>
                <select className="form-control radius-8 form-select" name="valueType" value={formData.valueType} onChange={handleChange} disabled={disabled}>
                  {VALUE_TYPES.map((v) => (<option key={v} value={v}>{v}</option>))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Value (&#8377;)</label>
                <input type={formData.valueType === "TEXT" ? "text" : "number"} className="form-control radius-8" name="value" value={formData.value} onChange={handleChange} disabled={disabled} />
              </div>
              <div className="col-md-12">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Description</label>
                <textarea className="form-control radius-8" name="description" rows={5} value={formData.description} onChange={handleChange} disabled={disabled} />
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-end gap-10 mt-24">
              <button type="button" onClick={isView ? (onCancel || (() => navigate(-1))) : handleReset} className="btn border border-danger-600 text-danger-600 bg-hover-danger-200 text-md px-56 py-12 radius-8">
                {isView ? "Back" : "Reset"}
              </button>
              {!isView && (
                <button type="submit" disabled={disabled} className="btn btn-primary text-md px-56 py-12 radius-8">
                  {submitting ? "Saving..." : isEdit ? "Update" : "Save"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PlatformVariableFormLayer;

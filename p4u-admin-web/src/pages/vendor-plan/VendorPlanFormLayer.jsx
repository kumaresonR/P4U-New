import React, { useMemo, useState } from "react";
import {
  createVendorPlan,
  updateVendorPlan,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const DEFAULT_FORM = {
  planName: "",
  description: "",
  planType: "local",
  tier: 1,
  price: "0",
  validityDays: 30,
  visibilityType: "radius",
  radiusKm: "5",
  commissionPercent: "10",
  maxUserRedemptionPercent: "5",
  paymentMode: "both",
  promoBannerAds: false,
  promoVideoAds: false,
  promoPriorityListing: false,
  isActive: true,
};

const VendorPlanFormLayer = ({ isEdit = false, initialData = null, onSuccess, onCancel }) => {
  const [form, setForm] = useState(() => ({
    ...DEFAULT_FORM,
    ...(initialData || {}),
    radiusKm: initialData?.radiusKm ?? "5",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(() => (isEdit ? "Edit Vendor Plan" : "Add Vendor Plan"), [isEdit]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!String(form.planName || "").trim()) {
      setError("Plan name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        planName: String(form.planName).trim(),
        description: String(form.description || "").trim() || null,
        planType: form.planType,
        tier: Number(form.tier) || 1,
        price: String(form.price ?? "0"),
        validityDays: Number(form.validityDays) || 30,
        visibilityType: form.visibilityType,
        radiusKm: form.visibilityType === "radius" ? String(form.radiusKm || "5") : undefined,
        commissionPercent: String(form.commissionPercent ?? "0"),
        maxUserRedemptionPercent: String(form.maxUserRedemptionPercent ?? "0"),
        paymentMode: form.paymentMode,
        promoBannerAds: !!form.promoBannerAds,
        promoVideoAds: !!form.promoVideoAds,
        promoPriorityListing: !!form.promoPriorityListing,
        isActive: !!form.isActive,
      };

      if (isEdit && initialData?.id) await updateVendorPlan(initialData.id, payload);
      else await createVendorPlan(payload);
      onSuccess && onSuccess();
    } catch (e1) {
      setError(e1 instanceof ApiError ? e1.message : String(e1));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='card h-100 p-0 radius-12'>
      <div className='card-header border-bottom bg-base py-16 px-24'>
        <h4 className='text-lg fw-semibold mb-0'>{title}</h4>
      </div>
      <div className='card-body p-24'>
        {error && <div className='alert alert-danger mb-16'>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className='row'>
            <div className='col-md-12 mb-20'>
              <label className='form-label'>Plan Name *</label>
              <input className='form-control radius-8' value={form.planName} onChange={(e) => setField("planName", e.target.value)} placeholder='e.g. Premium' />
            </div>

            <div className='col-md-12 mb-20'>
              <label className='form-label'>Description</label>
              <textarea className='form-control radius-8' rows={3} value={form.description || ""} onChange={(e) => setField("description", e.target.value)} placeholder='Plan description...' />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label'>Plan Type</label>
              <select className='form-select radius-8' value={form.planType} onChange={(e) => setField("planType", e.target.value)}>
                <option value='local'>Local</option>
                <option value='vip'>VIP</option>
              </select>
            </div>
            <div className='col-md-6 mb-20'>
              <label className='form-label'>Tier (sort order)</label>
              <input type='number' min={1} className='form-control radius-8' value={form.tier} onChange={(e) => setField("tier", e.target.value)} />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label'>Price (INR)</label>
              <input type='number' min={0} step='0.01' className='form-control radius-8' value={form.price} onChange={(e) => setField("price", e.target.value)} />
            </div>
            <div className='col-md-6 mb-20'>
              <label className='form-label'>Validity (days)</label>
              <input type='number' min={1} className='form-control radius-8' value={form.validityDays} onChange={(e) => setField("validityDays", e.target.value)} />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label'>Visibility Type</label>
              <select className='form-select radius-8' value={form.visibilityType} onChange={(e) => setField("visibilityType", e.target.value)}>
                <option value='radius'>Radius Based</option>
                <option value='city'>City</option>
                <option value='state'>State</option>
                <option value='country'>Country</option>
              </select>
            </div>
            <div className='col-md-6 mb-20'>
              <label className='form-label'>Radius (km)</label>
              <input type='number' min={1} step='0.1' disabled={form.visibilityType !== "radius"} className='form-control radius-8' value={form.radiusKm || ""} onChange={(e) => setField("radiusKm", e.target.value)} />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label'>Vendor to P4U Commission %</label>
              <input type='number' min={0} max={100} step='0.01' className='form-control radius-8' value={form.commissionPercent} onChange={(e) => setField("commissionPercent", e.target.value)} />
            </div>
            <div className='col-md-6 mb-20'>
              <label className='form-label'>Max User Redemption %</label>
              <input type='number' min={0} max={100} step='0.01' className='form-control radius-8' value={form.maxUserRedemptionPercent} onChange={(e) => setField("maxUserRedemptionPercent", e.target.value)} />
            </div>

            <div className='col-md-12 mb-20'>
              <label className='form-label'>Payment Mode</label>
              <select className='form-select radius-8' value={form.paymentMode} onChange={(e) => setField("paymentMode", e.target.value)}>
                <option value='both'>Both</option>
                <option value='online'>Online</option>
                <option value='offline'>Offline</option>
              </select>
            </div>

            <div className='col-md-12 mb-20'>
              <label className='form-label d-block mb-10'>Promotion Flags</label>
              <div className='d-flex flex-column gap-12'>
                <label className='form-check form-switch d-flex align-items-center gap-2'>
                  <input className='form-check-input' type='checkbox' checked={!!form.promoBannerAds} onChange={(e) => setField("promoBannerAds", e.target.checked)} />
                  <span>Banner Ads</span>
                </label>
                <label className='form-check form-switch d-flex align-items-center gap-2'>
                  <input className='form-check-input' type='checkbox' checked={!!form.promoVideoAds} onChange={(e) => setField("promoVideoAds", e.target.checked)} />
                  <span>Video Ads</span>
                </label>
                <label className='form-check form-switch d-flex align-items-center gap-2'>
                  <input className='form-check-input' type='checkbox' checked={!!form.promoPriorityListing} onChange={(e) => setField("promoPriorityListing", e.target.checked)} />
                  <span>Priority Listing</span>
                </label>
                <label className='form-check form-switch d-flex align-items-center gap-2'>
                  <input className='form-check-input' type='checkbox' checked={!!form.isActive} onChange={(e) => setField("isActive", e.target.checked)} />
                  <span>Active</span>
                </label>
              </div>
            </div>
          </div>

          <div className='d-flex justify-content-end gap-2 mt-8'>
            <button type='button' className='btn btn-outline-secondary px-20' onClick={onCancel} disabled={saving}>Cancel</button>
            <button type='submit' className='btn btn-primary px-24' disabled={saving}>{saving ? "Saving..." : "Save Plan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorPlanFormLayer;


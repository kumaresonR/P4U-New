import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  createCatalogService,
  getCatalogService,
  listServiceCategories,
  updateCatalogService,
  uploadFile,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";

const YES_NO = ["Yes", "No"];

const PRICE_TYPES = [
  { value: "fixed", label: "Fixed" },
  { value: "starting_from", label: "Starting from" },
  { value: "hourly", label: "Hourly" },
];

const emptyForm = () => ({
  name: "",
  categoryId: "",
  availability: "Yes",
  trending: "No",
  emergency: "No",
  iconUrl: "",
  description: "",
  basePrice: "",
  priceType: "fixed",
  duration: "",
});

const ServiceFormLayer = ({ isEdit = false, isView = false, serviceId, onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [serviceLoading, setServiceLoading] = useState(Boolean(serviceId));
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingIcon, setPendingIcon] = useState(null);
  const pendingIconRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCategoriesLoading(true);
      try {
        const res = await listServiceCategories({ purpose: "all" });
        if (!cancelled) setCategories(res.items || []);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof ApiError ? e.message : String(e);
          setLoadError((prev) => prev || msg);
        }
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyRow = useCallback((row) => {
    const pt = row.priceType;
    const priceType =
      pt === "starting_from" || pt === "hourly" || pt === "fixed" ? pt : "fixed";
    setFormData({
      name: row.name || "",
      categoryId: row.categoryId || "",
      availability: row.availability ? "Yes" : "No",
      trending: row.trending ? "Yes" : "No",
      emergency: row.emergency ? "Yes" : "No",
      iconUrl: row.iconUrl || "",
      description: row.description || "",
      basePrice:
        row.basePrice != null && String(row.basePrice).trim() !== ""
          ? String(row.basePrice)
          : "",
      priceType,
      duration: row.duration != null ? String(row.duration) : "",
    });
  }, []);

  const categoryOptions = useMemo(
    () => (categories || []).filter((c) => !c.parentId).sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [categories],
  );

  useEffect(() => {
    if (!serviceId) {
      setServiceLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setServiceLoading(true);
      setLoadError("");
      try {
        const row = await getCatalogService(serviceId);
        if (!cancelled) applyRow(row);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof ApiError ? e.message : String(e);
          setLoadError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setServiceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId, applyRow]);

  const handleChange = (e) => {
    if (isView) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;

    if (!formData.name?.trim()) {
      toast.error("Enter a service name.");
      return;
    }
    if (!formData.categoryId?.trim()) {
      toast.error("Select a category.");
      return;
    }

    let basePriceVal = null;
    if (formData.basePrice != null && String(formData.basePrice).trim() !== "") {
      const n = Number(String(formData.basePrice).replace(/,/g, ""));
      if (Number.isNaN(n) || n < 0) {
        toast.error("Base price must be a valid number.");
        return;
      }
      basePriceVal = String(n);
    }

    let iconUrl = formData.iconUrl;
    const fileToUpload = pendingIconRef.current || pendingIcon;
    if (fileToUpload) {
      try {
        const res = await uploadFile(fileToUpload);
        iconUrl = res.url;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "File upload failed");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim() || null,
        categoryId: formData.categoryId || null,
        availability: formData.availability === "Yes",
        trending: formData.trending === "Yes",
        emergency: formData.emergency === "Yes",
        iconUrl: iconUrl || null,
        description: formData.description.trim() || null,
        basePrice: basePriceVal,
        priceType: formData.priceType,
        duration: formData.duration?.trim() ? formData.duration.trim() : null,
      };

      if (isEdit && serviceId) {
        await updateCatalogService(serviceId, payload);
        toast.success("Service updated.");
      } else {
        await createCatalogService(payload);
        toast.success("Service created.");
      }
      if (onSuccess) onSuccess();
      else navigate("/service");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(emptyForm());
    setPendingIcon(null);
    pendingIconRef.current = null;
  };

  const disabled = isView || submitting || serviceLoading;
  const showSkeleton = Boolean(serviceId) && serviceLoading;
  const categorySelectDisabled = disabled || categoriesLoading;

  return (
    <div className="card h-100 p-0 radius-12">
      <div className="card-header border-bottom bg-base py-16 px-24">
        <h4 className="text-lg fw-semibold mb-0">{isView ? "View service" : isEdit ? "Edit service" : "Add service"}</h4>
        <p className="text-secondary-light text-sm mb-0 mt-4">Services are bookable actions (e.g. Plumbing, Cleaning), not catalog products.</p>
      </div>
      <div className="card-body p-24">
        {loadError && serviceId && !showSkeleton && (
          <div className="alert alert-danger radius-12 mb-16" role="alert">
            {loadError}
          </div>
        )}
        {showSkeleton ? (
          <p className="text-secondary-light mb-0">Loading service...</p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="row">
              <div className="col-md-6 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">
                  Service name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control radius-8"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={disabled}
                  maxLength={255}
                  placeholder="e.g. Plumbing, AC repair, House cleaning"
                  required
                />
              </div>
              <div className="col-md-6 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">
                  Category <span className="text-danger">*</span>
                </label>
                <select
                  className="form-control radius-8 form-select"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  disabled={categorySelectDisabled}
                  required
                >
                  <option value="">{categoriesLoading ? "Loading categories…" : "Select category…"}</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-12 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Description</label>
                <textarea
                  className="form-control radius-8"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  disabled={disabled}
                  placeholder="What the customer gets, coverage notes, or booking hints"
                />
              </div>

              <div className="col-md-12 mb-20">
                <div className="bg-neutral-50 radius-12 p-16">
                  <label className="form-label fw-semibold text-primary-light text-sm mb-8">Service icon / image</label>
                  <p className="text-secondary-light text-xs mb-8">Square icon or image used in the booking journey (not a product gallery).</p>
                  <input
                    type="file"
                    className="form-control radius-8"
                    accept="image/*"
                    disabled={disabled}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setPendingIcon(e.target.files[0]);
                        pendingIconRef.current = e.target.files[0];
                      }
                    }}
                  />
                  {(pendingIcon || formData.iconUrl) && (
                    <div className="mt-8">
                      <img
                        src={pendingIcon ? URL.createObjectURL(pendingIcon) : resolveMediaUrl(formData.iconUrl)}
                        alt=""
                        style={{ maxWidth: 88, maxHeight: 88, objectFit: "cover", borderRadius: 8 }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="col-md-4 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Availability</label>
                <select className="form-control radius-8 form-select" name="availability" value={formData.availability} onChange={handleChange} disabled={disabled}>
                  {YES_NO.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Trending</label>
                <select className="form-control radius-8 form-select" name="trending" value={formData.trending} onChange={handleChange} disabled={disabled}>
                  {YES_NO.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Emergency service</label>
                <select className="form-control radius-8 form-select" name="emergency" value={formData.emergency} onChange={handleChange} disabled={disabled}>
                  {YES_NO.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Base price (optional)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-control radius-8"
                  name="basePrice"
                  value={formData.basePrice}
                  onChange={handleChange}
                  disabled={disabled}
                  placeholder="e.g. 499"
                  autoComplete="off"
                />
              </div>
              <div className="col-md-4 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Price type</label>
                <select className="form-control radius-8 form-select" name="priceType" value={formData.priceType} onChange={handleChange} disabled={disabled}>
                  {PRICE_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Duration (optional)</label>
                <input
                  type="text"
                  className="form-control radius-8"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  disabled={disabled}
                  maxLength={64}
                  placeholder="e.g. 1 hour, 2 hours"
                />
              </div>
            </div>

            <div className="d-flex align-items-center justify-content-between mt-24">
              <button
                type="button"
                onClick={isView ? onCancel || (() => navigate(-1)) : handleReset}
                className="btn border border-danger-600 text-danger-600 bg-hover-danger-200 text-md px-56 py-12 radius-8 d-flex align-items-center gap-2"
              >
                <Icon icon="mdi:close-circle-outline" className="text-xl" /> {isView ? "Back" : "Reset"}
              </button>
              {!isView && (
                <button type="submit" disabled={disabled} className="btn btn-primary text-md px-56 py-12 radius-8 d-flex align-items-center gap-2">
                  <Icon icon="lucide:save" className="text-xl" /> {submitting ? "Saving..." : isEdit ? "Update" : "Save"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ServiceFormLayer;

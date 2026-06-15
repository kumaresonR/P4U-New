import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  createProductCategory,
  createProductSubcategory,
  createServiceCategory,
  getProductCategory,
  getProductSubcategory,
  getServiceCategory,
  listCatalogServices,
  updateProductCategory,
  updateProductSubcategory,
  updateServiceCategory,
  uploadFile,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";
import CountAndChips from "../../components/admin/CountAndChips";

const YES_NO = ["Yes", "No"];

const emptyServiceRoot = () => ({
  parentId: "",
  name: "",
  availability: "No",
  trending: "No",
  description: "",
  iconUrl: "",
});

const emptyProductVisual = () => ({
  parentId: "",
  name: "",
  availability: "No",
  trending: "No",
  description: "",
  thumbnailUrl: "",
  bannerUrls: [],
  commissionOverridePercent: "",
});

/**
 * @param {{ variant?: 'service-roots' | 'product-roots' | 'product-subs', isEdit?: boolean, isView?: boolean, categoryId?: string, scope?: 'root'|'subcategory', rootCategories?: { id: string, name: string }[], onSuccess?: () => void, onCancel?: () => void }} props
 */
const CategoryFormLayer = ({
  variant = "service-roots",
  isEdit = false,
  isView = false,
  categoryId,
  scope = "root",
  rootCategories = [],
  onSuccess,
  onCancel,
}) => {
  const navigate = useNavigate();
  const isRoot = scope === "root";
  const isServiceRoot = variant === "service-roots" && isRoot;
  const isProductRoot = variant === "product-roots" && isRoot;
  const isProductSub = variant === "product-subs" || (variant === "product-roots" && !isRoot);

  const initialEmpty = () => {
    if (isServiceRoot) return emptyServiceRoot();
    return emptyProductVisual();
  };

  const [formData, setFormData] = useState(initialEmpty);
  const [entityLoading, setEntityLoading] = useState(Boolean(categoryId));
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingIcon, setPendingIcon] = useState(null);
  const [pendingThumbnail, setPendingThumbnail] = useState(null);
  const [pendingBanners, setPendingBanners] = useState([]);
  const [linkedServices, setLinkedServices] = useState([]);
  const [linkedServicesLoading, setLinkedServicesLoading] = useState(false);

  const applyRow = useCallback(
    (row) => {
      if (isServiceRoot) {
        setFormData({
          parentId: "",
          name: row.name || "",
          availability: row.availability ? "Yes" : "No",
          trending: row.trending ? "Yes" : "No",
          description: row.description || "",
          iconUrl: row.iconUrl || "",
        });
      } else if (isProductRoot) {
        setFormData({
          parentId: "",
          name: row.name || "",
          availability: row.availability ? "Yes" : "No",
          trending: row.trending ? "Yes" : "No",
          description: row.description || "",
          thumbnailUrl: row.thumbnailUrl || "",
          bannerUrls: Array.isArray(row.bannerUrls) ? row.bannerUrls : [],
          commissionOverridePercent: row.commissionOverridePercent != null ? String(row.commissionOverridePercent) : "",
        });
      } else {
        setFormData({
          parentId: row.productCategoryId || row.parentId || "",
          name: row.name || "",
          availability: row.availability ? "Yes" : "No",
          trending: row.trending ? "Yes" : "No",
          description: row.description || "",
          thumbnailUrl: row.thumbnailUrl || "",
          bannerUrls: Array.isArray(row.bannerUrls) ? row.bannerUrls : [],
          commissionOverridePercent: row.commissionOverridePercent != null ? String(row.commissionOverridePercent) : "",
        });
      }
    },
    [isServiceRoot, isProductRoot],
  );

  useEffect(() => {
    if (!categoryId) {
      setEntityLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setEntityLoading(true);
      setLoadError("");
      try {
        let row;
        if (isServiceRoot) row = await getServiceCategory(categoryId);
        else if (isProductRoot) row = await getProductCategory(categoryId);
        else row = await getProductSubcategory(categoryId);
        if (!cancelled) applyRow(row);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof ApiError ? e.message : String(e);
          setLoadError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setEntityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, applyRow, isServiceRoot, isProductRoot]);

  useEffect(() => {
    if (!categoryId || !isServiceRoot) {
      setLinkedServices([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLinkedServicesLoading(true);
      try {
        const sRes = await listCatalogServices({ limit: 500, offset: 0 });
        if (cancelled) return;
        const all = sRes.items || [];
        setLinkedServices(all.filter((s) => s.categoryId === categoryId));
      } catch {
        if (!cancelled) setLinkedServices([]);
      } finally {
        if (!cancelled) setLinkedServicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, isServiceRoot]);

  const handleChange = (e) => {
    if (isView) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;

    if (!isRoot && !formData.parentId?.trim()) {
      toast.error("Select a parent category.");
      return;
    }

    if (!formData.name?.trim()) {
      toast.error("Enter a name.");
      return;
    }

    let iconUrl = isServiceRoot ? formData.iconUrl : undefined;
    let thumbnailUrl = !isServiceRoot ? formData.thumbnailUrl : undefined;
    let bannerUrls = !isServiceRoot ? [...formData.bannerUrls] : undefined;

    if (isServiceRoot && pendingIcon) {
      try {
        const res = await uploadFile(pendingIcon);
        iconUrl = res.url;
      } catch (err) {
        toast.error("Icon upload failed");
        return;
      }
    }
    if (!isServiceRoot && pendingThumbnail) {
      try {
        const res = await uploadFile(pendingThumbnail);
        thumbnailUrl = res.url;
      } catch (err) {
        toast.error("Thumbnail upload failed");
        return;
      }
    }
    if (!isServiceRoot) {
      for (const file of pendingBanners) {
        try {
          const res = await uploadFile(file);
          bannerUrls.push(res.url);
        } catch (err) {
          toast.error("Banner upload failed");
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const parentId = !isRoot ? formData.parentId?.trim() || null : null;

      if (isServiceRoot) {
        const payload = {
          name: formData.name.trim() || null,
          parentId: null,
          availability: formData.availability === "Yes",
          emergency: false,
          trending: formData.trending === "Yes",
          description: formData.description.trim() || null,
          iconUrl: iconUrl || null,
          thumbnailUrl: null,
          bannerUrls: null,
        };
        if (isEdit && categoryId) {
          await updateServiceCategory(categoryId, payload);
          toast.success("Service category updated.");
        } else {
          await createServiceCategory(payload);
          toast.success("Service category created.");
        }
      } else if (isProductRoot) {
        const payload = {
          name: formData.name.trim() || null,
          availability: formData.availability === "Yes",
          emergency: false,
          trending: formData.trending === "Yes",
          description: formData.description.trim() || null,
          thumbnailUrl: thumbnailUrl || null,
          bannerUrls: bannerUrls.length > 0 ? bannerUrls : null,
          commissionOverridePercent:
            formData.commissionOverridePercent !== "" ? Number(formData.commissionOverridePercent) : null,
        };
        if (isEdit && categoryId) {
          await updateProductCategory(categoryId, payload);
          toast.success("Product category updated.");
        } else {
          await createProductCategory(payload);
          toast.success("Product category created.");
        }
      } else {
        const payload = {
          name: formData.name.trim() || null,
          parentId,
          availability: formData.availability === "Yes",
          emergency: false,
          trending: formData.trending === "Yes",
          description: formData.description.trim() || null,
          thumbnailUrl: thumbnailUrl || null,
          bannerUrls: bannerUrls.length > 0 ? bannerUrls : null,
          commissionOverridePercent:
            formData.commissionOverridePercent !== "" ? Number(formData.commissionOverridePercent) : null,
        };
        if (isEdit && categoryId) {
          await updateProductSubcategory(categoryId, payload);
          toast.success("Subcategory updated.");
        } else {
          await createProductSubcategory(payload);
          toast.success("Subcategory created.");
        }
      }

      if (onSuccess) onSuccess();
      else {
        if (variant === "service-roots") navigate("/category");
        else if (variant === "product-roots") navigate("/product-categories");
        else navigate("/subcategories");
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(initialEmpty());
    setPendingIcon(null);
    setPendingThumbnail(null);
    setPendingBanners([]);
  };

  const removeBannerUrl = (index) => {
    setFormData((prev) => ({
      ...prev,
      bannerUrls: prev.bannerUrls.filter((_, i) => i !== index),
    }));
  };

  const disabled = isView || submitting || entityLoading;
  const showSkeleton = Boolean(categoryId) && entityLoading;

  const titleLine = () => {
    if (isServiceRoot) return isView ? "View service category" : isEdit ? "Edit service category" : "Add service category";
    if (isProductRoot) return isView ? "View product category" : isEdit ? "Edit product category" : "Add product category";
    return isView ? "View subcategory" : isEdit ? "Edit subcategory" : "Add subcategory";
  };

  const showLinkedServices = isServiceRoot && categoryId;

  return (
    <div className="card h-100 p-0 radius-12">
      <div className="card-header border-bottom bg-base py-16 px-24">
        <h4 className="text-lg fw-semibold mb-0">{titleLine()}</h4>
        {isServiceRoot && (
          <p className="text-secondary-light text-sm mb-0 mt-4">
            Top-level groups for the booking flow (service categories).
          </p>
        )}
        {isProductRoot && (
          <p className="text-secondary-light text-sm mb-0 mt-4">
            Shop catalog roots (product categories).
          </p>
        )}
      </div>
      <div className="card-body p-24">
        {loadError && categoryId && !showSkeleton && (
          <div className="alert alert-danger radius-12 mb-16" role="alert">
            {loadError}
          </div>
        )}
        {showSkeleton ? (
          <p className="text-secondary-light mb-0">Loading category...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="row">
              {isProductSub && (
                <div className="col-md-12 mb-20">
                  <label className="form-label fw-semibold text-primary-light text-sm mb-8">Parent category *</label>
                  <select
                    className="form-control radius-8 form-select"
                    name="parentId"
                    value={formData.parentId}
                    onChange={handleChange}
                    disabled={disabled}
                  >
                    <option value="">Select parent...</option>
                    {rootCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-md-6 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control radius-8"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={disabled}
                  maxLength={255}
                  placeholder={isServiceRoot ? "e.g. Home Services, Repair, Beauty" : ""}
                />
              </div>
              <div className="col-md-6 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Availability</label>
                <select className="form-control radius-8 form-select" name="availability" value={formData.availability} onChange={handleChange} disabled={disabled}>
                  {YES_NO.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Trending</label>
                <select className="form-control radius-8 form-select" name="trending" value={formData.trending} onChange={handleChange} disabled={disabled}>
                  {YES_NO.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              {!isServiceRoot && (
                <div className="col-md-6 mb-20">
                  <label className="form-label fw-semibold text-primary-light text-sm mb-8">Commission Override % (this category)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="form-control radius-8"
                    name="commissionOverridePercent"
                    value={formData.commissionOverridePercent}
                    onChange={handleChange}
                    disabled={disabled}
                    placeholder="Leave blank to use vendor/plan"
                  />
                </div>
              )}

              <div className="col-md-12 mb-20">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Description</label>
                <textarea className="form-control radius-8" name="description" rows={4} value={formData.description} onChange={handleChange} disabled={disabled} />
              </div>

              {showLinkedServices && (
                <div className="col-md-12 mb-20">
                  <label className="form-label fw-semibold text-primary-light text-sm mb-8">Linked services</label>
                  <div className="radius-8 border border-neutral-200 p-16 bg-base">
                    {linkedServicesLoading ? (
                      <span className="text-secondary-light text-sm">Loading services...</span>
                    ) : (
                      <CountAndChips
                        items={linkedServices}
                        getLabel={(s) => s.name}
                        getKey={(s) => s.id}
                        countSuffix="services"
                        emptyLabel="No services in this category yet."
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {isServiceRoot ? (
              <div className="row bg-neutral-50 radius-12 p-16 mb-20">
                <div className="col-md-12 mb-0">
                  <label className="form-label fw-semibold text-primary-light text-sm mb-8">Category icon</label>
                  <input
                    type="file"
                    className="form-control radius-8"
                    accept="image/*"
                    disabled={disabled}
                    onChange={(e) => {
                      if (e.target.files?.[0]) setPendingIcon(e.target.files[0]);
                    }}
                  />
                  {(pendingIcon || formData.iconUrl) && (
                    <div className="mt-8">
                      <img
                        src={pendingIcon ? URL.createObjectURL(pendingIcon) : resolveMediaUrl(formData.iconUrl)}
                        alt="Category icon"
                        style={{ maxWidth: 96, maxHeight: 96, objectFit: "cover", borderRadius: 8 }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="row bg-neutral-50 radius-12 p-16 mb-20">
                <div className="col-md-6 mb-20">
                  <label className="form-label fw-semibold text-primary-light text-sm mb-8">Thumbnail</label>
                  <input
                    type="file"
                    className="form-control radius-8"
                    accept="image/*"
                    disabled={disabled}
                    onChange={(e) => {
                      if (e.target.files?.[0]) setPendingThumbnail(e.target.files[0]);
                    }}
                  />
                  {(pendingThumbnail || formData.thumbnailUrl) && (
                    <div className="mt-8">
                      <img
                        src={pendingThumbnail ? URL.createObjectURL(pendingThumbnail) : resolveMediaUrl(formData.thumbnailUrl)}
                        alt="Thumbnail"
                        style={{ maxWidth: 120, maxHeight: 120, objectFit: "cover", borderRadius: 8 }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="col-md-6 mb-20">
                  <label className="form-label fw-semibold text-primary-light text-sm mb-8">Banner (optional)</label>
                  <input
                    type="file"
                    className="form-control radius-8"
                    accept="image/*"
                    multiple
                    disabled={disabled}
                    onChange={(e) => {
                      if (e.target.files?.length) setPendingBanners([...e.target.files]);
                    }}
                  />
                  {formData.bannerUrls.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mt-8">
                      {formData.bannerUrls.map((url, i) => (
                        <div key={i} className="position-relative">
                          <img
                            src={resolveMediaUrl(url)}
                            alt={`Banner ${i + 1}`}
                            style={{ width: 80, height: 50, objectFit: "cover", borderRadius: 6 }}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                          {!disabled && (
                            <button
                              type="button"
                              className="position-absolute top-0 end-0 border-0 bg-danger-600 text-white rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: 18, height: 18, fontSize: 10 }}
                              onClick={() => removeBannerUrl(i)}
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

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

export default CategoryFormLayer;

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  createProduct,
  getProduct,
  listCategoriesForProducts,
  listProductAttributes,
  listTaxConfigurations,
  listVendors,
  updateProduct,
  uploadFile,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";

function parseMeta(v) {
  if (!v) return {};
  if (typeof v === "string") {
    try { return JSON.parse(v) || {}; } catch { return {}; }
  }
  return typeof v === "object" && !Array.isArray(v) ? v : {};
}

function normalizeAttrSelections(raw) {
  if (!raw || typeof raw !== "object") return {};
  return Object.entries(raw).reduce((acc, [k, v]) => {
    if (Array.isArray(v)) {
      acc[k] = v.map((x) => String(x)).filter(Boolean);
      return acc;
    }
    if (v == null || v === "") {
      acc[k] = [];
      return acc;
    }
    acc[k] = [String(v)];
    return acc;
  }, {});
}

function splitLabelAndHex(value) {
  const s = String(value || "").trim();
  const m = s.match(/^(.*?)(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/);
  if (!m) return { label: s, hex: null };
  const label = String(m[1] || "").trim();
  return { label: label || s, hex: m[2] };
}

const emptyForm = () => ({
  name: "",
  productRef: "",
  sku: "",
  availability: "Yes",
  vendorId: "",
  parentCategoryId: "",
  categoryId: "",
  productType: "simple",
  sellPrice: "",
  discountAmount: "",
  finalPrice: "",
  taxConfigurationId: "",
  hsnCode: "",
  taxAmount: "",
  discountType: "Fixed",
  quantity: "",
  maxPointsRedeemable: "",
  maxUserRedemptionPercent: "",
  vendorCommissionLabel: "Vendor default",
  commissionOverridePercent: "",
  shortDescription: "",
  longDescription: "",
  statusLabel: "Active",
  dealOfDay: "No",
  specVolume: "",
  specPackSize: "",
  seoTitle: "",
  seoDescription: "",
  thumbnailUrl: "",
});

const ProductFormLayer = ({ isEdit = false, isView = false, productId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("general");
  const [isReadonly, setIsReadonly] = useState(Boolean(isView));
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [taxItems, setTaxItems] = useState([]);
  const [attributeDefs, setAttributeDefs] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [refsLoading, setRefsLoading] = useState(true);
  const [entityLoading, setEntityLoading] = useState(Boolean(productId));
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingThumbnail, setPendingThumbnail] = useState(null);
  const pendingThumbnailRef = useRef(null);

  const pendingPreviewUrl = useMemo(
    () => (pendingThumbnail ? URL.createObjectURL(pendingThumbnail) : null),
    [pendingThumbnail],
  );

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRefsLoading(true);
      try {
        const [vRes, cRes, tRes, aRes] = await Promise.all([
          listVendors({ limit: 300, offset: 0, vendorKind: "product" }),
          listCategoriesForProducts({ purpose: "all" }),
          listTaxConfigurations({ purpose: "all" }),
          listProductAttributes({ limit: 500, offset: 0 }),
        ]);
        if (!cancelled) {
          setVendors(vRes.items || []);
          setCategories(cRes.items || []);
          setTaxItems(tRes.items || []);
          setAttributeDefs((aRes.items || []).filter((a) => a.isActive !== false));
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof ApiError ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setRefsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const applyRow = useCallback((row) => {
    const meta = parseMeta(row.metadata || row.metaJson || row.extraJson);
    const productAttrs = normalizeAttrSelections(meta.productAttributes || meta.attributes || {});
    setSelectedAttributes(productAttrs);
    setFormData({
      name: row.name || "",
      productRef: row.productRef || `PRD-${String(row.id || "").slice(-6)}`,
      sku: meta.sku || row.sku || "",
      availability: row.availability || row.isActive ? "Yes" : "No",
      vendorId: row.vendorId || "",
      categoryId: row.categoryId || "",
      productType: meta.productType || "simple",
      sellPrice: row.sellPrice != null ? String(row.sellPrice) : String(row.price || ""),
      discountAmount: row.discountAmount != null ? String(row.discountAmount) : "",
      finalPrice: row.finalPrice != null ? String(row.finalPrice) : "",
      taxConfigurationId: row.taxConfigurationId || "",
      hsnCode: meta.hsnCode || "",
      taxAmount: meta.taxAmount != null ? String(meta.taxAmount) : "",
      discountType: meta.discountType || "Fixed",
      quantity: meta.quantity != null ? String(meta.quantity) : "",
      maxPointsRedeemable: meta.maxPointsRedeemable != null ? String(meta.maxPointsRedeemable) : "",
      maxUserRedemptionPercent: meta.maxUserRedemptionPercent != null ? String(meta.maxUserRedemptionPercent) : "",
      vendorCommissionLabel: meta.vendorCommissionLabel || "Vendor default",
      commissionOverridePercent: row.commissionOverridePercent != null ? String(row.commissionOverridePercent) : "",
      shortDescription: row.shortDescription || "",
      longDescription: row.longDescription || "",
      statusLabel: row.availability || row.isActive ? "Active" : "Inactive",
      dealOfDay: meta.dealOfDay || "No",
      specVolume: meta.specVolume || "",
      specPackSize: meta.specPackSize || "",
      seoTitle: meta.seoTitle || "",
      seoDescription: meta.seoDescription || "",
      thumbnailUrl: row.thumbnailUrl || "",
    });
  }, []);

  const toggleSelectAttribute = (attrName, option) => {
    if (isReadonly) return;
    setSelectedAttributes((prev) => {
      const curr = Array.isArray(prev[attrName]) ? prev[attrName] : [];
      const next = curr.includes(option) ? curr.filter((v) => v !== option) : [...curr, option];
      return { ...prev, [attrName]: next };
    });
  };

  const setScalarAttribute = (attrName, value) => {
    if (isReadonly) return;
    setSelectedAttributes((prev) => ({
      ...prev,
      [attrName]: value ? [String(value)] : [],
    }));
  };

  const rootCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );

  const subcategories = useMemo(() => {
    if (!formData.parentCategoryId) return [];
    return categories.filter((c) => c.parentId === formData.parentCategoryId);
  }, [categories, formData.parentCategoryId]);

  useEffect(() => {
    if (!formData.categoryId || !categories.length) return;
    const chosen = categories.find((c) => c.id === formData.categoryId);
    if (chosen?.parentId) {
      setFormData((prev) =>
        prev.parentCategoryId === chosen.parentId ? prev : { ...prev, parentCategoryId: chosen.parentId || "" },
      );
    }
  }, [formData.categoryId, categories]);

  useEffect(() => {
    if (!productId) {
      setEntityLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setEntityLoading(true);
      setLoadError("");
      try {
        const row = await getProduct(productId);
        if (!cancelled) applyRow(row);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof ApiError ? e.message : String(e));
      } finally {
        if (!cancelled) setEntityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId, applyRow]);

  useEffect(() => {
    setIsReadonly(Boolean(isView));
  }, [isView]);

  const handleChange = (e) => {
    if (isReadonly) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadonly) return;

    let thumbnailUrl = formData.thumbnailUrl;
    const thumbFile = pendingThumbnailRef.current || pendingThumbnail;
    if (thumbFile) {
      try {
        const res = await uploadFile(thumbFile);
        thumbnailUrl = res.url;
      } catch {
        toast.error("Thumbnail upload failed");
        return;
      }
    }

    if (!formData.vendorId?.trim()) {
      toast.error("Select product vendor.");
      return;
    }
    if (!formData.parentCategoryId?.trim()) {
      toast.error("Select category.");
      return;
    }
    if (!formData.categoryId?.trim()) {
      toast.error("Select subcategory.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim() || null,
        availability: formData.availability === "Yes",
        vendorId: formData.vendorId || null,
        categoryId: formData.categoryId || null,
        serviceId: null,
        sellPrice: formData.sellPrice || null,
        discountAmount: formData.discountAmount || null,
        finalPrice: formData.finalPrice || null,
        taxConfigurationId: formData.taxConfigurationId || null,
        commissionOverridePercent: formData.commissionOverridePercent !== "" ? Number(formData.commissionOverridePercent) : null,
        shortDescription: formData.shortDescription.trim() || null,
        longDescription: formData.longDescription.trim() || null,
        thumbnailUrl: thumbnailUrl || null,
        metadata: {
          sku: formData.sku || null,
          productType: formData.productType || "simple",
          hsnCode: formData.hsnCode || null,
          taxAmount: formData.taxAmount || null,
          discountType: formData.discountType || null,
          quantity: formData.quantity !== "" ? Number(formData.quantity) : null,
          maxPointsRedeemable: formData.maxPointsRedeemable || null,
          maxUserRedemptionPercent: formData.maxUserRedemptionPercent || null,
          vendorCommissionLabel: formData.vendorCommissionLabel || null,
          dealOfDay: formData.dealOfDay || "No",
          specVolume: formData.specVolume || null,
          specPackSize: formData.specPackSize || null,
            productAttributes: selectedAttributes,
          seoTitle: formData.seoTitle || null,
          seoDescription: formData.seoDescription || null,
        },
      };

      if (isEdit && productId) {
        await updateProduct(productId, payload);
        toast.success("Product updated.");
      } else {
        await createProduct(payload);
        toast.success("Product created.");
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = isReadonly || submitting || refsLoading || entityLoading;
  const showSkeleton = Boolean(productId) && entityLoading;
  const thumbnailSrc = pendingPreviewUrl || resolveMediaUrl(formData.thumbnailUrl);
  const vendorName = vendors.find((v) => v.id === formData.vendorId)?.businessName || "—";
  const categoryName = categories.find((c) => c.id === formData.categoryId)?.name || "—";

  return (
    <div className='card h-100 p-0 radius-16 border-0'>
      <div className='card-body p-20'>
        {loadError && <div className='alert alert-danger radius-12 mb-16'>{loadError}</div>}
        {showSkeleton ? (
          <p className='text-secondary-light mb-0'>Loading product...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className='d-flex align-items-center gap-12 mb-16'>
              <span className='w-48-px h-48-px rounded-3 bg-warning-100 text-warning-700 d-flex align-items-center justify-content-center'>
                <Icon icon='mdi:package-variant-closed' className='text-xl' />
              </span>
              <div>
                <h4 className='mb-0 fw-bold'>{formData.name || "Product"}</h4>
                <p className='mb-0 text-secondary-light'>{formData.productRef || "—"}</p>
              </div>
            </div>

            <div className='d-flex flex-wrap align-items-center gap-8 mb-16'>
              <span className='px-12 py-4 rounded-pill bg-success-focus text-success-main fw-semibold text-sm'>{formData.statusLabel}</span>
              <span className='px-12 py-4 rounded-pill bg-neutral-200 text-secondary-light fw-semibold text-sm'>{formData.productType}</span>
              <span className='text-secondary-light'><Icon icon='mdi:tag-outline' className='me-4' />{categoryName}</span>
              <span className='text-secondary-light'><Icon icon='mdi:store-outline' className='me-4' />{vendorName}</span>
            </div>

            <div className='bg-primary-50 radius-12 p-6 d-flex gap-6 mb-16'>
              <Tab active={activeTab === "general"} label='General' onClick={() => setActiveTab("general")} />
              <Tab active={activeTab === "pricing"} label='Pricing' onClick={() => setActiveTab("pricing")} />
              <Tab active={activeTab === "attributes"} label='Attributes' onClick={() => setActiveTab("attributes")} />
              <Tab active={activeTab === "seo"} label='SEO' onClick={() => setActiveTab("seo")} />
            </div>

            {activeTab === "general" && (
              <section className='d-flex flex-column gap-14'>
                <div className='bg-primary-25 radius-12 p-14'>
                  <div className='row g-12'>
                    <Field col='col-md-6' label='Title *'><input className='form-control radius-10' name='name' value={formData.name} onChange={handleChange} disabled={disabled} /></Field>
                    <Field col='col-md-6' label='SKU'><input className='form-control radius-10' name='sku' value={formData.sku} onChange={handleChange} disabled={disabled} /></Field>
                    <Field col='col-md-4' label='Vendor'>
                      <select className='form-select radius-10' name='vendorId' value={formData.vendorId} onChange={handleChange} disabled={disabled}>
                        <option value=''>Select vendor</option>
                        {vendors.map((v) => <option key={v.id} value={v.id}>{v.businessName || v.ownerName}</option>)}
                      </select>
                    </Field>
                    <Field col='col-md-4' label='Category'>
                      <select
                        className='form-select radius-10'
                        name='parentCategoryId'
                        value={formData.parentCategoryId}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => ({ ...prev, parentCategoryId: value, categoryId: "" }));
                        }}
                        disabled={disabled}
                      >
                        <option value=''>Select category</option>
                        {rootCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field col='col-md-4' label='Subcategory'>
                      <select className='form-select radius-10' name='categoryId' value={formData.categoryId} onChange={handleChange} disabled={disabled || !formData.parentCategoryId}>
                        <option value=''>{formData.parentCategoryId ? "Select subcategory" : "Select category first"}</option>
                        {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </Field>
                    <Field col='col-md-4' label='Quantity'>
                      <input
                        type='number'
                        min='0'
                        className='form-control radius-10'
                        name='quantity'
                        value={formData.quantity}
                        onChange={handleChange}
                        disabled={disabled}
                        placeholder='Available stock'
                      />
                    </Field>
                  </div>
                </div>

                <div className='bg-primary-25 radius-12 p-14'>
                  <h6 className='mb-10 fw-semibold'>Product Images</h6>
                  {!isReadonly && (
                    <input
                      type='file'
                      className='form-control radius-10 mb-10'
                      accept='image/*'
                      disabled={disabled}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setPendingThumbnail(f);
                          pendingThumbnailRef.current = f;
                        }
                      }}
                    />
                  )}
                  <div className='d-flex align-items-center gap-10'>
                    {thumbnailSrc ? (
                      <img src={thumbnailSrc} alt='Product' style={{ width: 96, height: 96, borderRadius: 10, objectFit: "cover" }} />
                    ) : (
                      <span className='text-secondary-light'>No image selected</span>
                    )}
                  </div>
                </div>

                <div className='row g-12'>
                  <Field col='col-md-6' label='Short Description'><textarea className='form-control radius-10' name='shortDescription' rows={3} value={formData.shortDescription} onChange={handleChange} disabled={disabled} /></Field>
                  <Field col='col-md-6' label='Long Description'><textarea className='form-control radius-10' name='longDescription' rows={3} value={formData.longDescription} onChange={handleChange} disabled={disabled} /></Field>
                </div>
                <div className='bg-warning-50 radius-12 p-14 d-flex align-items-center justify-content-between'>
                  <div>
                    <h6 className='mb-4 fw-semibold'>Deal of the Day</h6>
                    <p className='mb-0 text-secondary-light text-sm'>Featured in homepage "Deals of the Day"</p>
                  </div>
                  <select className='form-select radius-10' style={{ width: 140 }} name='dealOfDay' value={formData.dealOfDay} onChange={handleChange} disabled={disabled}>
                    <option value='No'>No</option>
                    <option value='Yes'>Yes</option>
                  </select>
                </div>
              </section>
            )}

            {activeTab === "pricing" && (
              <section className='d-flex flex-column gap-14'>
                <div className='bg-primary-25 radius-12 p-14'>
                  <h5 className='fw-bold mb-12'><Icon icon='mdi:currency-usd' className='me-6' />Pricing</h5>
                  <div className='row g-12'>
                    <Field col='col-md-6' label='MRP (₹)'><input className='form-control radius-10' name='sellPrice' value={formData.sellPrice} onChange={handleChange} disabled={disabled} /></Field>
                    <Field col='col-md-6' label='Tax Slab'>
                      <select className='form-select radius-10' name='taxConfigurationId' value={formData.taxConfigurationId} onChange={handleChange} disabled={disabled}>
                        <option value=''>Select tax</option>
                        {taxItems.map((t) => <option key={t.id} value={t.id}>{t.title || t.code} ({t.percentage}%)</option>)}
                      </select>
                    </Field>
                    <Field col='col-md-6' label='HSN Code'><input className='form-control radius-10' name='hsnCode' value={formData.hsnCode} onChange={handleChange} disabled={disabled} /></Field>
                    <Field col='col-md-6' label='Tax Amount (auto)'><input className='form-control radius-10' name='taxAmount' value={formData.taxAmount} onChange={handleChange} disabled={disabled} /></Field>
                    <Field col='col-md-6' label='Discount Type'>
                      <select className='form-select radius-10' name='discountType' value={formData.discountType} onChange={handleChange} disabled={disabled}>
                        <option value='Fixed'>Fixed</option>
                        <option value='Percent'>Percent</option>
                      </select>
                    </Field>
                    <Field col='col-md-6' label='Discount (₹)'><input className='form-control radius-10' name='discountAmount' value={formData.discountAmount} onChange={handleChange} disabled={disabled} /></Field>
                  </div>
                  <div className='border-top mt-14 pt-12 d-flex justify-content-between align-items-center'>
                    <h5 className='mb-0 fw-bold'>Selling Price</h5>
                    <h3 className='mb-0 fw-bold'>₹{formData.finalPrice || formData.sellPrice || 0}</h3>
                  </div>
                </div>

                <div className='bg-warning-50 radius-12 p-14'>
                  <div className='row g-12'>
                    <Field col='col-md-4' label='Max Points Redeemable'><input className='form-control radius-10' name='maxPointsRedeemable' value={formData.maxPointsRedeemable} onChange={handleChange} disabled={disabled} /></Field>
                    <Field col='col-md-4' label='Max User Redemption %'><input className='form-control radius-10' name='maxUserRedemptionPercent' value={formData.maxUserRedemptionPercent} onChange={handleChange} disabled={disabled} /></Field>
                    <Field col='col-md-4' label='Vendor to P4U Commission'><input className='form-control radius-10' name='vendorCommissionLabel' value={formData.vendorCommissionLabel} onChange={handleChange} disabled={disabled} /></Field>
                    <Field col='col-md-4' label='Commission Override % (this product)'>
                      <input
                        type='number'
                        min='0'
                        max='100'
                        step='0.01'
                        className='form-control radius-10'
                        name='commissionOverridePercent'
                        value={formData.commissionOverridePercent}
                        onChange={handleChange}
                        disabled={disabled}
                        placeholder='Leave blank to use category/vendor/plan'
                      />
                    </Field>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "attributes" && (
              <section className='bg-primary-25 radius-12 p-14'>
                <h5 className='fw-bold mb-12'>Attributes</h5>
                {attributeDefs.length === 0 ? (
                  <p className='text-secondary-light mb-0'>No active product attributes found.</p>
                ) : (
                  <div className='d-flex flex-column gap-16'>
                    {attributeDefs.map((attr) => {
                      const values = Array.isArray(attr.selectValues) ? attr.selectValues : [];
                      const selected = Array.isArray(selectedAttributes[attr.name]) ? selectedAttributes[attr.name] : [];
                      return (
                        <div key={attr.id}>
                          <label className='form-label fw-semibold text-primary-light text-md mb-8'>{attr.name}</label>
                          {attr.type === "select" ? (
                            <div className='d-flex flex-wrap gap-8'>
                              {values.map((opt) => {
                                const { label, hex } = splitLabelAndHex(opt);
                                const active = selected.includes(opt);
                                return (
                                  <button
                                    key={`${attr.id}-${opt}`}
                                    type='button'
                                    onClick={() => toggleSelectAttribute(attr.name, opt)}
                                    disabled={disabled}
                                    className={`btn radius-pill border d-inline-flex align-items-center gap-8 px-12 py-6 ${active ? "bg-primary-50 border-primary-300 text-primary-700" : "bg-white border-neutral-200 text-primary-light"}`}
                                  >
                                    {hex ? (
                                      <span
                                        style={{
                                          width: 16,
                                          height: 16,
                                          borderRadius: "50%",
                                          border: "1px solid #d1d5db",
                                          backgroundColor: hex,
                                        }}
                                      />
                                    ) : null}
                                    <span>{label || opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <input
                              className='form-control radius-10'
                              type={attr.type === "number" ? "number" : "text"}
                              value={selected[0] || ""}
                              onChange={(e) => setScalarAttribute(attr.name, e.target.value)}
                              disabled={disabled}
                              placeholder={`Enter ${attr.name}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {activeTab === "seo" && (
              <section className='bg-primary-25 radius-12 p-14'>
                <div className='row g-12'>
                  <Field col='col-md-12' label='SEO Title'><input className='form-control radius-10' name='seoTitle' value={formData.seoTitle} onChange={handleChange} disabled={disabled} /></Field>
                  <Field col='col-md-12' label='SEO Description'><textarea className='form-control radius-10' rows={4} name='seoDescription' value={formData.seoDescription} onChange={handleChange} disabled={disabled} /></Field>
                </div>
              </section>
            )}

            <div className='d-flex justify-content-end gap-10 mt-20'>
              <button type='button' onClick={onCancel} className='btn btn-light border radius-10 px-20'>Close</button>
              {isView && isReadonly && (
                <button type='button' onClick={() => setIsReadonly(false)} className='btn btn-primary radius-10 px-20'>Edit</button>
              )}
              {!isReadonly && (
                <button type='submit' disabled={submitting || refsLoading} className='btn btn-primary radius-10 px-20'>
                  {submitting ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const Tab = ({ active, label, onClick }) => (
  <button type='button' onClick={onClick} className={`btn border-0 radius-10 px-20 py-8 ${active ? "bg-white text-primary-600 fw-semibold" : "bg-transparent text-secondary-light"}`}>
    {label}
  </button>
);

const Field = ({ col, label, children }) => (
  <div className={col}>
    <label className='form-label fw-semibold text-primary-light text-sm mb-8'>{label}</label>
    {children}
  </div>
);

export default ProductFormLayer;

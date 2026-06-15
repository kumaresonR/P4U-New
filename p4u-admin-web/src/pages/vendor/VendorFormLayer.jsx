import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  createVendor,
  getVendor,
  listCategoriesForProducts,
  listCatalogServices,
  listVendorPlans,
  updateVendor,
  uploadFile,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";

const emptyForm = (kind = "product") => ({
  vendorKind: kind === "service" ? "service" : "product",
  ownerName: "",
  businessName: "",
  vendorRef: "",
  email: "",
  phone: "",
  status: "pending",
  verificationStatus: "pending",
  categorySlug: "",
  gst: "",
  pan: "",
  stateName: "",
  stateCode: "",
  registeredShopAddress: "",
  thumbnailUrl: "",
  gstCertUrl: "",
  panCardUrl: "",
  bankName: "",
  ifscCode: "",
  accountHolderName: "",
  accountNumber: "",
  commissionRate: "10",
  maxRedemptionPercent: "",
  vendorPlanId: "",
  enrollmentCost: "",
  coverageRadiusKm: "",
  restriction: "",
  selfDelivery: false,
  paymentStatus: "unpaid",
  transactionRef: "",
  selectedServiceIds: [],
});

function normalizeSlugsFromJson(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : x?.slug || x?.name)).filter(Boolean);
  if (typeof v === "string") {
    try {
      return normalizeSlugsFromJson(JSON.parse(v));
    } catch {
      return v.trim() ? [v.trim()] : [];
    }
  }
  return [];
}

function normalizeServiceIdsFromJson(v) {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v
      .map((x) => {
        if (typeof x === "string") return x;
        if (typeof x === "object" && x) return x.id || x.serviceId || x.slug || x.name;
        return null;
      })
      .filter(Boolean)
      .map((x) => String(x));
  }
  if (typeof v === "string") {
    try {
      return normalizeServiceIdsFromJson(JSON.parse(v));
    } catch {
      return v.trim() ? [v.trim()] : [];
    }
  }
  return [];
}

function parseBankJson(j) {
  const empty = { bankName: "", ifscCode: "", accountHolderName: "", accountNumber: "" };
  if (j == null) return empty;
  let o = j;
  if (typeof j === "string") {
    try { o = JSON.parse(j); } catch { return empty; }
  }
  if (typeof o !== "object" || !o) return empty;
  return {
    bankName: String(o.bankName ?? "").trim(),
    ifscCode: String(o.ifscCode ?? "").trim(),
    accountHolderName: String(o.accountHolderName ?? "").trim(),
    accountNumber: String(o.accountNumber ?? "").trim(),
  };
}

function buildBankJson(form) {
  const o = {
    bankName: form.bankName.trim(),
    ifscCode: form.ifscCode.trim(),
    accountHolderName: form.accountHolderName.trim(),
    accountNumber: form.accountNumber.trim(),
  };
  return Object.values(o).some(Boolean) ? o : null;
}

function planTypeKey(p) {
  return String(p.planType || "").toLowerCase();
}

function formatPlanRupeePrice(p) {
  const n = Number(p.price);
  if (Number.isFinite(n)) return `₹${n.toLocaleString("en-IN")}`;
  return p.price != null ? `₹${String(p.price)}` : "₹0";
}

function formatVendorPlanOptionLabel(p) {
  const mode = String(p.paymentMode || "both").toLowerCase();
  return `${p.planName} – ${formatPlanRupeePrice(p)} (${mode})`;
}

/**
 * @param {{ isEdit?: boolean, isView?: boolean, vendorId?: string, vendorKind: 'product'|'service', onSuccess?: () => void, onCancel?: () => void }} props
 */
const VendorFormLayer = ({ isEdit = false, isView = false, vendorId, vendorKind = "product", onSuccess, onCancel }) => {
  const [formData, setFormData] = useState(() => emptyForm(vendorKind));
  const [activeTab, setActiveTab] = useState("details");
  const [isReadonly, setIsReadonly] = useState(Boolean(isView));
  const [entityLoading, setEntityLoading] = useState(Boolean(vendorId));
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogServices, setCatalogServices] = useState([]);
  const [vendorPlans, setVendorPlans] = useState([]);
  const [pendingFiles, setPendingFiles] = useState({ thumbnailUrl: null, gstCertUrl: null, panCardUrl: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listCategoriesForProducts({ purpose: "all" }),
      listCatalogServices({ limit: 500, offset: 0 }),
      listVendorPlans({ limit: 200, offset: 0 }),
    ])
      .then(([cRes, sRes, pRes]) => {
        if (!cancelled) {
          setCatalogCategories(Array.isArray(cRes?.items) ? cRes.items : []);
          setCatalogServices(Array.isArray(sRes?.items) ? sRes.items : []);
          setVendorPlans(Array.isArray(pRes?.items) ? pRes.items : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogCategories([]);
          setCatalogServices([]);
          setVendorPlans([]);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const applyRow = useCallback((row) => {
    const bank = parseBankJson(row.bankJson);
    const docs = row.documentsJson || {};
    const categories = normalizeSlugsFromJson(row.categoriesJson);
    const serviceIds = normalizeServiceIdsFromJson(row.servicesJson);
    const address = typeof row.addressJson === "object" && row.addressJson ? row.addressJson : {};
    setFormData({
      vendorKind:
        row.vendorKind === "service" || String(row.vendorType || "").toUpperCase() === "SERVICE"
          ? "service"
          : "product",
      ownerName: row.ownerName || "",
      businessName: row.businessName || "",
      vendorRef: row.vendorRef?.trim() || "",
      email: row.email || "",
      phone: row.phone || "",
      status: row.status === "not_verified" ? "pending" : (row.status || "pending"),
      verificationStatus:
        row.status === "rejected"
          ? "rejected"
          : row.status === "pending" || row.status === "not_verified"
            ? "pending"
            : row.status === "active"
              ? "verified"
              : row.status === "suspended"
                ? "deactivated"
                : "pending",
      categorySlug: categories[0] || "",
      gst: row.gst || "",
      pan: row.pan || "",
      stateName: String(address.state || ""),
      stateCode: String(address.stateCode || ""),
      registeredShopAddress: String(address.areaLocality || address.buildingNumber || ""),
      thumbnailUrl: row.thumbnailUrl || "",
      gstCertUrl: docs.gstCertificateUrl || "",
      panCardUrl: docs.panCardUrl || "",
      commissionRate: row.commissionRate != null ? String(row.commissionRate) : "10",
      maxRedemptionPercent: String(row.maxRedemptionPercent || ""),
      vendorPlanId: row.vendorPlanId || "",
      enrollmentCost: String(row.enrollmentCost || ""),
      coverageRadiusKm: String(row.coverageRadiusKm || ""),
      restriction: row.restriction || "",
      selfDelivery: Boolean(row.selfDelivery),
      paymentStatus: row.paymentStatus || "unpaid",
      transactionRef: row.transactionRef || "",
      selectedServiceIds: serviceIds,
      ...bank,
    });
  }, []);

  useEffect(() => {
    if (!vendorId) { setEntityLoading(false); return; }
    let cancelled = false;
    (async () => {
      setEntityLoading(true);
      setLoadError("");
      try {
        const row = await getVendor(vendorId);
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
    return () => { cancelled = true; };
  }, [vendorId, applyRow]);

  useEffect(() => {
    setIsReadonly(Boolean(isView));
  }, [isView]);

  const localVendorPlans = useMemo(
    () => vendorPlans.filter((p) => planTypeKey(p) === "local"),
    [vendorPlans],
  );
  const vipVendorPlans = useMemo(
    () => vendorPlans.filter((p) => planTypeKey(p) === "vip"),
    [vendorPlans],
  );
  const otherVendorPlans = useMemo(
    () => vendorPlans.filter((p) => !["local", "vip"].includes(planTypeKey(p))),
    [vendorPlans],
  );

  const handleChange = (e) => {
    if (isReadonly) return;
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "vendorPlanId") {
        const plan = vendorPlans.find((p) => p.id === value);
        if (plan) {
          // Pre-fill defaults from the selected plan when fields are empty.
          if (!prev.commissionRate || prev.commissionRate === "10") {
            next.commissionRate = plan.commissionPercent != null ? String(plan.commissionPercent) : prev.commissionRate;
          }
          if (!prev.maxRedemptionPercent) {
            next.maxRedemptionPercent = plan.maxUserRedemptionPercent != null ? String(plan.maxUserRedemptionPercent) : prev.maxRedemptionPercent;
          }
          if (!prev.coverageRadiusKm && plan.radiusKm != null) {
            next.coverageRadiusKm = String(plan.radiusKm);
          }
          if (!prev.enrollmentCost && plan.price != null) {
            next.enrollmentCost = String(plan.price);
          }
        }
      }
      if (name === "status") {
        next.verificationStatus =
          value === "active"
            ? "verified"
            : value === "pending"
              ? "pending"
              : value === "rejected"
                ? "rejected"
                : value === "suspended"
                  ? "deactivated"
                  : "pending";
      }
      return next;
    });
  };

  const handleServicesChange = (e) => {
    if (isReadonly) return;
    const value = String(e.target.value || "").trim();
    setFormData((prev) => ({ ...prev, selectedServiceIds: value ? [value] : [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadonly) return;
    if (formData.vendorKind !== "product" && formData.vendorKind !== "service") {
      toast.error("Please select a vendor type.");
      return;
    }
    setSubmitting(true);
    try {
      const uploaded = { ...formData };
      const fileKeys = ["thumbnailUrl", "gstCertUrl", "panCardUrl"];
      for (const key of fileKeys) {
        if (pendingFiles[key]) {
          const res = await uploadFile(pendingFiles[key]);
          uploaded[key] = res.url;
        }
      }

      const categoriesJson = uploaded.categorySlug ? [uploaded.categorySlug] : null;
      const servicesJson =
        uploaded.vendorKind === "service" && Array.isArray(uploaded.selectedServiceIds) && uploaded.selectedServiceIds.length > 0
          ? uploaded.selectedServiceIds
          : null;
      const addressJson = {
        state: uploaded.stateName || "",
        stateCode: uploaded.stateCode || "",
        areaLocality: uploaded.registeredShopAddress || "",
      };
      const bankJson = buildBankJson(uploaded);
      const documentsJson = {};
      if (uploaded.gstCertUrl?.trim()) documentsJson.gstCertificateUrl = uploaded.gstCertUrl.trim();
      if (uploaded.panCardUrl?.trim()) documentsJson.panCardUrl = uploaded.panCardUrl.trim();

      const vk = uploaded.vendorKind === "service" ? "service" : "product";

      const payload = {
        ownerName: uploaded.ownerName?.trim() || null,
        businessName: uploaded.businessName?.trim() || null,
        vendorRef: uploaded.vendorRef?.trim() || null,
        email: uploaded.email?.trim() || null,
        phone: uploaded.phone?.trim() || null,
        status: uploaded.status || "pending",
        paymentStatus: uploaded.paymentStatus || "unpaid",
        transactionRef: uploaded.transactionRef?.trim() || null,
        maxRedemptionPercent: uploaded.maxRedemptionPercent ? Number(uploaded.maxRedemptionPercent) : null,
        thumbnailUrl: uploaded.thumbnailUrl?.trim() || null,
        vendorKind: vk,
        vendorType: vk === "service" ? "SERVICE" : "PRODUCT",
        bannerUrl: null,
        gst: uploaded.gst?.trim() || null,
        pan: uploaded.pan?.trim() || null,
        secondaryPhone: null,
        membershipStatus: null,
        experience: null,
        trending: false,
        appliedReferralCode: null,
        aboutBusiness: null,
        categoriesJson,
        servicesJson,
        addressJson,
        commissionRate: uploaded.commissionRate ? Number(uploaded.commissionRate) : null,
        vendorPlanId: uploaded.vendorPlanId?.trim() || null,
        enrollmentCost: uploaded.enrollmentCost ? Number(uploaded.enrollmentCost) : null,
        coverageRadiusKm: uploaded.coverageRadiusKm ? Number(uploaded.coverageRadiusKm) : null,
        restriction: uploaded.restriction?.trim() || null,
        selfDelivery: Boolean(uploaded.selfDelivery),
        documentsJson: Object.keys(documentsJson).length > 0 ? documentsJson : null,
        bankJson,
      };

      if (isEdit && vendorId) {
        await updateVendor(vendorId, payload);
        toast.success("Vendor updated.");
      } else {
        await createVendor(payload);
        toast.success("Vendor created.");
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = isReadonly || submitting || entityLoading;
  const showSkeleton = Boolean(vendorId) && entityLoading;

  return (
    <div className='card p-0 radius-16 border-0'>
      <div className='card-body p-12 p-sm-20'>
        {loadError && vendorId && !showSkeleton && <div className='alert alert-danger radius-12 mb-16'>{loadError}</div>}
        {showSkeleton ? (
          <p className='text-secondary-light mb-0'>Loading vendor...</p>
        ) : (
          <form onSubmit={handleSubmit} className={isReadonly ? "vendor-form-readonly" : undefined}>
            <div className='d-flex align-items-start gap-3 mb-16'>
              <div className='d-flex align-items-center gap-12 min-w-0 flex-grow-1'>
                <span className='w-56-px h-56-px rounded-3 bg-primary-100 text-primary-600 d-flex align-items-center justify-content-center flex-shrink-0'>
                  {formData.thumbnailUrl ? (
                    <img src={resolveMediaUrl(formData.thumbnailUrl)} alt='logo' className='w-100 h-100 rounded-3 object-fit-cover' />
                  ) : (
                    <Icon icon='mdi:storefront-outline' className='text-2xl' />
                  )}
                </span>
                <div className='min-w-0'>
                  <h4 className='mb-0 fw-bold text-primary-light'>
                    {formData.businessName || (formData.vendorKind === "service" ? "Service vendor" : "Product vendor")}
                  </h4>
                  <p className='mb-0 text-neutral-600 text-md mt-4'>
                    {formData.ownerName || "—"}
                    {formData.vendorRef && !/^VEND[a-f0-9]{6}$/i.test(String(formData.vendorRef).trim())
                      ? ` · ${formData.vendorRef.trim()}`
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className='d-flex flex-wrap align-items-center gap-8 mb-16'>
              <span className='px-12 py-4 rounded-pill bg-success-focus text-success-main fw-semibold text-sm'>{formData.verificationStatus}</span>
              <span className={`px-12 py-4 rounded-pill fw-semibold text-sm ${formData.paymentStatus === "paid" ? "bg-success-focus text-success-main" : "bg-warning-focus text-neutral-800"}`}>{formData.paymentStatus}</span>
            </div>

            <div className='bg-primary-50 radius-12 p-6 d-flex gap-6 mb-16'>
              <TabButton active={activeTab === "details"} label='Details' onClick={() => setActiveTab("details")} />
              <TabButton active={activeTab === "kyc"} label='KYC & Documents' onClick={() => setActiveTab("kyc")} />
              <TabButton active={activeTab === "plan"} label='Plan & Payment' onClick={() => setActiveTab("plan")} />
            </div>

            {activeTab === "details" && (
              <section className='d-flex flex-column gap-16'>
                <div className='row g-12'>
                  <Field col='col-md-6' label='Owner Name *'><input className='form-control radius-10' name='ownerName' value={formData.ownerName} onChange={handleChange} disabled={disabled} /></Field>
                  <Field col='col-md-6' label='Business Name *'><input className='form-control radius-10' name='businessName' value={formData.businessName} onChange={handleChange} disabled={disabled} /></Field>
                  <Field col='col-md-6' label='Email'><input className='form-control radius-10' name='email' value={formData.email} onChange={handleChange} disabled={disabled} /></Field>
                  <Field col='col-md-6' label='Mobile'><input className='form-control radius-10' name='phone' value={formData.phone} onChange={handleChange} disabled={disabled} /></Field>
                  {formData.vendorKind !== "service" && (
                    <Field col='col-md-6' label='Vendor Category'>
                      <select className='form-select radius-10' name='categorySlug' value={formData.categorySlug} onChange={handleChange} disabled={disabled}>
                        <option value=''>Select...</option>
                        {catalogCategories
                          .filter((c) => !c.parentId)
                          .map((c) => <option key={c.id} value={c.slug || c.name}>{c.name}</option>)}
                      </select>
                    </Field>
                  )}
                  {formData.vendorKind === "service" && (
                    <Field col='col-md-6' label='Services'>
                      <select
                        className='form-select radius-10'
                        name='selectedServiceIds'
                        value={formData.selectedServiceIds?.[0] || ""}
                        onChange={handleServicesChange}
                        disabled={disabled}
                      >
                        <option value=''>Select service...</option>
                        {catalogServices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Field col='col-md-6' label='Status'>
                    <select className='form-select radius-10' name='status' value={formData.status} onChange={handleChange} disabled={disabled}>
                      <option value='active'>Verified</option>
                      <option value='pending'>Pending</option>
                      <option value='rejected'>Rejected</option>
                      <option value='suspended'>Deactivated</option>
                    </select>
                  </Field>
                  <Field col='col-md-6' label='Vendor Type *'>
                    <select
                      className='form-select radius-10'
                      name='vendorKind'
                      value={formData.vendorKind}
                      onChange={handleChange}
                      disabled={disabled || isView}
                      required
                    >
                      <option value='product'>Product Vendor</option>
                      <option value='service'>Service Vendor</option>
                    </select>
                  </Field>
                  <Field
                    col='col-md-12'
                    label={(
                      <span className='d-inline-flex align-items-center gap-6'>
                        <Icon icon='mdi:crown' className='text-warning-main text-lg flex-shrink-0' aria-hidden />
                        Vendor Plan
                      </span>
                    )}
                  >
                    <select
                      className='form-select radius-10 bg-white'
                      name='vendorPlanId'
                      value={formData.vendorPlanId}
                      onChange={handleChange}
                      disabled={disabled}
                      aria-label='Vendor plan'
                      style={{ borderWidth: 2, borderColor: "#20a090", borderStyle: "solid" }}
                    >
                      <option value=''>No Plan</option>
                      {localVendorPlans.length > 0 && (
                        <optgroup label='LOCAL PLANS'>
                          {localVendorPlans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {formatVendorPlanOptionLabel(p)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {vipVendorPlans.length > 0 && (
                        <optgroup label='VIP PLANS'>
                          {vipVendorPlans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {formatVendorPlanOptionLabel(p)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherVendorPlans.length > 0 && (
                        <optgroup label='OTHER PLANS'>
                          {otherVendorPlans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {formatVendorPlanOptionLabel(p)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </Field>
                </div>

                <div className='bg-primary-25 radius-12 p-14'>
                  <div className='d-flex flex-wrap align-items-start justify-content-between gap-10 mb-10'>
                    <div className='d-flex align-items-center gap-8 flex-wrap min-w-0'>
                      <Icon icon='mdi:file-document-outline' className='text-primary-600 text-xl flex-shrink-0' />
                      <h5 className='mb-0 fw-bold text-primary-light'>GST & TAX COMPLIANCE</h5>
                    </div>
                    <span
                      className='px-12 py-6 rounded-pill bg-warning-focus text-neutral-800 text-xs fw-semibold text-start'
                      style={{ maxWidth: "100%", lineHeight: 1.4, whiteSpace: "normal", wordBreak: "break-word" }}
                    >
                      Required for tax invoices
                    </span>
                  </div>
                  <p className='text-neutral-600 text-sm mb-0'>These details appear on customer tax invoice issued under vendor name.</p>
                  <div className='row g-12'>
                    <Field col='col-md-6' label='GSTIN (15 chars)'><input className='form-control radius-10' name='gst' value={formData.gst} onChange={handleChange} disabled={disabled} /></Field>
                    <Field col='col-md-6' label='PAN (10 chars)'><input className='form-control radius-10' name='pan' value={formData.pan} onChange={handleChange} disabled={disabled} /></Field>
                    <Field col='col-md-6' label='State Name (place of supply)'><input className='form-control radius-10' name='stateName' value={formData.stateName} onChange={handleChange} disabled={disabled} /></Field>
                    <Field col='col-md-6' label='State Code (2 digits)'><input className='form-control radius-10' name='stateCode' value={formData.stateCode} onChange={handleChange} disabled={disabled} /></Field>
                    <Field col='col-md-12' label='Registered Shop Address (printed on invoice)'><input className='form-control radius-10' name='registeredShopAddress' value={formData.registeredShopAddress} onChange={handleChange} disabled={disabled} /></Field>
                  </div>
                </div>

                <div className='bg-primary-25 radius-12 p-14'>
                  <h5 className='mb-12 fw-bold'>Shop Photo</h5>
                  {!isReadonly && <input type='file' className='form-control radius-10 mb-12' accept='image/*' disabled={disabled} onChange={(e) => { if (e.target.files?.[0]) setPendingFiles((p) => ({ ...p, thumbnailUrl: e.target.files[0] })); }} />}
                  <div className='border border-dashed radius-12 py-24 text-center text-secondary-light'>
                    {pendingFiles.thumbnailUrl || formData.thumbnailUrl ? (
                      <img src={pendingFiles.thumbnailUrl ? URL.createObjectURL(pendingFiles.thumbnailUrl) : resolveMediaUrl(formData.thumbnailUrl)} alt='Shop' style={{ maxHeight: 140, objectFit: "cover", borderRadius: 10 }} />
                    ) : (
                      <><Icon icon='mdi:image-off-outline' className='text-2xl mb-4' /><div>No shop photo uploaded</div></>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "kyc" && (
              <section className='bg-primary-25 radius-12 p-14'>
                <div className='row g-12'>
                  <Field col='col-md-6' label='GST Certificate'>
                    {!isReadonly && <input type='file' className='form-control radius-10' accept='image/*,.pdf' disabled={disabled} onChange={(e) => { if (e.target.files?.[0]) setPendingFiles((p) => ({ ...p, gstCertUrl: e.target.files[0] })); }} />}
                    {formData.gstCertUrl ? (
                      <a className='text-primary-600 text-sm d-inline-block mt-8 fw-medium' href={formData.gstCertUrl} target='_blank' rel='noreferrer'>View GST document</a>
                    ) : isReadonly ? (
                      <p className='text-neutral-600 text-sm mb-0 mt-8'>No file uploaded</p>
                    ) : null}
                  </Field>
                  <Field col='col-md-6' label='PAN Card'>
                    {!isReadonly && <input type='file' className='form-control radius-10' accept='image/*,.pdf' disabled={disabled} onChange={(e) => { if (e.target.files?.[0]) setPendingFiles((p) => ({ ...p, panCardUrl: e.target.files[0] })); }} />}
                    {formData.panCardUrl ? (
                      <a className='text-primary-600 text-sm d-inline-block mt-8 fw-medium' href={formData.panCardUrl} target='_blank' rel='noreferrer'>View PAN document</a>
                    ) : isReadonly ? (
                      <p className='text-neutral-600 text-sm mb-0 mt-8'>No file uploaded</p>
                    ) : null}
                  </Field>
                  <Field col='col-md-6' label='Bank Name'><input className='form-control radius-10' name='bankName' value={formData.bankName} onChange={handleChange} disabled={disabled} /></Field>
                  <Field col='col-md-6' label='IFSC'><input className='form-control radius-10' name='ifscCode' value={formData.ifscCode} onChange={handleChange} disabled={disabled} /></Field>
                  <Field col='col-md-6' label='Account Holder'><input className='form-control radius-10' name='accountHolderName' value={formData.accountHolderName} onChange={handleChange} disabled={disabled} /></Field>
                  <Field col='col-md-6' label='Account Number'><input className='form-control radius-10' name='accountNumber' value={formData.accountNumber} onChange={handleChange} disabled={disabled} /></Field>
                </div>
              </section>
            )}

            {activeTab === "plan" && (
              <section className='bg-primary-25 radius-12 p-14 d-flex flex-column gap-12'>
                <div className='row g-12'>
                  <p className='text-neutral-600 text-sm mb-0 col-12'>
                    Vendor plan is chosen on the <strong>Details</strong> tab (No Plan, Local, or VIP tiers). Enrollment and commission below still apply.
                  </p>
                  <Field col='col-md-6' label='Enrollment Cost (₹)'><input type='number' min='0' step='0.01' className='form-control radius-10' name='enrollmentCost' value={formData.enrollmentCost} onChange={handleChange} disabled={disabled} placeholder='Inherits plan price if blank' /></Field>
                  <Field col='col-md-6' label='Commission % (overrides plan)'><input className='form-control radius-10' name='commissionRate' value={formData.commissionRate} onChange={handleChange} disabled={disabled} /></Field>
                  <Field col='col-md-6' label='Max User Redemption % (overrides plan)'><input className='form-control radius-10' name='maxRedemptionPercent' value={formData.maxRedemptionPercent} onChange={handleChange} disabled={disabled} /></Field>
                  <Field col='col-md-6' label='Coverage Radius (km)'><input type='number' min='0' step='0.1' className='form-control radius-10' name='coverageRadiusKm' value={formData.coverageRadiusKm} onChange={handleChange} disabled={disabled} /></Field>
                  <Field col='col-md-6' label='Restriction (zone)'>
                    <select className='form-select radius-10' name='restriction' value={formData.restriction} onChange={handleChange} disabled={disabled}>
                      <option value=''>— None —</option>
                      <option value='district'>District</option>
                      <option value='state'>State</option>
                      <option value='pan_india'>PAN India</option>
                      <option value='international'>International</option>
                    </select>
                  </Field>
                  <Field col='col-md-6' label='Self Delivery by Vendor'>
                    <div className='form-check form-switch mt-8'>
                      <input className='form-check-input' type='checkbox' name='selfDelivery' checked={formData.selfDelivery} onChange={handleChange} disabled={disabled} id='selfDeliveryCheck' />
                      <label className='form-check-label' htmlFor='selfDeliveryCheck'>{formData.selfDelivery ? "Yes" : "No"}</label>
                    </div>
                  </Field>
                  <Field col='col-md-6' label='Payment Status'>
                    <select className='form-select radius-10' name='paymentStatus' value={formData.paymentStatus} onChange={handleChange} disabled={disabled}>
                      <option value='unpaid'>Unpaid</option>
                      <option value='paid'>Paid</option>
                      <option value='partial'>Partial</option>
                    </select>
                  </Field>
                  <Field col='col-md-6' label='Transaction Reference ID'><input className='form-control radius-10' name='transactionRef' value={formData.transactionRef} onChange={handleChange} disabled={disabled} /></Field>
                </div>
              </section>
            )}

            <div className='d-flex justify-content-end gap-10 mt-20'>
              <button type='button' onClick={onCancel} className='btn btn-light border radius-10 px-20'>Close</button>
              {isView && isReadonly && <button type='button' onClick={() => setIsReadonly(false)} className='btn btn-primary radius-10 px-20'>Edit</button>}
              {!isReadonly && <button type='submit' disabled={submitting} className='btn btn-primary radius-10 px-20'>{submitting ? "Saving..." : "Save"}</button>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, label, onClick }) => (
  <button type='button' onClick={onClick} className={`btn border-0 radius-10 px-20 py-8 ${active ? "bg-white text-primary-600 fw-semibold" : "bg-transparent text-neutral-600"}`}>
    {label}
  </button>
);

const Field = ({ col, label, children }) => (
  <div className={col}>
    <label className='form-label fw-semibold text-neutral-700 text-sm mb-8'>{label}</label>
    {children}
  </div>
);

export default VendorFormLayer;

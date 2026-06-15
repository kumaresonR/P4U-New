import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  createClassifiedVendor,
  updateClassifiedVendor,
  uploadFile,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";

const empty = () => ({
  contactName: "",
  displayName: "",
  vendorRef: "",
  mobileNumber: "",
  verificationStatus: "verified",
  status: "verified",
  categoryId: "",
  aadhaarNumber: "",
  aadhaarDocTitle: "Aadhaar Card",
  aadhaarDocStatus: "submitted",
  accountHolder: "",
  accountNumber: "",
  ifscCode: "",
  bankName: "",
  kycStatus: "approved",
  vendorPlan: "Basic",
  commissionPercent: "10",
  maxRedemptionPercent: "",
  paymentStatus: "unpaid",
  transactionRef: "",
  logoUrl: "",
});

const CFVendorFormLayer = ({
  isEdit = false,
  isView = false,
  initialData = null,
  categories = [],
  onSuccess,
  onCancel,
}) => {
  const [form, setForm] = useState(empty);
  const [activeTab, setActiveTab] = useState("details");
  const [isReadonly, setIsReadonly] = useState(Boolean(isView));
  const [pendingLogo, setPendingLogo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const pendingLogoRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      const meta = initialData.metadata || {};
      setForm({
        contactName: meta.contactName || "",
        displayName: initialData.displayName || initialData.name || "",
        vendorRef: meta.vendorRef || `VND-${String(initialData.id || "").slice(-6)}`,
        mobileNumber: meta.mobileNumber || "",
        verificationStatus: meta.verificationStatus || "verified",
        status: String(initialData.status || meta.verificationStatus || "verified").toLowerCase(),
        categoryId: meta.categoryId || "",
        aadhaarNumber: meta.aadhaarNumber || "",
        aadhaarDocTitle: meta.aadhaarDocTitle || "Aadhaar Card",
        aadhaarDocStatus: meta.aadhaarDocStatus || "submitted",
        accountHolder: meta.accountHolder || "",
        accountNumber: meta.accountNumber || "",
        ifscCode: meta.ifscCode || "",
        bankName: meta.bankName || "",
        kycStatus: meta.kycStatus || "approved",
        vendorPlan: meta.vendorPlan || "Basic",
        commissionPercent: String(meta.commissionPercent ?? 10),
        maxRedemptionPercent: String(meta.maxRedemptionPercent || ""),
        paymentStatus: meta.paymentStatus || "unpaid",
        transactionRef: meta.transactionRef || "",
        logoUrl: meta.logoUrl || "",
      });
    } else {
      setForm(empty());
    }
    setActiveTab("details");
    setIsReadonly(Boolean(isView));
    setPendingLogo(null);
    pendingLogoRef.current = null;
  }, [initialData, isView]);

  const handleChange = (e) => {
    if (isReadonly) return;
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleLogo = (e) => {
    if (isReadonly) return;
    const file = e.target.files && e.target.files[0];
    if (file) { setPendingLogo(file); pendingLogoRef.current = file; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadonly) return;

    const displayName = form.displayName.trim();
    if (!displayName) { toast.error("Business name is required."); return; }

    let logoUrl = form.logoUrl;
    const logoFile = pendingLogoRef.current || pendingLogo;
    if (logoFile) {
      try {
        const res = await uploadFile(logoFile);
        logoUrl = res.url;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Logo upload failed");
        return;
      }
    }

    const selectedCategory = categories.find((c) => c.id === form.categoryId);

    const metadata = {
      ...(form.contactName.trim() ? { contactName: form.contactName.trim() } : {}),
      ...(form.vendorRef.trim() ? { vendorRef: form.vendorRef.trim() } : {}),
      ...(form.categoryId ? { categoryId: form.categoryId } : {}),
      ...(selectedCategory?.name ? { categoryName: selectedCategory.name } : {}),
      ...(form.mobileNumber.trim() ? { mobileNumber: form.mobileNumber.trim() } : {}),
      verificationStatus: form.verificationStatus || "verified",
      ...(form.aadhaarNumber.trim() ? { aadhaarNumber: form.aadhaarNumber.trim() } : {}),
      ...(form.aadhaarDocTitle.trim() ? { aadhaarDocTitle: form.aadhaarDocTitle.trim() } : {}),
      aadhaarDocStatus: form.aadhaarDocStatus || "submitted",
      ...(form.accountHolder.trim() ? { accountHolder: form.accountHolder.trim() } : {}),
      ...(form.accountNumber.trim() ? { accountNumber: form.accountNumber.trim() } : {}),
      ...(form.ifscCode.trim() ? { ifscCode: form.ifscCode.trim() } : {}),
      ...(form.bankName.trim() ? { bankName: form.bankName.trim() } : {}),
      kycStatus: form.kycStatus || "approved",
      vendorPlan: form.vendorPlan || "Basic",
      commissionPercent: Number(form.commissionPercent || 0) || 0,
      maxRedemptionPercent: form.maxRedemptionPercent === "" ? null : Number(form.maxRedemptionPercent || 0),
      paymentStatus: form.paymentStatus || "unpaid",
      ...(form.transactionRef.trim() ? { transactionRef: form.transactionRef.trim() } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    };

    const body = {
      name: displayName,
      isActive: !["deactivated", "deleted"].includes(String(form.status || "").toLowerCase()),
      status: form.status || metadata.verificationStatus || "verified",
      metadata,
    };

    setSubmitting(true);
    try {
      if (isEdit && initialData?.id) {
        await updateClassifiedVendor(initialData.id, body);
        toast.success("Vendor updated.");
      } else {
        await createClassifiedVendor(body);
        toast.success("Vendor created.");
      }
      setIsReadonly(Boolean(isView));
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const dis = isReadonly || submitting;

  return (
    <div className='card h-100 p-0 radius-16 border-0'>
      <div className='card-body p-20'>
        <form onSubmit={handleSubmit}>
          <div className='d-flex align-items-start justify-content-between gap-3 mb-16'>
            <div className='d-flex align-items-center gap-12'>
              <span className='w-56-px h-56-px rounded-3 bg-primary-100 text-primary-600 d-flex align-items-center justify-content-center'>
                {form.logoUrl || pendingLogo ? (
                  <img src={pendingLogo ? URL.createObjectURL(pendingLogo) : resolveMediaUrl(form.logoUrl)} alt='Logo' className='w-100 h-100 rounded-3 object-fit-cover' />
                ) : (
                  <Icon icon='mdi:storefront-outline' className='text-2xl' />
                )}
              </span>
              <div>
                <h5 className='mb-0 fw-bold'>{form.displayName || "new vendor"}</h5>
                <p className='mb-0 text-secondary-light'>{form.contactName || "—"} · {form.vendorRef || "—"}</p>
              </div>
            </div>
            <button type='button' onClick={onCancel} className='btn btn-link p-0 text-secondary-light'>
              <Icon icon='mdi:close' className='text-2xl' />
            </button>
          </div>

          <div className='d-flex align-items-center gap-8 mb-16'>
            <span className='px-12 py-4 rounded-pill bg-success-focus text-success-main fw-semibold text-sm'>
              {form.verificationStatus}
            </span>
            <span className={`px-12 py-4 rounded-pill fw-semibold text-sm ${form.paymentStatus === "paid" ? "bg-success-focus text-success-main" : "bg-warning-focus text-warning-main"}`}>
              {form.paymentStatus}
            </span>
          </div>

          <div className='bg-primary-50 radius-12 p-6 d-flex gap-6 mb-16'>
            <TabButton active={activeTab === "details"} onClick={() => setActiveTab("details")} label='Details' />
            <TabButton active={activeTab === "kyc"} onClick={() => setActiveTab("kyc")} label='KYC & Documents' />
            <TabButton active={activeTab === "plan"} onClick={() => setActiveTab("plan")} label='Plan & Payment' />
          </div>

          {activeTab === "details" && (
            <section className='bg-primary-25 radius-12 p-16'>
              <div className='row g-16'>
                <Field col='col-md-6' label='Vendor Name'>
                  <input className='form-control radius-10' name='displayName' value={form.displayName} onChange={handleChange} disabled={dis} />
                </Field>
                <Field col='col-md-6' label='Contact Name'>
                  <input className='form-control radius-10' name='contactName' value={form.contactName} onChange={handleChange} disabled={dis} />
                </Field>
                <Field col='col-md-4' label='Vendor Ref'>
                  <input className='form-control radius-10' name='vendorRef' value={form.vendorRef} onChange={handleChange} disabled={dis} />
                </Field>
                <Field col='col-md-4' label='Mobile'>
                  <input className='form-control radius-10' name='mobileNumber' value={form.mobileNumber} onChange={handleChange} disabled={dis} />
                </Field>
                <Field col='col-md-4' label='Category'>
                  <select className='form-select radius-10' name='categoryId' value={form.categoryId} onChange={handleChange} disabled={dis}>
                    <option value=''>Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </Field>
                <Field col='col-md-4' label='Status'>
                  <select className='form-select radius-10' name='status' value={form.status} onChange={handleChange} disabled={dis}>
                    <option value='verified'>Verified</option>
                    <option value='pending'>Pending</option>
                    <option value='rejected'>Rejected</option>
                    <option value='deactivated'>Deactivated</option>
                  </select>
                </Field>
                <Field col='col-md-4' label='Verification'>
                  <select className='form-select radius-10' name='verificationStatus' value={form.verificationStatus} onChange={handleChange} disabled={dis}>
                    <option value='verified'>Verified</option>
                    <option value='pending'>Pending</option>
                    <option value='rejected'>Rejected</option>
                  </select>
                </Field>
                <Field col='col-md-4' label='Logo'>
                  {!isReadonly && <input type='file' className='form-control radius-10' onChange={handleLogo} accept='image/*' />}
                </Field>
              </div>
            </section>
          )}

          {activeTab === "kyc" && (
            <section className='bg-primary-25 radius-12 p-16 d-flex flex-column gap-16'>
              <div>
                <h5 className='fw-bold mb-12'>KYC & Identity Documents</h5>
                <div className='border radius-12 p-12 d-flex align-items-center justify-content-between'>
                  <div>
                    <h6 className='mb-2 fw-semibold'>{form.aadhaarDocTitle || "Aadhaar Card"}</h6>
                    <p className='mb-0 text-secondary-light'>No: {form.aadhaarNumber || "—"}</p>
                  </div>
                  <span className='px-12 py-4 rounded-pill bg-success-focus text-success-main fw-semibold text-xs'>
                    {form.aadhaarDocStatus}
                  </span>
                </div>
              </div>

              <div>
                <h5 className='fw-bold mb-12'>Bank Details</h5>
                <div className='border radius-12 p-12'>
                  <div className='row g-12'>
                    <Field col='col-md-6' label='Account Holder'>
                      <input className='form-control radius-10' name='accountHolder' value={form.accountHolder} onChange={handleChange} disabled={dis} />
                    </Field>
                    <Field col='col-md-6' label='Account Number'>
                      <input className='form-control radius-10' name='accountNumber' value={form.accountNumber} onChange={handleChange} disabled={dis} />
                    </Field>
                    <Field col='col-md-6' label='IFSC Code'>
                      <input className='form-control radius-10' name='ifscCode' value={form.ifscCode} onChange={handleChange} disabled={dis} />
                    </Field>
                    <Field col='col-md-6' label='Bank Name'>
                      <input className='form-control radius-10' name='bankName' value={form.bankName} onChange={handleChange} disabled={dis} />
                    </Field>
                    <Field col='col-md-6' label='Aadhaar Number'>
                      <input className='form-control radius-10' name='aadhaarNumber' value={form.aadhaarNumber} onChange={handleChange} disabled={dis} />
                    </Field>
                    <Field col='col-md-6' label='KYC Status'>
                      <select className='form-select radius-10' name='kycStatus' value={form.kycStatus} onChange={handleChange} disabled={dis}>
                        <option value='approved'>Approved</option>
                        <option value='pending'>Pending</option>
                        <option value='rejected'>Rejected</option>
                      </select>
                    </Field>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "plan" && (
            <section className='bg-primary-25 radius-12 p-16 d-flex flex-column gap-16'>
              <div className='border radius-12 p-14'>
                <p className='text-secondary-light mb-4'>Vendor Plan</p>
                <h4 className='mb-0 fw-bold'>{form.vendorPlan || "Basic"}</h4>
              </div>
              <div className='row g-12'>
                <div className='col-md-6'>
                  <div className='border radius-12 p-14'>
                    <p className='text-secondary-light mb-4'>Vendor to P4U Commission</p>
                    <h3 className='mb-0 fw-bold'>{form.commissionPercent || 0}%</h3>
                    {!isReadonly && <input className='form-control mt-10 radius-10' name='commissionPercent' value={form.commissionPercent} onChange={handleChange} />}
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='border radius-12 p-14'>
                    <p className='text-secondary-light mb-4'>Max User Redemption %</p>
                    <h3 className='mb-0 fw-bold'>{form.maxRedemptionPercent || "Plan default"}</h3>
                    {!isReadonly && <input className='form-control mt-10 radius-10' name='maxRedemptionPercent' value={form.maxRedemptionPercent} onChange={handleChange} />}
                  </div>
                </div>
              </div>
              <div className='border radius-12 p-14'>
                <label className='form-label fw-semibold mb-8'>Payment Status</label>
                <div className='d-flex align-items-center gap-10'>
                  <select className='form-select radius-10' style={{ maxWidth: 220 }} name='paymentStatus' value={form.paymentStatus} onChange={handleChange} disabled={dis}>
                    <option value='unpaid'>Unpaid</option>
                    <option value='paid'>Paid</option>
                    <option value='partial'>Partial</option>
                  </select>
                  <span className={`px-12 py-4 rounded-pill fw-semibold text-sm ${form.paymentStatus === "paid" ? "bg-success-focus text-success-main" : "bg-danger-focus text-danger-main"}`}>
                    {form.paymentStatus}
                  </span>
                </div>
              </div>
              <div className='border radius-12 p-14'>
                <label className='form-label fw-semibold mb-8'>Transaction Reference ID</label>
                <div className='d-flex gap-10'>
                  <input className='form-control radius-10' placeholder='Enter transaction ID' name='transactionRef' value={form.transactionRef} onChange={handleChange} disabled={dis} />
                  {!isReadonly && (
                    <button type='submit' disabled={submitting} className='btn btn-primary radius-10 px-20'>
                      {submitting ? "Saving..." : "Save"}
                    </button>
                  )}
                </div>
              </div>
              <div className='border radius-12 p-14 bg-info-50'>
                <h5 className='fw-bold mb-8'>Company Account for Offline Payment</h5>
                <div className='row g-8'>
                  <div className='col-md-6'><span className='text-secondary-light'>Account Name:</span> <strong>Planext4U Pvt Ltd</strong></div>
                  <div className='col-md-6'><span className='text-secondary-light'>Account No:</span> <strong>1234567890123</strong></div>
                  <div className='col-md-6'><span className='text-secondary-light'>IFSC:</span> <strong>SBIN0001234</strong></div>
                  <div className='col-md-6'><span className='text-secondary-light'>Bank:</span> <strong>State Bank of India</strong></div>
                </div>
                <p className='text-xs text-secondary-light mt-8 mb-0'>
                  Share these details with the vendor for offline payment. After payment, update payment status and transaction ID above.
                </p>
              </div>
            </section>
          )}

          <div className='d-flex align-items-center justify-content-end gap-10 mt-20'>
            <button type='button' onClick={onCancel} className='btn btn-light border radius-10 px-20'>Close</button>
            {isView && isReadonly && (
              <button type='button' onClick={() => setIsReadonly(false)} className='btn btn-primary radius-10 px-20'>Edit</button>
            )}
            {!isReadonly && (
              <button type='submit' disabled={submitting} className='btn btn-primary radius-10 px-20'>
                {submitting ? "Saving..." : isEdit || isView ? "Save" : "Create"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label }) => (
  <button
    type='button'
    onClick={onClick}
    className={`btn border-0 radius-10 px-20 py-8 ${active ? "bg-white fw-semibold text-primary-600" : "bg-transparent text-secondary-light"}`}
  >
    {label}
  </button>
);

const Field = ({ col, label, children }) => (
  <div className={`${col} mb-0`}>
    <label className='form-label fw-semibold text-primary-light text-sm mb-8'>{label}</label>
    {children}
  </div>
);

export default CFVendorFormLayer;

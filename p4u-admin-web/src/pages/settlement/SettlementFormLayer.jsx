import React, { useMemo } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";

const SettlementFormLayer = ({ isView = true, initialData = null, vendors = [], onCancel }) => {
  const vendorById = useMemo(() => {
    const m = new Map();
    vendors.forEach((v) => m.set(v.id, v));
    return m;
  }, [vendors]);

  const meta = (initialData && initialData.metadata) || {};
  const v = initialData?.vendorId ? vendorById.get(initialData.vendorId) : null;
  const vendorName = meta.vendorName || v?.name || v?.businessName || "";
  const vendorMobile = meta.vendorMobile || v?.phone || "";

  const display = {
    vendorName,
    vendorMobile,
    paymentMode: meta.paymentMode || "",
    transactionId: meta.transactionId || "",
    settlementType: meta.settlementOwnerType || "Vendors",
    amount: initialData?.amount ?? "",
    documentUrl: initialData?.documentUrl || "",
    status: initialData?.status || "",
    settlementKind: initialData?.settlementType || "",
  };

  return (
    <div className='card h-100 p-0 radius-12'>
      <div className='card-header border-bottom bg-base py-16 px-24'>
        <h4 className='text-lg fw-semibold mb-0'>
          {isView ? "View Settlement" : "Settlement Details"}
        </h4>
      </div>
      <div className='card-body p-24'>
        <form>
          <div className='row'>
            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Vendor</label>
              <input type='text' className='form-control radius-8 bg-neutral-100' value={display.vendorName || "—"} readOnly disabled />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Vendor Mobile</label>
              <input type='text' className='form-control radius-8 bg-neutral-100' value={display.vendorMobile || "—"} readOnly disabled />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Payment Mode</label>
              <input type='text' className='form-control radius-8 bg-neutral-100' value={display.paymentMode || "—"} readOnly disabled />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Transaction ID</label>
              <input type='text' className='form-control radius-8 bg-neutral-100' value={display.transactionId || "—"} readOnly disabled />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Settlement Type</label>
              <input type='text' className='form-control radius-8 bg-neutral-100' value={display.settlementType} readOnly disabled />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Amount</label>
              <input
                type='text'
                className='form-control radius-8 bg-neutral-100'
                value={
                  display.settlementKind === "points"
                    ? `${display.amount} Pts`
                    : `₹${display.amount}`
                }
                readOnly
                disabled
              />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Status</label>
              <input type='text' className='form-control radius-8 bg-neutral-100' value={display.status || "—"} readOnly disabled />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Receipt</label>
              {display.documentUrl ? (
                <div>
                  <a
                    href={display.documentUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='text-sm text-primary-600 fw-medium d-flex align-items-center gap-2'
                  >
                    <Icon icon='mdi:image-outline' className='text-xl' /> View Attached Receipt
                  </a>
                </div>
              ) : (
                <input type='text' className='form-control radius-8 bg-neutral-100' value='—' readOnly disabled />
              )}
            </div>
          </div>

          <div className='d-flex align-items-center justify-content-end mt-24'>
            <button type='button' onClick={() => (onCancel ? onCancel() : window.history.back())} className='btn border border-danger-600 text-danger-600 bg-hover-danger-200 text-md px-56 py-12 radius-8 d-flex align-items-center gap-2'>
              <Icon icon='mdi:arrow-left-circle-outline' className='text-xl' /> Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettlementFormLayer;

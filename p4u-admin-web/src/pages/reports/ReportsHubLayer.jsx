import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";

function ReportCard({ icon, title, description, to, gradient }) {
  const body = (
    <>
      <div
        className='w-48-px h-48-px radius-10 d-flex align-items-center justify-content-center flex-shrink-0 text-white shadow-sm'
        style={{ background: gradient }}
      >
        <Icon icon={icon} className='text-2xl' />
      </div>
      <div className='min-w-0 d-flex flex-column justify-content-center reports-hub-card-copy'>
        <h6 className='fw-bold text-primary-light mb-8 lh-sm'>{title}</h6>
        <p className='text-sm text-secondary-light mb-0 lh-base'>{description}</p>
      </div>
    </>
  );

  const cardCls =
    "d-flex align-items-start p-20 bg-base border radius-12 text-start h-100 text-decoration-none text-primary-light reports-hub-card";

  if (to) {
    return (
      <Link to={to} className={cardCls}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type='button'
      className={`${cardCls} border-0 w-100`}
      onClick={() => toast.info("This report is not available yet.", { autoClose: 2800 })}
    >
      {body}
    </button>
  );
}

const GRAD = {
  teal: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
  blue: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  green: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  orange: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
  slate: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  violet: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  pink: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
  indigo: "linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)",
  cyan: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
  rose: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
  emerald: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
};

const OPERATIONAL = [
  { icon: "mdi:chart-line", title: "Sales Report", description: "Revenue, orders, and transaction analytics", to: "/reports/sales", gradient: GRAD.teal },
  { icon: "mdi:chart-bar", title: "Vendor Performance", description: "Vendor-wise revenue, ratings, and fulfillment", to: "/reports/vendor-performance", gradient: GRAD.blue },
  { icon: "mdi:cash-multiple", title: "Settlement Report", description: "Payouts, commissions, and pending settlements", to: "/reports/settlements", gradient: GRAD.green },
  { icon: "mdi:account-group", title: "Customer Report", description: "User growth, retention, and demographics", to: "/reports/customers", gradient: GRAD.orange },
  { icon: "mdi:star-circle", title: "Points Report", description: "Points issued, redeemed, and balance overview", to: "/reports/points", gradient: GRAD.slate },
  { icon: "mdi:gift-outline", title: "Referral Report", description: "Referral conversions and reward distribution", to: "/reports/referrals", gradient: GRAD.violet },
];

const MARKETPLACE = [
  { icon: "mdi:newspaper-variant-outline", title: "Classified Ads Report", description: "Ad listings, approvals, and engagement", to: "/reports/classified-ads", gradient: GRAD.green },
  { icon: "mdi:credit-card-outline", title: "Payment Report", description: "Payment gateway transactions and reconciliation", to: "/reports/payments", gradient: GRAD.pink },
  { icon: "mdi:finance", title: "P4U Revenue & Profit", description: "Commission revenue, vendor/product-wise profit with cascade source tracking", to: "/reports/revenue-profit", gradient: GRAD.indigo },
];

/** Live cards use `to`; entries with `to: null` are defined for later — hidden until a route is added. */
const GST = [
  { icon: "mdi:file-document-outline", title: "Tax Invoices Issued", description: "All vendor → customer GST invoices auto-generated on order delivery (statutory register).", to: "/reports/tax-invoices", gradient: GRAD.teal },
  { icon: "mdi:calculator-variant", title: "Tax Report", description: "Product tax, GST on platform fee, and tax collection summary.", to: "/reports/tax", gradient: GRAD.orange },
  { icon: "mdi:file-chart-outline", title: "GSTR-1 (Outward Supplies)", description: "Invoice-wise B2C outward supplies with CGST/SGST/IGST + HSN summary for monthly GST filing.", to: null, gradient: GRAD.teal },
  { icon: "mdi:file-document-multiple", title: "GSTR-3B (Monthly Summary)", description: "Self-declaration summary of outward supplies, tax liability, and ITC for monthly return.", to: null, gradient: GRAD.blue },
  { icon: "mdi:backup-restore", title: "Credit Notes (GSTR-1 Table 9B)", description: "Refund/cancellation credit notes auto-generated with reverse tax breakup for amendment filing.", to: null, gradient: GRAD.orange },
  { icon: "mdi:package-variant", title: "HSN-wise Summary", description: "Aggregated supply by HSN code with quantity, taxable value, and tax breakup (GSTR-1 Table 12).", to: null, gradient: GRAD.green },
  { icon: "mdi:domain", title: "TCS u/s 52 (GSTR-8)", description: "Tax Collected at Source @1% per vendor — required monthly filing for e-commerce operators.", to: null, gradient: GRAD.pink },
  { icon: "mdi:percent", title: "TDS u/s 194-O", description: "1% TDS deducted from vendor payouts > ₹5L/yr — quarterly statutory filing for marketplaces.", to: null, gradient: GRAD.blue },
  { icon: "mdi:file-cabinet", title: "GSTR-9 (Annual Return)", description: "Consolidated annual GST return — auto-aggregates monthly GSTR-1/3B data for FY filing.", to: null, gradient: GRAD.cyan },
  { icon: "mdi:book-open-page-variant", title: "Day Book (Tally / Zoho Export)", description: "Voucher-level export for accounting tools and period close.", to: null, gradient: GRAD.emerald },
];

const GST_VISIBLE = GST.filter((c) => c.to);

export default function ReportsHubLayer() {
  return (
    <div className='card border-0 shadow-none bg-transparent'>
      <div className='card-body p-0'>
        <p className='text-xs fw-semibold text-secondary-light text-uppercase letter-spacing-1 mb-16'>Operational reports</p>
        <div className='row g-16 mb-32'>
          {OPERATIONAL.map((c) => (
            <div key={c.title} className='col-12 col-md-6 col-xl-4'>
              <ReportCard {...c} />
            </div>
          ))}
        </div>

        <div className='row g-16 mb-32'>
          {MARKETPLACE.map((c) => (
            <div key={c.title} className='col-12 col-md-6 col-xl-4'>
              <ReportCard {...c} />
            </div>
          ))}
        </div>

        <div className='mb-20'>
          <p className='text-xs fw-semibold text-secondary-light text-uppercase letter-spacing-1 mb-8'>Finance &amp; GST compliance</p>
          <p className='text-sm text-secondary-light mb-4'>India audit &amp; statutory filings</p>
          <p className='text-sm text-secondary-light mb-0 max-w-910-px lh-base'>
            All reports below are auto-generated from completed orders &amp; settlements, support date-range filters, and export to CSV / XLSX where
            applicable. Filing formats follow CBIC guidelines; validate with your CA before submission.
          </p>
        </div>

        <div className='row g-16'>
          {GST_VISIBLE.map((c) => (
            <div key={c.title} className='col-12 col-md-6 col-xl-4'>
              <ReportCard {...c} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .reports-hub-card {
          min-height: 124px;
          column-gap: 18px;
          row-gap: 12px;
          padding: 20px 22px !important;
          align-items: flex-start !important;
        }
        .reports-hub-card > div:first-child {
          margin-top: 2px;
        }
        .reports-hub-card-copy h6 {
          line-height: 1.25;
          margin-bottom: 10px !important;
        }
        .reports-hub-card-copy p {
          line-height: 1.5;
        }
        .reports-hub-card:hover {
          border-color: var(--primary-300, #5eead4) !important;
          box-shadow: 0 4px 20px rgba(15, 118, 110, 0.08);
        }
        .reports-hub-card:focus-visible {
          outline: 2px solid var(--primary-500, #14b8a6);
          outline-offset: 2px;
        }
        .letter-spacing-1 { letter-spacing: 0.06em; }
        .max-w-910-px { max-width: 910px; }
      `}</style>
    </div>
  );
}

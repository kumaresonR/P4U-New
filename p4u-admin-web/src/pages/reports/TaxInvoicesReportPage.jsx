import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import TaxInvoicesReportLayer from "./TaxInvoicesReportLayer";

export default function TaxInvoicesReportPage() {
  return (
    <MasterLayout>
      <Breadcrumb
        title='Tax Invoices Issued'
        pagetitle='Tax Invoices Issued'
        subtitle='All vendor → customer GST invoices auto-generated on order delivery'
      />
      <TaxInvoicesReportLayer />
    </MasterLayout>
  );
}

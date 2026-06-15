import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import PaymentReportLayer from "./PaymentReportLayer";

export default function PaymentReportPage() {
  return (
    <MasterLayout>
      <Breadcrumb
        title='Payment Report'
        pagetitle='Payment Report'
        subtitle='Payment transactions, gateway references, and reconciliation'
      />
      <PaymentReportLayer />
    </MasterLayout>
  );
}

import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import SettlementReportLayer from "./SettlementReportLayer";

export default function SettlementReportPage() {
  return (
    <MasterLayout>
      <Breadcrumb
        title='Settlement Report'
        pagetitle='Settlement Report'
        subtitle='Payouts, commissions, and vendor settlements'
      />
      <SettlementReportLayer />
    </MasterLayout>
  );
}

import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import RevenueProfitReportLayer from "./RevenueProfitReportLayer";

export default function RevenueProfitReportPage() {
  return (
    <MasterLayout>
      <Breadcrumb
        title='P4U Revenue & Profit Report'
        pagetitle='P4U Revenue & Profit Report'
        subtitle='Commission revenue, platform fees, and net profit analysis'
      />
      <RevenueProfitReportLayer />
    </MasterLayout>
  );
}

import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import TaxReportLayer from "./TaxReportLayer";

export default function TaxReportPage() {
  return (
    <MasterLayout>
      <Breadcrumb
        title='Tax Report'
        pagetitle='Tax Report'
        subtitle='Product tax, GST on platform fee, and tax collection summary'
      />
      <TaxReportLayer />
    </MasterLayout>
  );
}

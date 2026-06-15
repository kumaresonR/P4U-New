import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import VendorPerformanceReportLayer from "./VendorPerformanceReportLayer";

export default function VendorPerformanceReportPage() {
  return (
    <MasterLayout>
      <Breadcrumb
        title='Vendor Performance Report'
        pagetitle='Vendor Performance Report'
        subtitle='Vendor-wise revenue, orders, and verification status'
      />
      <VendorPerformanceReportLayer />
    </MasterLayout>
  );
}

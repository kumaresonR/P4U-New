import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import SalesReportLayer from "./SalesReportLayer";

export default function SalesReportPage() {
  return (
    <MasterLayout>
      <Breadcrumb title='Sales Report' pagetitle='Sales Report' subtitle='Revenue, orders, and transaction analytics' />
      <SalesReportLayer />
    </MasterLayout>
  );
}

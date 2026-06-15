import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import CustomerReportLayer from "./CustomerReportLayer";

export default function CustomerReportPage() {
  return (
    <MasterLayout>
      <Breadcrumb title='Customer Report' />
      <CustomerReportLayer />
    </MasterLayout>
  );
}

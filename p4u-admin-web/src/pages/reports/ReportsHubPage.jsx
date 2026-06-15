import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import ReportsHubLayer from "./ReportsHubLayer";

export default function ReportsHubPage() {
  return (
    <MasterLayout>
      <Breadcrumb title='Reports' pagetitle='Reports' subtitle='Analytics and exportable reports for all modules' />
      <ReportsHubLayer />
    </MasterLayout>
  );
}

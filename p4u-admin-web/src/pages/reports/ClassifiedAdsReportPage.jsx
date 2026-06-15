import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import ClassifiedAdsReportLayer from "./ClassifiedAdsReportLayer";

export default function ClassifiedAdsReportPage() {
  return (
    <MasterLayout>
      <Breadcrumb
        title='Classified Ads Report'
        pagetitle='Classified Ads Report'
        subtitle='Ad listings, approvals, and engagement'
      />
      <ClassifiedAdsReportLayer />
    </MasterLayout>
  );
}

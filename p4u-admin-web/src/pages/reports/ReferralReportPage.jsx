import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import ReferralReportLayer from "./ReferralReportLayer";

export default function ReferralReportPage() {
  return (
    <MasterLayout>
      <Breadcrumb
        title='Referral Report'
        pagetitle='Referral Report'
        subtitle='Referral conversions and reward distribution'
      />
      <ReferralReportLayer />
    </MasterLayout>
  );
}

import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import PointsReportLayer from "./PointsReportLayer";

export default function PointsReportPage() {
  return (
    <MasterLayout>
      <Breadcrumb
        title='Points Report'
        pagetitle='Points Report'
        subtitle='Points issued, redeemed, and balance overview'
      />
      <PointsReportLayer />
    </MasterLayout>
  );
}

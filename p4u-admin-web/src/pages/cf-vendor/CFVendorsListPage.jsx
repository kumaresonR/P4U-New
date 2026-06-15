import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import CFVendorListLayer from "./CFVendorListLayer";

export default function CFVendorsListPage() {
  return (
    <MasterLayout>
      <Breadcrumb title='CF vendors (classified)' pagetitle='CF vendors (classified)' />
      <CFVendorListLayer />
    </MasterLayout>
  );
}
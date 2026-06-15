import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import VendorServiceApprovalsLayer from "./VendorServiceApprovalsLayer";

const VendorServiceApprovalsPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Vendor service approvals" pagetitle="Vendor service approvals" />
      <VendorServiceApprovalsLayer />
    </MasterLayout>
  );
};

export default VendorServiceApprovalsPage;

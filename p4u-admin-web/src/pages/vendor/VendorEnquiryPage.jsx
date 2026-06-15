import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import VendorEnquiryListLayer from "./VendorEnquiryListLayer";

const VendorEnquiryPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Catalog vendor enquiry" pagetitle="Catalog vendor enquiry" />
      <VendorEnquiryListLayer />
    </MasterLayout>
  );
};

export default VendorEnquiryPage;

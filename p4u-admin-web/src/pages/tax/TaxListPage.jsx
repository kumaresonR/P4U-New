import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import TaxListLayer from "./TaxListLayer";

const TaxListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='List Tax' pagetitle='Tax Management' />
      <TaxListLayer />
    </MasterLayout>
  );
};

export default TaxListPage;
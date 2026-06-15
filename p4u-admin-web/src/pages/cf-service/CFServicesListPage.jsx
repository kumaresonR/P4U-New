import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import CFServiceListLayer from "./CFServiceListLayer";

const CFServicesListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='List CF Services' pagetitle='CF Services' />
      <CFServiceListLayer />
    </MasterLayout>
  );
};

export default CFServicesListPage;
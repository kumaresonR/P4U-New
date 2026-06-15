import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import CFCityListLayer from "./CFCityListLayer";

const CFCityListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='List Cities' pagetitle='CF City' />
      <CFCityListLayer />
    </MasterLayout>
  );
};

export default CFCityListPage;
import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import PlatformVariableListLayer from "./PlatformVariableListLayer";

const PlatformVariablesListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='List Platform Variables' pagetitle='Platform Settings' />
      <PlatformVariableListLayer />
    </MasterLayout>
  );
};

export default PlatformVariablesListPage;
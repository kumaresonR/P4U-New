import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import ReportLogLayer from "./ReportLogLayer";

const ReportLogPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='Report Log' />
      <ReportLogLayer />
    </MasterLayout>
  );
};

export default ReportLogPage;
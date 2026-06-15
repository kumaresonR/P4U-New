import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import OccupationListLayer from "./OccupationListLayer";

const OccupationListPage = () => (
  <MasterLayout>
    <Breadcrumb
      title="Occupations"
      pagetitle="Occupations"
      subtitle="Manage occupation types, customer counts, and which options appear when customers pick an occupation."
    />
    <OccupationListLayer />
  </MasterLayout>
);

export default OccupationListPage;

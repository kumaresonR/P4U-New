import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import HomepageCmsLayer from "./HomepageCmsLayer";

const HomepageCmsPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='Homepage CMS' pagetitle='Homepage CMS' />
      <HomepageCmsLayer />
    </MasterLayout>
  );
};

export default HomepageCmsPage;

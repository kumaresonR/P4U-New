import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import CFCategoryListLayer from "./CFCategoryListLayer";

const CFCategoriesListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='List CF Categories' pagetitle='CF Categories' />
      <CFCategoryListLayer />
    </MasterLayout>
  );
};

export default CFCategoriesListPage;
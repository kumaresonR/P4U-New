import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import CategoryListLayer from "./CategoryListLayer";

const CategoryListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Service categories" pagetitle="Service categories" />
      <CategoryListLayer variant="service-roots" />
    </MasterLayout>
  );
};

export default CategoryListPage;
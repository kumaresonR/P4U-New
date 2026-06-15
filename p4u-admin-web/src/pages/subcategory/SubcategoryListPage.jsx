import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import CategoryListLayer from "../category/CategoryListLayer";

const SubcategoryListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Subcategories" pagetitle="Subcategories" />
      <CategoryListLayer variant="product-subs" />
    </MasterLayout>
  );
};

export default SubcategoryListPage;

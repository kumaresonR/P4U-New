import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import CategoryListLayer from "./CategoryListLayer";

const ProductCategoryListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Product categories" pagetitle="Product categories" />
      <CategoryListLayer variant="product-roots" />
    </MasterLayout>
  );
};

export default ProductCategoryListPage;

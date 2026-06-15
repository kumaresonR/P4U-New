import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import ProductListLayer from "./ProductListLayer";

const ProductListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='Product List' pagetitle='Product List' />
      <ProductListLayer />
    </MasterLayout>
  );
};

export default ProductListPage;
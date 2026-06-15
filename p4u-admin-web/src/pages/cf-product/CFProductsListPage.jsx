import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import CFProductListLayer from "./CFProductListLayer";

export default function CFProductsListPage() {
  return (
    <MasterLayout>
      <Breadcrumb title='List CF Products' pagetitle='CF Products' />
      <CFProductListLayer />
    </MasterLayout>
  );
}

import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import CustomerListLayer from "./CustomerListLayer";

const CustomerListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb
        title='Customers'
        pagetitle='Customers'
        subtitle='Manage registered customers — add, edit, or view profiles.'
      />
      <CustomerListLayer />
    </MasterLayout>
  );
};

export default CustomerListPage;
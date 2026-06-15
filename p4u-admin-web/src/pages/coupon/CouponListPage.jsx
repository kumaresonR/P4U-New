import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import CouponListLayer from "./CouponListLayer";

const CouponListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Coupons" pagetitle="Coupons" />
      <CouponListLayer />
    </MasterLayout>
  );
};

export default CouponListPage;

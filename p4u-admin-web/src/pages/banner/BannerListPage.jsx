import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import BannerListLayer from "./BannerListLayer";

const BannerListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='List Banners' pagetitle='Banners' />
      <BannerListLayer />
    </MasterLayout>
  );
};

export default BannerListPage;
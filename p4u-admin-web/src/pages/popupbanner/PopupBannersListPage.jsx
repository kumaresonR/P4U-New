import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import PopupBannerListLayer from "./PopupBannerListLayer";

const PopupBannersListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='List Popup Banners' pagetitle='Popup Banners' />
      <PopupBannerListLayer />
    </MasterLayout>
  );
};

export default PopupBannersListPage;
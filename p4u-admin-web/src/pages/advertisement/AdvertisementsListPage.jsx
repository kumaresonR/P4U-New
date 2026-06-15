import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import AdvertisementListLayer from "./AdvertisementListLayer";

const AdvertisementsListPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='List Advertisements' pagetitle='Advertisements' />
      <AdvertisementListLayer />
    </MasterLayout>
  );
};

export default AdvertisementsListPage;
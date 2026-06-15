import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import PushNotificationsLayer from "./PushNotificationsLayer";

const PushNotificationsPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='Push Notifications' pagetitle='Push Notifications' />
      <PushNotificationsLayer />
    </MasterLayout>
  );
};

export default PushNotificationsPage;

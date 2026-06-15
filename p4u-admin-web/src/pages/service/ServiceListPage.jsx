import React from "react";
import { useSearchParams } from "react-router-dom";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import ServiceListLayer from "./ServiceListLayer";

const ServiceListPage = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "approvals" ? "approvals" : "catalog";
  const title = tab === "approvals" ? "Services · Approvals" : "Services";
  const pagetitle = tab === "approvals" ? "Services approvals" : "Services List";

  return (
    <MasterLayout>
      <Breadcrumb title={title} pagetitle={pagetitle} />
      <ServiceListLayer />
    </MasterLayout>
  );
};

export default ServiceListPage;
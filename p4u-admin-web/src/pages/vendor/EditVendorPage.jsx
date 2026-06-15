import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import VendorFormLayer from "./VendorFormLayer";

const EditVendorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) {
    return (
      <MasterLayout>
        <Breadcrumb title="Edit Vendor" pagetitle="Vendor" />
        <div className="alert alert-warning radius-12">Invalid vendor id.</div>
      </MasterLayout>
    );
  }

  return (
    <MasterLayout>
        <Breadcrumb title="Edit vendor" pagetitle="Vendors" />
      <div className="card h-100 p-0 radius-16 border-0 shadow-sm">
        <div className="card-body p-24">
          <VendorFormLayer
            isEdit
            isView={false}
            vendorId={id}
            onSuccess={() => navigate(-1)}
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>
    </MasterLayout>
  );
};

export default EditVendorPage;

import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import VendorListLayer from "./VendorList";

const ServiceVendorsPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Service vendors" pagetitle="Service vendors" />
      <VendorListLayer
        vendorKind="service"
        pageTitle="Service vendors"
        addButtonLabel="Add service vendor"
        searchPlaceholder="Search service vendors"
        csvFilenamePrefix="service-vendors"
      />
    </MasterLayout>
  );
};

export default ServiceVendorsPage;

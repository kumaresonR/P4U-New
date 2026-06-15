import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import VendorListLayer from "./VendorList";

const VendorListPage = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */} 
        <Breadcrumb title='Catalog vendors' pagetitle='Catalog vendors' />

        {/* VendorListLayer */}
        <VendorListLayer />
      </MasterLayout>
    </>
  );
};

export default VendorListPage;
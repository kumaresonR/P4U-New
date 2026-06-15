import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import VendorListLayer from "./VendorList";

const ProductVendorsPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Product vendors" pagetitle="Product vendors" />
      <VendorListLayer
        vendorKind="product"
        pageTitle="Product vendors"
        addButtonLabel="Add product vendor"
        searchPlaceholder="Search product vendors"
        csvFilenamePrefix="product-vendors"
      />
    </MasterLayout>
  );
};

export default ProductVendorsPage;

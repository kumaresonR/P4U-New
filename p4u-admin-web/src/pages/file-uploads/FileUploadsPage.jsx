import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import FileUploadsLayer from "./FileUploadsLayer";

const FileUploadsPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb
        title='File Uploads'
        pagetitle='File Uploads'
        subtitle='Bulk upload products, customers, and vendors via CSV. Leave ID blank to create, provide existing ID to update.'
      />
      <FileUploadsLayer />
    </MasterLayout>
  );
};

export default FileUploadsPage;

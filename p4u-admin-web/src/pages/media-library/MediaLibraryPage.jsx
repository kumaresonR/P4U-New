import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import MediaLibraryLayer from "./MediaLibraryLayer";

const MediaLibraryPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb
        title='Media Library'
        pagetitle='Media Library'
        subtitle='Manage all uploaded images, videos, and documents. Drag & drop files anywhere to upload.'
      />
      <MediaLibraryLayer />
    </MasterLayout>
  );
};

export default MediaLibraryPage;

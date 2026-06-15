import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  createClassifiedProduct,
  updateClassifiedProduct,
  uploadFile,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";

const empty = () => ({
  name: "",
  isActive: true,
  vendorId: "",
  categoryId: "",
  serviceId: "",
  price: "",
  description: "",
  thumbnailUrl: "",
  imageUrls: [],
});

const CFProductFormLayer = ({
  isEdit = false,
  isView = false,
  initialData = null,
  vendors = [],
  categories = [],
  services = [],
  onSuccess,
  onCancel,
}) => {
  const [form, setForm] = useState(empty);
  const [pendingThumb, setPendingThumb] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const pendingThumbRef = useRef(null);
  const pendingImageRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      const meta = initialData.metadata || {};
      setForm({
        name: initialData.name || "",
        isActive: initialData.isActive !== false,
        vendorId: initialData.vendorId || "",
        categoryId: initialData.categoryId || "",
        serviceId: initialData.serviceId || "",
        price: initialData.price != null ? String(initialData.price) : "",
        description: initialData.description || "",
        thumbnailUrl: meta.thumbnailUrl || "",
        imageUrls: Array.isArray(initialData.imageUrls) ? initialData.imageUrls : [],
      });
    } else {
      setForm(empty());
    }
    setPendingThumb(null);
    setPendingImage(null);
    pendingThumbRef.current = null;
    pendingImageRef.current = null;
  }, [initialData]);

  const handleChange = (e) => {
    if (isView) return;
    const { name, value, type, checked } = e.target;
    if (name === "availability") {
      setForm((p) => ({ ...p, isActive: value === "Yes" }));
    } else {
      setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    }
  };

  const handleThumb = (e) => {
    if (isView) return;
    const file = e.target.files && e.target.files[0];
    if (file) { setPendingThumb(file); pendingThumbRef.current = file; }
  };

  const handleImage = (e) => {
    if (isView) return;
    const file = e.target.files && e.target.files[0];
    if (file) { setPendingImage(file); pendingImageRef.current = file; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;

    const name = form.name.trim();
    if (!name) { toast.error("Name is required."); return; }
    if (!form.vendorId) { toast.error("Vendor is required."); return; }
    if (!form.categoryId) { toast.error("Category is required."); return; }

    const priceStr = form.price.toString().trim();
    if (!priceStr || Number.isNaN(Number(priceStr))) {
      toast.error("Sell price must be a number."); return;
    }

    let thumbnailUrl = form.thumbnailUrl;
    let imageUrls = Array.isArray(form.imageUrls) ? [...form.imageUrls] : [];

    const thumbFile = pendingThumbRef.current || pendingThumb;
    if (thumbFile) {
      try {
        const res = await uploadFile(thumbFile);
        thumbnailUrl = res.url;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Thumbnail upload failed");
        return;
      }
    }

    const imageFile = pendingImageRef.current || pendingImage;
    if (imageFile) {
      try {
        const res = await uploadFile(imageFile);
        imageUrls = [res.url, ...imageUrls];
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Image upload failed");
        return;
      }
    }

    const metadata = thumbnailUrl ? { thumbnailUrl } : null;

    const body = {
      name,
      vendorId: form.vendorId || null,
      categoryId: form.categoryId || null,
      serviceId: form.serviceId || null,
      price: priceStr,
      description: form.description.trim() || null,
      imageUrls: imageUrls.length ? imageUrls : null,
      isActive: form.isActive,
      metadata,
    };

    setSubmitting(true);
    try {
      if (isEdit && initialData?.id) {
        await updateClassifiedProduct(initialData.id, body);
        toast.success("Product updated.");
      } else {
        await createClassifiedProduct(body);
        toast.success("Product created.");
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const dis = isView || submitting;

  return (
    <div className='card h-100 p-0 radius-12'>
      <div className='card-header border-bottom bg-base py-16 px-24'>
        <h4 className='text-lg fw-semibold mb-0'>
          {isView ? "View CF Product" : isEdit ? "Edit CF Product" : "Add CF Product"}
        </h4>
      </div>
      <div className='card-body p-24'>
        <form onSubmit={handleSubmit}>
          <div className='row'>
            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Name <span className='text-danger-600'>*</span></label>
              <input type='text' className='form-control radius-8' name='name' value={form.name} onChange={handleChange} required disabled={dis} placeholder='Enter product name' maxLength={255} />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Availability <span className='text-danger-600'>*</span></label>
              <select className='form-control radius-8 form-select' name='availability' value={form.isActive ? "Yes" : "No"} onChange={handleChange} disabled={dis}>
                <option value='Yes'>Yes</option>
                <option value='No'>No</option>
              </select>
            </div>

            <div className='col-md-4 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Vendor <span className='text-danger-600'>*</span></label>
              <select className='form-control radius-8 form-select' name='vendorId' value={form.vendorId} onChange={handleChange} required disabled={dis}>
                <option value=''>Select Vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.displayName}</option>
                ))}
              </select>
            </div>

            <div className='col-md-4 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Category <span className='text-danger-600'>*</span></label>
              <select className='form-control radius-8 form-select' name='categoryId' value={form.categoryId} onChange={handleChange} required disabled={dis}>
                <option value=''>Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className='col-md-4 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Service</label>
              <select className='form-control radius-8 form-select' name='serviceId' value={form.serviceId} onChange={handleChange} disabled={dis}>
                <option value=''>Select Service...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Sell Price <span className='text-danger-600'>*</span></label>
              <div className='input-group'>
                <span className='input-group-text bg-base radius-8-start'>₹</span>
                <input type='number' step='0.01' className='form-control radius-8-end' name='price' value={form.price} onChange={handleChange} required disabled={dis} placeholder='0.00' />
              </div>
            </div>

            <div className='col-12 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Description</label>
              <textarea className='form-control radius-8' name='description' rows='3' value={form.description} onChange={handleChange} disabled={dis} placeholder='Detailed product specifications...'></textarea>
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Image</label>
              {form.imageUrls[0] && (
                <div className='mb-12'>
                  <img src={resolveMediaUrl(form.imageUrls[0])} alt='Product' style={{ maxHeight: 60, objectFit: "cover", borderRadius: 6 }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              {!isView && <input type='file' className='form-control radius-8' name='image' onChange={handleImage} accept='image/*' />}
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Thumbnail</label>
              {form.thumbnailUrl && (
                <div className='mb-12'>
                  <img src={resolveMediaUrl(form.thumbnailUrl)} alt='Thumbnail' style={{ maxHeight: 60, objectFit: "cover", borderRadius: 6 }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              {!isView && <input type='file' className='form-control radius-8' name='thumbnail' onChange={handleThumb} accept='image/*' />}
            </div>
          </div>

          <div className='d-flex align-items-center justify-content-between mt-24'>
            <button type='button' onClick={() => (onCancel ? onCancel() : window.history.back())} className='btn border border-danger-600 text-danger-600 bg-hover-danger-200 text-md px-56 py-12 radius-8 d-flex align-items-center gap-2'>
              <Icon icon='mdi:close-circle-outline' className='text-xl' /> {isView ? "Back" : "Cancel"}
            </button>
            {!isView && (
              <button type='submit' disabled={dis} className='btn btn-primary text-md px-56 py-12 radius-8 d-flex align-items-center gap-2'>
                <Icon icon='lucide:save' className='text-xl' />
                {submitting ? "Saving..." : isEdit ? "Update Product" : "Save Product"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CFProductFormLayer;

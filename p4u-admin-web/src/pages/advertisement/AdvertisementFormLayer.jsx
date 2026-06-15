import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  createAdvertisement,
  updateAdvertisement,
  uploadFile,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";

const empty = () => ({
  title: "",
  caption: "",
  buttonTitle: "",
  redirectUrl: "",
  sortOrder: 0,
  isActive: true,
  postType: "",
  imageUrl: "",
  bannerUrl: "",
});

const AdvertisementFormLayer = ({ isEdit = false, isView = false, initialData = null, onSuccess, onCancel }) => {
  const [form, setForm] = useState(empty);
  const [pendingLogo, setPendingLogo] = useState(null);
  const [pendingBanner, setPendingBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const pendingLogoRef = useRef(null);
  const pendingBannerRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      const meta = initialData.metadata || {};
      setForm({
        title: initialData.title || "",
        caption: meta.caption || "",
        buttonTitle: meta.buttonTitle || "",
        redirectUrl: initialData.redirectUrl || "",
        sortOrder: initialData.sortOrder ?? 0,
        isActive: initialData.status !== "inactive",
        postType: meta.postType || "",
        imageUrl: initialData.imageUrl || "",
        bannerUrl: meta.bannerUrl || "",
      });
    } else {
      setForm(empty());
    }
    setPendingLogo(null);
    setPendingBanner(null);
    pendingLogoRef.current = null;
    pendingBannerRef.current = null;
  }, [initialData]);

  const handleChange = (e) => {
    if (isView) return;
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((p) => ({ ...p, [name]: checked }));
    } else if (name === "sortOrder") {
      setForm((p) => ({ ...p, sortOrder: value === "" ? 0 : Number(value) }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  const handleLogo = (e) => {
    if (isView) return;
    const file = e.target.files && e.target.files[0];
    if (file) { setPendingLogo(file); pendingLogoRef.current = file; }
  };

  const handleBanner = (e) => {
    if (isView) return;
    const file = e.target.files && e.target.files[0];
    if (file) { setPendingBanner(file); pendingBannerRef.current = file; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;

    const title = form.title.trim();
    if (!title) { toast.error("Name is required."); return; }

    let imageUrl = form.imageUrl;
    let bannerUrl = form.bannerUrl;

    const logoFile = pendingLogoRef.current || pendingLogo;
    if (logoFile) {
      try {
        const res = await uploadFile(logoFile);
        imageUrl = res.url;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Logo upload failed");
        return;
      }
    }

    const bannerFile = pendingBannerRef.current || pendingBanner;
    if (bannerFile) {
      try {
        const res = await uploadFile(bannerFile);
        bannerUrl = res.url;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Banner upload failed");
        return;
      }
    }

    const metadata = {
      ...(form.caption.trim() ? { caption: form.caption.trim() } : {}),
      ...(form.buttonTitle.trim() ? { buttonTitle: form.buttonTitle.trim() } : {}),
      ...(form.postType ? { postType: form.postType } : {}),
      ...(bannerUrl ? { bannerUrl } : {}),
    };

    const body = {
      title,
      imageUrl: imageUrl || null,
      redirectUrl: form.redirectUrl.trim() || null,
      status: form.isActive ? "active" : "inactive",
      sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
      metadata: Object.keys(metadata).length ? metadata : null,
    };

    setSubmitting(true);
    try {
      if (isEdit && initialData?.id) {
        await updateAdvertisement(initialData.id, body);
        toast.success("Advertisement updated.");
      } else {
        await createAdvertisement(body);
        toast.success("Advertisement created.");
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
          {isView ? "View Advertisement" : isEdit ? "Edit Advertisement" : "Add Advertisement"}
        </h4>
      </div>
      <div className='card-body p-24'>
        <form onSubmit={handleSubmit}>
          <div className='row'>
            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                Advertisement Name <span className='text-danger-600'>*</span>
              </label>
              <input type='text' className='form-control radius-8' name='title' value={form.title} onChange={handleChange} required disabled={dis} maxLength={255} />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Caption</label>
              <input type='text' className='form-control radius-8' name='caption' value={form.caption} onChange={handleChange} disabled={dis} />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Button Title</label>
              <input type='text' className='form-control radius-8' name='buttonTitle' placeholder='e.g., Shop Now' value={form.buttonTitle} onChange={handleChange} disabled={dis} />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Redirect URL</label>
              <input type='url' className='form-control radius-8' name='redirectUrl' placeholder='https://...' value={form.redirectUrl} onChange={handleChange} disabled={dis} />
            </div>

            <div className='col-md-4 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Order Of Appearance</label>
              <input type='number' min='0' className='form-control radius-8' name='sortOrder' value={form.sortOrder} onChange={handleChange} disabled={dis} />
            </div>

            <div className='col-md-4 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Post Type</label>
              <select className='form-control radius-8 form-select' name='postType' value={form.postType} onChange={handleChange} disabled={dis}>
                <option value=''>Select...</option>
                <option value='Image'>Image</option>
                <option value='Video'>Video</option>
                <option value='Text'>Text</option>
              </select>
            </div>

            <div className='col-md-4 mb-20 d-flex align-items-end'>
              <div className='form-check mb-12'>
                <input type='checkbox' className='form-check-input' id='ad-active' name='isActive' checked={form.isActive} onChange={handleChange} disabled={dis} />
                <label className='form-check-label' htmlFor='ad-active'>Active</label>
              </div>
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Logo Image</label>
              {form.imageUrl && (
                <div className='mb-12'>
                  <img src={pendingLogo ? URL.createObjectURL(pendingLogo) : resolveMediaUrl(form.imageUrl)} alt='Logo' style={{ maxHeight: 80, objectFit: "cover", borderRadius: 6 }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              {!isView && (
                <input type='file' className='form-control radius-8' name='logoImage' onChange={handleLogo} accept='image/*' />
              )}
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Banner</label>
              {form.bannerUrl && (
                <div className='mb-12'>
                  <img src={pendingBanner ? URL.createObjectURL(pendingBanner) : resolveMediaUrl(form.bannerUrl)} alt='Banner' style={{ maxHeight: 80, objectFit: "cover", borderRadius: 6 }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              {!isView && (
                <input type='file' className='form-control radius-8' name='banner' onChange={handleBanner} accept='image/*,video/*' />
              )}
            </div>
          </div>

          <div className='d-flex align-items-center justify-content-between mt-24'>
            <button type='button' onClick={() => (onCancel ? onCancel() : window.history.back())} className='btn border border-danger-600 text-danger-600 bg-hover-danger-200 text-md px-56 py-12 radius-8 d-flex align-items-center gap-2'>
              <Icon icon='mdi:close-circle-outline' className='text-xl' /> {isView ? "Back" : "Cancel"}
            </button>

            {!isView && (
              <button type='submit' disabled={dis} className='btn btn-primary text-md px-56 py-12 radius-8 d-flex align-items-center gap-2'>
                <Icon icon='lucide:save' className='text-xl' />
                {submitting ? "Saving..." : isEdit ? "Update" : "Save"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdvertisementFormLayer;

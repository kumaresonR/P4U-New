import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  createBanner,
  updateBanner,
  uploadFile,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const empty = () => ({
  title: "",
  imageUrl: "",
  redirectUrl: "",
  sortOrder: 0,
  isActive: true,
  bannerRoute: "",
  bannerType: "",
  broadcastApplication: "",
  bannerPlacement: "",
});

const BannerFormLayer = ({ isEdit = false, isView = false, initialData = null, onSuccess, onCancel }) => {
  const [form, setForm] = useState(empty);
  const [pendingFile, setPendingFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const pendingFileRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      const meta = initialData.metadata || {};
      setForm({
        title: initialData.title || "",
        imageUrl: initialData.imageUrl || "",
        redirectUrl: initialData.redirectUrl || "",
        sortOrder: initialData.sortOrder ?? 0,
        isActive: initialData.isActive !== false,
        bannerRoute: meta.bannerRoute || "",
        bannerType: meta.bannerType || "",
        broadcastApplication: meta.broadcastApplication || "",
        bannerPlacement: meta.bannerPlacement || "",
      });
    } else {
      setForm(empty());
    }
    setPendingFile(null);
    pendingFileRef.current = null;
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

  const handleFileChange = (e) => {
    if (isView) return;
    const file = e.target.files && e.target.files[0];
    if (file) {
      setPendingFile(file);
      pendingFileRef.current = file;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;

    const title = form.title.trim();
    if (!title) { toast.error("Title is required."); return; }

    let imageUrl = form.imageUrl;
    const fileToUpload = pendingFileRef.current || pendingFile;
    if (fileToUpload) {
      try {
        const res = await uploadFile(fileToUpload);
        imageUrl = res.url;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "File upload failed");
        return;
      }
    }

    if (!imageUrl) { toast.error("Banner image/video is required."); return; }

    const metadata = {
      ...(form.bannerRoute ? { bannerRoute: form.bannerRoute } : {}),
      ...(form.bannerType ? { bannerType: form.bannerType } : {}),
      ...(form.broadcastApplication ? { broadcastApplication: form.broadcastApplication } : {}),
      ...(form.bannerPlacement ? { bannerPlacement: form.bannerPlacement } : {}),
    };

    const body = {
      title,
      imageUrl,
      redirectUrl: form.redirectUrl.trim() || null,
      sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
      isActive: form.isActive,
      metadata: Object.keys(metadata).length ? metadata : null,
    };

    setSubmitting(true);
    try {
      if (isEdit && initialData?.id) {
        await updateBanner(initialData.id, body);
        toast.success("Banner updated.");
      } else {
        await createBanner(body);
        toast.success("Banner created.");
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
          {isView ? "View Banner" : isEdit ? "Edit Banner" : "Add Banner"}
        </h4>
      </div>
      <div className='card-body p-24'>
        <form onSubmit={handleSubmit}>
          <div className='row'>
            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                Title <span className='text-danger-600'>*</span>
              </label>
              <input
                type='text'
                className='form-control radius-8'
                name='title'
                placeholder='Banner title'
                value={form.title}
                onChange={handleChange}
                disabled={dis}
                maxLength={255}
                required
              />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Banner Route</label>
              <select className='form-control radius-8 form-select' name='bannerRoute' value={form.bannerRoute} onChange={handleChange} disabled={dis}>
                <option value=''>Select...</option>
                <option value='MAIN_SCREEN'>MAIN_SCREEN</option>
                <option value='HOME'>HOME</option>
                <option value='NEWS_FEED'>NEWS_FEED</option>
                <option value='WALLET'>WALLET</option>
                <option value='PROFILE'>PROFILE</option>
                <option value='ABOUT_NEWS_FEED'>ABOUT_NEWS_FEED</option>
              </select>
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Banner Type</label>
              <select className='form-control radius-8 form-select' name='bannerType' value={form.bannerType} onChange={handleChange} disabled={dis}>
                <option value=''>Select...</option>
                <option value='IMAGE'>IMAGE</option>
                <option value='VIDEO'>VIDEO</option>
              </select>
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Broadcast Application</label>
              <select className='form-control radius-8 form-select' name='broadcastApplication' value={form.broadcastApplication} onChange={handleChange} disabled={dis}>
                <option value=''>Select...</option>
                <option value='VENDOR'>VENDOR</option>
                <option value='CUSTOMER'>CUSTOMER</option>
                <option value='BOTH'>BOTH</option>
              </select>
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Banner Placement</label>
              <select className='form-control radius-8 form-select' name='bannerPlacement' value={form.bannerPlacement} onChange={handleChange} disabled={dis}>
                <option value=''>Select...</option>
                <option value='TOP'>TOP</option>
                <option value='MIDDLE'>MIDDLE</option>
                <option value='BOTTOM'>BOTTOM</option>
              </select>
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Redirect URL</label>
              <input type='url' className='form-control radius-8' name='redirectUrl' placeholder='https://...' value={form.redirectUrl} onChange={handleChange} disabled={dis} />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Sort Order</label>
              <input type='number' min='0' className='form-control radius-8' name='sortOrder' value={form.sortOrder} onChange={handleChange} disabled={dis} />
            </div>

            <div className='col-md-6 mb-20 d-flex align-items-end'>
              <div className='form-check mb-12'>
                <input type='checkbox' className='form-check-input' id='banner-active' name='isActive' checked={form.isActive} onChange={handleChange} disabled={dis} />
                <label className='form-check-label' htmlFor='banner-active'>Active</label>
              </div>
            </div>

            <div className='col-md-12 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                Banner File {!isEdit && !form.imageUrl && <span className='text-danger-600'>*</span>}
              </label>
              {form.imageUrl && (
                <div className='mb-12'>
                  <img
                    src={form.imageUrl}
                    alt='Current banner'
                    style={{ maxHeight: 120, objectFit: "cover", borderRadius: 6 }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              {!isView && (
                <input
                  type='file'
                  className='form-control radius-8'
                  name='banner'
                  onChange={handleFileChange}
                  accept='image/*,video/*'
                />
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
                {submitting ? "Saving..." : isEdit ? "Update Banner" : "Save Banner"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default BannerFormLayer;

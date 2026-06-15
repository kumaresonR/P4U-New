import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  createPopupBanner,
  updatePopupBanner,
  uploadFile,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const empty = () => ({
  title: "",
  imageUrl: "",
  redirectUrl: "",
  isActive: true,
  appType: "",
  screenId: "",
});

const PopupBannerFormLayer = ({ isEdit = false, isView = false, initialData = null, onSuccess, onCancel }) => {
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
        isActive: initialData.isActive !== false,
        appType: meta.appType || "",
        screenId: meta.screenId || "",
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
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
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

    if (!imageUrl) { toast.error("Popup image is required."); return; }

    const metadata = {
      ...(form.appType ? { appType: form.appType } : {}),
      ...(form.screenId ? { screenId: form.screenId } : {}),
    };

    const body = {
      title,
      imageUrl,
      redirectUrl: form.redirectUrl.trim() || null,
      isActive: form.isActive,
      metadata: Object.keys(metadata).length ? metadata : null,
    };

    setSubmitting(true);
    try {
      if (isEdit && initialData?.id) {
        await updatePopupBanner(initialData.id, body);
        toast.success("Popup banner updated.");
      } else {
        await createPopupBanner(body);
        toast.success("Popup banner created.");
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
          {isView ? "View Popup Banner" : isEdit ? "Edit Popup Banner" : "Add Popup Banner"}
        </h4>
      </div>
      <div className='card-body p-24'>
        <form onSubmit={handleSubmit}>
          <div className='row'>
            <div className='col-md-12 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                Title <span className='text-danger-600'>*</span>
              </label>
              <input
                type='text'
                className='form-control radius-8'
                name='title'
                placeholder='Popup title'
                value={form.title}
                onChange={handleChange}
                disabled={dis}
                maxLength={255}
                required
              />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>App Type</label>
              <select className='form-control radius-8 form-select' name='appType' value={form.appType} onChange={handleChange} disabled={dis}>
                <option value=''>Select...</option>
                <option value='User'>User</option>
                <option value='Vendor'>Vendor</option>
              </select>
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Screen Id</label>
              <select className='form-control radius-8 form-select' name='screenId' value={form.screenId} onChange={handleChange} disabled={dis}>
                <option value=''>Select...</option>
                <option value='Splash Screen'>Splash Screen</option>
                <option value='Menu'>Menu</option>
                <option value='Social media'>Social media</option>
                <option value='Services'>Services</option>
                <option value='Newsfeed'>Newsfeed</option>
                <option value='Wallets'>Wallets</option>
                <option value='Profile'>Profile</option>
              </select>
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Redirect URL</label>
              <input type='url' className='form-control radius-8' name='redirectUrl' placeholder='https://...' value={form.redirectUrl} onChange={handleChange} disabled={dis} />
            </div>

            <div className='col-md-6 mb-20 d-flex align-items-end'>
              <div className='form-check mb-12'>
                <input type='checkbox' className='form-check-input' id='popup-active' name='isActive' checked={form.isActive} onChange={handleChange} disabled={dis} />
                <label className='form-check-label' htmlFor='popup-active'>Active</label>
              </div>
            </div>

            <div className='col-md-12 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                Popup Image {!isEdit && !form.imageUrl && <span className='text-danger-600'>*</span>}
              </label>
              {form.imageUrl && (
                <div className='mb-12'>
                  <img
                    src={form.imageUrl}
                    alt='Current popup'
                    style={{ maxHeight: 120, objectFit: "cover", borderRadius: 6 }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              {!isView && (
                <input
                  type='file'
                  className='form-control radius-8'
                  name='popupImage'
                  onChange={handleFileChange}
                  accept='image/*'
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

export default PopupBannerFormLayer;

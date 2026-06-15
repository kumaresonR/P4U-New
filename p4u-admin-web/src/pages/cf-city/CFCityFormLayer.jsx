import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  createAvailableCity,
  updateAvailableCity,
  uploadFile,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";

const empty = () => ({
  name: "",
  description: "",
  iconUrl: "",
  isActive: true,
});

const CFCityFormLayer = ({ isEdit = false, isView = false, initialData = null, onSuccess, onCancel }) => {
  const [form, setForm] = useState(empty);
  const [pendingIcon, setPendingIcon] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const pendingIconRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      const meta = initialData.metadata || {};
      setForm({
        name: initialData.name || "",
        description: meta.description || "",
        iconUrl: meta.iconUrl || "",
        isActive: initialData.isActive !== false,
      });
    } else {
      setForm(empty());
    }
    setPendingIcon(null);
    pendingIconRef.current = null;
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
      setPendingIcon(file);
      pendingIconRef.current = file;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;

    const name = form.name.trim();
    if (!name) { toast.error("City name is required."); return; }

    let iconUrl = form.iconUrl;
    const fileToUpload = pendingIconRef.current || pendingIcon;
    if (fileToUpload) {
      try {
        const res = await uploadFile(fileToUpload);
        iconUrl = res.url;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Icon upload failed");
        return;
      }
    }

    const metadata = {
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(iconUrl ? { iconUrl } : {}),
    };

    const body = {
      name,
      isActive: form.isActive,
      metadata: Object.keys(metadata).length ? metadata : null,
    };

    setSubmitting(true);
    try {
      if (isEdit && initialData?.id) {
        await updateAvailableCity(initialData.id, body);
        toast.success("City updated.");
      } else {
        await createAvailableCity(body);
        toast.success("City created.");
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
          {isView ? "View City" : isEdit ? "Edit City" : "Add City"}
        </h4>
      </div>
      <div className='card-body p-24'>
        <form onSubmit={handleSubmit}>
          <div className='row'>
            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                City Name <span className='text-danger-600'>*</span>
              </label>
              <input
                type='text'
                className='form-control radius-8'
                name='name'
                placeholder='e.g., Chennai, Bangalore'
                value={form.name}
                onChange={handleChange}
                disabled={dis}
                maxLength={255}
                required
              />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Icon</label>
              {form.iconUrl && (
                <div className='mb-12'>
                  <img src={resolveMediaUrl(form.iconUrl)} alt='City icon' style={{ maxHeight: 60, objectFit: "cover", borderRadius: 6 }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              {!isView && (
                <input
                  type='file'
                  className='form-control radius-8'
                  name='icon'
                  onChange={handleFileChange}
                  accept='image/*'
                />
              )}
            </div>

            <div className='col-md-12 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Description</label>
              <textarea
                className='form-control radius-8'
                name='description'
                rows='4'
                placeholder='Enter details about this city...'
                value={form.description}
                onChange={handleChange}
                disabled={dis}
              ></textarea>
            </div>

            <div className='col-md-12 mb-20'>
              <div className='form-check'>
                <input
                  type='checkbox'
                  className='form-check-input'
                  id='city-active'
                  name='isActive'
                  checked={form.isActive}
                  onChange={handleChange}
                  disabled={dis}
                />
                <label className='form-check-label' htmlFor='city-active'>Active</label>
              </div>
            </div>
          </div>

          <div className='d-flex align-items-center justify-content-between mt-24'>
            <button type='button' onClick={() => (onCancel ? onCancel() : window.history.back())} className='btn border border-danger-600 text-danger-600 bg-hover-danger-200 text-md px-56 py-12 radius-8 d-flex align-items-center gap-2'>
              <Icon icon='mdi:close-circle-outline' className='text-xl' /> {isView ? "Back" : "Cancel"}
            </button>

            {!isView && (
              <button type='submit' disabled={dis} className='btn btn-primary text-md px-56 py-12 radius-8 d-flex align-items-center gap-2'>
                <Icon icon='lucide:save' className='text-xl' />
                {submitting ? "Saving..." : isEdit ? "Update City" : "Save City"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CFCityFormLayer;

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  createClassifiedCategory,
  updateClassifiedCategory,
  uploadFile,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";

const empty = () => ({
  name: "",
  description: "",
  thumbnailUrl: "",
  isActive: true,
});

const CFCategoryFormLayer = ({ isEdit = false, isView = false, initialData = null, onSuccess, onCancel }) => {
  const [form, setForm] = useState(empty);
  const [pendingThumb, setPendingThumb] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const pendingThumbRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      const meta = initialData.metadata || {};
      setForm({
        name: initialData.name || "",
        description: meta.description || "",
        thumbnailUrl: meta.thumbnailUrl || "",
        isActive: initialData.isActive !== false,
      });
    } else {
      setForm(empty());
    }
    setPendingThumb(null);
    pendingThumbRef.current = null;
  }, [initialData]);

  const handleChange = (e) => {
    if (isView) return;
    const { name, value, type, checked } = e.target;
    if (name === "availability") {
      setForm((p) => ({ ...p, isActive: value === "Active" }));
    } else {
      setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    }
  };

  const handleFileChange = (e) => {
    if (isView) return;
    const file = e.target.files && e.target.files[0];
    if (file) {
      setPendingThumb(file);
      pendingThumbRef.current = file;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;

    const name = form.name.trim();
    if (!name) { toast.error("Name is required."); return; }

    let thumbnailUrl = form.thumbnailUrl;
    const fileToUpload = pendingThumbRef.current || pendingThumb;
    if (fileToUpload) {
      try {
        const res = await uploadFile(fileToUpload);
        thumbnailUrl = res.url;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Thumbnail upload failed");
        return;
      }
    }

    const metadata = {
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
    };

    const body = {
      name,
      isActive: form.isActive,
      metadata: Object.keys(metadata).length ? metadata : null,
    };

    setSubmitting(true);
    try {
      if (isEdit && initialData?.id) {
        await updateClassifiedCategory(initialData.id, body);
        toast.success("Category updated.");
      } else {
        await createClassifiedCategory(body);
        toast.success("Category created.");
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
          {isView ? "View CF Category" : isEdit ? "Edit CF Category" : "Add CF Category"}
        </h4>
      </div>
      <div className='card-body p-24'>
        <form onSubmit={handleSubmit}>
          <div className='row'>
            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                Name <span className='text-danger-600'>*</span>
              </label>
              <input
                type='text'
                className='form-control radius-8'
                name='name'
                placeholder='e.g., Groceries, Electronics'
                value={form.name}
                onChange={handleChange}
                disabled={dis}
                maxLength={255}
                required
              />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                Availability <span className='text-danger-600'>*</span>
              </label>
              <select
                className='form-control radius-8 form-select'
                name='availability'
                value={form.isActive ? "Active" : "Inactive"}
                onChange={handleChange}
                disabled={dis}
                required
              >
                <option value='Active'>Active</option>
                <option value='Inactive'>Inactive</option>
              </select>
            </div>

            <div className='col-md-12 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>Thumbnail</label>
              {form.thumbnailUrl && (
                <div className='mb-12'>
                  <img src={resolveMediaUrl(form.thumbnailUrl)} alt='Category thumbnail' style={{ maxHeight: 80, objectFit: "cover", borderRadius: 6 }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              {!isView && (
                <input
                  type='file'
                  className='form-control radius-8'
                  name='thumbnail'
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
                placeholder='Enter details about this category...'
                value={form.description}
                onChange={handleChange}
                disabled={dis}
              ></textarea>
            </div>
          </div>

          <div className='d-flex align-items-center justify-content-between mt-24'>
            <button type='button' onClick={() => (onCancel ? onCancel() : window.history.back())} className='btn border border-danger-600 text-danger-600 bg-hover-danger-200 text-md px-56 py-12 radius-8 d-flex align-items-center gap-2'>
              <Icon icon='mdi:close-circle-outline' className='text-xl' /> {isView ? "Back" : "Cancel"}
            </button>

            {!isView && (
              <button type='submit' disabled={dis} className='btn btn-primary text-md px-56 py-12 radius-8 d-flex align-items-center gap-2'>
                <Icon icon='lucide:save' className='text-xl' />
                {submitting ? "Saving..." : isEdit ? "Update Category" : "Save Category"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CFCategoryFormLayer;

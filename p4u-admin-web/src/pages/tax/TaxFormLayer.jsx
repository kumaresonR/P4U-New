import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  createTaxConfiguration,
  updateTaxConfiguration,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const empty = () => ({
  code: "",
  title: "",
  percentage: "",
  isActive: true,
  description: "",
});

const TaxFormLayer = ({ isEdit = false, isView = false, initialData = null, onSuccess, onCancel }) => {
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        code: initialData.code || "",
        title: initialData.title || "",
        percentage: initialData.percentage != null ? String(initialData.percentage) : "",
        isActive: initialData.isActive !== false,
        description:
          (initialData.metadata && initialData.metadata.description) || "",
      });
    } else {
      setForm(empty());
    }
  }, [initialData]);

  const handleChange = (e) => {
    if (isView) return;
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;

    const code = form.code.trim();
    const title = form.title.trim();
    const percentage = form.percentage.toString().trim();

    if (!code) { toast.error("Code is required."); return; }
    if (!title) { toast.error("Title is required."); return; }
    if (!percentage || Number.isNaN(Number(percentage))) {
      toast.error("Rate must be a number."); return;
    }

    const metadata = form.description.trim()
      ? { description: form.description.trim() }
      : null;

    const body = {
      code,
      title,
      percentage,
      isActive: form.isActive,
      metadata,
    };

    setSubmitting(true);
    try {
      if (isEdit && initialData?.id) {
        await updateTaxConfiguration(initialData.id, body);
        toast.success("Tax updated.");
      } else {
        await createTaxConfiguration(body);
        toast.success("Tax created.");
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
          {isView ? "View Tax" : isEdit ? "Edit Tax" : "Add Tax"}
        </h4>
      </div>
      <div className='card-body p-24'>
        <form onSubmit={handleSubmit}>
          <div className='row'>
            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                Code <span className='text-danger-600'>*</span>
              </label>
              <input
                type='text'
                className='form-control radius-8'
                name='code'
                placeholder='e.g. GST18'
                value={form.code}
                onChange={handleChange}
                disabled={dis}
                maxLength={128}
                required
              />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                Title <span className='text-danger-600'>*</span>
              </label>
              <input
                type='text'
                className='form-control radius-8'
                name='title'
                placeholder='e.g. Standard GST'
                value={form.title}
                onChange={handleChange}
                disabled={dis}
                maxLength={255}
                required
              />
            </div>

            <div className='col-md-6 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                Rate (%) <span className='text-danger-600'>*</span>
              </label>
              <input
                type='number'
                step='0.01'
                className='form-control radius-8'
                name='percentage'
                placeholder='e.g. 18'
                value={form.percentage}
                onChange={handleChange}
                disabled={dis}
                required
              />
            </div>

            <div className='col-md-6 mb-20 d-flex align-items-center'>
              <div className='form-check mt-24'>
                <input
                  type='checkbox'
                  className='form-check-input'
                  id='tax-active'
                  name='isActive'
                  checked={form.isActive}
                  onChange={handleChange}
                  disabled={dis}
                />
                <label className='form-check-label' htmlFor='tax-active'>
                  Active
                </label>
              </div>
            </div>

            <div className='col-md-12 mb-20'>
              <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                Description
              </label>
              <textarea
                className='form-control radius-8'
                name='description'
                rows='4'
                placeholder='Enter tax description here...'
                value={form.description}
                onChange={handleChange}
                disabled={dis}
              ></textarea>
            </div>
          </div>

          <div className='d-flex align-items-center justify-content-between mt-24'>
            <button
              type='button'
              onClick={() => (onCancel ? onCancel() : window.history.back())}
              className='btn border border-danger-600 text-danger-600 bg-hover-danger-200 text-md px-56 py-12 radius-8 d-flex align-items-center gap-2'
            >
              <Icon icon='mdi:close-circle-outline' className='text-xl' /> Cancel
            </button>

            {!isView && (
              <button
                type='submit'
                disabled={dis}
                className='btn btn-primary text-md px-56 py-12 radius-8 d-flex align-items-center gap-2'
              >
                <Icon icon='lucide:save' className='text-xl' />
                {submitting ? "Saving..." : isEdit ? "Update Tax" : "Save Tax"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaxFormLayer;

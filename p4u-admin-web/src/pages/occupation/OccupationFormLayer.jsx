import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  createOccupation,
  deleteOccupation,
  getOccupation,
  updateOccupation,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const empty = () => ({ name: "", sortOrder: 0, isActive: true, customerCount: 0 });

export default function OccupationFormLayer({ isEdit = false, isView = false, occupationId, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(Boolean(occupationId));
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const apply = useCallback((row) => {
    setForm({
      name: row.name || "",
      sortOrder: row.sortOrder ?? 0,
      isActive: row.isActive !== false,
      customerCount: typeof row.customerCount === "number" ? row.customerCount : 0,
    });
  }, []);

  useEffect(() => {
    if (!occupationId) {
      setLoading(false);
      return;
    }
    let c = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const row = await getOccupation(occupationId);
        if (!c) apply(row);
      } catch (e) {
        if (!c) {
          const msg = e instanceof ApiError ? e.message : String(e);
          setLoadError(msg);
          toast.error(msg);
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [occupationId, apply]);

  function handleChange(e) {
    if (isView) return;
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((p) => ({ ...p, [name]: checked }));
    } else if (name === "sortOrder") {
      setForm((p) => ({ ...p, sortOrder: value === "" ? 0 : Number(value) }));
    } else if (name === "status") {
      setForm((p) => ({ ...p, isActive: value === "active" }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (isView) return;
    const name = form.name.trim();
    if (!name) {
      toast.error("Occupation name is required.");
      return;
    }
    const body = {
      name,
      sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
      isActive: form.isActive,
    };
    setSubmitting(true);
    try {
      if (isEdit && occupationId) {
        await updateOccupation(occupationId, body);
        toast.success("Occupation updated.");
      } else {
        await createOccupation(body);
        toast.success("Occupation created.");
      }
      if (onSuccess) onSuccess();
      else navigate("/occupations");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!occupationId || !isEdit) return;
    if (!window.confirm("Delete this occupation? Customers assigned to it may need to be updated.")) return;
    setDeleting(true);
    try {
      await deleteOccupation(occupationId);
      toast.success("Occupation deleted.");
      if (onSuccess) onSuccess();
      else navigate("/occupations");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  const dis = isView || submitting || loading || deleting;
  const headerTitle = isView
    ? `View: ${form.name || "Occupation"}`
    : isEdit
      ? `Edit: ${form.name || "…"}`
      : "Add occupation";

  return (
    <div className="card h-100 p-0 radius-12 border-0 shadow-none">
      <div className="card-body p-0">
        <div className="d-flex align-items-start justify-content-between gap-12 px-4 pb-16 border-bottom mb-20">
          <h4 className="text-lg fw-bold mb-0 text-primary-light">{headerTitle}</h4>
          <button type="button" className="btn btn-sm btn-light border-0 rounded-circle" onClick={() => (onCancel ? onCancel() : navigate(-1))} aria-label="Close">
            <Icon icon="mdi:close" className="text-xl text-secondary-light" />
          </button>
        </div>

        {loadError && occupationId && !loading && (
          <div className="alert alert-danger radius-12 mb-16 mx-4" role="alert">
            {loadError}
          </div>
        )}

        {loading ? (
          <p className="text-secondary-light mb-0 px-4">Loading…</p>
        ) : (
          <form onSubmit={onSubmit} className="px-4 pb-4">
            <div className="mb-20">
              <label className="form-label fw-semibold text-sm mb-8">
                Occupation name <span className="text-danger-600">*</span>
              </label>
              <input
                name="name"
                className="form-control radius-10"
                value={form.name}
                onChange={handleChange}
                disabled={dis}
                maxLength={255}
                required
                placeholder="e.g. AC Technician"
              />
            </div>

            <div className="mb-20">
              <label className="form-label fw-semibold text-sm mb-8">Status</label>
              <select name="status" className="form-select radius-10" value={form.isActive ? "active" : "inactive"} onChange={handleChange} disabled={dis}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {(isEdit || isView) && occupationId ? (
              <div className="mb-20 p-16 radius-12 bg-neutral-50 border">
                <div className="text-secondary-light text-sm mb-4">Customers using this occupation</div>
                <div className="h5 fw-bold mb-0 text-primary-light">{Number(form.customerCount ?? 0).toLocaleString("en-IN")}</div>
              </div>
            ) : null}

            <details className="mb-20">
              <summary className="text-sm text-secondary-light cursor-pointer">Advanced</summary>
              <div className="mt-12">
                <label className="form-label fw-semibold text-sm mb-8">Sort order</label>
                <input
                  type="number"
                  name="sortOrder"
                  className="form-control radius-10"
                  value={form.sortOrder}
                  onChange={handleChange}
                  disabled={dis}
                  min={0}
                />
              </div>
            </details>

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-12 mt-24 pt-20 border-top">
              <div>
                {isEdit && occupationId && !isView ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting || submitting}
                    className="btn btn-danger radius-10 px-16 py-10 d-inline-flex align-items-center gap-8"
                  >
                    <Icon icon="mdi:delete-outline" className="text-xl" />
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                ) : (
                  <span />
                )}
              </div>
              <div className="d-flex gap-10">
                <button type="button" onClick={() => (onCancel ? onCancel() : navigate(-1))} className="btn btn-light border radius-10 px-20 py-10">
                  Cancel
                </button>
                {!isView && (
                  <button type="submit" disabled={dis} className="btn btn-primary radius-10 px-20 py-10 d-inline-flex align-items-center gap-8">
                    <Icon icon="mdi:content-save-outline" className="text-xl" />
                    {submitting ? "Saving…" : "Save"}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

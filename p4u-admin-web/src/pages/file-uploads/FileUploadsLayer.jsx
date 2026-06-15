import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  downloadBulkUploadSource,
  downloadBulkSampleCsv,
  listBulkUploadJobs,
  retryBulkUploadJob,
  submitBulkCsvUpload,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { formatDateTime } from "../../lib/formatters";

const UPLOAD_TYPES = [
  { value: "product", label: "Products" },
  { value: "customer", label: "Customers" },
  { value: "vendor", label: "Vendors" },
];

function typeLabel(t) {
  const u = String(t || "").toLowerCase();
  if (u === "customer" || u === "customers") return "Customer";
  if (u === "vendor" || u === "vendors") return "Vendor";
  return "Product";
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") {
    return (
      <span className='d-inline-flex align-items-center gap-4 text-success'>
        <Icon icon='mdi:check-circle-outline' className='text-xl' />
        Completed
      </span>
    );
  }
  if (s === "partial") {
    return (
      <span className='d-inline-flex align-items-center gap-4 text-warning'>
        <Icon icon='mdi:alert-outline' className='text-xl' />
        Partial
      </span>
    );
  }
  if (s === "failed") {
    return (
      <span className='d-inline-flex align-items-center gap-4 text-danger'>
        <Icon icon='mdi:close-circle-outline' className='text-xl' />
        Failed
      </span>
    );
  }
  return (
    <span className='d-inline-flex align-items-center gap-4 text-secondary-light'>
      <Icon icon='mdi:progress-clock' className='text-xl' />
      Processing
    </span>
  );
}

const FileUploadsLayer = () => {
  const [uploadType, setUploadType] = useState("product");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [retryingId, setRetryingId] = useState("");

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await listBulkUploadJobs({ limit: 50, offset: 0 });
      setJobs(Array.isArray(res.items) ? res.items : []);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleSample = async () => {
    try {
      await downloadBulkSampleCsv(uploadType);
      toast.success("Sample CSV downloaded.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a CSV file.");
      return;
    }
    setUploading(true);
    try {
      await submitBulkCsvUpload(uploadType, file);
      toast.success("Upload processed.");
      setFile(null);
      await loadJobs();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSource = async (id) => {
    try {
      await downloadBulkUploadSource(id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const handleRetry = async (id) => {
    setRetryingId(id);
    try {
      await retryBulkUploadJob(id);
      toast.success("Retry completed.");
      await loadJobs();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    } finally {
      setRetryingId("");
    }
  };

  const helpProduct = uploadType === "product";

  return (
    <div className='d-flex flex-column gap-24'>
      <div className='card border-0 shadow-sm radius-16 p-24'>
        <form onSubmit={handleSubmit} className='d-flex flex-column gap-16'>
          <div className='row g-16'>
            <div className='col-md-4'>
              <label className='form-label fw-semibold text-sm'>Upload Type</label>
              <select className='form-select radius-10' value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
                {UPLOAD_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className='col-md-8'>
              <label className='form-label fw-semibold text-sm'>CSV File</label>
              <div className='d-flex flex-wrap align-items-center gap-12'>
                <label className='btn btn-primary radius-10 mb-0'>
                  <input type='file' accept='.csv,text/csv' className='d-none' onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  Choose file
                </label>
                <span className='text-secondary-light text-sm'>{file ? file.name : "No file chosen"}</span>
              </div>
            </div>
          </div>
          <div className='d-flex flex-wrap gap-8'>
            <button type='button' className='btn btn-outline-primary radius-10 d-inline-flex align-items-center gap-8' onClick={handleSample}>
              <Icon icon='mdi:download' className='text-xl' />
              {uploadType === "product" ? "Sample product CSV" : uploadType === "customer" ? "Sample customer CSV" : "Sample vendor CSV"}
            </button>
            <button type='button' className='btn btn-outline-secondary radius-10 d-inline-flex align-items-center gap-8' onClick={() => loadJobs()} disabled={loadingJobs}>
              <Icon icon='mdi:refresh' className='text-xl' />
              Refresh
            </button>
            <button type='submit' className='btn btn-primary radius-10 ms-auto' disabled={uploading}>
              {uploading ? "Uploading…" : "Upload & process"}
            </button>
          </div>
        </form>
      </div>

      <div className='card border-0 shadow-sm radius-16 p-20 bg-neutral-50'>
        {helpProduct ? (
          <>
            <p className='mb-8 text-sm'>
              <strong>Product CSV supports:</strong> All product fields including images, SEO, pricing, and up to 5 attribute name/value pairs (
              <code>attr1_name</code> / <code>attr1_value</code> … <code>attr5_*</code>).
            </p>
            <p className='mb-8 text-sm'>
              <strong>Create vs update:</strong> Leave <code>id</code> empty to create. Provide an existing product <code>id</code> to update.
            </p>
            <p className='mb-0 text-sm'>
              <strong>Images:</strong> Use <code>image_urls</code> with pipe (<code>|</code>) to separate multiple image URLs. If <code>thumbnail_url</code> is empty, the first URL is used as the thumbnail.
            </p>
          </>
        ) : uploadType === "customer" ? (
          <p className='mb-0 text-sm'>
            <strong>Customers:</strong> Leave <code>id</code> empty to create (requires <code>full_name</code>). Provide <code>id</code> to update. Columns:{" "}
            <code>full_name</code>, <code>email</code>, <code>phone</code>, <code>status</code>, <code>occupation_id</code>, <code>keycloak_user_id</code>.
          </p>
        ) : (
          <p className='mb-0 text-sm'>
            <strong>Vendors:</strong> Leave <code>id</code> empty to create (requires <code>business_name</code> and <code>vendor_kind</code> as{" "}
            <code>product</code> or <code>service</code>). Provide <code>id</code> to update.
          </p>
        )}
      </div>

      <div className='card border-0 shadow-sm radius-16 p-0 overflow-hidden'>
        <div className='p-20 border-bottom'>
          <h5 className='fw-bold mb-0'>Upload history</h5>
        </div>
        <div className='table-responsive'>
          <table className='table align-middle mb-0'>
            <thead className='bg-neutral-50'>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Status</th>
                <th>Total</th>
                <th>Success</th>
                <th>Errors</th>
                <th>Uploaded</th>
                <th className='text-end'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingJobs ? (
                <tr>
                  <td colSpan={8} className='text-secondary-light py-24 text-center'>Loading…</td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className='text-secondary-light py-24 text-center'>No uploads yet.</td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id}>
                    <td className='text-truncate' style={{ maxWidth: 200 }} title={j.originalFilename}>{j.originalFilename}</td>
                    <td>
                      <span className='badge bg-primary-50 text-primary-600 radius-8'>{typeLabel(j.uploadType)}</span>
                    </td>
                    <td>{statusBadge(j.status)}</td>
                    <td>{j.totalRows ?? 0}</td>
                    <td className='text-success fw-medium'>{j.successCount ?? 0}</td>
                    <td className='text-danger fw-medium'>{j.errorCount ?? 0}</td>
                    <td className='text-nowrap text-sm text-secondary-light'>{formatDateTime(j.createdAt)}</td>
                    <td className='text-end'>
                      <button type='button' className='btn btn-sm btn-outline-secondary border-0 p-8' title='Download original' onClick={() => handleDownloadSource(j.id)}>
                        <Icon icon='mdi:download' className='text-xl' />
                      </button>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-secondary border-0 p-8'
                        title='Retry'
                        disabled={retryingId === j.id}
                        onClick={() => handleRetry(j.id)}
                      >
                        <Icon icon='mdi:refresh' className='text-xl' />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FileUploadsLayer;

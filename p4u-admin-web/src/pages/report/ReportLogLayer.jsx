import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  listObjectionableFeedLogs,
  updateObjectionableFeedLog,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { formatDateTime } from "../../lib/formatters";

const ACTION_OPTIONS = ["pending", "resolved", "dismissed"];

const prettyStatus = (s) => {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const getActionBadge = (action) => {
  const k = (action || "").toLowerCase();
  switch (k) {
    case "resolved":
      return "bg-success-focus text-success-600 border border-success-main";
    case "pending":
      return "bg-warning-focus text-warning-600 border border-warning-main";
    case "dismissed":
      return "bg-danger-focus text-danger-600 border border-danger-main";
    default:
      return "bg-neutral-200 text-neutral-600 border border-neutral-400";
  }
};

const ReportLogLayer = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listObjectionableFeedLogs({ purpose: "all", limit: 100, offset: 0 });
      setItems(res.items || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      const meta = r.metadata || {};
      const customer = (meta.customerName || "").toLowerCase();
      const mobile = (meta.customerMobile || "").toLowerCase();
      const reason = ((meta.reason || r.reasonCode) || "").toLowerCase();
      if (statusFilter && (r.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (q && !(customer.includes(q) || mobile.includes(q) || reason.includes(q))) return false;
      return true;
    });
  }, [items, search, statusFilter]);

  const handleStatusChange = async (row, newStatus) => {
    if (!row || !newStatus || newStatus === row.status) return;
    setUpdatingId(row.id);
    try {
      await updateObjectionableFeedLog(row.id, { status: newStatus });
      toast.success("Action updated.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className='card h-100 p-0 radius-12'>
      <div className='card-header border-bottom bg-base py-16 px-24 p4u-admin-filter-row align-items-center gap-3 justify-content-between'>
        <div className='p4u-admin-filter-row align-items-center gap-3'>
          <span className='text-md fw-medium text-secondary-light mb-0'>Show</span>
          <select className='form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px' defaultValue='10'>
            <option value='10'>10</option>
            <option value='20'>20</option>
          </select>
          <form className='navbar-search' onSubmit={(e) => e.preventDefault()}>
            <input
              type='text'
              className='bg-base h-40-px w-auto'
              name='search'
              placeholder='Search Reports...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Icon icon='ion:search-outline' className='icon' />
          </form>
          <select
            className='form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px'
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value=''>Filter Action</option>
            <option value='pending'>Pending</option>
            <option value='resolved'>Resolved</option>
            <option value='dismissed'>Dismissed</option>
          </select>
        </div>
      </div>
      <div className='card-body p-24'>
        {error && (
          <div className='alert alert-danger radius-12 mb-16' role='alert'>
            {error}
          </div>
        )}
        {loading ? (
          <p className='text-secondary-light mb-0'>Loading...</p>
        ) : (
          <div className='table-responsive scroll-sm'>
            <table className='table bordered-table sm-table mb-0 text-nowrap'>
              <thead>
                <tr>
                  <th scope='col'>S.No</th>
                  <th scope='col'>Customer Name</th>
                  <th scope='col'>Mobile Number</th>
                  <th scope='col'>Reason For Objection</th>
                  <th scope='col' className='text-center'>Administrator Action</th>
                  <th scope='col'>Created At</th>
                  <th scope='col'>Feed Date</th>
                  <th scope='col' className='text-center'>Update</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan='8' className='text-center py-4'>No report logs found.</td>
                  </tr>
                ) : (
                  filtered.map((row, index) => {
                    const meta = row.metadata || {};
                    const reason = meta.reason || row.reasonCode || "—";
                    return (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td>
                          <span className='text-md mb-0 fw-medium text-primary-light'>
                            {meta.customerName || "—"}
                          </span>
                        </td>
                        <td>{meta.customerMobile || "—"}</td>
                        <td>
                          <span className='text-secondary-light d-inline-block text-truncate' style={{ maxWidth: '250px' }} title={reason}>
                            {reason}
                          </span>
                        </td>
                        <td className='text-center'>
                          <span className={`px-12 py-4 radius-4 fw-medium text-sm ${getActionBadge(row.status)}`}>
                            {prettyStatus(row.status)}
                          </span>
                        </td>
                        <td>{formatDateTime(row.createdAt) || "—"}</td>
                        <td>{meta.feedDate ? formatDateTime(meta.feedDate) : "—"}</td>
                        <td className='text-center'>
                          <select
                            className='form-select form-select-sm w-auto radius-8'
                            value={row.status || "pending"}
                            disabled={updatingId === row.id}
                            onChange={(e) => handleStatusChange(row, e.target.value)}
                          >
                            {ACTION_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{prettyStatus(opt)}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className='p4u-admin-filter-row align-items-center justify-content-between gap-2 mt-24'>
          <span>Showing 1 to {filtered.length} of {filtered.length} entries</span>
        </div>
      </div>
    </div>
  );
};

export default ReportLogLayer;

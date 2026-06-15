import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  deleteClassifiedVendor,
  listAvailableCities,
  listClassifiedCategories,
  listClassifiedVendors,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { formatDateTime } from "../../lib/formatters";
import FormModal from "../../components/admin/FormModal";
import CFVendorFormLayer from "./CFVendorFormLayer";

function normalizeStatus(row) {
  const meta = row?.metadata || {};
  const raw = String(row?.status || meta?.verificationStatus || "").toLowerCase();
  if (raw.includes("reject")) return "rejected";
  if (raw.includes("delete")) return "deleted";
  if (raw.includes("deactive") || row?.isActive === false) return "deactivated";
  if (raw.includes("verify") || raw === "approved" || raw === "active") return "verified";
  if (raw.includes("pend") || !raw) return "pending";
  return raw;
}

function normalizePayment(row) {
  const s = String(row?.metadata?.paymentStatus || "unpaid").toLowerCase();
  if (s === "paid") return "paid";
  if (s === "partial") return "partial";
  return "unpaid";
}

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

const STATUS_TABS = [
  { key: "pending", label: "Pending Approval" },
  { key: "verified", label: "All Verified Vendors" },
  { key: "rejected", label: "Rejected" },
  { key: "deactivated", label: "Deactivated" },
  { key: "deleted", label: "Deleted" },
];

const CFVendorListLayer = () => {
  const [items, setItems] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("verified");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [vRes, cityRes, catRes] = await Promise.all([
        listClassifiedVendors({ purpose: "all", limit: 500, offset: 0 }),
        listAvailableCities({ purpose: "all", limit: 100, offset: 0 }),
        listClassifiedCategories({ purpose: "all", limit: 100, offset: 0 }),
      ]);
      setItems(vRes.items || []);
      setCities(cityRes.items || []);
      setCategories(catRes.items || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const listWithComputed = useMemo(
    () =>
      items.map((row) => ({
        ...row,
        __status: normalizeStatus(row),
        __payment: normalizePayment(row),
      })),
    [items],
  );

  const counts = useMemo(() => {
    const base = {
      total: listWithComputed.length,
      verified: 0,
      pending: 0,
      rejected: 0,
      deactivated: 0,
      deleted: 0,
    };
    listWithComputed.forEach((v) => {
      if (v.__status in base) base[v.__status] += 1;
    });
    return base;
  }, [listWithComputed]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listWithComputed.filter((row) => {
      const meta = row.metadata || {};
      if (statusTab && row.__status !== statusTab) return false;
      if (paymentFilter && row.__payment !== paymentFilter) return false;
      if (fromDate) {
        const d = new Date(row.createdAt);
        if (Number.isNaN(d.getTime()) || d < new Date(fromDate)) return false;
      }
      if (toDate) {
        const d = new Date(row.createdAt);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (Number.isNaN(d.getTime()) || d > end) return false;
      }
      if (!q) return true;
      return (
        (row.displayName || "").toLowerCase().includes(q) ||
        (meta.contactName || "").toLowerCase().includes(q) ||
        (meta.mobileNumber || "").includes(q) ||
        (meta.categoryName || "").toLowerCase().includes(q)
      );
    });
  }, [listWithComputed, search, statusTab, paymentFilter, fromDate, toDate]);

  const rowForId = (id) => items.find((v) => v.id === id) || null;

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;
    try {
      await deleteClassifiedVendor(id);
      toast.success("Vendor deleted.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const statusBadge = (status) => {
    if (status === "verified") return "bg-success-focus text-success-main";
    if (status === "rejected") return "bg-danger-focus text-danger-main";
    if (status === "deactivated") return "bg-warning-focus text-warning-main";
    if (status === "deleted") return "bg-neutral-200 text-secondary-light";
    return "bg-info-focus text-info-main";
  };

  const exportCsv = () => {
    const rows = [
      ["Vendor", "Commission", "Payment", "Status", "Created", "Updated"],
      ...filtered.map((v) => [
        v.displayName || "—",
        `${Number(v.metadata?.commissionPercent || 10) || 10}%`,
        v.__payment,
        v.__status,
        v.createdAt || "",
        v.updatedAt || "",
      ]),
    ];
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cf-vendors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='card h-100 p-0 radius-16 border-0 shadow-sm'>
      <div className='card-body p-24'>
        <div className='p4u-admin-filter-row align-items-start justify-content-between gap-3 mb-20'>
          <div>
            <h4 className='fw-bold mb-4'>CF vendors (classified)</h4>
            <p className='mb-0 text-secondary-light'>
              {counts.total} classified vendors · Multi-level approval · Separate from <strong>catalog vendors</strong> (marketplace products & services)
            </p>
          </div>
          <button
            type='button'
            onClick={() => setModal({ mode: "add" })}
            className='btn btn-primary-600 text-white radius-12 px-20 py-10 d-flex align-items-center gap-8'
          >
            <Icon icon='ic:baseline-plus' className='text-lg' /> Add CF vendor
          </button>
        </div>

        <div className='bg-primary-50 radius-12 p-6 p4u-admin-filter-row gap-6 mb-16'>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type='button'
              className={`btn radius-10 px-14 py-8 border-0 ${
                statusTab === tab.key ? "bg-white fw-semibold text-primary-600" : "bg-transparent text-secondary-light"
              }`}
              onClick={() => setStatusTab(tab.key)}
            >
              {tab.label}
              {tab.key === "deactivated" ? ` (${counts.deactivated})` : ""}
              {tab.key === "deleted" ? ` (${counts.deleted})` : ""}
            </button>
          ))}
        </div>

        <div className='row g-12 mb-16'>
          <SummaryCard title='Total CF vendors' value={counts.total} icon='mdi:storefront-outline' color='info' />
          <SummaryCard title='Verified' value={counts.verified} icon='mdi:shield-check-outline' color='success' />
          <SummaryCard title='Pending' value={counts.pending} icon='mdi:clock-outline' color='warning' />
          <SummaryCard title='Rejected' value={counts.rejected} icon='mdi:close-circle-outline' color='danger' />
        </div>

        <div className='card radius-12 border-0 mb-12 bg-base'>
          <div className='card-body p-16 p4u-admin-filter-row align-items-center gap-10'>
            <div className='input-group radius-10 p4u-filter-search' style={{ minWidth: 160, maxWidth: 300 }}>
              <span className='input-group-text bg-white border-end-0'>
                <Icon icon='mdi:magnify' />
              </span>
              <input
                type='text'
                className='form-control border-start-0 h-40-px'
                placeholder='Search vendor'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <input type='date' className='form-control radius-10 h-40-px' value={fromDate} onChange={(e) => setFromDate(e.target.value)} title='From date' />
            <input type='date' className='form-control radius-10 h-40-px' value={toDate} onChange={(e) => setToDate(e.target.value)} title='To date' />
            <select className='form-select radius-10 h-40-px' style={{ minWidth: 130, maxWidth: 200 }} value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value=''>Payment</option>
              <option value='paid'>Paid</option>
              <option value='unpaid'>Unpaid</option>
              <option value='partial'>Partial</option>
            </select>
            <div className='p4u-admin-filter-row__end gap-8'>
              <button type='button' onClick={exportCsv} className='btn btn-outline-secondary radius-10 d-flex align-items-center gap-8'>
                <Icon icon='mdi:download-outline' /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className='alert alert-danger radius-12 mb-16' role='alert'>
            {error}
          </div>
        )}

        {loading ? (
          <p className='text-secondary-light mb-0'>Loading vendors...</p>
        ) : (
          <div className='table-responsive scroll-sm' style={{ overflowX: "auto" }}>
            <table className='table bordered-table sm-table mb-0 text-nowrap' style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>COMMISSION</th>
                  <th>PAYMENT</th>
                  <th>STATUS</th>
                  <th>CREATED</th>
                  <th>UPDATED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan='6' className='text-center py-4'>No vendors found.</td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const meta = item.metadata || {};
                    const commission = Number(meta.commissionPercent || 10) || 10;
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className='fw-semibold text-primary-light'>{commission}%</div>
                          <div className='text-xs text-secondary-light'>{item.displayName || "Vendor"}</div>
                        </td>
                        <td>
                          <span className={`px-12 py-4 rounded-pill text-xs fw-semibold ${item.__payment === "paid" ? "bg-success-focus text-success-main" : "bg-danger-focus text-danger-main"}`}>
                            {item.__payment}
                          </span>
                        </td>
                        <td>
                          <span className={`px-12 py-4 rounded-pill text-xs fw-semibold ${statusBadge(item.__status)}`}>
                            {item.__status.replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        </td>
                        <td>{formatDateTime(item.createdAt)}</td>
                        <td>{formatDateTime(item.updatedAt)}</td>
                        <td>
                          <div className='d-flex align-items-center gap-10'>
                            <button type='button' onClick={() => setModal({ mode: "view", id: item.id })} className='btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-secondary-light' style={{ width: 36, height: 36 }} title='View'>
                              <Icon icon='majesticons:eye-line' className='text-xl' />
                            </button>
                            <button type='button' onClick={() => setModal({ mode: "edit", id: item.id })} className='btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-secondary-light' style={{ width: 36, height: 36 }} title='Edit'>
                              <Icon icon='lucide:edit' className='text-xl' />
                            </button>
                            <button type='button' onClick={() => handleDelete(item.id)} className='btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-danger-600' style={{ width: 36, height: 36 }} title='Delete'>
                              <Icon icon='fluent:delete-24-regular' className='text-xl' />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <FormModal onClose={() => setModal(null)} size='xl'>
          <CFVendorFormLayer
            isEdit={modal.mode === "edit"}
            isView={modal.mode === "view"}
            initialData={modal.id ? rowForId(modal.id) : null}
            cities={cities}
            categories={categories}
            onSuccess={() => {
              setModal(null);
              load();
            }}
            onCancel={() => setModal(null)}
          />
        </FormModal>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value, icon, color }) => {
  const map = {
    info: "bg-info-50 text-info-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    danger: "bg-danger-50 text-danger-600",
  };
  return (
    <div className='col-sm-6 col-xl-3'>
      <div className='radius-12 p-16 bg-neutral-50 border'>
        <div className='d-flex align-items-center gap-10'>
          <span className={`w-40-px h-40-px rounded-circle d-flex align-items-center justify-content-center ${map[color]}`}>
            <Icon icon={icon} className='text-xl' />
          </span>
          <div>
            <div className='text-sm text-secondary-light'>{title}</div>
            <h5 className='mb-0 fw-bold'>{value}</h5>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CFVendorListLayer;

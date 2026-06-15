import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import { createCustomer, deleteCustomer, listCustomers, listOccupations } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import FormModal from "../../components/admin/FormModal";
import CustomerFormLayer from "./CustomerFormLayer";

const STATUS_OPTIONS = ["All", "active", "inactive", "suspended"];
const STATUS_TABS = [
  { key: "all", label: "All Customers" },
  { key: "deactivated", label: "Deactivated" },
  { key: "deleted", label: "Deleted" },
];

const CustomerListLayer = () => {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [occupationMap, setOccupationMap] = useState({});
  const [occupations, setOccupations] = useState([]);
  const [occupationFilter, setOccupationFilter] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    listOccupations({ purpose: "all" }).then((res) => {
      const items = res.items || [];
      const om = {};
      items.forEach((o) => {
        om[o.id] = o.name;
      });
      setOccupationMap(om);
      setOccupations(items);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listCustomers({ limit, offset });
      setCustomers(res.items || []);
      setTotal(typeof res.total === "number" ? res.total : 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer?")) return;
    try {
      await deleteCustomer(id);
      await load();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : String(e));
    }
  };

  const filtered = customers.filter((c) => {
    const s = String(c.status || "").toLowerCase();
    if (statusTab === "deactivated" && !["inactive", "suspended", "deactivated"].includes(s)) return false;
    if (statusTab === "deleted" && s !== "deleted") return false;
    if (statusFilter !== "All" && (c.status || "").toLowerCase() !== statusFilter) return false;
    if (occupationFilter) {
      const oid = c.occupationId != null ? String(c.occupationId) : "";
      if (oid !== occupationFilter) return false;
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (new Date(c.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(c.createdAt) > to) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (c.fullName || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q) ||
        (c.email || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return "—";
    return dt.toISOString().replace("T", " ").substring(0, 19);
  };

  const exportCsv = useCallback(() => {
    const esc = (v) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [
      ["Name", "Mobile", "Join Date", "Status", "Occupation", "Wallet", "Referral Code"],
      ...filtered.map((c) => {
        const meta = c.metadata || {};
        return [
          c.fullName || "",
          c.phone || "",
          formatDate(c.createdAt),
          c.status || "",
          occupationMap[c.occupationId] || meta.occupation || "",
          String(meta.wallet ?? meta.walletBalance ?? ""),
          meta.referralCode || "",
        ];
      }),
    ];
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, occupationMap]);

  const pageFrom = total === 0 ? 0 : offset + 1;
  const pageTo = offset + customers.length;
  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  const deactivatedCount = customers.filter((c) =>
    ["inactive", "suspended", "deactivated"].includes(String(c.status || "").toLowerCase())
  ).length;
  const deletedCount = customers.filter((c) => String(c.status || "").toLowerCase() === "deleted").length;
  const activeCount = customers.filter((c) => String(c.status || "").toLowerCase() === "active").length;
  const inactiveSuspendedCount = customers.filter((c) =>
    ["inactive", "suspended", "deactivated"].includes(String(c.status || "").toLowerCase())
  ).length;
  const totalWalletPoints = customers.reduce((sum, c) => {
    const meta = c.metadata || {};
    return sum + (Number(meta.wallet ?? meta.walletBalance ?? 0) || 0);
  }, 0);

  return (
    <div className="card h-100 p-0 radius-12">
      <div className="card-body p-24">
        <div className="mb-20">
          <p className="text-secondary-light text-lg mb-0">{total.toLocaleString("en-IN")} registered customers</p>
        </div>

        <div className="d-flex flex-wrap gap-8 bg-neutral-100 p-8 radius-12 mb-20">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === "deactivated" ? deactivatedCount : tab.key === "deleted" ? deletedCount : total;
            const active = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`btn border-0 radius-10 px-16 py-8 fw-medium ${active ? "bg-white text-primary-light shadow-sm" : "bg-transparent text-secondary-light"}`}
                onClick={() => setStatusTab(tab.key)}
              >
                {tab.label}
                {tab.key !== "all" ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>

        <div className="row g-16 mb-20">
          <StatCard title="Total Customers" value={total.toLocaleString("en-IN")} icon="mdi:account-group-outline" cardCls="bg-primary-50" valueCls="text-primary-700" />
          <StatCard title="Active" value={activeCount.toLocaleString("en-IN")} icon="mdi:account-check-outline" cardCls="bg-success-50" valueCls="text-success-700" />
          <StatCard title="Inactive / Suspended" value={inactiveSuspendedCount.toLocaleString("en-IN")} icon="mdi:account-cancel-outline" cardCls="bg-danger-50" valueCls="text-danger-700" />
          <StatCard title="Total Wallet Points" value={totalWalletPoints.toLocaleString("en-IN")} icon="mdi:star-circle-outline" cardCls="bg-warning-50" valueCls="text-warning-700" />
        </div>

        <div className="p4u-admin-filter-row gap-10 mb-20">
          <div className="input-group radius-8 p4u-filter-search" style={{ minWidth: 160, maxWidth: 300 }}>
            <span className="input-group-text bg-white border-end-0">
              <Icon icon="mdi:magnify" className="text-secondary-light" />
            </span>
            <input
              type="text"
              className="form-control border-start-0 h-40-px"
              placeholder="Search by name, email, mobile"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select form-select-sm radius-8 h-40-px"
            style={{ minWidth: 120 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === "All" ? "All status" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            className="form-select form-select-sm radius-8 h-40-px"
            style={{ minWidth: 140 }}
            value={occupationFilter}
            onChange={(e) => setOccupationFilter(e.target.value)}
          >
            <option value="">All occupation types</option>
            {occupations.map((o) => (
              <option key={o.id} value={String(o.id)}>{o.name || o.id}</option>
            ))}
          </select>
          <input type="date" className="form-control radius-8 h-40-px" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" />
          <input type="date" className="form-control radius-8 h-40-px" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" />
          <div className="p4u-admin-filter-row__end gap-8">
            <button type="button" className="btn btn-outline-secondary text-sm btn-sm px-14 py-8 radius-8 d-flex align-items-center gap-6" onClick={exportCsv}>
              <Icon icon="mdi:download-outline" className="text-lg" />
              Export CSV
            </button>
            <button
              type="button"
              className="btn btn-primary text-sm btn-sm px-16 py-8 radius-8 d-flex align-items-center gap-6"
              onClick={() => setModal({ mode: "add" })}
            >
              <Icon icon="ic:baseline-plus" className="text-lg" />
              Add Customer
            </button>
          </div>
        </div>
        {error && <div className="alert alert-danger radius-12 mb-16" role="alert">{error}</div>}
        {loading ? (
          <p className="text-secondary-light mb-0">Loading customers...</p>
        ) : (
          <>
            <div className="table-responsive scroll-sm" style={{ overflowX: "auto" }}>
              <table className="table bordered-table sm-table mb-0 text-nowrap" style={{ minWidth: 1180 }}>
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Mobile</th>
                    <th scope="col">Occupation</th>
                    <th scope="col">Points</th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                    <th scope="col">Updated</th>
                    <th scope="col" className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((customer, index) => {
                      const meta = customer.metadata || {};
                      return (
                        <tr key={customer.id}>
                          <td className="fw-medium">{`CUST-${String(customer.id || "").replace(/-/g, "").slice(0, 6).toUpperCase()}`}</td>
                          <td><span className="text-md fw-normal text-secondary-light">{customer.fullName || "—"}</span></td>
                          <td>{customer.email || "—"}</td>
                          <td>{customer.phone || "—"}</td>
                          <td>{occupationMap[customer.occupationId] || meta.occupation || "—"}</td>
                          <td className="fw-semibold">{meta.wallet ?? meta.walletBalance ?? 0}</td>
                          <td>
                            <span className={`px-12 py-4 radius-pill fw-medium text-sm ${String(customer.status).toLowerCase() === "active" ? "bg-success-100 text-success-700" : "bg-danger-100 text-danger-700"}`}>
                              {(customer.status || "—").charAt(0).toUpperCase() + String(customer.status || "—").slice(1)}
                            </span>
                          </td>
                          <td>{formatDate(customer.createdAt)}</td>
                          <td>{formatDate(customer.updatedAt)}</td>
                          <td className="text-center">
                            <div className="d-flex align-items-center gap-10 justify-content-center">
                              <button type="button" onClick={() => setModal({ mode: "view", id: customer.id })} className="btn btn-light border-0 rounded-circle d-flex justify-content-center align-items-center text-secondary-light" style={{ width: 36, height: 36 }} title="View">
                                <Icon icon="mdi:eye-outline" className="icon text-xl" />
                              </button>
                              <button type="button" onClick={() => setModal({ mode: "edit", id: customer.id })} className="btn btn-light border-0 rounded-circle d-flex justify-content-center align-items-center text-success-600" style={{ width: 36, height: 36 }} title="Edit">
                                <Icon icon="lucide:edit" className="menu-icon" />
                              </button>
                              <button type="button" onClick={() => handleDelete(customer.id)} className="btn btn-light border-0 rounded-circle d-flex justify-content-center align-items-center text-danger-600" style={{ width: 36, height: 36 }} title="Delete">
                                <Icon icon="fluent:delete-24-regular" className="menu-icon" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="10" className="text-center py-4">No customers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p4u-admin-filter-row align-items-center justify-content-between gap-2 mt-24">
              <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-8 gap-md-16">
                <span>Showing {pageFrom} to {pageTo} of {total} entries</span>
                <span className="text-secondary-light text-sm">
                  <Link to="/occupations" className="text-primary-600 hover-text-decoration-underline">Occupations</Link>
                  {" — edit the list used when assigning a customer's occupation."}
                </span>
              </div>
              <div className="d-flex gap-2 align-items-center">
                <button type="button" className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px text-md" disabled={!canPrev} onClick={() => setOffset(Math.max(0, offset - limit))}>
                  <Icon icon="ep:d-arrow-left" />
                </button>
                <span className="page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md bg-primary-600 text-white mb-0">{Math.floor(offset / limit) + 1}</span>
                <button type="button" className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px text-md" disabled={!canNext} onClick={() => setOffset(offset + limit)}>
                  <Icon icon="ep:d-arrow-right" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modal && modal.id && (
        <FormModal onClose={() => setModal(null)} size="xl">
          <CustomerFormLayer
            isEdit={modal.mode === "edit"}
            isView={modal.mode === "view"}
            customerId={modal.id}
            onSuccess={() => { setModal(null); load(); }}
            onCancel={() => setModal(null)}
          />
        </FormModal>
      )}
      {modal && modal.mode === "add" && (
        <FormModal onClose={() => setModal(null)} size="lg">
          <CustomerCreateForm
            occupations={occupations}
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

function CustomerCreateForm({ occupations, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    status: "active",
    occupationId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email is required.");
      return;
    }
    setSubmitting(true);
    try {
      await createCustomer({
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        status: form.status,
        occupationId: form.occupationId || null,
      });
      toast.success("Customer created.");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card h-100 p-0 radius-12 border-0 shadow-none">
      <div className="card-body p-24">
        <div className="d-flex align-items-center gap-12 mb-20">
          <span className="w-48-px h-48-px radius-12 bg-primary-600 text-white d-flex align-items-center justify-content-center flex-shrink-0">
            <Icon icon="mdi:plus" className="text-2xl" />
          </span>
          <h5 className="fw-bold mb-0">New Customer</h5>
        </div>
        <form onSubmit={submit}>
          <div className="row g-16">
            <div className="col-md-6">
              <label className="form-label fw-semibold text-sm">Full Name *</label>
              <input
                className="form-control radius-10"
                name="fullName"
                value={form.fullName}
                onChange={update}
                disabled={submitting}
                placeholder="Enter name"
                autoComplete="name"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-sm">Status</label>
              <select className="form-select radius-10" name="status" value={form.status} onChange={update} disabled={submitting}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-sm">Email *</label>
              <div className="input-group radius-10">
                <span className="input-group-text bg-base border-end-0 text-secondary-light">
                  <Icon icon="mdi:email-outline" />
                </span>
                <input
                  className="form-control border-start-0 radius-10"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={update}
                  disabled={submitting}
                  placeholder="email@example.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-sm">Mobile</label>
              <div className="input-group radius-10">
                <span className="input-group-text bg-base border-end-0 text-secondary-light">
                  <Icon icon="mdi:phone-outline" />
                </span>
                <input
                  className="form-control border-start-0 radius-10"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={update}
                  disabled={submitting}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                />
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-sm">Occupation</label>
              <select className="form-select radius-10" name="occupationId" value={form.occupationId} onChange={update} disabled={submitting}>
                <option value="">Select occupation</option>
                {occupations.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="d-flex justify-content-end gap-10 mt-24">
            <button type="button" className="btn btn-light border radius-10 px-20" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary radius-10 px-20" disabled={submitting}>
              {submitting ? "Creating…" : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon, cardCls = "", valueCls = "" }) => (
  <div className="col-sm-6 col-xl-3">
    <div className={`radius-12 p-16 ${cardCls}`}>
      <div className="d-flex align-items-center gap-12">
        <span className="w-40-px h-40-px radius-8 d-flex align-items-center justify-content-center bg-white">
          <Icon icon={icon} className="text-xl text-secondary-light" />
        </span>
        <div>
          <div className="text-secondary-light text-sm">{title}</div>
          <div className={`h5 fw-bold mb-0 ${valueCls}`}>{value}</div>
        </div>
      </div>
    </div>
  </div>
);

export default CustomerListLayer;

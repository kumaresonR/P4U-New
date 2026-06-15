import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import { deleteOccupation, getPlatformVariableByKey, listOccupations, OCCUPATION_ADMIN_CREATE_ENABLED_KEY } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { isPlatformVariableRowAllowingAction } from "../../lib/platformVariableValue";
import { formatDateTime } from "../../lib/formatters";
import FormModal from "../../components/admin/FormModal";
import OccupationFormLayer from "./OccupationFormLayer";

/** Display ID like OCC0000023 (7-digit suffix from 1-based index in sorted list). */
function formatOccDisplayId(index) {
  return `OCC${String(index + 1).padStart(7, "0")}`;
}

function exportOccupationsCsv(rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["ID", "Occupation", "Customers", "Status", "Created", "Updated"];
  const lines = [header.join(",")];
  rows.forEach((row, i) => {
    lines.push(
      [
        esc(formatOccDisplayId(i)),
        esc(row.name),
        esc(row.customerCount ?? 0),
        esc(row.isActive !== false ? "Active" : "Inactive"),
        esc(formatDateTime(row.createdAt)),
        esc(formatDateTime(row.updatedAt)),
      ].join(",")
    );
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `occupations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const StatCard = ({ title, value, icon, cardCls = "", valueCls = "" }) => (
  <div className="col-sm-6 col-xl-4">
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

export default function OccupationListLayer() {
  const [items, setItems] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [occupationAddAllowed, setOccupationAddAllowed] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listOccupations({ purpose: "all" });
      setItems(Array.isArray(res.items) ? res.items : []);
      setTotalCustomers(typeof res.totalCustomers === "number" ? res.totalCustomers : 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setItems([]);
      setTotalCustomers(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getPlatformVariableByKey(OCCUPATION_ADMIN_CREATE_ENABLED_KEY);
        if (!cancelled) {
          setOccupationAddAllowed(isPlatformVariableRowAllowingAction(res?.item, true));
        }
      } catch {
        if (!cancelled) setOccupationAddAllowed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (so !== 0) return so;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [items]);

  const filtered = useMemo(() => {
    let rows = sorted;
    if (statusFilter === "active") rows = rows.filter((r) => r.isActive !== false);
    if (statusFilter === "inactive") rows = rows.filter((r) => r.isActive === false);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => String(r.name || "").toLowerCase().includes(q));
    return rows;
  }, [sorted, search, statusFilter]);

  const displayIndexById = useMemo(() => {
    const m = new Map();
    sorted.forEach((row, i) => m.set(row.id, i));
    return m;
  }, [sorted]);

  const activeCount = useMemo(() => items.filter((r) => r.isActive !== false).length, [items]);

  async function onDelete(id) {
    if (!window.confirm("Delete this occupation? Customers using it may need to be reassigned first.")) return;
    try {
      await deleteOccupation(id);
      toast.success("Occupation deleted.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  }

  return (
    <div className="card border-0 shadow-sm radius-16 p-0">
      <div className="card-body p-24">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-12 mb-20">
          <div>
            <p className="text-secondary-light text-lg mb-0">
              {items.length.toLocaleString("en-IN")} occupation type{items.length === 1 ? "" : "s"}
            </p>
            <p className="text-sm text-secondary-light mb-0 mt-4">
              <Link to="/customers" className="text-primary-600 hover-text-decoration-underline">Customers</Link>
              {" — assign occupations when editing a customer profile."}
            </p>
          </div>
        </div>

        <div className="row g-16 mb-24">
          <StatCard title="Total occupations" value={items.length.toLocaleString("en-IN")} icon="mdi:briefcase-outline" cardCls="bg-primary-50" valueCls="text-primary-700" />
          <StatCard title="Active" value={activeCount.toLocaleString("en-IN")} icon="mdi:check-circle-outline" cardCls="bg-success-50" valueCls="text-success-700" />
          <StatCard title="Total customers" value={totalCustomers.toLocaleString("en-IN")} icon="mdi:account-group-outline" cardCls="bg-neutral-100" valueCls="text-primary-light" />
        </div>

        {!occupationAddAllowed && (
          <div className="alert alert-warning radius-12 mb-20" role="status">
            <span className="fw-medium">Add occupation is disabled.</span>{" "}
            Platform variable <code className="text-xs">OCCUPATION_ADMIN_CREATE_ENABLED</code> is off or its value is 0.
            You can still view, edit, or delete existing types. Change it under{" "}
            <Link to="/platform-variables" className="alert-link">Platform Variables</Link>.
          </div>
        )}

        <div className="p4u-admin-filter-row flex-wrap gap-10 mb-20">
          <div className="input-group radius-8 p4u-filter-search" style={{ minWidth: 160, maxWidth: 320 }}>
            <span className="input-group-text bg-white border-end-0">
              <Icon icon="mdi:magnify" className="text-secondary-light" />
            </span>
            <input
              type="text"
              className="form-control border-start-0 h-40-px"
              placeholder="Search occupations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select form-select-sm radius-8 h-40-px" style={{ minWidth: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="p4u-admin-filter-row__end gap-8 ms-auto">
            <button type="button" className="btn btn-outline-secondary text-sm btn-sm px-14 py-8 radius-8 d-flex align-items-center gap-6" onClick={() => exportOccupationsCsv(filtered)}>
              <Icon icon="mdi:download-outline" className="text-lg" />
              Export CSV
            </button>
            <button
              type="button"
              className="btn btn-primary text-sm btn-sm px-16 py-8 radius-8 d-flex align-items-center gap-6"
              disabled={!occupationAddAllowed}
              title={
                occupationAddAllowed
                  ? undefined
                  : "Disabled by OCCUPATION_ADMIN_CREATE_ENABLED (Platform Variables)."
              }
              onClick={() => {
                if (!occupationAddAllowed) return;
                setModal({ mode: "add" });
              }}
            >
              <Icon icon="ic:baseline-plus" className="text-lg" />
              Add occupation
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger radius-12 mb-16" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-secondary-light mb-0">Loading occupations…</p>
        ) : (
          <div className="table-responsive scroll-sm">
            <table className="table bordered-table sm-table mb-0 text-nowrap">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Occupation</th>
                  <th>Customers</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-secondary-light">
                      No occupations match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const idx = displayIndexById.get(row.id) ?? 0;
                    const displayId = formatOccDisplayId(idx);
                    const cnt = row.customerCount ?? 0;
                    return (
                      <tr key={row.id}>
                        <td className="fw-medium">{displayId}</td>
                        <td className="fw-semibold">{row.name || "—"}</td>
                        <td>{cnt.toLocaleString("en-IN")}</td>
                        <td>
                          <span className={`px-12 py-4 radius-pill fw-medium text-sm ${row.isActive !== false ? "bg-success-100 text-success-700" : "bg-neutral-200 text-secondary-light"}`}>
                            {row.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>{formatDateTime(row.createdAt)}</td>
                        <td>{formatDateTime(row.updatedAt)}</td>
                        <td>
                          <div className="d-flex gap-10 justify-content-center">
                            <button type="button" onClick={() => setModal({ mode: "view", id: row.id })} className="bg-info-focus text-info-600 w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0" title="View">
                              <Icon icon="majesticons:eye-line" className="icon text-xl" />
                            </button>
                            <button type="button" onClick={() => setModal({ mode: "edit", id: row.id })} className="bg-success-focus text-success-600 w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0" title="Edit">
                              <Icon icon="lucide:edit" />
                            </button>
                            <button type="button" onClick={() => onDelete(row.id)} className="bg-danger-focus text-danger-600 w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0" title="Delete">
                              <Icon icon="fluent:delete-24-regular" className="icon text-xl" />
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
        <FormModal onClose={() => setModal(null)} size="md">
          <OccupationFormLayer
            isEdit={modal.mode === "edit"}
            isView={modal.mode === "view"}
            occupationId={modal.id}
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
}

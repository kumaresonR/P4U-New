import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { listPlatformVariables, deletePlatformVariable } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import FormModal from "../../components/admin/FormModal";
import PlatformVariableFormLayer from "./PlatformVariableFormLayer";

const PlatformVariableListLayer = () => {
  const [variables, setVariables] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listPlatformVariables({ limit, offset });
      setVariables(res.items || []);
      setTotal(typeof res.total === "number" ? res.total : 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this variable?")) return;
    try {
      await deletePlatformVariable(id);
      await load();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : String(e));
    }
  };

  const filtered = search.trim()
    ? variables.filter((v) => (v.key || "").toLowerCase().includes(search.toLowerCase()))
    : variables;

  const getVal = (row) => {
    const v = row.value;
    if (v == null) return { amount: "", valueType: "", currencyType: "", description: "" };
    if (typeof v === "object") return { amount: v.amount ?? v.text ?? "", valueType: v.valueType || "", currencyType: v.currencyType || "None", description: v.description || "" };
    return { amount: String(v), valueType: "", currencyType: "", description: "" };
  };

  const formatDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return "—";
    return dt.toISOString().replace("T", " ").substring(0, 19);
  };

  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="card h-100 p-0 radius-12">
      <div className="card-header border-bottom bg-base py-16 px-24 p4u-admin-filter-row align-items-center gap-3 justify-content-between">
        <button type="button" onClick={() => setModal({ mode: "add" })} className="btn btn-primary text-sm btn-sm px-12 py-8 radius-8 d-flex align-items-center gap-2">
          <Icon icon="ic:baseline-plus" className="icon text-xl line-height-1" /> Add Variable
        </button>
        <input type="text" className="form-control radius-8" style={{ maxWidth: 300 }} placeholder="Search Platform Variables" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card-body p-24">
        {error && <div className="alert alert-danger radius-12 mb-16" role="alert">{error}</div>}
        {loading ? (
          <p className="text-secondary-light mb-0">Loading platform variables...</p>
        ) : (
          <>
            <div className="table-responsive scroll-sm">
              <table className="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th><input type="checkbox" disabled /></th>
                    <th>S.No</th>
                    <th>Variable Type</th>
                    <th>Value</th>
                    <th>Value Type</th>
                    <th>Currency Type</th>
                    <th>CreatedAt</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((row, index) => {
                      const v = getVal(row);
                      return (
                        <tr key={row.id}>
                          <td><input type="checkbox" /></td>
                          <td>{offset + index + 1}</td>
                          <td className="fw-medium">{row.key || "—"}</td>
                          <td>{v.amount}</td>
                          <td>{v.valueType || "—"}</td>
                          <td>{v.currencyType || "None"}</td>
                          <td>{formatDate(row.createdAt)}</td>
                          <td className="text-center">
                            <div className="d-flex align-items-center gap-10 justify-content-center">
                              <button type="button" onClick={() => setModal({ mode: "view", id: row.id })} className="border-0 bg-transparent text-info-600 p-0" title="View">
                                <Icon icon="mdi:information-outline" className="text-xl" />
                              </button>
                              <button type="button" onClick={() => setModal({ mode: "edit", id: row.id })} className="border-0 bg-transparent text-success-600 p-0" title="Edit">
                                <Icon icon="lucide:edit" className="text-xl" />
                              </button>
                              <button type="button" onClick={() => handleDelete(row.id)} className="border-0 bg-transparent text-danger-600 p-0" title="Delete">
                                <Icon icon="fluent:delete-24-regular" className="text-xl" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="8" className="text-center py-4">No platform variables found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p4u-admin-filter-row align-items-center justify-content-between gap-2 mt-24">
              <span>{page} of {totalPages}</span>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-sm btn-outline-secondary radius-8" disabled={!canPrev} onClick={() => setOffset(Math.max(0, offset - limit))}>Prev</button>
                <button type="button" className="btn btn-sm btn-primary radius-8" disabled={!canNext} onClick={() => setOffset(offset + limit)}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {modal && (
        <FormModal onClose={() => setModal(null)} size="lg">
          <PlatformVariableFormLayer
            isEdit={modal.mode === "edit"}
            isView={modal.mode === "view"}
            variableId={modal.id}
            onSuccess={() => { setModal(null); load(); }}
            onCancel={() => setModal(null)}
          />
        </FormModal>
      )}
    </div>
  );
};

export default PlatformVariableListLayer;

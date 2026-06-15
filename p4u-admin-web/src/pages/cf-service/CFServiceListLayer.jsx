import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  deleteClassifiedService,
  listClassifiedCategories,
  listClassifiedServices,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";
import FormModal from "../../components/admin/FormModal";
import CFServiceFormLayer from "./CFServiceFormLayer";

const CFServiceListLayer = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [svcRes, catRes] = await Promise.all([
        listClassifiedServices({ purpose: "all", limit: 100, offset: 0 }),
        listClassifiedCategories({ purpose: "all", limit: 100, offset: 0 }),
      ]);
      setItems(svcRes.items || []);
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

  const categoryNameById = useMemo(() => {
    const m = new Map();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => (r.name || "").toLowerCase().includes(q));
  }, [items, search]);

  const rowForId = (id) => items.find((s) => s.id === id) || null;

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await deleteClassifiedService(id);
      await load();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : String(e));
    }
  };

  const resolveCategoryName = (row) => {
    const meta = row.metadata || {};
    if (meta.categoryName) return meta.categoryName;
    if (meta.categoryId && categoryNameById.has(meta.categoryId)) return categoryNameById.get(meta.categoryId);
    if (row.categoryId && categoryNameById.has(row.categoryId)) return categoryNameById.get(row.categoryId);
    return "—";
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
              placeholder='Search Services...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Icon icon='ion:search-outline' className='icon' />
          </form>
        </div>
        <button type='button' onClick={() => setModal({ mode: "add" })} className='btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2'>
          <Icon icon='ic:baseline-plus' className='icon text-xl line-height-1' />
          Add CF Service
        </button>
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
                  <th scope='col'>Sr No.</th>
                  <th scope='col'>Icon</th>
                  <th scope='col'>Name</th>
                  <th scope='col'>Categories</th>
                  <th scope='col'>Description</th>
                  <th scope='col' className='text-center'>Availability</th>
                  <th scope='col' className='text-center'>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan='7' className='text-center py-4'>No services found.</td>
                  </tr>
                ) : (
                  filtered.map((service, index) => {
                    const meta = service.metadata || {};
                    return (
                      <tr key={service.id}>
                        <td>{index + 1}</td>
                        <td>
                          {meta.thumbnailUrl ? (
                            <img
                              src={resolveMediaUrl(meta.thumbnailUrl)}
                              alt={service.name}
                              className='w-40-px h-40-px radius-8 object-fit-cover border'
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span className='text-secondary-light'>—</span>
                          )}
                        </td>
                        <td><span className='fw-semibold text-primary-light'>{service.name || "—"}</span></td>
                        <td><span className='text-secondary-light'>{resolveCategoryName(service)}</span></td>
                        <td>
                          <span className='text-secondary-light text-truncate d-inline-block' style={{ maxWidth: '200px' }}>
                            {meta.description || "—"}
                          </span>
                        </td>
                        <td className='text-center'>
                          <span className={`px-12 py-4 radius-4 fw-medium text-sm ${service.isActive !== false ? 'bg-success-focus text-success-600 border border-success-main' : 'bg-danger-focus text-danger-600 border border-danger-main'}`}>
                            {service.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className='text-center'>
                          <div className='d-flex align-items-center gap-10 justify-content-center'>
                            <button type='button' onClick={() => setModal({ mode: "view", id: service.id })} className='bg-info-focus bg-hover-info-200 text-info-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0' title='View'>
                              <Icon icon='majesticons:eye-line' className='icon text-xl' />
                            </button>
                            <button type='button' onClick={() => setModal({ mode: "edit", id: service.id })} className='bg-success-focus text-success-600 bg-hover-success-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0' title='Edit'>
                              <Icon icon='lucide:edit' className='menu-icon' />
                            </button>
                            <button type='button' onClick={() => handleDelete(service.id)} className='remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle' title='Delete'>
                              <Icon icon='fluent:delete-24-regular' className='menu-icon' />
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

        <div className='p4u-admin-filter-row align-items-center justify-content-between gap-2 mt-24'>
          <span>Showing 1 to {filtered.length} of {filtered.length} entries</span>
        </div>
      </div>

      {modal && (
        <FormModal onClose={() => setModal(null)} size='lg'>
          <CFServiceFormLayer
            isEdit={modal.mode === "edit"}
            isView={modal.mode === "view"}
            initialData={modal.id ? rowForId(modal.id) : null}
            categories={categories}
            onSuccess={() => { setModal(null); load(); }}
            onCancel={() => setModal(null)}
          />
        </FormModal>
      )}
    </div>
  );
};

export default CFServiceListLayer;

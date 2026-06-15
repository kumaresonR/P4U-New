import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  deleteClassifiedProduct,
  listClassifiedCategories,
  listClassifiedProducts,
  listClassifiedServices,
  listClassifiedVendors,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";
import FormModal from "../../components/admin/FormModal";
import CFProductFormLayer from "./CFProductFormLayer";

const CFProductListLayer = () => {
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pRes, vRes, catRes, sRes] = await Promise.all([
        listClassifiedProducts({ purpose: "all", limit: 100, offset: 0 }),
        listClassifiedVendors({ purpose: "all", limit: 100, offset: 0 }),
        listClassifiedCategories({ purpose: "all", limit: 100, offset: 0 }),
        listClassifiedServices({ purpose: "all", limit: 100, offset: 0 }),
      ]);
      setItems(pRes.items || []);
      setVendors(vRes.items || []);
      setCategories(catRes.items || []);
      setServices(sRes.items || []);
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
    if (!q) return items;
    return items.filter((r) => (r.name || "").toLowerCase().includes(q));
  }, [items, search]);

  const rowForId = (id) => items.find((p) => p.id === id) || null;

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteClassifiedProduct(id);
      await load();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : String(e));
    }
  };

  const pickThumbnail = (row) => {
    const meta = row.metadata || {};
    if (meta.thumbnailUrl) return meta.thumbnailUrl;
    if (Array.isArray(row.imageUrls) && row.imageUrls[0]) return row.imageUrls[0];
    return null;
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
              placeholder='Search Product...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Icon icon='ion:search-outline' className='icon' />
          </form>
        </div>
        <button type='button' onClick={() => setModal({ mode: "add" })} className='btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2'>
          <Icon icon='ic:baseline-plus' className='icon text-xl' /> Add CF Product
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
                  <th scope='col'>Description</th>
                  <th scope='col'>Price</th>
                  <th scope='col' className='text-center'>Status</th>
                  <th scope='col' className='text-center'>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan='7' className='text-center py-4'>No products found.</td>
                  </tr>
                ) : (
                  filtered.map((item, index) => {
                    const thumb = pickThumbnail(item);
                    return (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>
                          {thumb ? (
                            <img src={resolveMediaUrl(thumb) || thumb || ""} alt={item.name} className='w-40-px h-40-px radius-8 object-fit-cover' onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <span className='text-secondary-light'>—</span>
                          )}
                        </td>
                        <td><span className='fw-medium text-primary-light'>{item.name || "—"}</span></td>
                        <td><span className='text-secondary-light text-truncate d-inline-block' style={{ maxWidth: '200px' }}>{item.description || "—"}</span></td>
                        <td className='fw-bold text-success-main'>₹{item.price != null ? item.price : "0"}</td>
                        <td className='text-center'>
                          <span className={`px-12 py-4 radius-4 fw-medium text-sm ${item.isActive !== false ? 'bg-success-focus text-success-600' : 'bg-danger-focus text-danger-600'}`}>
                            {item.isActive !== false ? "Available" : "Unavailable"}
                          </span>
                        </td>
                        <td className='text-center'>
                          <div className='d-flex align-items-center gap-10 justify-content-center'>
                            <button type='button' onClick={() => setModal({ mode: "view", id: item.id })} className='bg-info-focus text-info-600 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle border-0'><Icon icon='majesticons:eye-line' /></button>
                            <button type='button' onClick={() => setModal({ mode: "edit", id: item.id })} className='bg-success-focus text-success-600 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle border-0'><Icon icon='lucide:edit' /></button>
                            <button type='button' onClick={() => handleDelete(item.id)} className='bg-danger-focus text-danger-600 w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle border-0'><Icon icon='fluent:delete-24-regular' /></button>
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
        <FormModal onClose={() => setModal(null)} size='lg'>
          <CFProductFormLayer
            isEdit={modal.mode === "edit"}
            isView={modal.mode === "view"}
            initialData={modal.id ? rowForId(modal.id) : null}
            vendors={vendors}
            categories={categories}
            services={services}
            onSuccess={() => { setModal(null); load(); }}
            onCancel={() => setModal(null)}
          />
        </FormModal>
      )}
    </div>
  );
};

export default CFProductListLayer;

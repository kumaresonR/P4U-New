import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  deletePopupBanner,
  listPopupBanners,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import FormModal from "../../components/admin/FormModal";
import PopupBannerFormLayer from "./PopupBannerFormLayer";

const PopupBannerListLayer = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listPopupBanners();
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
    if (!q) return items;
    return items.filter(
      (r) =>
        (r.title || "").toLowerCase().includes(q) ||
        ((r.metadata && r.metadata.screenId) || "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const rowForId = (id) => items.find((b) => b.id === id) || null;

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this popup banner?")) return;
    try {
      await deletePopupBanner(id);
      await load();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : String(e));
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
              placeholder='Search Screens...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Icon icon='ion:search-outline' className='icon' />
          </form>
        </div>
        <button type='button' onClick={() => setModal({ mode: "add" })} className='btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2'>
          <Icon icon='ic:baseline-plus' className='icon text-xl line-height-1' />
          Add Popup Banner
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
                  <th scope='col'>S.No</th>
                  <th scope='col'>Title</th>
                  <th scope='col'>Screen</th>
                  <th scope='col'>App Type</th>
                  <th scope='col' className='text-center'>Active</th>
                  <th scope='col'>Image</th>
                  <th scope='col' className='text-center'>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan='7' className='text-center py-4'>No popup banners found.</td>
                  </tr>
                ) : (
                  filtered.map((item, index) => {
                    const meta = item.metadata || {};
                    return (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td className='fw-medium text-primary-light'>{item.title || "—"}</td>
                        <td>{meta.screenId || "—"}</td>
                        <td>
                          {meta.appType ? (
                            <span className={`px-12 py-4 radius-4 fw-medium text-sm ${meta.appType === 'Vendor' ? 'bg-purple-focus text-purple-600' : 'bg-info-focus text-info-600'}`}>
                              {meta.appType}
                            </span>
                          ) : "—"}
                        </td>
                        <td className='text-center'>
                          <span className={`px-12 py-4 radius-4 fw-medium text-sm ${item.isActive !== false ? 'bg-success-focus text-success-600 border border-success-main' : 'bg-danger-focus text-danger-600 border border-danger-main'}`}>
                            {item.isActive !== false ? "Active" : "Deactive"}
                          </span>
                        </td>
                        <td>
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt='Popup Preview'
                              className='w-40-px h-40-px radius-8 object-fit-cover border'
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span className='text-secondary-light'>—</span>
                          )}
                        </td>
                        <td className='text-center'>
                          <div className='d-flex align-items-center gap-10 justify-content-center'>
                            <button type='button' onClick={() => setModal({ mode: "view", id: item.id })} className='bg-info-focus bg-hover-info-200 text-info-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0' title='View'>
                              <Icon icon='majesticons:eye-line' className='icon text-xl' />
                            </button>
                            <button type='button' onClick={() => setModal({ mode: "edit", id: item.id })} className='bg-success-focus text-success-600 bg-hover-success-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0' title='Edit'>
                              <Icon icon='lucide:edit' className='menu-icon' />
                            </button>
                            <button type='button' onClick={() => handleDelete(item.id)} className='remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle' title='Delete'>
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
        <FormModal onClose={() => setModal(null)} size='md'>
          <PopupBannerFormLayer
            isEdit={modal.mode === "edit"}
            isView={modal.mode === "view"}
            initialData={modal.id ? rowForId(modal.id) : null}
            onSuccess={() => { setModal(null); load(); }}
            onCancel={() => setModal(null)}
          />
        </FormModal>
      )}
    </div>
  );
};

export default PopupBannerListLayer;

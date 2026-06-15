import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  listCashSettlements,
  listVendors,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { formatDateTime, formatInrAmount } from "../../lib/formatters";
import FormModal from "../../components/admin/FormModal";
import SettlementFormLayer from "./SettlementFormLayer";

const ListCashLayer = () => {
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sRes, vRes] = await Promise.all([
        listCashSettlements({ limit: 100, offset: 0 }),
        listVendors({ limit: 200, offset: 0 }),
      ]);
      setItems(sRes.items || []);
      setVendors(vRes.items || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const vendorById = useMemo(() => {
    const m = new Map();
    vendors.forEach((v) => m.set(v.id, v));
    return m;
  }, [vendors]);

  const resolveVendor = (row) => {
    const meta = row.metadata || {};
    const v = row.vendorId ? vendorById.get(row.vendorId) : null;
    return {
      name: meta.vendorName || v?.name || v?.businessName || "—",
      mobile: meta.vendorMobile || v?.phone || "—",
    };
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const v = resolveVendor(r);
      return v.name.toLowerCase().includes(q) || v.mobile.toLowerCase().includes(q);
    });
  }, [items, search, vendorById]);

  const rowForId = (id) => items.find((d) => d.id === id) || null;

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
              placeholder='Search...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Icon icon='ion:search-outline' className='icon' />
          </form>
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
                  <th scope='col'>Vendor Name</th>
                  <th scope='col'>Vendor Mobile Number</th>
                  <th scope='col'>Amount</th>
                  <th scope='col'>Date</th>
                  <th scope='col'>Payment Mode</th>
                  <th scope='col'>Transaction ID</th>
                  <th scope='col'>Settlement Type</th>
                  <th scope='col' className='text-center'>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan='9' className='text-center py-4'>No settlements found.</td>
                  </tr>
                ) : (
                  filtered.map((item, index) => {
                    const meta = item.metadata || {};
                    const v = resolveVendor(item);
                    return (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td><span className='text-md mb-0 fw-normal text-secondary-light'>{v.name}</span></td>
                        <td>{v.mobile}</td>
                        <td className='fw-semibold text-success-main'>{formatInrAmount(item.amount)}</td>
                        <td>{formatDateTime(item.createdAt) || "—"}</td>
                        <td>{meta.paymentMode || "—"}</td>
                        <td>{meta.transactionId || "—"}</td>
                        <td>{meta.settlementOwnerType || "Vendors"}</td>
                        <td className='text-center'>
                          <div className='d-flex align-items-center gap-10 justify-content-center'>
                            <button type='button' onClick={() => setModal({ id: item.id })} className='bg-info-focus bg-hover-info-200 text-info-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0' title='View Settlement'>
                              <Icon icon='majesticons:eye-line' className='icon text-xl' />
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
        <FormModal onClose={() => setModal(null)} size='lg'>
          <SettlementFormLayer
            isView
            initialData={rowForId(modal.id)}
            vendors={vendors}
            onCancel={() => setModal(null)}
          />
        </FormModal>
      )}
    </div>
  );
};

export default ListCashLayer;

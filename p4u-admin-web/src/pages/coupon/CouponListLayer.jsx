import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { deleteCoupon, listCoupons } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { formatDateTime, shortJson } from "../../lib/formatters";
import FormModal from "../../components/admin/FormModal";
import CouponFormLayer from "./CouponFormLayer";

export default function CouponListLayer() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listCoupons({ limit, offset });
      setItems(res.items || []);
      setTotal(typeof res.total === "number" ? res.total : 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id) {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      await deleteCoupon(id);
      await load();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : String(e));
    }
  }

  const pageFrom = total === 0 ? 0 : offset + 1;
  const pageTo = offset + items.length;

  return (
    <div className="card h-100 p-0 radius-12">
      <div className="card-header border-bottom bg-base py-16 px-24 p4u-admin-filter-row gap-3 justify-content-between align-items-center">
        <div className="p4u-admin-filter-row align-items-center gap-3">
          <span className="text-md fw-medium text-secondary-light mb-0">Show</span>
          <select
            className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px"
            value={String(limit)}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setOffset(0);
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
        <button type="button" onClick={() => setModal({ mode: "add" })} className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2">
          <Icon icon="ic:baseline-plus" className="icon text-xl line-height-1" />
          Add Coupon
        </button>
      </div>
      <div className="card-body p-24">
        {error && (
          <div className="alert alert-danger radius-12 mb-16" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-secondary-light mb-0">Loading coupons...</p>
        ) : (
          <>
            <div className="table-responsive scroll-sm">
              <table className="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Code</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Discount</th>
                    <th>Valid from</th>
                    <th>Valid to</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4">
                        No coupons found.
                      </td>
                    </tr>
                  ) : (
                    items.map((row, index) => (
                      <tr key={row.id}>
                        <td>{offset + index + 1}</td>
                        <td className="fw-semibold">{row.code || "—"}</td>
                        <td>{row.title || "—"}</td>
                        <td>{row.status || "—"}</td>
                        <td>
                          <span className="text-xs text-secondary-light">{shortJson(row.discountJson)}</span>
                        </td>
                        <td>{formatDateTime(row.validFrom)}</td>
                        <td>{formatDateTime(row.validTo)}</td>
                        <td>
                          <div className="d-flex gap-10 justify-content-center">
                            <button type="button" onClick={() => setModal({ mode: "view", id: row.id })} className="bg-info-focus text-info-600 w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0">
                              <Icon icon="majesticons:eye-line" className="icon text-xl" />
                            </button>
                            <button type="button" onClick={() => setModal({ mode: "edit", id: row.id })} className="bg-success-focus text-success-600 w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0">
                              <Icon icon="lucide:edit" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(row.id)}
                              className="bg-danger-focus text-danger-600 w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0"
                            >
                              <Icon icon="fluent:delete-24-regular" className="icon text-xl" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p4u-admin-filter-row justify-content-between gap-2 mt-24">
              <span className="text-sm">
                Showing {pageFrom} to {pageTo} of {total}
              </span>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary radius-8"
                  disabled={offset <= 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary radius-8"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modal && (
        <FormModal onClose={() => setModal(null)} size="lg">
          <CouponFormLayer
            isEdit={modal.mode === "edit"}
            isView={modal.mode === "view"}
            couponId={modal.id}
            onSuccess={() => { setModal(null); load(); }}
            onCancel={() => setModal(null)}
          />
        </FormModal>
      )}
    </div>
  );
}

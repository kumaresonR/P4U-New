import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import Breadcrumb from "../../components/Breadcrumb";
import { ApiError } from "../../lib/api/client";
import {
  getCatalogService,
  getCustomer,
  getVendor,
  listServiceBookings,
  deleteServiceBooking,
  updateServiceBookingStatus,
} from "../../lib/api/adminApi";

const STATUS_FILTERS = [
  { value: "", label: "All status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

function badge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "bg-success-100 text-success-700";
  if (s === "rejected" || s === "cancelled") return "bg-danger-100 text-danger-700";
  return "bg-warning-100 text-warning-700";
}

function bookingRef(id) {
  const raw = String(id || "").trim();
  if (!raw) return "—";
  return `BKG-${raw.slice(0, 8).toUpperCase()}`;
}

export default function ServiceBookingListLayer() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listServiceBookings({ limit, offset, status: status || undefined });
      const rows = (res?.data?.items ?? res?.items ?? []).map((r) => ({
        ...r,
        date: r.bookingDate ?? r.booking_date ?? "",
        slot: r.timeSlot ?? r.time_slot ?? "",
      }));

      const customerIds = [...new Set(rows.map((r) => String(r.customerId || "").trim()).filter(Boolean))];
      const vendorIds = [...new Set(rows.map((r) => String(r.vendorId || "").trim()).filter(Boolean))];
      const serviceIds = [...new Set(rows.map((r) => String(r.serviceId || "").trim()).filter(Boolean))];

      const [customers, vendors, services] = await Promise.all([
        Promise.all(
          customerIds.map(async (id) => {
            try {
              const c = await getCustomer(id);
              return [id, c?.fullName || c?.name || c?.email || c?.phone || id];
            } catch {
              return [id, id];
            }
          }),
        ),
        Promise.all(
          vendorIds.map(async (id) => {
            try {
              const v = await getVendor(id);
              return [id, v?.businessName || v?.ownerName || id];
            } catch {
              return [id, id];
            }
          }),
        ),
        Promise.all(
          serviceIds.map(async (id) => {
            try {
              const s = await getCatalogService(id);
              return [id, s?.name || id];
            } catch {
              return [id, id];
            }
          }),
        ),
      ]);

      const customerMap = new Map(customers);
      const vendorMap = new Map(vendors);
      const serviceMap = new Map(services);

      const rowsWithNames = rows.map((r) => ({
        ...r,
        customerLabel: customerMap.get(String(r.customerId || "").trim()) || r.customerId || "—",
        vendorLabel: vendorMap.get(String(r.vendorId || "").trim()) || r.vendorId || "—",
        serviceLabel: serviceMap.get(String(r.serviceId || "").trim()) || r.serviceId || "—",
      }));
      setItems(rowsWithNames);
      setTotal(Number(res?.data?.total ?? res?.total ?? rowsWithNames.length));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [limit, offset, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(
    () => items.filter((r) => String(r.status).toLowerCase() === "pending").length,
    [items],
  );

  const review = async (row, nextStatus) => {
    try {
      const updated = await updateServiceBookingStatus(row.id, nextStatus);
      const data = updated?.data ?? updated;
      setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: data.status ?? nextStatus } : r)));
      toast.success(`Booking ${nextStatus}.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const removeBooking = async (row) => {
    if (!window.confirm("Delete this booking permanently? This cannot be undone.")) return;
    try {
      await deleteServiceBooking(row.id);
      setItems((prev) => prev.filter((r) => r.id !== row.id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success("Booking deleted.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div>
      <Breadcrumb title='Service Bookings' />
      <div className='card radius-12'>
        <div className='card-body p-24'>
          <div className='d-flex flex-wrap align-items-center justify-content-between gap-12 mb-20'>
            <div className='d-flex align-items-center gap-8'>
              <span className='badge text-bg-warning'>Pending: {pendingCount}</span>
              <span className='text-secondary-light'>Total: {total}</span>
            </div>
            <select
              className='form-select radius-8 h-40-px'
              style={{ width: 180 }}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setOffset(0);
              }}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {error && <div className='alert alert-danger mb-16'>{error}</div>}
          {loading ? (
            <p className='text-secondary-light mb-0'>Loading bookings...</p>
          ) : (
            <div className='table-responsive scroll-sm'>
              <table className='table bordered-table sm-table mb-0 text-nowrap'>
                <thead>
                  <tr>
                    <th>BOOKING ID</th>
                    <th>CUSTOMER</th>
                    <th>VENDOR</th>
                    <th>SERVICE</th>
                    <th>DATE</th>
                    <th>SLOT</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan='8' className='text-center py-4'>
                        No bookings found.
                      </td>
                    </tr>
                  ) : (
                    items.map((r) => {
                      const st = String(r.status || "").toLowerCase();
                      return (
                        <tr key={r.id}>
                          <td className='fw-semibold'>{bookingRef(r.id)}</td>
                          <td>{r.customerLabel || "—"}</td>
                          <td>{r.vendorLabel || "—"}</td>
                          <td>{r.serviceLabel || "—"}</td>
                          <td>{r.date ? new Date(r.date).toLocaleDateString() : "—"}</td>
                          <td>{r.slot || "—"}</td>
                          <td>
                            <span className={`px-12 py-4 radius-pill text-xs fw-medium ${badge(st)}`}>{st || "pending"}</span>
                          </td>
                          <td>
                            <div className='d-flex align-items-center flex-wrap gap-8'>
                              {st === "pending" && (
                                <>
                                  <button
                                    type='button'
                                    className='btn btn-sm btn-success'
                                    onClick={() => void review(r, "approved")}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type='button'
                                    className='btn btn-sm btn-danger'
                                    onClick={() => void review(r, "rejected")}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                type='button'
                                className='btn btn-sm btn-outline-danger'
                                onClick={() => void removeBooking(r)}
                              >
                                Delete
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

          <div className='d-flex align-items-center justify-content-end gap-8 mt-20'>
            <button
              type='button'
              className='page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 h-32-px text-md d-flex align-items-center justify-content-center'
              disabled={!canPrev}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              <Icon icon='ep:d-arrow-left' />
            </button>
            <button
              type='button'
              className='page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 h-32-px text-md d-flex align-items-center justify-content-center'
              disabled={!canNext}
              onClick={() => setOffset(offset + limit)}
            >
              <Icon icon='ep:d-arrow-right' />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import FormModal from "../../components/admin/FormModal";
import {
  deleteVendorPlan,
  listVendorPlans,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import VendorPlanFormLayer from "./VendorPlanFormLayer";

const formatInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const prettyPlanType = (t) => (String(t || "").toLowerCase() === "vip" ? "VIP" : "Local");
const prettyVisibility = (v) => {
  const s = String(v || "").toLowerCase();
  if (s === "radius") return "Radius Based";
  if (s === "city") return "City";
  if (s === "state") return "State";
  if (s === "country") return "Country";
  return "—";
};

const VendorPlanListLayer = () => {
  const [activeTab, setActiveTab] = useState("local");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listVendorPlans({ limit: 200, offset: 0, includeInactive: true });
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

  const stats = useMemo(() => {
    const localCount = items.filter((i) => i.planType === "local").length;
    const vipCount = items.filter((i) => i.planType === "vip").length;
    return { localCount, vipCount };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((r) => r.planType === activeTab)
      .filter((r) => !q || String(r.planName || "").toLowerCase().includes(q) || String(r.description || "").toLowerCase().includes(q))
      .sort((a, b) => Number(a.tier || 9999) - Number(b.tier || 9999));
  }, [activeTab, items, search]);

  const tabLabel = activeTab === "vip" ? "VIP" : "Local";

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vendor plan?")) return;
    try {
      await deleteVendorPlan(id);
      await load();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : String(e));
    }
  };

  return (
    <>
      <div className='card h-100 p-0 radius-12'>
        <div className='card-body p-24 border-bottom'>
          <h4 className='mb-4'>Vendor Plans</h4>
          <p className='text-secondary-light mb-16'>Configure marketplace vendor plans and pricing</p>
          <ul className='nav nav-pills gap-8 mb-0'>
            <li className='nav-item'>
              <button type='button' className={`nav-link px-20 py-8 radius-8 ${activeTab === "local" ? "bg-primary-600 text-white" : "bg-neutral-100 text-secondary-light"}`} onClick={() => setActiveTab("local")}>
                Local Plans ({stats.localCount})
              </button>
            </li>
            <li className='nav-item'>
              <button type='button' className={`nav-link px-20 py-8 radius-8 ${activeTab === "vip" ? "bg-primary-600 text-white" : "bg-neutral-100 text-secondary-light"}`} onClick={() => setActiveTab("vip")}>
                VIP Plans ({stats.vipCount})
              </button>
            </li>
          </ul>
        </div>

        <div className='card-header border-bottom bg-base py-16 px-24 p4u-admin-filter-row align-items-center gap-3 justify-content-between'>
          <form className='navbar-search' onSubmit={(e) => e.preventDefault()}>
            <input type='text' className='bg-base h-40-px w-auto' placeholder='Search...' value={search} onChange={(e) => setSearch(e.target.value)} />
            <Icon icon='ion:search-outline' className='icon' />
          </form>
          <button type='button' onClick={() => setModal({ mode: "add", planType: activeTab })} className='btn btn-primary text-sm btn-sm px-16 py-12 radius-8 d-flex align-items-center gap-2'>
            <Icon icon='ic:baseline-plus' className='icon text-xl line-height-1' />
            Add {tabLabel} Plan
          </button>
        </div>

        <div className='card-body p-24'>
          {error && <div className='alert alert-danger mb-16'>{error}</div>}
          {loading ? (
            <p className='text-secondary-light mb-0'>Loading...</p>
          ) : (
            <div className='table-responsive scroll-sm'>
              <table className='table bordered-table sm-table mb-0'>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Price</th>
                    <th>Validity</th>
                    <th>Visibility</th>
                    <th>Vendor to P4U Commission</th>
                    <th>Max User Redemption %</th>
                    <th>Payment</th>
                    <th>Promotions</th>
                    <th>Status</th>
                    <th className='text-center'>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan='10' className='text-center py-4'>No plans found.</td></tr>
                  ) : filtered.map((row) => {
                    const promos = [
                      row.promoBannerAds ? "Banner" : null,
                      row.promoVideoAds ? "Video" : null,
                      row.promoPriorityListing ? "Priority" : null,
                    ].filter(Boolean);
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className='fw-semibold'>{row.planName}</div>
                          <small className='text-secondary-light'>{prettyPlanType(row.planType)} · Tier {row.tier}</small>
                        </td>
                        <td>{formatInr(row.price)}</td>
                        <td>{row.validityDays} days</td>
                        <td>{prettyVisibility(row.visibilityType)}{row.visibilityType === "radius" && row.radiusKm ? ` (${row.radiusKm}km)` : ""}</td>
                        <td>{row.commissionPercent}%</td>
                        <td>{row.maxUserRedemptionPercent}%</td>
                        <td className='text-capitalize'>{row.paymentMode || "both"}</td>
                        <td>{promos.length ? promos.join(", ") : "None"}</td>
                        <td>
                          <span className={`px-12 py-4 radius-8 text-sm fw-medium ${row.isActive ? "bg-success-focus text-success-600" : "bg-danger-focus text-danger-600"}`}>
                            {row.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className='text-center'>
                          <div className='d-flex align-items-center gap-8 justify-content-center'>
                            <button type='button' onClick={() => setModal({ mode: "edit", item: row })} className='bg-success-focus text-success-600 bg-hover-success-200 fw-medium px-12 py-8 radius-8 border-0'>Edit</button>
                            <button type='button' onClick={() => handleDelete(row.id)} className='bg-danger-focus text-danger-600 bg-hover-danger-200 fw-medium px-12 py-8 radius-8 border-0'>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className='p4u-admin-filter-row align-items-center justify-content-between gap-2 mt-24'>
            <span>Showing 1-{filtered.length} of {filtered.length}</span>
          </div>
        </div>
      </div>

      {modal && (
        <FormModal onClose={() => setModal(null)} size='md'>
          <VendorPlanFormLayer
            isEdit={modal.mode === "edit"}
            initialData={modal.mode === "edit" ? modal.item : { planType: modal.planType }}
            onSuccess={() => { setModal(null); load(); }}
            onCancel={() => setModal(null)}
          />
        </FormModal>
      )}
    </>
  );
};

export default VendorPlanListLayer;


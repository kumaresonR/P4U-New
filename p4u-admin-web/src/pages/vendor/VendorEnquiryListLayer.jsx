import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link } from "react-router-dom";
import { listVendors, updateVendor, deleteVendor } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { normalizeVendorCategories, categorySlugToLabel } from "../../lib/formatters";
import CountAndChips from "../../components/admin/CountAndChips";

const VendorEnquiryListLayer = () => {
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listVendors({ limit, offset, status: "not_verified" });
      setVendors(res.items || []);
      setTotal(typeof res.total === "number" ? res.total : 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (id) => {
    if (!window.confirm("Verify this vendor?")) return;
    try {
      await updateVendor(id, { status: "active" });
      await load();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : String(e));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vendor?")) return;
    try {
      await deleteVendor(id);
      await load();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : String(e));
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return "—";
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
  };

  const normServices = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : x?.name || x?.slug || "")).filter(Boolean);
    return [];
  };

  const parseAddr = (v) => {
    if (!v) return {};
    if (typeof v === "string") { try { return JSON.parse(v); } catch { return {}; } }
    return v;
  };

  const filtered = search.trim()
    ? vendors.filter((v) => {
        const q = search.toLowerCase();
        return (
          (v.ownerName || "").toLowerCase().includes(q) ||
          (v.businessName || "").toLowerCase().includes(q) ||
          (v.phone || "").includes(q)
        );
      })
    : vendors;

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="card h-100 p-0 radius-12">
      <div className="card-header border-bottom bg-base py-16 px-24 p4u-admin-filter-row align-items-center gap-3 justify-content-between">
        <button className="btn btn-primary text-sm btn-sm px-16 py-8 radius-8">Export with Excel</button>
        <input
          type="text"
          className="form-control radius-8"
          style={{ maxWidth: 320 }}
          placeholder="Search Vendor Request"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="card-body p-24">
        {error && <div className="alert alert-danger radius-12 mb-16" role="alert">{error}</div>}
        {loading ? (
          <p className="text-secondary-light mb-0">Loading vendor requests...</p>
        ) : (
          <>
            <div className="table-responsive scroll-sm">
              <table className="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Name</th>
                    <th scope="col">Business Name</th>
                    <th scope="col">Mobile Number</th>
                    <th scope="col">Categories</th>
                    <th scope="col">Services</th>
                    <th scope="col">City</th>
                    <th scope="col">Pincode</th>
                    <th scope="col" className="text-center">Status</th>
                    <th scope="col" className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((vendor) => {
                      const cats = normalizeVendorCategories(vendor.categoriesJson);
                      const svcs = normServices(vendor.servicesJson);
                      const addr = parseAddr(vendor.addressJson);
                      return (
                        <tr key={vendor.id}>
                          <td>{formatDate(vendor.createdAt)}</td>
                          <td><span className="text-md fw-normal text-secondary-light">{vendor.ownerName || "—"}</span></td>
                          <td><span className="text-md fw-normal text-secondary-light">{vendor.businessName || "—"}</span></td>
                          <td>{vendor.phone || "—"}</td>
                          <td>
                            <CountAndChips
                              strings={cats.map(categorySlugToLabel)}
                              countSuffix="categories"
                            />
                          </td>
                          <td>
                            <CountAndChips strings={svcs} countSuffix="services" />
                          </td>
                          <td>{addr.city || "—"}</td>
                          <td>{addr.pincode || "—"}</td>
                          <td className="text-center">
                            <span className="px-12 py-4 radius-4 fw-medium text-sm bg-danger-600 text-white">Not Verified</span>
                          </td>
                          <td className="text-center">
                            <div className="d-flex align-items-center gap-10 justify-content-center">
                              <button type="button" onClick={() => handleVerify(vendor.id)}
                                className="bg-success-focus bg-hover-success-200 text-success-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0" title="Verify">
                                <Icon icon="mdi:check-circle-outline" className="icon text-xl" />
                              </button>
                              <Link to={`/edit-vendor/${vendor.id}`}
                                className="bg-info-focus bg-hover-info-200 text-info-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle" title="Edit">
                                <Icon icon="lucide:edit" className="menu-icon" />
                              </Link>
                              <button type="button" onClick={() => handleDelete(vendor.id)}
                                className="remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0" title="Delete">
                                <Icon icon="fluent:delete-24-regular" className="menu-icon" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="10" className="text-center py-4">No vendor requests found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p4u-admin-filter-row align-items-center justify-content-between gap-2 mt-24">
              <span>{filtered.length} of {total} entries</span>
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
    </div>
  );
};

export default VendorEnquiryListLayer;

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  listVendorServiceLinks,
  listVendors,
  listCatalogServices,
  updateVendorServiceLink,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { formatDateTime } from "../../lib/formatters";

/** When `embedded` is true, render without outer card (used inside Services page tab). */
const VendorServiceApprovalsLayer = ({ embedded = false }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vendorMap, setVendorMap] = useState({});
  const [serviceMap, setServiceMap] = useState({});

  useEffect(() => {
    Promise.all([
      listVendors({ limit: 200, offset: 0 }),
      listCatalogServices({ limit: 500, offset: 0 }),
    ])
      .then(([vRes, sRes]) => {
        const vm = {};
        (vRes.items || []).forEach((v) => {
          vm[v.id] = v.businessName || v.ownerName || "Vendor";
        });
        const sm = {};
        (sRes.items || []).forEach((s) => {
          sm[s.id] = s.name || "Service";
        });
        setVendorMap(vm);
        setServiceMap(sm);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listVendorServiceLinks({ moderationStatus: "pending" });
      setItems(res.items || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (id) => {
    try {
      await updateVendorServiceLink(id, {
        moderationStatus: "approved",
        isActive: true,
        isAvailable: true,
      });
      toast.success("Service listing approved.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const inner = (
    <>
      {!embedded ? (
        <div className="mb-20">
          <h3 className="fw-bold mb-4">Vendor service approvals</h3>
          <p className="text-secondary-light mb-0">
            New vendor-linked services start as <strong>pending</strong>. Approve them to publish alongside{" "}
            <strong>All Services</strong> in the catalog.
          </p>
        </div>
      ) : (
        <p className="text-secondary-light mb-16">
          Vendor-submitted links to catalog service templates. Approve to publish for customers in the Services catalog.
        </p>
      )}

      <div className="d-flex flex-wrap gap-10 mb-16">
        <button type="button" onClick={() => void load()} className="btn btn-outline-secondary radius-10 d-flex align-items-center gap-8">
          <Icon icon="mdi:refresh" className="text-xl" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-16" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-secondary-light mb-0">Loading pending listings…</p>
      ) : (
        <div className="table-responsive scroll-sm" style={{ overflowX: "auto" }}>
          <table className="table bordered-table sm-table mb-0 text-nowrap" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>VENDOR</th>
                <th>SERVICE</th>
                <th>PRICE (₹)</th>
                <th>UPDATED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((row) => (
                  <tr key={row.id}>
                    <td>{vendorMap[row.vendorId] || row.vendorId || "—"}</td>
                    <td>
                      <span className="fw-semibold text-primary-light">{serviceMap[row.serviceId] || row.serviceId || "—"}</span>
                    </td>
                    <td className="fw-bold">{row.price ?? "—"}</td>
                    <td>{formatDateTime(row.updatedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-success radius-8 px-16 py-6"
                        onClick={() => void handleApprove(row.id)}
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-secondary-light">
                    No vendor service listings are awaiting approval.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  if (embedded) return inner;

  return (
    <div className="card h-100 p-0 radius-16 border-0 shadow-sm">
      <div className="card-body p-24">{inner}</div>
    </div>
  );
};

export default VendorServiceApprovalsLayer;

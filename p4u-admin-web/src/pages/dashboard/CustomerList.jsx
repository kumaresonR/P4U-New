import { useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link } from "react-router-dom";
import { listCustomers, listVendors } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import {
  categorySlugToLabel,
  formatDateTime,
  normalizeVendorCategories,
} from "../../lib/formatters";

const PREVIEW_LIMIT = 5;

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [custRes, vendRes] = await Promise.all([
          listCustomers({ limit: PREVIEW_LIMIT, offset: 0 }),
          listVendors({ limit: PREVIEW_LIMIT, offset: 0 }),
        ]);
        if (!cancelled) {
          setCustomers(custRes.items || []);
          setVendors(vendRes.items || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const customerStatusClass = (status) =>
    String(status || "").toLowerCase() === "active"
      ? "bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm"
      : "bg-warning-focus text-warning-main px-24 py-4 rounded-pill fw-medium text-sm";

  const vendorStatusClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "active") return "bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm";
    if (s === "pending") return "bg-warning-focus text-warning-main px-24 py-4 rounded-pill fw-medium text-sm";
    return "bg-danger-focus text-danger-main px-24 py-4 rounded-pill fw-medium text-sm";
  };

  return (
    <div className='col-12'>
      <div className='card border-0 shadow-sm radius-16 h-100 bg-base'>
        <div className='card-body p-24'>
          <div className='p4u-admin-filter-row align-items-center gap-1 justify-content-between mb-16'>
            <ul
              className='nav border-gradient-tab nav-pills mb-0'
              id='pills-tab'
              role='tablist'
            >
              <li className='nav-item' role='presentation'>
                <button
                  className='nav-link d-flex align-items-center active'
                  id='pills-to-do-list-tab'
                  data-bs-toggle='pill'
                  data-bs-target='#pills-to-do-list'
                  type='button'
                  role='tab'
                  aria-controls='pills-to-do-list'
                  aria-selected='true'
                >
                  Latest Customers
                  <span className='text-sm fw-semibold py-6 px-12 bg-neutral-500 rounded-pill text-white line-height-1 ms-12 notification-alert'>
                    {loading ? "…" : customers.length}
                  </span>
                </button>
              </li>
              <li className='nav-item' role='presentation'>
                <button
                  className='nav-link d-flex align-items-center'
                  id='pills-recent-leads-tab'
                  data-bs-toggle='pill'
                  data-bs-target='#pills-recent-leads'
                  type='button'
                  role='tab'
                  aria-controls='pills-recent-leads'
                  aria-selected='false'
                  tabIndex={-1}
                >
                  Latest Vendors
                  <span className='text-sm fw-semibold py-6 px-12 bg-neutral-500 rounded-pill text-white line-height-1 ms-12 notification-alert'>
                    {loading ? "…" : vendors.length}
                  </span>
                </button>
              </li>
            </ul>
            <div className='p4u-admin-filter-row align-items-center gap-3'>
              <Link
                to='/customers'
                className='text-primary-600 hover-text-primary d-flex align-items-center gap-1 text-sm'
              >
                All customers
                <Icon icon='solar:alt-arrow-right-linear' className='icon' />
              </Link>
              <Link
                to='/product-vendors'
                className='text-primary-600 hover-text-primary d-flex align-items-center gap-1 text-sm'
              >
                All vendors
                <Icon icon='solar:alt-arrow-right-linear' className='icon' />
              </Link>
            </div>
          </div>

          {error && (
            <div className='alert alert-danger radius-12 mb-16 py-12 px-16' role='alert'>
              {error}
            </div>
          )}

          <div className='tab-content' id='pills-tabContent'>
            <div
              className='tab-pane fade show active'
              id='pills-to-do-list'
              role='tabpanel'
              aria-labelledby='pills-to-do-list-tab'
              tabIndex={0}
            >
              <div className='table-responsive scroll-sm'>
                <table className='table bordered-table sm-table mb-0'>
                  <thead>
                    <tr>
                      <th scope='col'>Name</th>
                      <th scope='col'>Registered On</th>
                      <th scope='col'>Type</th>
                      <th scope='col' className='text-center'>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan='4' className='text-center py-4 text-secondary-light'>
                          Loading…
                        </td>
                      </tr>
                    ) : customers.length === 0 ? (
                      <tr>
                        <td colSpan='4' className='text-center py-4 text-secondary-light'>
                          No customers yet.
                        </td>
                      </tr>
                    ) : (
                      customers.map((c) => {
                        const custInitials = (c.fullName || "C")
                          .split(" ")
                          .filter(Boolean)
                          .map((w) => w[0].toUpperCase())
                          .slice(0, 2)
                          .join("");
                        return (
                        <tr key={c.id}>
                          <td>
                            <div className='d-flex align-items-center'>
                              <span
                                className='w-40-px h-40-px rounded-circle flex-shrink-0 me-12 fw-semibold text-white d-flex align-items-center justify-content-center'
                                style={{
                                  fontSize: "14px",
                                  background: `hsl(${((c.fullName || "C").charCodeAt(0) * 37) % 360}, 55%, 50%)`,
                                }}
                              >
                                {custInitials}
                              </span>
                              <div className='flex-grow-1'>
                                <h6 className='text-md mb-0 fw-medium'>{c.fullName || "—"}</h6>
                                <span className='text-sm text-secondary-light fw-medium'>
                                  {c.phone || c.email || "—"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>{formatDateTime(c.createdAt)}</td>
                          <td>Customer</td>
                          <td className='text-center'>
                            <span className={customerStatusClass(c.status)}>{c.status || "—"}</span>
                          </td>
                        </tr>
                      );})
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className='tab-pane fade'
              id='pills-recent-leads'
              role='tabpanel'
              aria-labelledby='pills-recent-leads-tab'
              tabIndex={0}
            >
              <div className='table-responsive scroll-sm'>
                <table className='table bordered-table sm-table mb-0'>
                  <thead>
                    <tr>
                      <th scope='col'>Vendor</th>
                      <th scope='col'>Registered On</th>
                      <th scope='col'>Categories</th>
                      <th scope='col' className='text-center'>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan='4' className='text-center py-4 text-secondary-light'>
                          Loading…
                        </td>
                      </tr>
                    ) : vendors.length === 0 ? (
                      <tr>
                        <td colSpan='4' className='text-center py-4 text-secondary-light'>
                          No vendors yet.
                        </td>
                      </tr>
                    ) : (
                      vendors.map((v) => {
                        const categorySlugs = normalizeVendorCategories(v.categoriesJson);
                        return (
                        <tr key={v.id}>
                          <td>
                            <div className='d-flex align-items-center'>
                              {v.logoUrl ? (
                                <img
                                  src={v.logoUrl}
                                  alt=''
                                  className='w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden'
                                  style={{ objectFit: "cover" }}
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextElementSibling.style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <span
                                className='w-40-px h-40-px rounded-circle flex-shrink-0 me-12 fw-semibold text-white d-flex align-items-center justify-content-center'
                                style={{
                                  display: v.logoUrl ? "none" : "flex",
                                  fontSize: "14px",
                                  background: `hsl(${((v.businessName || v.ownerName || "V").charCodeAt(0) * 37) % 360}, 55%, 50%)`,
                                }}
                              >
                                {(v.businessName || v.ownerName || "V")
                                  .split(" ")
                                  .filter(Boolean)
                                  .map((w) => w[0].toUpperCase())
                                  .slice(0, 2)
                                  .join("")}
                              </span>
                              <div className='flex-grow-1'>
                                <h6 className='text-md mb-0 fw-medium'>{v.businessName || "—"}</h6>
                                <span className='text-sm text-secondary-light fw-medium'>
                                  {v.phone || v.ownerName || "—"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>{formatDateTime(v.createdAt)}</td>
                          <td>
                            {categorySlugs.length === 0 ? (
                              <span className='text-secondary-light'>—</span>
                            ) : (
                              <div className='d-flex flex-wrap gap-1'>
                                {categorySlugs.map((slug, i) => (
                                  <span
                                    key={`${slug}-${i}`}
                                    className='bg-neutral-200 text-secondary-light px-8 py-2 radius-4 text-xs fw-medium'
                                  >
                                    {categorySlugToLabel(slug)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className='text-center'>
                            <span className={vendorStatusClass(v.status)}>{v.status || "—"}</span>
                          </td>
                        </tr>
                      );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerList;

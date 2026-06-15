import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import { deleteProduct, listProducts, listVendors, listCategoriesForProducts, updateProduct } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { formatDateTime } from "../../lib/formatters";
import { resolveAdminProductUnitPrice } from "../../lib/resolveProductPrice";
import FormModal from "../../components/admin/FormModal";
import ProductFormLayer from "./ProductFormLayer";

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

function isPendingModeration(p) {
  return String(p.moderationStatus || "").toLowerCase() === "pending";
}

const ProductListLayer = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [vendorMap, setVendorMap] = useState({});
  const [categoryMap, setCategoryMap] = useState({});
  const [modal, setModal] = useState(null);

  useEffect(() => {
    Promise.all([
      listVendors({ limit: 200, offset: 0 }),
      listCategoriesForProducts({ purpose: "all" }),
    ]).then(([vRes, cRes]) => {
      const vm = {}; (vRes.items || []).forEach((v) => { vm[v.id] = v.businessName || v.ownerName || "Vendor"; });
      const cm = {}; (cRes.items || []).forEach((c) => { cm[c.id] = c.name; });
      setVendorMap(vm);
      setCategoryMap(cm);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listProducts({ limit: 500, offset: 0 });
      setProducts(res.items || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApproveProduct = async (id) => {
    try {
      await updateProduct(id, {
        moderationStatus: "approved",
        isActive: true,
        availability: true,
      });
      toast.success("Product approved and published.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      toast.success("Product deleted.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const pendingMod = isPendingModeration(p);
      if (tab === "pending" && !pendingMod) return false;
      if (tab === "all" && pendingMod) return false;
      if (fromDate) {
        const d = new Date(p.createdAt);
        if (Number.isNaN(d.getTime()) || d < new Date(fromDate)) return false;
      }
      if (toDate) {
        const d = new Date(p.createdAt);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (Number.isNaN(d.getTime()) || d > end) return false;
      }
      if (!q) return true;
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (categoryMap[p.categoryId] || "").toLowerCase().includes(q) ||
        (vendorMap[p.vendorId] || "").toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryMap, vendorMap, tab, fromDate, toDate]);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const pendingApprovalCount = products.filter(isPendingModeration).length;
    const activeCount = products.filter((p) => !isPendingModeration(p) && (p.availability || p.isActive)).length;
    const catalogForAvg = products.filter((p) => !isPendingModeration(p));
    const avgPrice = catalogForAvg.length
      ? Math.round(
          catalogForAvg.reduce((sum, p) => sum + resolveAdminProductUnitPrice(p), 0) / catalogForAvg.length,
        )
      : 0;
    return { totalProducts, activeCount, avgPrice, pendingApprovalCount };
  }, [products]);

  const exportCsv = () => {
    const csvRows = [
      ["ID", "Product", "Vendor", "Price", "Discount", "Status", "Created"],
      ...filtered.map((p) => [
        p.productRef || p.id || "",
        p.name || "",
        vendorMap[p.vendorId] || "",
        resolveAdminProductUnitPrice(p),
        p.discountAmount || "",
        isPendingModeration(p) ? "pending_approval" : (p.availability || p.isActive) ? "active" : "inactive",
        p.createdAt || "",
      ]),
    ];
    const csv = toCsv(csvRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='card h-100 p-0 radius-16 border-0 shadow-sm'>
      <div className='card-body p-24'>
        <div className='mb-20'>
          <h3 className='fw-bold mb-4'>Products</h3>
          <p className='text-secondary-light mb-0'>{stats.totalProducts} rows · {stats.pendingApprovalCount} awaiting catalog approval</p>
        </div>

        <div className='bg-primary-50 radius-12 p-6 d-flex gap-6 mb-16' style={{ maxWidth: 420 }}>
          <button type='button' className={`btn border-0 radius-10 px-20 py-8 ${tab === "pending" ? "bg-white text-primary-600 fw-semibold" : "bg-transparent text-secondary-light"}`} onClick={() => setTab("pending")}>
            Pending Approval
          </button>
          <button type='button' className={`btn border-0 radius-10 px-20 py-8 ${tab === "all" ? "bg-white text-primary-600 fw-semibold" : "bg-transparent text-secondary-light"}`} onClick={() => setTab("all")}>
            All Products
          </button>
        </div>

        <div className='row g-12 mb-16'>
          <MetricCard title='Total (loaded)' value={stats.totalProducts} icon='mdi:package-variant-closed' color='info' />
          <MetricCard title='Pending approval' value={stats.pendingApprovalCount} icon='mdi:clock-outline' color='primary' />
          <MetricCard title='Published & active' value={stats.activeCount} icon='mdi:trending-up' color='success' />
          <MetricCard title='Avg price (published)' value={`₹${stats.avgPrice}`} icon='mdi:currency-inr' color='primary' />
        </div>

        <div className='card radius-12 border-0 mb-16'>
          <div className='card-body p-16 p4u-admin-filter-row gap-10 align-items-center'>
            <div className='input-group radius-10 p4u-filter-search' style={{ minWidth: 160, maxWidth: 300 }}>
              <span className='input-group-text bg-white border-end-0'><Icon icon='mdi:magnify' /></span>
              <input
                type='text'
                className='form-control border-start-0 h-40-px'
                placeholder='Search products...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <input type='date' className='form-control radius-10 h-40-px' value={fromDate} onChange={(e) => setFromDate(e.target.value)} title='From date' />
            <input type='date' className='form-control radius-10 h-40-px' value={toDate} onChange={(e) => setToDate(e.target.value)} title='To date' />
            <div className='p4u-admin-filter-row__end gap-8'>
              <button type='button' onClick={() => setModal({ mode: "add" })} className='btn btn-primary radius-10 px-20 d-flex align-items-center gap-8'>
                <Icon icon='ic:baseline-plus' /> Add Product
              </button>
              <button type='button' onClick={exportCsv} className='btn btn-outline-secondary radius-10 d-flex align-items-center gap-8'>
                <Icon icon='mdi:download-outline' /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {error && <div className='alert alert-danger radius-12 mb-16' role='alert'>{error}</div>}
        {loading ? (
          <p className='text-secondary-light mb-0'>Loading products...</p>
        ) : (
          <div className='table-responsive scroll-sm' style={{ overflowX: "auto" }}>
              <table className='table bordered-table sm-table mb-0 text-nowrap' style={{ minWidth: 980 }}>
                <thead>
                  <tr>
                    <th></th>
                    <th>ID</th>
                    <th>PRODUCT</th>
                    <th>VENDOR</th>
                    <th>PRICE</th>
                    <th>DISCOUNT</th>
                    <th>STATUS</th>
                    <th>CREATED</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((product) => {
                      const price = resolveAdminProductUnitPrice(product);
                      const discount = Number(product.discountAmount || 0) || 0;
                      const pendingMod = isPendingModeration(product);
                      const active = !pendingMod && Boolean(product.availability || product.isActive);
                      const ref = product.productRef || `PRD-${String(product.id || "").slice(-6)}`;
                      return (
                        <tr key={product.id}>
                          <td><span className='w-18-px h-18-px rounded-circle border d-inline-block' /></td>
                          <td>{ref}</td>
                          <td>
                            <div className='fw-semibold text-primary-light'>{product.name || "—"}</div>
                            <div className='text-secondary-light text-sm'>{categoryMap[product.categoryId] || "—"}</div>
                          </td>
                          <td>{vendorMap[product.vendorId] || "—"}</td>
                          <td className='fw-bold'>₹{price}</td>
                          <td>{discount > 0 ? `₹${discount}` : "—"}</td>
                          <td>
                            <span className={`px-12 py-4 rounded-pill text-xs fw-semibold ${
                              pendingMod
                                ? "bg-warning-focus text-warning-main"
                                : active
                                  ? "bg-success-focus text-success-main"
                                  : "bg-neutral-200 text-secondary-light"
                            }`}>
                              {pendingMod ? "Pending approval" : active ? "Published" : "Inactive"}
                            </span>
                          </td>
                          <td>{formatDateTime(product.createdAt)}</td>
                          <td>
                            <div className='d-flex align-items-center gap-10 flex-wrap'>
                              {pendingMod ? (
                                <button
                                  type='button'
                                  onClick={() => void handleApproveProduct(product.id)}
                                  className='btn btn-sm btn-success radius-8 px-12 py-6'
                                  title='Approve and publish to catalog'
                                >
                                  Approve
                                </button>
                              ) : null}
                              <button type='button' onClick={() => setModal({ mode: "view", id: product.id })} className='btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-secondary-light' style={{ width: 36, height: 36 }} title='View'>
                                <Icon icon='majesticons:eye-line' className='text-xl' />
                              </button>
                              <button type='button' onClick={() => setModal({ mode: "edit", id: product.id })} className='btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-secondary-light' style={{ width: 36, height: 36 }} title='Edit'>
                                <Icon icon='lucide:edit' className='text-xl' />
                              </button>
                              <button type='button' onClick={() => handleDelete(product.id)} className='btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-danger-600' style={{ width: 36, height: 36 }} title='Delete'>
                                <Icon icon='fluent:delete-24-regular' className='text-xl' />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan='9' className='text-center py-4'>No products found.</td></tr>
                  )}
                </tbody>
              </table>
          </div>
        )}
      </div>

      {modal && (
        <FormModal onClose={() => setModal(null)} size="xl">
          <ProductFormLayer
            isEdit={modal.mode === "edit"}
            isView={modal.mode === "view"}
            productId={modal.id}
            onSuccess={() => { setModal(null); load(); }}
            onCancel={() => setModal(null)}
          />
        </FormModal>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, icon, color }) => {
  const colors = {
    info: "bg-info-50 text-info-600",
    success: "bg-success-50 text-success-600",
    primary: "bg-primary-50 text-primary-600",
  };
  return (
    <div className='col-sm-6 col-xl-4'>
      <div className='radius-12 p-16 bg-neutral-50 border'>
        <div className='d-flex align-items-center gap-10'>
          <span className={`w-40-px h-40-px rounded-circle d-flex align-items-center justify-content-center ${colors[color]}`}>
            <Icon icon={icon} className='text-xl' />
          </span>
          <div>
            <div className='text-sm text-secondary-light'>{title}</div>
            <h4 className='mb-0 fw-bold'>{value}</h4>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductListLayer;

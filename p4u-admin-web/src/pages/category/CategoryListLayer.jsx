import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  deleteProductCategory,
  deleteProductSubcategory,
  deleteServiceCategory,
  listCatalogServices,
  listProductCategories,
  listProductSubcategories,
  listServiceCategories,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";
import CountAndChips from "../../components/admin/CountAndChips";
import FormModal from "../../components/admin/FormModal";
import CategoryFormLayer from "./CategoryFormLayer";

/**
 * @param {{ variant?: 'service-roots' | 'product-roots' | 'product-subs' }} props
 */
const CategoryListLayer = ({ variant = "service-roots" }) => {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [productRootsForParent, setProductRootsForParent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);

  const isSubTable = variant === "product-subs";
  const isProductRoots = variant === "product-roots";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (variant === "service-roots") {
        const [cRes, sRes] = await Promise.all([
          listServiceCategories({ purpose: "all" }),
          listCatalogServices({ limit: 500, offset: 0 }),
        ]);
        setCategories((cRes.items || []).map((c) => ({ ...c, parentId: null })));
        setServices(sRes.items || []);
        setProductRootsForParent([]);
      } else if (variant === "product-roots") {
        const [rRes, sRes] = await Promise.all([
          listProductCategories({ purpose: "all" }),
          listProductSubcategories({ purpose: "all" }),
        ]);
        const roots = rRes.items || [];
        const subs = sRes.items || [];
        setCategories(roots.map((c) => ({ ...c, parentId: null })));
        setServices(subs);
        setProductRootsForParent(roots);
      } else {
        const [rRes, sRes] = await Promise.all([
          listProductCategories({ purpose: "all" }),
          listProductSubcategories({ purpose: "all" }),
        ]);
        const roots = rRes.items || [];
        const subs = sRes.items || [];
        setCategories(subs.map((s) => ({ ...s, parentId: s.productCategoryId })));
        setServices([]);
        setProductRootsForParent(roots);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [variant]);

  useEffect(() => { load(); }, [load]);

  const servicesByCategory = useMemo(() => {
    const m = {};
    services.forEach((s) => {
      const cid = s.categoryId;
      if (cid) {
        if (!m[cid]) m[cid] = [];
        m[cid].push(s);
      }
    });
    return m;
  }, [services]);

  const subsByParent = useMemo(() => {
    const m = {};
    services.forEach((sub) => {
      const pid = sub.productCategoryId;
      if (!pid) return;
      if (!m[pid]) m[pid] = [];
      m[pid].push(sub);
    });
    return m;
  }, [services]);

  const rootCategories = useMemo(
    () => productRootsForParent.map((c) => ({ id: c.id, name: c.name })),
    [productRootsForParent],
  );

  const parentById = useMemo(() => {
    const m = {};
    productRootsForParent.forEach((c) => { m[c.id] = c; });
    return m;
  }, [productRootsForParent]);

  const pool = useMemo(() => {
    if (variant === "product-subs") return categories.filter((c) => Boolean(c.parentId));
    return categories;
  }, [categories, variant]);

  const filtered = useMemo(() => {
    if (!search.trim()) return pool;
    const q = search.toLowerCase();
    return pool.filter((c) => {
      const linked =
        variant === "service-roots"
          ? (servicesByCategory[c.id] || [])
          : variant === "product-roots"
            ? (subsByParent[c.id] || [])
            : [];
      const parentName = c.parentId ? (parentById[c.parentId]?.name || "") : "";
      return (
        (c.name || "").toLowerCase().includes(q) ||
        parentName.toLowerCase().includes(q) ||
        linked.some((x) => (x.name || "").toLowerCase().includes(q))
      );
    });
  }, [pool, search, servicesByCategory, subsByParent, parentById, variant]);

  const tableColSpan = isSubTable ? 9 : 8;

  const handleDelete = async (id) => {
    const msg =
      variant === "product-subs"
        ? "Delete this subcategory?"
        : variant === "product-roots"
          ? "Delete this product category?"
          : "Delete this service category?";
    if (!window.confirm(msg)) return;
    try {
      if (variant === "service-roots") await deleteServiceCategory(id);
      else if (variant === "product-roots") await deleteProductCategory(id);
      else await deleteProductSubcategory(id);
      await load();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : String(e));
    }
  };

  const availBadge = (val) => val ? "bg-success-600 text-white" : "bg-danger-600 text-white";

  const addLabel =
    variant === "product-subs"
      ? "Add subcategory"
      : variant === "product-roots"
        ? "Add product category"
        : "Add service category";

  const chipsTitle =
    variant === "service-roots" ? "Services" : variant === "product-roots" ? "Subcategories" : null;

  const chipItems = (cat) => {
    if (variant === "service-roots") return servicesByCategory[cat.id] || [];
    if (variant === "product-roots") return subsByParent[cat.id] || [];
    return [];
  };

  const chipSuffix = variant === "service-roots" ? "services" : "subcategories";

  return (
    <div className="card h-100 p-0 radius-12">
      <div className="card-header border-bottom bg-base py-16 px-24 p4u-admin-filter-row align-items-center gap-3 justify-content-between">
        <div className="p4u-admin-filter-row align-items-center gap-3">
          <button className="btn btn-primary text-sm btn-sm px-16 py-8 radius-8">Export with Excel</button>
          <button type="button" onClick={() => setModal({ mode: "add" })} className="btn btn-primary text-sm btn-sm px-12 py-8 radius-8 d-flex align-items-center gap-2">
            <Icon icon="ic:baseline-plus" className="icon text-xl line-height-1" /> {addLabel}
          </button>
        </div>
        <input
          type="text"
          className="form-control radius-8"
          style={{ maxWidth: 320 }}
          placeholder={isSubTable ? "Search subcategories or parent" : "Search categories"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="card-body p-24">
        {error && <div className="alert alert-danger radius-12 mb-16" role="alert">{error}</div>}
        {loading ? (
          <p className="text-secondary-light mb-0">Loading categories...</p>
        ) : (
          <>
            <div className="table-responsive scroll-sm">
              <table className="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th scope="col">S.No</th>
                    <th scope="col">Name</th>
                    {isSubTable && <th scope="col">Parent category</th>}
                    <th scope="col">{variant === "product-subs" || variant === "product-roots" ? "Image" : "Icon"}</th>
                    {chipsTitle && <th scope="col">{chipsTitle}</th>}
                    <th scope="col" className="text-center">Availability</th>
                    <th scope="col" className="text-center">Trending</th>
                    <th scope="col" className="text-center">Verification Status</th>
                    <th scope="col" className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((cat, index) => {
                      const chips = chipItems(cat);
                      return (
                        <tr key={cat.id}>
                          <td>{index + 1}</td>
                          <td><span className="text-md fw-normal text-secondary-light">{cat.name || "—"}</span></td>
                          {isSubTable && (
                            <td>
                              <span className="text-md fw-normal text-secondary-light">
                                {cat.parentId ? (parentById[cat.parentId]?.name || "—") : "—"}
                              </span>
                            </td>
                          )}
                          <td>
                            {variant === "service-roots" ? (
                              (cat.iconUrl || cat.thumbnailUrl) ? (
                                <img src={resolveMediaUrl(cat.iconUrl || cat.thumbnailUrl)} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} onError={(e) => { e.target.style.display = "none"; }} />
                              ) : (
                                <span className="text-secondary-light">—</span>
                              )
                            ) : cat.thumbnailUrl ? (
                              <img src={resolveMediaUrl(cat.thumbnailUrl)} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} onError={(e) => { e.target.style.display = "none"; }} />
                            ) : (
                              <span className="text-secondary-light">—</span>
                            )}
                          </td>
                          {chipsTitle && (
                            <td>
                              <CountAndChips
                                items={chips}
                                getLabel={(s) => s.name}
                                getKey={(s) => s.id}
                                countSuffix={chipSuffix}
                              />
                            </td>
                          )}
                          <td className="text-center">
                            <span className={`px-12 py-4 radius-4 fw-medium text-sm ${availBadge(cat.availability)}`}>
                              {cat.availability ? "Active" : "Deactive"}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className={`px-12 py-4 radius-4 fw-medium text-sm ${cat.trending ? "bg-success-600 text-white" : "bg-danger-600 text-white"}`}>
                              {cat.trending ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="px-12 py-4 radius-4 fw-medium text-sm bg-success-600 text-white">VERIFIED</span>
                          </td>
                          <td className="text-center">
                            <div className="d-flex align-items-center gap-10 justify-content-center">
                              <button type="button" onClick={() => setModal({ mode: "view", id: cat.id })} className="bg-info-focus bg-hover-info-200 text-info-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0" title="View">
                                <Icon icon="majesticons:eye-line" className="icon text-xl" />
                              </button>
                              <button type="button" onClick={() => setModal({ mode: "edit", id: cat.id })} className="bg-success-focus text-success-600 bg-hover-success-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0" title="Edit">
                                <Icon icon="lucide:edit" className="menu-icon" />
                              </button>
                              <button type="button" onClick={() => handleDelete(cat.id)} className="remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle border-0" title="Delete">
                                <Icon icon="fluent:delete-24-regular" className="menu-icon" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={tableColSpan} className="text-center py-4">No categories found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p4u-admin-filter-row align-items-center justify-content-between gap-2 mt-24">
              <span>{filtered.length} categor{filtered.length === 1 ? "y" : "ies"}</span>
            </div>
          </>
        )}
      </div>

      {modal && (
        <FormModal onClose={() => setModal(null)} size="lg">
          <CategoryFormLayer
            isEdit={modal.mode === "edit"}
            isView={modal.mode === "view"}
            categoryId={modal.id}
            variant={variant}
            scope={isSubTable ? "subcategory" : "root"}
            rootCategories={rootCategories}
            onSuccess={() => { setModal(null); load(); }}
            onCancel={() => setModal(null)}
          />
        </FormModal>
      )}
    </div>
  );
};

export default CategoryListLayer;

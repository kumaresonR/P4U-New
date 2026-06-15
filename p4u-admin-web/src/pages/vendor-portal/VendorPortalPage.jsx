import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  getMyVendorPlan,
  listMySettlements,
  listProducts,
  listCategoriesForProducts,
  setVendorCategoryOverride,
  setVendorProductOverride,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const TabBtn = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`btn border-0 radius-10 px-20 py-8 ${active ? "bg-white text-primary-600 fw-semibold" : "bg-transparent text-neutral-600"}`}
  >
    {label}
  </button>
);

export default function VendorPortalPage() {
  const [tab, setTab] = useState("plan");
  const [planInfo, setPlanInfo] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [plan, sett, cats, prods] = await Promise.all([
          getMyVendorPlan().catch(() => null),
          listMySettlements({ limit: 50, offset: 0 }).catch(() => ({ items: [] })),
          listCategoriesForProducts({ purpose: "all" }).catch(() => ({ items: [] })),
          listProducts({ limit: 200, offset: 0 }).catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        setPlanInfo(plan);
        setSettlements(Array.isArray(sett?.items) ? sett.items : []);
        setCategories(Array.isArray(cats?.items) ? cats.items : []);
        const myVendorId = plan?.vendor?.id;
        const allProds = Array.isArray(prods?.items) ? prods.items : [];
        setProducts(myVendorId ? allProds.filter((p) => p.vendorId === myVendorId) : allProds);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof ApiError ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const myVendorId = planInfo?.vendor?.id;

  const persistCategoryOverride = async (cat, raw) => {
    const value = raw === "" ? null : Number(raw);
    setSavingId(`cat:${cat.id}`);
    try {
      const updated = await setVendorCategoryOverride(cat.id, value);
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, metadata: updated.metadata } : c)));
      toast.success("Category override saved");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSavingId("");
    }
  };

  const persistProductOverride = async (prod, raw) => {
    const value = raw === "" ? null : Number(raw);
    setSavingId(`prod:${prod.id}`);
    try {
      const updated = await setVendorProductOverride(prod.id, value);
      setProducts((prev) => prev.map((p) => (p.id === prod.id ? { ...p, commissionOverridePercent: updated.commissionOverridePercent } : p)));
      toast.success("Product override saved");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="card p-0 radius-16 border-0">
      <div className="card-body p-20">
        <div className="d-flex align-items-center gap-12 mb-16">
          <span className="w-48-px h-48-px rounded-3 bg-primary-100 text-primary-700 d-flex align-items-center justify-content-center">
            <Icon icon="mdi:storefront-outline" className="text-xl" />
          </span>
          <div>
            <h4 className="mb-0">Vendor Portal</h4>
            <p className="text-secondary-light mb-0 text-sm">Your plan, payouts and commission overrides</p>
          </div>
        </div>

        {loadError && <div className="alert alert-danger radius-12 mb-16">{loadError}</div>}

        <div className="d-flex gap-6 bg-primary-50 radius-12 p-6 mb-16" style={{ width: "fit-content" }}>
          <TabBtn active={tab === "plan"} label="My Plan" onClick={() => setTab("plan")} />
          <TabBtn active={tab === "settlements"} label="Settlements" onClick={() => setTab("settlements")} />
          <TabBtn active={tab === "category-override"} label="Category Override" onClick={() => setTab("category-override")} />
          <TabBtn active={tab === "product-override"} label="Product Override" onClick={() => setTab("product-override")} />
        </div>

        {tab === "plan" && (
          <section className="bg-primary-25 radius-12 p-14">
            {planInfo ? (
              <div className="row g-12">
                <Info col="col-md-4" label="Vendor" value={planInfo.vendor?.businessName || "—"} />
                <Info col="col-md-4" label="Plan" value={planInfo.plan?.planName || "— No plan —"} />
                <Info col="col-md-4" label="Plan tier" value={planInfo.plan?.tier ?? "—"} />
                <Info col="col-md-4" label="Plan type" value={planInfo.plan?.planType || "—"} />
                <Info col="col-md-4" label="Effective commission %" value={`${planInfo.effective?.commissionPercent ?? "0"}%`} />
                <Info col="col-md-4" label="Effective max redemption %" value={`${planInfo.effective?.maxRedemptionPercent ?? "0"}%`} />
                <Info col="col-md-4" label="Coverage radius (km)" value={planInfo.vendor?.coverageRadiusKm ?? planInfo.plan?.radiusKm ?? "—"} />
                <Info col="col-md-4" label="Restriction zone" value={planInfo.vendor?.restriction || "—"} />
                <Info col="col-md-4" label="Self delivery" value={planInfo.vendor?.selfDelivery ? "Yes" : "No"} />
              </div>
            ) : (
              <p className="mb-0 text-secondary-light">Loading plan…</p>
            )}
          </section>
        )}

        {tab === "settlements" && (
          <section className="bg-primary-25 radius-12 p-14">
            {settlements.length === 0 ? (
              <p className="mb-0 text-secondary-light">No settlements yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order Ref</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s) => (
                      <tr key={s.id}>
                        <td>{s.metadata?.orderRef || s.orderId || "—"}</td>
                        <td>{s.settlementType}</td>
                        <td><span className="badge bg-primary-50 text-primary-700">{s.status}</span></td>
                        <td>₹{s.amount}</td>
                        <td>{new Date(s.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === "category-override" && (
          <section className="bg-primary-25 radius-12 p-14">
            <p className="text-sm text-secondary-light mb-12">
              Set a per-category commission % that applies to your products in that category. Beats vendor + plan, beaten by per-product override.
            </p>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Global override</th>
                    <th>Your override</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => {
                    const myOverride = c.metadata?.vendorOverrides?.[myVendorId] ?? "";
                    return <CategoryRow key={c.id} cat={c} myOverride={String(myOverride)} saving={savingId === `cat:${c.id}`} onSave={persistCategoryOverride} />;
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "product-override" && (
          <section className="bg-primary-25 radius-12 p-14">
            <p className="text-sm text-secondary-light mb-12">
              Set a commission % override for a specific product (yours only). Most-specific wins in the resolver chain.
            </p>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Override %</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <ProductRow key={p.id} prod={p} saving={savingId === `prod:${p.id}`} onSave={persistProductOverride} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const Info = ({ col, label, value }) => (
  <div className={col}>
    <p className="text-secondary-light text-xs mb-2">{label}</p>
    <p className="fw-semibold mb-0">{value}</p>
  </div>
);

function CategoryRow({ cat, myOverride, saving, onSave }) {
  const [val, setVal] = React.useState(myOverride || "");
  React.useEffect(() => { setVal(myOverride || ""); }, [myOverride]);
  return (
    <tr>
      <td>{cat.name}</td>
      <td>{cat.commissionOverridePercent != null ? `${cat.commissionOverridePercent}%` : "—"}</td>
      <td><input type="number" min="0" max="100" step="0.01" className="form-control radius-10" value={val} onChange={(e) => setVal(e.target.value)} placeholder="blank = none" /></td>
      <td><button type="button" className="btn btn-primary radius-10 px-12 py-6" disabled={saving} onClick={() => onSave(cat, val)}>{saving ? "Saving…" : "Save"}</button></td>
    </tr>
  );
}

function ProductRow({ prod, saving, onSave }) {
  const [val, setVal] = React.useState(prod.commissionOverridePercent != null ? String(prod.commissionOverridePercent) : "");
  React.useEffect(() => {
    setVal(prod.commissionOverridePercent != null ? String(prod.commissionOverridePercent) : "");
  }, [prod.commissionOverridePercent]);
  return (
    <tr>
      <td>{prod.name}</td>
      <td><input type="number" min="0" max="100" step="0.01" className="form-control radius-10" value={val} onChange={(e) => setVal(e.target.value)} placeholder="blank = none" /></td>
      <td><button type="button" className="btn btn-primary radius-10 px-12 py-6" disabled={saving} onClick={() => onSave(prod, val)}>{saving ? "Saving…" : "Save"}</button></td>
    </tr>
  );
}

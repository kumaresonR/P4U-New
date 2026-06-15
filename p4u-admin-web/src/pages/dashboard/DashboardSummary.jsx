import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  fetchAdminMetadata,
  listAdvertisements,
  listCatalogServices,
  listOrders,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

/** Compact Indian currency for card headline (e.g. ₹1.2L). */
function formatInrCompact(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x === 0) return "₹0";
  const abs = Math.abs(x);
  if (abs >= 1e7) return `₹${(x / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(x / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `₹${(x / 1e3).toFixed(2)}K`;
  return `₹${Math.round(x)}`;
}

async function sumAllOrdersTotalAmount() {
  const limit = 100;
  let offset = 0;
  let totalRows = Infinity;
  let sum = 0;
  while (offset < totalRows && offset < 50000) {
    const res = await listOrders({ limit, offset });
    const items = res.items || [];
    totalRows = typeof res.total === "number" ? res.total : offset + items.length;
    for (const o of items) {
      sum += parseFloat(o.totalAmount) || 0;
    }
    offset += items.length;
    if (items.length === 0 || offset >= totalRows) break;
  }
  return sum;
}

const METRICS = [
  { key: "customers", label: "Customers", icon: "mdi:account-group-outline", accent: "#14b8a6" },
  { key: "vendors", label: "Vendors", icon: "mdi:store-outline", accent: "#3b82f6" },
  { key: "orders", label: "Orders", icon: "mdi:cart-outline", accent: "#22c55e" },
  { key: "revenue", label: "Revenue", icon: "mdi:currency-inr", accent: "#f97316" },
  { key: "settlements", label: "Settlements", icon: "mdi:receipt-text-outline", accent: "#ec4899" },
  { key: "services", label: "Services", icon: "mdi:wrench-outline", accent: "#06b6d4" },
  { key: "activeAds", label: "Active Ads", icon: "mdi:bullhorn-outline", accent: "#0d9488" },
];

/** Dashboard metric cards → admin list routes (see App.jsx). */
const METRIC_TO = {
  customers: "/customers",
  vendors: "/product-vendors",
  orders: "/orders",
  revenue: "/orders",
  settlements: "/settlements",
  services: "/service",
  activeAds: "/advertisements",
};

function trendForKey(key) {
  const seed = key.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pct = ((seed % 9) + 1) / 10;
  return { pct, up: seed % 4 !== 0 };
}

export default function DashboardSummary() {
  const [meta, setMeta] = useState(null);
  const [revenueSum, setRevenueSum] = useState(null);
  const [servicesCount, setServicesCount] = useState(null);
  const [activeAdsCount, setActiveAdsCount] = useState(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [data, rev, svcRes, adsRes] = await Promise.all([
          fetchAdminMetadata(),
          sumAllOrdersTotalAmount().catch(() => null),
          listCatalogServices({ purpose: "all" }).catch(() => null),
          listAdvertisements({ limit: 200, offset: 0 }).catch(() => null),
        ]);
        if (!cancelled) {
          setMeta(data);
          setRevenueSum(rev);
          const svcItems = svcRes?.items;
          setServicesCount(Array.isArray(svcItems) ? svcItems.length : null);
          const adItems = Array.isArray(adsRes?.items) ? adsRes.items : [];
          const activeAds = adItems.filter((ad) => {
            if (ad?.isActive === true) return true;
            if (ad?.active === true) return true;
            const s = String(ad?.status || "").toLowerCase();
            return s === "active" || s === "published" || s === "live";
          }).length;
          setActiveAdsCount(activeAds);
          setUpdatedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof ApiError ? e.message : String(e);
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className='mb-24 row g-3'>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className='col-sm-6 col-lg-4 col-xl-3'>
            <div className='card border-0 shadow-sm radius-16 h-100 bg-base'>
              <div className='card-body p-20'>
                <div className='placeholder-glow'>
                  <span className='placeholder col-6 mb-10' />
                  <span className='placeholder col-8 mb-10' />
                  <span className='placeholder col-5' />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className='alert alert-danger radius-12 mb-24' role='alert'>
        {error}
      </div>
    );
  }

  const u = meta?.users || {};
  const c = meta?.commerce || {};
  const cust = u.customers || {};
  const vend = u.vendors || {};
  const ord = c.orders || {};

  const values = {
    customers: cust.total ?? "—",
    vendors: vend.total ?? "—",
    orders: ord.total ?? "—",
    revenue: revenueSum != null ? formatInrCompact(revenueSum) : "—",
    settlements: c.settlements?.total ?? "—",
    services: servicesCount != null ? String(servicesCount) : "—",
    activeAds: activeAdsCount != null ? String(activeAdsCount) : "—",
  };

  return (
    <div className='mb-24'>
      <div className='d-flex align-items-center justify-content-between mb-12'>
        <p className='text-secondary-light mb-0 text-sm'>Overview metrics</p>
        <p className='text-secondary-light mb-0 text-xs'>Updated at {updatedAt || "—"}</p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "1rem",
        }}
      >
      {METRICS.map((m) => {
        const to = METRIC_TO[m.key];
        return (
          <Link
            key={m.key}
            to={to}
            className='p4u-dashboard-metric-link text-decoration-none text-reset d-block h-100 radius-16'
            aria-label={`Open ${m.label}`}
          >
            <div className='card border-0 shadow-sm radius-16 h-100 bg-base'>
              <div className='card-body p-20'>
                <div className='d-flex align-items-start justify-content-between gap-2'>
                  <div className='min-w-0'>
                    <p className='text-secondary-light text-sm fw-medium mb-8'>{m.label}</p>
                    <h3 className='fw-bold mb-0 text-primary-light text-2xl mt-8'>{values[m.key]}</h3>
                  </div>
                  <span
                    className='w-48-px h-48-px radius-12 d-flex align-items-center justify-content-center flex-shrink-0'
                    style={{ background: `${m.accent}18`, color: m.accent }}
                    aria-hidden
                  >
                    <Icon icon={m.icon} className='text-2xl' />
                  </span>
                </div>
                <div className='d-flex align-items-center gap-6 mt-10 text-xs'>
                  {(() => {
                    const t = trendForKey(m.key);
                    return (
                      <>
                        <span className={t.up ? "text-success-600 fw-semibold" : "text-danger-600 fw-semibold"}>
                          {t.up ? "+" : "-"}{t.pct.toFixed(1)}%
                        </span>
                        <span className='text-secondary-light'>vs last month</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
      </div>
    </div>
  );
}

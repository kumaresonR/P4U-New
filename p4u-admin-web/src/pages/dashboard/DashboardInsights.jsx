import { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { getCustomer, listOrders, listVendors } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const PREVIEW_ORDERS = 5;

function parseMeta(m) {
  if (m == null) return {};
  if (typeof m === "string") {
    try {
      return JSON.parse(m) || {};
    } catch {
      return {};
    }
  }
  return typeof m === "object" && !Array.isArray(m) ? m : {};
}

function statusPill(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "bg-success-focus text-success-main";
  if (s === "delivered") return "bg-success-focus text-success-main";
  if (s === "cancelled" || s === "canceled") return "bg-danger-focus text-danger-main";
  if (s === "paid") return "bg-info-focus text-info-main";
  if (s === "accepted" || s === "in_progress") return "bg-warning-focus text-warning-main";
  return "bg-warning-focus text-warning-main";
}

function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (!s) return "Placed";
  if (s === "completed") return "Completed";
  if (s === "delivered") return "Delivered";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatInr(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function DashboardInsights() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [vendorMap, setVendorMap] = useState({});
  const [customerById, setCustomerById] = useState({});
  const [updatedAt, setUpdatedAt] = useState("");
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const sync = () => setIsCompact(window.innerWidth < 768);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [ordersRes, vendorsRes] = await Promise.all([
          listOrders({ limit: 200, offset: 0 }),
          listVendors({ limit: 200, offset: 0 }),
        ]);
        if (cancelled) return;

        const orderItems = Array.isArray(ordersRes?.items) ? ordersRes.items : [];
        const sortedOrders = [...orderItems].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
        );
        setOrders(sortedOrders);

        const vendors = Array.isArray(vendorsRes?.items) ? vendorsRes.items : [];
        const vMap = {};
        vendors.forEach((v) => {
          vMap[v.id] = v.businessName || v.ownerName || "Unknown vendor";
        });
        setVendorMap(vMap);

        const preview = sortedOrders.slice(0, PREVIEW_ORDERS);
        const ids = [...new Set(preview.map((o) => o.customerId).filter(Boolean))];
        const pairs = await Promise.all(
          ids.map(async (id) => {
            try {
              const c = await getCustomer(id);
              return [id, c ? { fullName: c.fullName ?? c.full_name ?? "" } : null];
            } catch {
              return [id, null];
            }
          }),
        );
        if (!cancelled) {
          setCustomerById(Object.fromEntries(pairs));
          setUpdatedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
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

  const recentOrders = useMemo(() => orders.slice(0, PREVIEW_ORDERS), [orders]);

  const topVendors = useMemo(() => {
    const agg = new Map();
    orders.forEach((o) => {
      if (!o.vendorId) return;
      const prev = agg.get(o.vendorId) || 0;
      agg.set(o.vendorId, prev + (Number(o.totalAmount) || 0));
    });
    return [...agg.entries()]
      .map(([vendorId, revenue]) => ({
        vendorId,
        name: vendorMap[vendorId] || "Unknown vendor",
        revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders, vendorMap]);

  const vendorChartSeries = useMemo(
    () => [{ name: "Revenue", data: topVendors.map((v) => Number(v.revenue.toFixed(2))) }],
    [topVendors],
  );

  const vendorChartOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4,
          barHeight: "45%",
        },
      },
      dataLabels: { enabled: false },
      colors: ["#4f46e5"],
      xaxis: {
        categories: topVendors.map((v) => v.name),
        labels: {
          formatter: (v) => `₹${Math.round(v / 1000)}k`,
        },
      },
      tooltip: {
        y: {
          formatter: (v) => formatInr(v),
        },
      },
      grid: {
        borderColor: "#e5e7eb",
        strokeDashArray: 4,
      },
    }),
    [topVendors],
  );

  return (
    <section className='row g-4'>
      <div className='col-12 col-xl-6'>
        <div className='card border-0 shadow-sm radius-16 h-100 bg-base'>
          <div className='card-body p-24'>
            <h5 className='fw-bold text-primary-light mb-20'>Recent Orders</h5>
            <p className='text-secondary-light text-sm mb-12'>Most recent order activity · updated {updatedAt || "—"}</p>
            {error && (
              <div className='alert alert-warning radius-12 py-12 px-16 mb-0' role='status'>
                {error}
              </div>
            )}
            {!error && loading && (
              <div className='placeholder-glow py-2'>
                {Array.from({ length: 4 }).map((_, i) => (
                  <span key={i} className='placeholder col-12 mb-10' style={{ height: 22 }} />
                ))}
              </div>
            )}
            {!error && !loading && recentOrders.length === 0 && (
              <div className='text-secondary-light py-4'>No recent orders found.</div>
            )}
            {!error && !loading && recentOrders.length > 0 && (
              <div className='d-flex flex-column gap-20'>
                {recentOrders.map((o) => {
                  const m = parseMeta(o.metadata);
                  const customerName =
                    m.customerName ||
                    m.customer_name ||
                    (o.customerId ? customerById[o.customerId]?.fullName : "") ||
                    "Unknown customer";
                  const vendorName = vendorMap[o.vendorId] || "Unknown vendor";
                  return (
                  <div key={o.id} className={`d-flex justify-content-between gap-3 p-8 radius-8 hover-bg-neutral-50 ${isCompact ? "flex-column align-items-start" : "align-items-center"}`}>
                      <div className='min-w-0 w-100'>
                        <h6 className='mb-4 fw-semibold text-primary-light text-truncate'>{customerName}</h6>
                        <p className='text-secondary-light mb-0 text-md text-truncate'>
                          {(o.orderRef || o.id || "—")} · {vendorName}
                        </p>
                      </div>
                      <div className={`d-flex align-items-center gap-12 ${isCompact ? "w-100 justify-content-between" : "flex-shrink-0"}`}>
                        <span className={`px-12 py-4 rounded-pill fw-medium text-sm ${statusPill(o.status)}`}>
                          {statusLabel(o.status)}
                        </span>
                        <span className='fw-bold text-primary-light'>{formatInr(o.totalAmount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='col-12 col-xl-6'>
        <div className='card border-0 shadow-sm radius-16 h-100 bg-base'>
          <div className='card-body p-24'>
            <h5 className='fw-bold text-primary-light mb-16'>Top Vendors</h5>
            <p className='text-secondary-light text-sm mb-12'>Ranked by recent revenue contribution</p>
            {error && (
              <div className='alert alert-warning radius-12 py-12 px-16 mb-0' role='status'>
                {error}
              </div>
            )}
            {!error && loading && (
              <div className='placeholder-glow py-2'>
                <span className='placeholder col-12' style={{ height: 240 }} />
              </div>
            )}
            {!error && !loading && topVendors.length === 0 && (
              <div className='text-secondary-light py-4'>No vendor performance data yet.</div>
            )}
            {!error && !loading && topVendors.length > 0 && (
              <ReactApexChart options={vendorChartOptions} series={vendorChartSeries} type='bar' height={isCompact ? 240 : 300} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

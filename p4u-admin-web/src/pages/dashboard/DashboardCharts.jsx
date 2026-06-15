import { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { listCategoriesForProducts, listOrders, listProducts } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";

const DONUT_COLORS = ["#8b5cf6", "#db2777", "#38bdf8", "#22c55e", "#f97316", "#6366f1", "#14b8a6"];

function lastNDatesIso(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function formatInrAxis(val) {
  const v = Number(val);
  if (!Number.isFinite(v)) return "₹0";
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${Math.round(v)}`;
}

async function aggregateRevenueByDay() {
  const days = lastNDatesIso(7);
  const byDay = Object.fromEntries(days.map((d) => [d, 0]));
  const limit = 100;
  let offset = 0;
  let totalRows = Infinity;
  const maxScan = 4000;

  while (offset < totalRows && offset < maxScan) {
    const res = await listOrders({ limit, offset });
    const items = res.items || [];
    totalRows = typeof res.total === "number" ? res.total : offset + items.length;
    for (const o of items) {
      const day = (o.createdAt || "").slice(0, 10);
      if (day in byDay) {
        byDay[day] += parseFloat(o.totalAmount) || 0;
      }
    }
    offset += items.length;
    if (items.length === 0 || offset >= totalRows) break;
  }

  return { categories: days.map((d) => d.slice(5).replace("-", "-")), data: days.map((d) => byDay[d]) };
}

async function aggregateProductsByCategory() {
  const catRes = await listCategoriesForProducts({ purpose: "all" });
  const catItems = catRes?.items || [];
  const idToName = new Map(catItems.map((c) => [c.id, c.name || c.title || "Category"]));

  const counts = new Map();
  const limit = 100;
  let offset = 0;
  let totalRows = Infinity;
  const maxScan = 3000;

  while (offset < totalRows && offset < maxScan) {
    const res = await listProducts({ limit, offset });
    const items = res.items || [];
    totalRows = typeof res.total === "number" ? res.total : offset + items.length;
    for (const p of items) {
      const cid = p.categoryId || "__none__";
      counts.set(cid, (counts.get(cid) || 0) + 1);
    }
    offset += items.length;
    if (items.length === 0 || offset >= totalRows) break;
  }

  const rows = [...counts.entries()]
    .map(([id, n]) => ({
      name: id === "__none__" ? "Uncategorized" : idToName.get(id) || "Other",
      value: n,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return rows;
}

export default function DashboardCharts() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revenue, setRevenue] = useState({ categories: [], data: [] });
  const [categoryRows, setCategoryRows] = useState([]);
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
        const [rev, cats] = await Promise.all([aggregateRevenueByDay(), aggregateProductsByCategory()]);
        if (!cancelled) {
          setRevenue(rev);
          setCategoryRows(cats);
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

  const lineSeries = useMemo(
    () => [{ name: "Revenue", data: revenue.data.length ? revenue.data : [0, 0, 0, 0, 0, 0, 0] }],
    [revenue.data],
  );

  const lineOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "inherit",
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3, colors: ["#8b5cf6"] },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 90, 100],
          colorStops: [
            { offset: 0, color: "#a78bfa", opacity: 0.5 },
            { offset: 100, color: "#a78bfa", opacity: 0.02 },
          ],
        },
      },
      colors: ["#8b5cf6"],
      xaxis: {
        categories: revenue.categories.length ? revenue.categories : ["—", "—", "—", "—", "—", "—", "—"],
        labels: { style: { fontSize: "12px" } },
        axisBorder: { show: false },
      },
      yaxis: {
        labels: {
          formatter: (v) => formatInrAxis(v),
          style: { fontSize: "12px" },
        },
      },
      grid: {
        borderColor: "#e5e7eb",
        strokeDashArray: 4,
      },
      tooltip: {
        y: {
          formatter: (v) => formatInrAxis(v),
        },
      },
    }),
    [revenue.categories],
  );

  const donutSeries = useMemo(() => categoryRows.map((r) => r.value), [categoryRows]);
  const donutLabels = useMemo(() => categoryRows.map((r) => r.name), [categoryRows]);

  const donutOptions = useMemo(
    () => ({
      chart: { fontFamily: "inherit" },
      labels: donutLabels.length ? donutLabels : ["No data"],
      colors: DONUT_COLORS,
      legend: {
        position: "bottom",
        fontSize: "12px",
        markers: { size: 8 },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Products",
                formatter: () =>
                  donutSeries.length ? String(donutSeries.reduce((a, b) => a + b, 0)) : "0",
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
    }),
    [donutLabels, donutSeries],
  );

  const hasCategoryData = donutSeries.length > 0;

  return (
    <section className='row g-4 mb-24'>
      <div className='col-12 col-xl-7'>
        <div className='card border-0 shadow-sm radius-16 h-100 bg-base'>
          <div className='card-body p-24'>
            <h5 className='fw-bold text-primary-light mb-16'>Revenue Trend</h5>
            <p className='text-secondary-light text-sm mb-12'>Last 7 days · updated {updatedAt || "—"}</p>
            {error && (
              <div className='alert alert-warning radius-12 py-12 px-16 mb-0' role='status'>
                {error}
              </div>
            )}
            {!error && loading && (
              <div className='placeholder-glow py-5'>
                <span className='placeholder col-12' style={{ height: 220 }} />
              </div>
            )}
            {!error && !loading && (
              <ReactApexChart options={lineOptions} series={lineSeries} type='area' height={isCompact ? 240 : 300} />
            )}
          </div>
        </div>
      </div>
      <div className='col-12 col-xl-5'>
        <div className='card border-0 shadow-sm radius-16 h-100 bg-base'>
          <div className='card-body p-24'>
            <h5 className='fw-bold text-primary-light mb-16'>Categories</h5>
            <p className='text-secondary-light text-sm mb-12'>Product distribution snapshot</p>
            {error && (
              <div className='alert alert-warning radius-12 py-12 px-16 mb-0' role='status'>
                {error}
              </div>
            )}
            {!error && loading && (
              <div className='placeholder-glow py-5'>
                <span className='placeholder col-12' style={{ height: 220 }} />
              </div>
            )}
            {!error && !loading && hasCategoryData && (
              <ReactApexChart options={donutOptions} series={donutSeries} type='donut' height={isCompact ? 260 : 320} />
            )}
            {!error && !loading && !hasCategoryData && (
              <div className='text-secondary-light py-5 text-center'>No product category distribution yet.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

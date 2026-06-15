import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { Icon } from "@iconify/react/dist/iconify.js";

const overviewCards = [
  { title: "Total Users", value: 14, icon: "mdi:account-group-outline" },
  { title: "Total Posts", value: 14, icon: "mdi:image-multiple-outline" },
  { title: "Verified", value: 0, icon: "mdi:check-circle-outline" },
  { title: "Creators", value: 0, icon: "mdi:trending-up" },
];

const tabs = [
  { key: "overview", label: "Overview", icon: "mdi:chart-bar" },
  { key: "users", label: "Users", icon: "mdi:account-multiple-outline" },
  { key: "moderation", label: "Moderation", icon: "mdi:shield-check-outline" },
  { key: "hashtags", label: "Hashtags", icon: "mdi:tag-multiple-outline" },
  { key: "audio", label: "Audio", icon: "mdi:music-note-outline" },
  { key: "config", label: "Config", icon: "mdi:tune-variant" },
];

export default function SocialDashboardLayer() {
  const contentSeries = useMemo(
    () => [
      { name: "Posts", data: [220, 180, 310, 240, 330, 420, 380] },
      { name: "Verified", data: [110, 90, 140, 105, 170, 200, 160] },
    ],
    [],
  );

  const contentOptions = useMemo(
    () => ({
      chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
      plotOptions: { bar: { borderRadius: 3, columnWidth: "36%" } },
      dataLabels: { enabled: false },
      xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
      colors: ["#111827", "#14b8a6"],
      legend: { show: false },
      grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
    }),
    [],
  );

  const growthSeries = useMemo(() => [{ name: "Users", data: [1200, 1450, 1700, 2100, 2600, 3200] }], []);
  const growthOptions = useMemo(
    () => ({
      chart: { type: "line", toolbar: { show: false }, fontFamily: "inherit" },
      stroke: { width: 3, curve: "smooth", colors: ["#0891b2"] },
      dataLabels: { enabled: false },
      xaxis: { categories: ["W1", "W2", "W3", "W4", "W5", "W6"] },
      grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
      markers: { size: 4, colors: ["#fff"], strokeColors: "#0891b2", strokeWidth: 2 },
    }),
    [],
  );

  return (
    <div>
      <div className='mb-20'>
        <h3 className='fw-bold mb-4'>P4U Social - Admin</h3>
        <p className='text-secondary-light mb-0'>Content moderation, user management, analytics & configuration</p>
      </div>

      <div className='bg-primary-50 radius-12 p-6 p4u-admin-filter-row gap-6 mb-16'>
        {tabs.map((tab, idx) => (
          <button
            key={tab.key}
            type='button'
            className={`btn border-0 radius-10 px-16 py-8 d-flex align-items-center gap-8 ${idx === 0 ? "bg-white text-primary-600 fw-semibold" : "bg-transparent text-secondary-light"}`}
          >
            <Icon icon={tab.icon} /> {tab.label}
          </button>
        ))}
      </div>

      <div className='row g-12 mb-16'>
        {overviewCards.map((card) => (
          <div className='col-sm-6 col-xl-3' key={card.title}>
            <div className='card radius-12 border-0 shadow-sm h-100'>
              <div className='card-body p-16 d-flex align-items-start justify-content-between'>
                <div>
                  <p className='text-secondary-light mb-4'>{card.title}</p>
                  <h3 className='fw-bold mb-0'>{card.value}</h3>
                </div>
                <span className='text-primary-600 text-xl'>
                  <Icon icon={card.icon} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className='row g-16'>
        <div className='col-12 col-xl-6'>
          <div className='card radius-12 border-0 shadow-sm h-100'>
            <div className='card-body p-24'>
              <h5 className='fw-bold mb-16'>Content Created (This Week)</h5>
              <ReactApexChart options={contentOptions} series={contentSeries} type='bar' height={280} />
            </div>
          </div>
        </div>
        <div className='col-12 col-xl-6'>
          <div className='card radius-12 border-0 shadow-sm h-100'>
            <div className='card-body p-24'>
              <h5 className='fw-bold mb-16'>User Growth</h5>
              <ReactApexChart options={growthOptions} series={growthSeries} type='line' height={280} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

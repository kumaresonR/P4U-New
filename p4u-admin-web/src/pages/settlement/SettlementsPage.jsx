import React, { useState } from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import ListCashLayer from "./ListCashLayer";
import ListPointsLayer from "./ListPointsLayer";

const TABS = [
  { key: "cash", label: "Cash" },
  { key: "points", label: "Points" },
];

const SettlementsPage = () => {
  const [tab, setTab] = useState("cash");

  return (
    <MasterLayout>
      <Breadcrumb title="Settlements" pagetitle="Settlements" />
      <ul className="nav nav-pills mb-20 gap-8">
        {TABS.map((t) => (
          <li key={t.key} className="nav-item">
            <button
              type="button"
              className={`nav-link px-24 py-10 radius-8 ${tab === t.key ? "bg-primary-600 text-white" : "bg-neutral-100 text-secondary-light"}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>
      {tab === "cash" ? <ListCashLayer /> : <ListPointsLayer />}
    </MasterLayout>
  );
};

export default SettlementsPage;

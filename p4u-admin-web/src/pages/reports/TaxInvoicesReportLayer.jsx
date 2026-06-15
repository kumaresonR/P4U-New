import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import { listOrders, listVendors, getCustomer, getVendor } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import {
  buildRegisterRow,
  buildInvoiceModel,
  renderTaxInvoiceHtml,
  openTaxInvoicePrintWindow,
} from "./taxInvoiceHtml";

const PAGE = 200;
const MAX_ROWS = 4000;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const INVOICE_STATUSES = new Set(["delivered", "completed"]);

const MONTHS_FY = [
  { key: "", label: "Whole FY" },
  { key: "04", label: "April", calMonth: 3, yearOffset: 0 },
  { key: "05", label: "May", calMonth: 4, yearOffset: 0 },
  { key: "06", label: "June", calMonth: 5, yearOffset: 0 },
  { key: "07", label: "July", calMonth: 6, yearOffset: 0 },
  { key: "08", label: "August", calMonth: 7, yearOffset: 0 },
  { key: "09", label: "September", calMonth: 8, yearOffset: 0 },
  { key: "10", label: "October", calMonth: 9, yearOffset: 0 },
  { key: "11", label: "November", calMonth: 10, yearOffset: 0 },
  { key: "12", label: "December", calMonth: 11, yearOffset: 0 },
  { key: "01", label: "January", calMonth: 0, yearOffset: 1 },
  { key: "02", label: "February", calMonth: 1, yearOffset: 1 },
  { key: "03", label: "March", calMonth: 2, yearOffset: 1 },
];

function fiscalYearStartYears(now = new Date()) {
  const y = now.getFullYear();
  const mo = now.getMonth();
  const currentStart = mo >= 3 ? y : y - 1;
  return [currentStart - 2, currentStart - 1, currentStart, currentStart + 1, currentStart + 2];
}

function fyLabel(startYear) {
  const ey = (startYear + 1) % 100;
  return `FY ${startYear}–${String(ey).padStart(2, "0")}`;
}

function fyMonthBounds(fyStartYear, monthKey) {
  if (!monthKey) {
    return {
      start: new Date(fyStartYear, 3, 1, 0, 0, 0, 0),
      end: new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999),
    };
  }
  const M = MONTHS_FY.find((x) => x.key === monthKey);
  if (!M || !M.calMonth) return fyMonthBounds(fyStartYear, "");
  const y = fyStartYear + M.yearOffset;
  return {
    start: new Date(y, M.calMonth, 1, 0, 0, 0, 0),
    end: new Date(y, M.calMonth + 1, 0, 23, 59, 59, 999),
  };
}

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

function formatTableDate(d) {
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}

function formatMoney(n) {
  const x = Number(n) || 0;
  return `₹${x.toLocaleString("en-IN", { minimumFractionDigits: x % 1 ? 1 : 0, maximumFractionDigits: 2 })}`;
}

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function fetchAllOrders() {
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && all.length < MAX_ROWS) {
    const res = await listOrders({ limit: PAGE, offset });
    const items = res.items || [];
    all.push(...items);
    total = typeof res.total === "number" ? res.total : all.length;
    offset += items.length;
    if (items.length === 0) break;
  }
  return all;
}

function SortTh({ label, sortKey, activeKey, dir, onSort }) {
  const active = activeKey === sortKey;
  return (
    <th className='cursor-pointer user-select-none' onClick={() => onSort(sortKey)} title='Sort'>
      <span className='d-inline-flex align-items-center gap-4'>
        {label}
        <Icon
          icon={active ? (dir === "asc" ? "mdi:arrow-up" : "mdi:arrow-down") : "mdi:unfold-more-horizontal"}
          className={`text-lg ${active ? "text-primary-600" : "text-secondary-light opacity-50"}`}
        />
      </span>
    </th>
  );
}

function KpiCard({ label, value, icon }) {
  return (
    <div className='card border radius-12 h-100'>
      <div className='card-body p-16'>
        <div className='d-flex justify-content-between align-items-start mb-8'>
          <span className='text-xs text-secondary-light text-uppercase fw-semibold'>{label}</span>
          <Icon icon={icon} className='text-xl text-secondary-light' />
        </div>
        <div className='h4 fw-bold mb-0 text-primary-light'>{value}</div>
      </div>
    </div>
  );
}

export default function TaxInvoicesReportLayer() {
  const fyYears = useMemo(() => fiscalYearStartYears(), []);
  const defaultFy = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth();
    return mo >= 3 ? y : y - 1;
  }, []);

  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [customerById, setCustomerById] = useState({});
  const vendorCacheRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState("");

  const [fyYear, setFyYear] = useState(defaultFy);
  const [fyMonth, setFyMonth] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [search, setSearch] = useState("");

  const [sort, setSort] = useState({ key: "invoiceDate", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([fetchAllOrders(), listVendors({ limit: 200, offset: 0 })])
      .then(([ord, vres]) => {
        if (cancelled) return;
        setOrders(ord);
        setVendors(vres.items || []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Failed to load data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const vendorById = useMemo(() => {
    const m = {};
    vendors.forEach((v) => {
      m[v.id] = v;
    });
    return m;
  }, [vendors]);

  useEffect(() => {
    const ids = [...new Set(orders.map((o) => o.customerId).filter(Boolean))];
    let cancelled = false;
    const pending = ids.filter((id) => !customerById[id]);
    if (pending.length === 0) return;
    const batch = pending.slice(0, 80);
    Promise.all(
      batch.map((id) =>
        getCustomer(id)
          .then((c) => [id, c])
          .catch(() => [id, null]),
      ),
    ).then((pairs) => {
      if (cancelled) return;
      setCustomerById((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => {
      cancelled = true;
    };
  }, [orders, customerById]);

  const { start: rangeStart, end: rangeEnd } = useMemo(() => fyMonthBounds(fyYear, fyMonth), [fyYear, fyMonth]);

  const baseRows = useMemo(() => {
    const rows = [];
    for (const o of orders) {
      const st = String(o.status || "").toLowerCase().trim();
      if (!INVOICE_STATUSES.has(st)) continue;
      const v = vendorById[o.vendorId] || {};
      const c = o.customerId ? customerById[o.customerId] : null;
      const row = buildRegisterRow(o, v, c);
      const inv = row.invoiceDate;
      if (isNaN(inv.getTime())) continue;
      if (inv < rangeStart || inv > rangeEnd) continue;
      if (vendorFilter && String(o.vendorId) !== vendorFilter) continue;

      const meta = parseMeta(o.metadata);
      const custMeta = c ? parseMeta(c.metadata) : {};
      const stateBucket =
        row.pos && row.pos !== "—"
          ? row.pos
          : c?.stateName ||
            custMeta.stateName ||
            v.stateName ||
            meta.billingState ||
            meta.placeOfSupply ||
            "—";

      if (stateFilter) {
        if (String(stateBucket).trim() !== stateFilter) continue;
      }

      rows.push({ ...row, stateBucket });
    }
    return rows;
  }, [orders, vendorById, customerById, rangeStart, rangeEnd, vendorFilter, stateFilter]);

  const stateOptions = useMemo(() => {
    const set = new Set();
    for (const o of orders) {
      const st = String(o.status || "").toLowerCase().trim();
      if (!INVOICE_STATUSES.has(st)) continue;
      const v = vendorById[o.vendorId] || {};
      const c = o.customerId ? customerById[o.customerId] : null;
      const meta = parseMeta(o.metadata);
      const custMeta = c ? parseMeta(c.metadata) : {};
      const r = buildRegisterRow(o, v, c);
      const pos = r.pos;
      const label =
        pos && pos !== "—"
          ? pos
          : c?.stateName ||
            custMeta.stateName ||
            v.stateName ||
            meta.billingState ||
            meta.placeOfSupply ||
            "";
      if (label && String(label).trim()) set.add(String(label).trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [orders, vendorById, customerById]);

  const filtered = useMemo(() => {
    if (!search.trim()) return baseRows;
    const q = search.toLowerCase().trim();
    return baseRows.filter(
      (r) =>
        String(r.invoiceNo).toLowerCase().includes(q) ||
        String(r.orderRef).toLowerCase().includes(q) ||
        String(r.customer).toLowerCase().includes(q) ||
        String(r.vendorName).toLowerCase().includes(q),
    );
  }, [baseRows, search]);

  const kpis = useMemo(() => {
    let taxable = 0;
    let tax = 0;
    let total = 0;
    for (const r of filtered) {
      taxable += Number(r.taxable) || 0;
      tax += Number(r.tax) || 0;
      total += Number(r.total) || 0;
    }
    return {
      count: filtered.length,
      taxable,
      tax,
      total,
    };
  }, [filtered]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (key) {
        case "invoiceNo":
          return mul * String(a.invoiceNo).localeCompare(String(b.invoiceNo));
        case "invoiceDate":
          return mul * (a.invoiceDate.getTime() - b.invoiceDate.getTime());
        case "orderRef":
          return mul * String(a.orderRef).localeCompare(String(b.orderRef));
        case "customer":
          return mul * String(a.customer).localeCompare(String(b.customer));
        case "vendorName":
          return mul * String(a.vendorName).localeCompare(String(b.vendorName));
        case "taxable":
          return mul * (a.taxable - b.taxable);
        case "tax":
          return mul * (a.tax - b.tax);
        case "total":
          return mul * (a.total - b.total);
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sort]);

  useEffect(() => {
    setPage(1);
  }, [fyYear, fyMonth, vendorFilter, stateFilter, search, pageSize, sort.key, sort.dir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const slice = useMemo(() => {
    const s = (safePage - 1) * pageSize;
    return sorted.slice(s, s + pageSize);
  }, [sorted, safePage, pageSize]);

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "invoiceDate" ? "desc" : "asc" },
    );
  };

  const resolveVendorForPdf = async (vendorId) => {
    if (!vendorId) return null;
    const cached = vendorCacheRef.current[vendorId];
    if (cached) return cached;
    const fromList = vendorById[vendorId];
    if (fromList?.gst != null && String(fromList.gst).trim() && fromList.registeredShopAddress) {
      vendorCacheRef.current[vendorId] = fromList;
      return fromList;
    }
    try {
      const v = await getVendor(vendorId);
      vendorCacheRef.current[vendorId] = v;
      return v;
    } catch {
      vendorCacheRef.current[vendorId] = fromList || null;
      return fromList || null;
    }
  };

  const handleInvoiceDownload = async (row) => {
    const oid = row.order?.id || row.orderRef;
    setOpeningId(String(oid));
    try {
      const v = await resolveVendorForPdf(row.order.vendorId);
      const c = row.order.customerId ? customerById[row.order.customerId] : null;
      const model = buildInvoiceModel(row.order, v || row.vendor, c);
      const html = renderTaxInvoiceHtml(model);
      const ok = openTaxInvoicePrintWindow(html);
      if (!ok) toast.error("Pop-up blocked. Allow pop-ups to open the invoice.");
    } catch (e) {
      toast.error(e?.message || "Could not open invoice.");
    } finally {
      setOpeningId("");
    }
  };

  const exportCsv = () => {
    const header = [
      "Invoice no",
      "Date",
      "Order",
      "Customer",
      "Vendor",
      "POS",
      "Supply",
      "Taxable",
      "Tax",
      "Total",
    ];
    const lines = sorted.map((r) => [
      r.invoiceNo,
      formatTableDate(r.invoiceDate),
      r.orderRef,
      r.customer,
      r.vendorName,
      r.pos,
      r.supply,
      r.taxable,
      r.tax,
      r.total,
    ]);
    downloadBlob(`tax-invoices-${new Date().toISOString().slice(0, 10)}.csv`, new Blob([toCsv([header, ...lines])], { type: "text/csv;charset=utf-8" }));
  };

  const exportExcel = () => {
    const rows = sorted
      .map(
        (r) =>
          `<tr><td>${escapeXml(r.invoiceNo)}</td><td>${escapeXml(formatTableDate(r.invoiceDate))}</td><td>${escapeXml(
            r.orderRef,
          )}</td><td>${escapeXml(r.customer)}</td><td>${escapeXml(r.vendorName)}</td><td>${escapeXml(
            r.pos,
          )}</td><td>${escapeXml(r.supply)}</td><td>${r.taxable}</td><td>${r.tax}</td><td>${r.total}</td></tr>`,
      )
      .join("");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1"><thead><tr><th>Invoice no</th><th>Date</th><th>Order</th><th>Customer</th><th>Vendor</th><th>POS</th><th>Supply</th><th>Taxable</th><th>Tax</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    downloadBlob(`tax-invoices-${new Date().toISOString().slice(0, 10)}.xls`, new Blob([`\ufeff${html}`], { type: "application/vnd.ms-excel" }));
  };

  return (
    <div>
      <div className='row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-16 mb-24'>
        <div className='col'>
          <KpiCard label='Total Invoices' value={kpis.count.toLocaleString("en-IN")} icon='mdi:file-document-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Taxable Value' value={formatMoney(kpis.taxable)} icon='mdi:calculator-variant-outline' />
        </div>
        <div className='col'>
          <KpiCard label='GST Collected' value={formatMoney(kpis.tax)} icon='mdi:percent-outline' />
        </div>
        <div className='col'>
          <KpiCard label='Invoice Total' value={formatMoney(kpis.total)} icon='mdi:currency-inr' />
        </div>
      </div>

      <div className='card radius-12 border mb-16'>
        <div className='card-body p-16'>
          <div className='d-flex flex-wrap align-items-end gap-14'>
            <div>
              <label className='form-label text-xs text-secondary-light mb-4'>FY</label>
              <select className='form-select form-select-sm radius-8 h-40-px' value={fyYear} onChange={(e) => setFyYear(Number(e.target.value))}>
                {fyYears.map((y) => (
                  <option key={y} value={y}>
                    {fyLabel(y)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className='form-label text-xs text-secondary-light mb-4'>Month</label>
              <select className='form-select form-select-sm radius-8 h-40-px' value={fyMonth} onChange={(e) => setFyMonth(e.target.value)}>
                {MONTHS_FY.map((m) => (
                  <option key={m.key || "all"} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className='form-label text-xs text-secondary-light mb-4'>Vendor</label>
              <select
                className='form-select form-select-sm radius-8 h-40-px'
                style={{ minWidth: 180 }}
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
              >
                <option value=''>All vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.businessName || v.ownerName || v.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className='form-label text-xs text-secondary-light mb-4'>State</label>
              <select
                className='form-select form-select-sm radius-8 h-40-px'
                style={{ minWidth: 160 }}
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
              >
                <option value=''>All states</option>
                {stateOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className='ms-auto d-flex flex-wrap gap-8'>
              <button
                type='button'
                className='btn btn-outline-secondary h-40-px radius-8 d-inline-flex align-items-center gap-6 px-12'
                onClick={exportCsv}
              >
                <Icon icon='mdi:tray-arrow-down' />
                CSV
              </button>
              <button
                type='button'
                className='btn btn-outline-secondary h-40-px radius-8 d-inline-flex align-items-center gap-6 px-12'
                onClick={exportExcel}
              >
                <Icon icon='mdi:microsoft-excel' />
                Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='input-group mb-16' style={{ maxWidth: 640 }}>
        <span className='input-group-text bg-white border-end-0'>
          <Icon icon='mdi:magnify' className='text-secondary-light' />
        </span>
        <input
          type='search'
          className='form-control border-start-0 radius-8'
          placeholder='Search invoice no, customer, vendor, order…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete='off'
        />
      </div>

      {error && (
        <div className='alert alert-danger radius-8' role='alert'>
          {error}
        </div>
      )}

      <div className='card radius-12 border p-0'>
        <div className='card-body p-0'>
          {loading ? (
            <div className='p-40 text-center text-secondary-light'>Loading invoices…</div>
          ) : (
            <>
              <div className='table-responsive scroll-sm'>
                <table className='table table-striped bordered-table sm-table mb-0 text-nowrap align-middle'>
                  <thead>
                    <tr>
                      <SortTh label='INVOICE NO' sortKey='invoiceNo' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='DATE' sortKey='invoiceDate' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='ORDER' sortKey='orderRef' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='CUSTOMER' sortKey='customer' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='VENDOR' sortKey='vendorName' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <th>POS</th>
                      <th>SUPPLY</th>
                      <SortTh label='TAXABLE' sortKey='taxable' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='TAX' sortKey='tax' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <SortTh label='TOTAL' sortKey='total' activeKey={sort.key} dir={sort.dir} onSort={toggleSort} />
                      <th className='text-center'>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.length === 0 ? (
                      <tr>
                        <td colSpan='11' className='text-center py-40 text-secondary-light'>
                          No tax invoices in this period.
                        </td>
                      </tr>
                    ) : (
                      slice.map((r) => {
                        const oid = r.order?.id || r.orderRef;
                        const busy = openingId === String(oid);
                        return (
                          <tr key={`${r.invoiceNo}-${r.orderRef}`}>
                            <td className='font-monospace text-sm fw-semibold'>{r.invoiceNo}</td>
                            <td>{formatTableDate(r.invoiceDate)}</td>
                            <td className='text-sm'>{r.orderRef}</td>
                            <td>{r.customer}</td>
                            <td>{r.vendorName}</td>
                            <td>
                              <span className='px-10 py-4 radius-pill text-xs bg-neutral-100 text-secondary-light'>
                                {r.pos && r.pos !== "—" ? r.pos : "—"}
                              </span>
                            </td>
                            <td>
                              <span className='px-10 py-4 radius-pill text-xs bg-neutral-100 text-secondary-light'>{r.supply}</span>
                            </td>
                            <td>{formatMoney(r.taxable)}</td>
                            <td>{formatMoney(r.tax)}</td>
                            <td className='fw-semibold'>{formatMoney(r.total)}</td>
                            <td className='text-center'>
                              <button
                                type='button'
                                className='btn btn-link p-8 text-primary-600'
                                title='Open printable invoice (Save as PDF)'
                                disabled={busy}
                                onClick={() => handleInvoiceDownload(r)}
                              >
                                <Icon icon={busy ? "mdi:loading" : "mdi:tray-arrow-down"} className='text-xl' />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className='d-flex flex-wrap align-items-center justify-content-between gap-12 p-16 border-top'>
                <span className='text-secondary-light text-sm'>
                  {sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, sorted.length)} of{" "}
                  {sorted.length}
                </span>
                <div className='d-flex flex-wrap align-items-center gap-12'>
                  <div className='d-flex align-items-center gap-8'>
                    <select className='form-select form-select-sm radius-8 h-40-px' style={{ width: 72 }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <span className='text-secondary-light text-sm'>per page</span>
                  </div>
                  <div className='d-flex align-items-center gap-8'>
                    <button type='button' className='btn btn-light border radius-8 h-40-px px-10' disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      <Icon icon='mdi:chevron-left' className='text-xl' />
                    </button>
                    <span className='text-sm text-secondary-light'>
                      {safePage} / {totalPages}
                    </span>
                    <button
                      type='button'
                      className='btn btn-light border radius-8 h-40-px px-10'
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <Icon icon='mdi:chevron-right' className='text-xl' />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!loading && orders.length >= MAX_ROWS && (
        <p className='text-secondary-light text-sm mt-16 mb-0'>Loaded up to {MAX_ROWS} orders. Narrow the fiscal period for complete data.</p>
      )}
    </div>
  );
}

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

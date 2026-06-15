import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import Breadcrumb from "../../components/Breadcrumb";
import FormModal from "../../components/admin/FormModal";
import { ApiError } from "../../lib/api/client";
import {
  createProductAttribute,
  deleteProductAttribute,
  listProductAttributes,
  updateProductAttribute,
} from "../../lib/api/adminApi";

const TYPE_OPTIONS = [
  { value: "select", label: "Select (Dropdown)" },
  { value: "text", label: "Text (Free input)" },
  { value: "number", label: "Number" },
];

function attrIcon(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("color")) return "mdi:palette-outline";
  if (n.includes("size")) return "mdi:format-size";
  if (n.includes("weight")) return "mdi:weight";
  if (n.includes("material")) return "mdi:texture-box";
  if (n.includes("pattern")) return "mdi:pattern";
  return "mdi:tag-outline";
}

function valueCount(row) {
  if (row.type === "select" && Array.isArray(row.selectValues)) return row.selectValues.length;
  return 0;
}

function typeLabel(t) {
  const o = TYPE_OPTIONS.find((x) => x.value === t);
  return o ? o.label.split(" ")[0].toLowerCase() : String(t || "");
}

export default function ProductAttributesListLayer() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [draftValueById, setDraftValueById] = useState({});
  const [draftHexById, setDraftHexById] = useState({});
  const [savingValueId, setSavingValueId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listProductAttributes({ limit: 500, offset: 0 });
      setItems(res.items || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" })),
    [items],
  );

  const handleDeleteRow = async (row) => {
    if (!window.confirm(`Delete attribute “${row.name}”? This cannot be undone.`)) return;
    try {
      await deleteProductAttribute(row.id);
      toast.success("Attribute deleted.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const handleAddValue = async (row) => {
    if (row.type !== "select") return;
    const raw = String(draftValueById[row.id] || "").trim();
    if (!raw) {
      toast.error("Enter a value first.");
      return;
    }
    const hexRaw = String(draftHexById[row.id] || "").trim();
    const hex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hexRaw) ? hexRaw.toUpperCase() : "";
    const finalValue = hex ? `${raw} ${hex}` : raw;
    const current = Array.isArray(row.selectValues) ? row.selectValues : [];
    if (current.includes(finalValue)) {
      toast.error("This value already exists.");
      return;
    }
    setSavingValueId(row.id);
    try {
      await updateProductAttribute(row.id, {
        selectValues: [...current, finalValue],
      });
      toast.success("Value added.");
      setDraftValueById((prev) => ({ ...prev, [row.id]: "" }));
      setDraftHexById((prev) => ({ ...prev, [row.id]: "" }));
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSavingValueId(null);
    }
  };

  const handleRemoveValue = async (row, value) => {
    const current = Array.isArray(row.selectValues) ? row.selectValues : [];
    const next = current.filter((v) => v !== value);
    setSavingValueId(row.id);
    try {
      await updateProductAttribute(row.id, { selectValues: next });
      toast.success("Value removed.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSavingValueId(null);
    }
  };

  return (
    <div>
      <Breadcrumb
        title='Product Attributes'
        pagetitle='Product Attributes'
        subtitle='Manage product attributes like Color, Size, Weight, etc.'
      />

      <div className='card radius-12'>
        <div className='card-body p-24'>
          <div className='d-flex flex-wrap align-items-center justify-content-end gap-16 mb-20'>
            <button
              type='button'
              className='btn btn-primary radius-10 px-20 py-10 d-inline-flex align-items-center gap-8'
              onClick={() => setModal({ mode: "create" })}
            >
              <Icon icon='ic:baseline-plus' className='text-xl' />
              Add Attribute
            </button>
          </div>

          {error && (
            <div className='alert alert-danger radius-12 mb-16' role='alert'>
              {error}
            </div>
          )}

          {loading ? (
            <p className='text-secondary-light mb-0'>Loading attributes…</p>
          ) : sorted.length === 0 ? (
            <div className='text-center py-40 text-secondary-light'>No attributes yet. Click “Add Attribute” to create one.</div>
          ) : (
            <div className='d-flex flex-column gap-12'>
              {sorted.map((row) => {
                const active = row.isActive !== false;
                const vc = valueCount(row);
                const expanded = expandedId === row.id;
                return (
                  <div
                    key={row.id}
                    className='px-20 py-16 bg-base border radius-12'
                    style={{ borderColor: "var(--neutral-200, #e5e7eb)" }}
                  >
                    <div className='d-flex align-items-center flex-wrap gap-12'>
                      <button
                        type='button'
                        onClick={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
                        className='btn p-0 border-0 bg-transparent d-flex align-items-center flex-grow-1 text-start'
                        style={{ minWidth: 0 }}
                      >
                        <div
                          className='w-48-px h-48-px radius-10 d-flex align-items-center justify-content-center flex-shrink-0'
                          style={{ background: "var(--primary-50, #ecfdf5)" }}
                        >
                          <Icon icon={attrIcon(row.name)} className='text-2xl text-primary-600' />
                        </div>
                        <div className='flex-grow-1 min-w-0 ms-12'>
                          <div className='d-flex align-items-center flex-wrap gap-8'>
                            <span className='fw-bold text-primary-light'>{row.name}</span>
                            <span
                              className={`px-10 py-2 radius-pill text-xs fw-medium ${active ? "bg-success-100 text-success-700" : "bg-neutral-200 text-secondary-light"}`}
                            >
                              {active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className='text-sm text-secondary-light mt-4'>
                            {typeLabel(row.type)} • {vc} value{vc === 1 ? "" : "s"}
                          </div>
                        </div>
                      </button>
                      <div className='d-flex align-items-center gap-4 ms-auto'>
                        <button
                          type='button'
                          className='btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-primary-light'
                          style={{ width: 40, height: 40 }}
                          title='Edit'
                          onClick={() => setModal({ mode: "edit", row })}
                        >
                          <Icon icon='mdi:pencil-outline' className='text-xl' />
                        </button>
                        <button
                          type='button'
                          className='btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-danger-600'
                          style={{ width: 40, height: 40 }}
                          title='Delete'
                          onClick={() => void handleDeleteRow(row)}
                        >
                          <Icon icon='mdi:trash-can-outline' className='text-xl' />
                        </button>
                      </div>
                    </div>
                    {expanded && row.type === "select" && (
                      <div className='pt-14 mt-14 border-top'>
                        <div className='d-flex flex-wrap gap-8 mb-12'>
                          {(row.selectValues || []).map((val) => {
                            const str = String(val || "");
                            const hexMatch = str.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
                            const hex = hexMatch ? hexMatch[0] : null;
                            const label = hex ? str.slice(0, -hex.length).trim() : str;
                            return (
                              <span
                                key={`${row.id}-${str}`}
                                className='d-inline-flex align-items-center gap-8 px-12 py-8 radius-pill border bg-white'
                                style={{ borderColor: "var(--neutral-200, #e5e7eb)" }}
                              >
                                {hex ? (
                                  <span
                                    style={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: "50%",
                                      border: "1px solid #d1d5db",
                                      backgroundColor: hex,
                                    }}
                                  />
                                ) : null}
                                <span className='text-sm fw-medium'>{label || str}</span>
                                {hex ? <span className='text-xs text-secondary-light'>{hex}</span> : null}
                                <button
                                  type='button'
                                  className='btn p-0 border-0 bg-transparent text-secondary-light'
                                  onClick={() => void handleRemoveValue(row, str)}
                                  disabled={savingValueId === row.id}
                                  title='Remove value'
                                >
                                  <Icon icon='mdi:close' />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                        <div className='d-flex flex-wrap align-items-center gap-10'>
                          <input
                            className='form-control radius-10'
                            style={{ maxWidth: 340 }}
                            placeholder='Add new value...'
                            value={draftValueById[row.id] || ""}
                            onChange={(e) =>
                              setDraftValueById((prev) => ({ ...prev, [row.id]: e.target.value }))
                            }
                          />
                          <input
                            className='form-control radius-10'
                            style={{ width: 120 }}
                            placeholder='#hex'
                            value={draftHexById[row.id] || ""}
                            onChange={(e) =>
                              setDraftHexById((prev) => ({ ...prev, [row.id]: e.target.value }))
                            }
                          />
                          <button
                            type='button'
                            className='btn btn-primary radius-10 px-18'
                            onClick={() => void handleAddValue(row)}
                            disabled={savingValueId === row.id}
                          >
                            {savingValueId === row.id ? "Adding..." : "Add"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <AttributeFormModal
          key={modal.mode === "edit" ? modal.row.id : "new"}
          mode={modal.mode}
          row={modal.row}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function AttributeFormModal({ mode, row, onClose, onSaved }) {
  const editing = mode === "edit" && row;
  const [name, setName] = useState(editing ? row.name : "");
  const [type, setType] = useState(editing ? row.type : "select");
  const [isActive, setIsActive] = useState(editing ? row.isActive !== false : true);
  const [valuesText, setValuesText] = useState(
    editing && row.type === "select" && Array.isArray(row.selectValues) ? row.selectValues.join("\n") : "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setName(row.name);
    setType(row.type);
    setIsActive(row.isActive !== false);
    setValuesText(row.type === "select" && Array.isArray(row.selectValues) ? row.selectValues.join("\n") : "");
  }, [editing, row]);

  const parseValues = () =>
    valuesText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: trimmed,
        type,
        isActive,
        ...(type === "select" ? { selectValues: parseValues() } : {}),
      };
      if (editing) {
        await updateProductAttribute(row.id, body);
        toast.success("Attribute updated.");
      } else {
        await createProductAttribute(body);
        toast.success("Attribute created.");
      }
      await onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm(`Delete attribute “${row.name}”? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await deleteProductAttribute(row.id);
      toast.success("Attribute deleted.");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal onClose={onClose} size='md'>
      <h5 className='fw-bold text-primary-light mb-20'>{editing ? "Edit Attribute" : "New Attribute"}</h5>
      <form onSubmit={(e) => void submit(e)} className='d-flex flex-column gap-16'>
        <div>
          <label className='form-label fw-semibold text-sm'>Name</label>
          <input
            className='form-control radius-10'
            placeholder='e.g. Color, Size'
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete='off'
          />
        </div>
        <div>
          <label className='form-label fw-semibold text-sm'>Type</label>
          <select
            className='form-select radius-10'
            value={type}
            onChange={(e) => {
              const v = e.target.value;
              setType(v);
              if (v !== "select") setValuesText("");
            }}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {type === "select" && (
          <div>
            <label className='form-label fw-semibold text-sm'>Allowed values (one per line)</label>
            <textarea
              className='form-control radius-10'
              rows={5}
              placeholder={"Red\nBlue\nGreen"}
              value={valuesText}
              onChange={(e) => setValuesText(e.target.value)}
            />
          </div>
        )}
        <div className='form-check form-switch'>
          <input
            className='form-check-input'
            type='checkbox'
            role='switch'
            id='attr-active'
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <label className='form-check-label fw-semibold' htmlFor='attr-active'>
            Active
          </label>
        </div>
        <div className='d-flex flex-wrap align-items-center justify-content-between gap-12 mt-8'>
          <button type='submit' className='btn btn-primary radius-10 px-24' disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {editing && (
            <button type='button' className='btn btn-outline-danger radius-10 px-20' disabled={saving} onClick={() => void handleDelete()}>
              Delete
            </button>
          )}
        </div>
      </form>
    </FormModal>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  createBanner,
  deleteBanner,
  listCategoriesForProducts,
  listCatalogServices,
  listBanners,
  updateBanner,
  uploadFile,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";
import FormModal from "../../components/admin/FormModal";

const TABS = [
  { key: "hero", label: "Hero Banners" },
  { key: "content", label: "Content Sections" },
  { key: "video", label: "Video Ads" },
];

function emptyForm() {
  return {
    title: "",
    subtitle: "",
    mediaType: "image",
    sectionType: "product_slider",
    displayOrder: 0,
    desktopImageUrl: "",
    mobileImageUrl: "",
    videoUrl: "",
    thumbnailUrl: "",
    durationSec: 0,
    ctaText: "",
    ctaLink: "",
    redirectType: "external",
    redirectId: "",
    linkType: "none",
    linkTarget: "",
    targetLocation: "",
    targetSegment: "all_users",
    themeHeaderColor: "",
    themeBgColor: "",
    themeButtonColor: "",
    backgroundGradient: "",
    festivalTag: "",
    displayMode: "inline",
    showAfterSeconds: 0,
    autoExpandFullscreen: false,
    startDate: "",
    endDate: "",
    isActive: true,
  };
}

function bannerToForm(b) {
  const m = b.metadata || {};
  return {
    title: b.title || "",
    subtitle: String(m.subtitle || ""),
    mediaType: m.mediaType === "video" ? "video" : "image",
    sectionType: String(m.sectionType || "product_slider"),
    displayOrder: b.sortOrder ?? 0,
    desktopImageUrl: String(m.desktopImageUrl || b.imageUrl || ""),
    mobileImageUrl: String(m.mobileImageUrl || ""),
    videoUrl: String(m.videoUrl || ""),
    thumbnailUrl: String(m.thumbnailUrl || m.desktopImageUrl || b.imageUrl || ""),
    durationSec: Number(m.durationSec || 0),
    ctaText: String(m.ctaText || ""),
    ctaLink: String(m.ctaLink || b.redirectUrl || ""),
    redirectType: m.redirectType === "internal" ? "internal" : "external",
    redirectId: String(m.redirectId || ""),
    linkType: String(m.linkType || "none"),
    linkTarget: String(m.linkTarget || ""),
    targetLocation: String(m.targetLocation || ""),
    targetSegment: String(m.targetSegment || "all_users"),
    themeHeaderColor: String(m.themeHeaderColor || ""),
    themeBgColor: String(m.themeBgColor || ""),
    themeButtonColor: String(m.themeButtonColor || ""),
    backgroundGradient: String(m.backgroundGradient || ""),
    festivalTag: String(m.festivalTag || ""),
    displayMode: String(m.displayMode || "inline"),
    showAfterSeconds: Number(m.showAfterSeconds || 0),
    autoExpandFullscreen: Boolean(m.autoExpandFullscreen),
    startDate: m.startDate ? String(m.startDate).slice(0, 16) : "",
    endDate: m.endDate ? String(m.endDate).slice(0, 16) : "",
    isActive: b.isActive !== false,
  };
}

function buildMetadata(form, cmsSlot, existingMeta = {}) {
  return {
    homepageCMS: true,
    cmsSlot,
    subtitle: form.subtitle.trim() || null,
    mediaType: form.mediaType,
    sectionType: form.sectionType || null,
    desktopImageUrl: form.desktopImageUrl.trim() || null,
    mobileImageUrl: form.mobileImageUrl.trim() || null,
    videoUrl: form.videoUrl.trim() || null,
    thumbnailUrl: form.thumbnailUrl.trim() || null,
    durationSec: Number(form.durationSec || 0),
    ctaText: form.ctaText.trim() || null,
    ctaLink: form.ctaLink.trim() || null,
    redirectType: form.redirectType,
    redirectId: form.redirectId.trim() || null,
    linkType: form.linkType || "none",
    linkTarget: form.linkTarget || null,
    targetLocation: form.targetLocation.trim() || null,
    targetSegment: form.targetSegment || "all_users",
    themeHeaderColor: form.themeHeaderColor.trim() || null,
    themeBgColor: form.themeBgColor.trim() || null,
    themeButtonColor: form.themeButtonColor.trim() || null,
    backgroundGradient: form.backgroundGradient.trim() || null,
    festivalTag: form.festivalTag.trim() || null,
    displayMode: form.displayMode || "inline",
    showAfterSeconds: Number(form.showAfterSeconds || 0),
    autoExpandFullscreen: Boolean(form.autoExpandFullscreen),
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    impressions: typeof existingMeta.impressions === "number" ? existingMeta.impressions : 0,
    clicks: typeof existingMeta.clicks === "number" ? existingMeta.clicks : 0,
  };
}

const HomepageCmsLayer = () => {
  const [tab, setTab] = useState("hero");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingDesktop, setPendingDesktop] = useState(null);
  const [pendingMobile, setPendingMobile] = useState(null);
  const [pendingVideo, setPendingVideo] = useState(null);
  const [pendingThumb, setPendingThumb] = useState(null);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listBanners();
      setItems(Array.isArray(res.items) ? res.items : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listCategoriesForProducts({ purpose: "all" }),
      listCatalogServices({ limit: 500, offset: 0 }),
    ])
      .then(([catRes, svcRes]) => {
        if (cancelled) return;
        setCategories(Array.isArray(catRes?.items) ? catRes.items.filter((c) => !c.parentId) : []);
        setServices(Array.isArray(svcRes?.items) ? svcRes.items : []);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setServices([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tabItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((b) => {
        const m = b.metadata || {};
        if (m.homepageCMS !== true) return false;
        const slot = m.cmsSlot || "hero";
        if (slot !== tab) return false;
        if (!q) return true;
        return (
          (b.title || "").toLowerCase().includes(q) ||
          String(m.subtitle || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [items, tab, search]);

  const counts = useMemo(() => {
    const c = { hero: 0, content: 0, video: 0 };
    items.forEach((b) => {
      const m = b.metadata || {};
      if (m.homepageCMS !== true) return;
      const slot = m.cmsSlot || "hero";
      if (slot in c) c[slot] += 1;
    });
    return c;
  }, [items]);

  const openAdd = () => {
    setForm(emptyForm());
    setPendingDesktop(null);
    setPendingMobile(null);
    setPendingVideo(null);
    setPendingThumb(null);
    setModal({ mode: "add" });
  };

  const openEdit = (row) => {
    setForm(bannerToForm(row));
    setPendingDesktop(null);
    setPendingMobile(null);
    setPendingVideo(null);
    setPendingThumb(null);
    setModal({ mode: "edit", id: row.id, row });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this homepage item?")) return;
    try {
      await deleteBanner(id);
      toast.success("Deleted.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const patchActive = async (row, next) => {
    try {
      await updateBanner(row.id, { isActive: next });
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const move = async (index, dir) => {
    const list = [...tabItems];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[index];
    const b = list[j];
    const orderA = a.sortOrder ?? 0;
    const orderB = b.sortOrder ?? 0;
    try {
      await updateBanner(a.id, { sortOrder: orderB });
      await updateBanner(b.id, { sortOrder: orderA });
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : name === "displayOrder" ? (value === "" ? 0 : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) {
      toast.error("Title is required.");
      return;
    }
    const isHero = tab === "hero";
    const isVideo = tab === "video";
    let desktopUrl = form.desktopImageUrl.trim();
    let mobileUrl = form.mobileImageUrl.trim();
    let videoUrl = form.videoUrl.trim();
    let thumbnailUrl = form.thumbnailUrl.trim();

    if (pendingDesktop) {
      try {
        const up = await uploadFile(pendingDesktop);
        desktopUrl = up.url || desktopUrl;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : String(err));
        return;
      }
    }
    if (pendingMobile) {
      try {
        const up = await uploadFile(pendingMobile);
        mobileUrl = up.url || mobileUrl;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : String(err));
        return;
      }
    }
    if (pendingVideo) {
      try {
        const up = await uploadFile(pendingVideo);
        videoUrl = up.url || videoUrl;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : String(err));
        return;
      }
    }
    if (pendingThumb) {
      try {
        const up = await uploadFile(pendingThumb);
        thumbnailUrl = up.url || thumbnailUrl;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : String(err));
        return;
      }
    }

    if (isVideo) {
      if (!videoUrl) {
        toast.error("Video URL is required (or upload a video).");
        return;
      }
      if (!thumbnailUrl) {
        toast.error("Thumbnail is required for video ad.");
        return;
      }
      desktopUrl = thumbnailUrl;
    } else if (!desktopUrl) {
      toast.error("Desktop image is required (URL or upload).");
      return;
    }

    const existingMeta = modal?.row?.metadata || {};
    const cmsSlot =
      modal?.mode === "edit" && modal?.row?.metadata && typeof modal.row.metadata.cmsSlot === "string"
        ? modal.row.metadata.cmsSlot
        : tab;
    const metadata = buildMetadata(
      {
        ...form,
        mediaType: isVideo ? "video" : form.mediaType,
        desktopImageUrl: desktopUrl,
        mobileImageUrl: mobileUrl,
        videoUrl,
        thumbnailUrl,
      },
      cmsSlot,
      existingMeta,
    );

    setSubmitting(true);
    try {
      const body = {
        title,
        imageUrl: isVideo ? thumbnailUrl : desktopUrl,
        redirectUrl:
          form.redirectType === "external"
            ? form.ctaLink.trim() || null
            : form.linkTarget || form.redirectId.trim() || null,
        sortOrder: Number(form.displayOrder) || 0,
        isActive: form.isActive,
        metadata,
      };
      if (modal?.mode === "edit" && modal.id) {
        await updateBanner(modal.id, body);
        toast.success("Saved.");
      } else {
        await createBanner(body);
        toast.success("Created.");
      }
      setModal(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const addLabel = tab === "hero" ? "Add Banner" : tab === "content" ? "Add Section" : "Add Video Ad";
  const currentTabTitle = tab === "hero" ? "Hero carousel banners" : tab === "content" ? "Content sections" : "Video ads";

  return (
    <div className='card h-100 p-0 radius-16 border-0 shadow-sm'>
      <div className='card-body p-24'>
        <div className='mb-20'>
          <h3 className='fw-bold mb-4'>Homepage CMS</h3>
          <p className='text-secondary-light mb-0'>
            Manage dynamic homepage banners, sections, and video ads. Items here are stored as homepage banners (separate from the generic Banners list).
          </p>
        </div>

        <div className='bg-primary-50 radius-12 p-6 d-flex flex-wrap gap-6 mb-20'>
          {TABS.map((t) => (
            <button
              key={t.key}
              type='button'
              onClick={() => setTab(t.key)}
              className={`btn border-0 radius-10 px-16 py-8 ${tab === t.key ? "bg-white fw-semibold text-primary-600" : "bg-transparent text-secondary-light"}`}
            >
              {t.label} ({counts[t.key] ?? 0})
            </button>
          ))}
        </div>

        <div className='card radius-12 border-0 mb-16'>
          <div className='card-body p-16 d-flex flex-wrap align-items-center gap-10 justify-content-between'>
            <div className='input-group radius-10 p4u-filter-search' style={{ minWidth: 160, maxWidth: 320 }}>
              <span className='input-group-text bg-white border-end-0'><Icon icon='mdi:magnify' /></span>
              <input
                type='search'
                className='form-control border-start-0 h-40-px'
                placeholder='Search...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type='button' onClick={openAdd} className='btn btn-primary radius-10 px-20 d-flex align-items-center gap-8'>
              <Icon icon='ic:baseline-plus' /> {addLabel}
            </button>
          </div>
        </div>

        {error && (
          <div className='alert alert-danger radius-12 mb-16' role='alert'>{error}</div>
        )}

        {loading ? (
          <p className='text-secondary-light mb-0'>Loading...</p>
        ) : (
          <section>
            <h5 className='fw-semibold text-primary-light mb-12'>
              {currentTabTitle}
              {" "}
              <span className='text-secondary-light fw-normal'>({tabItems.length})</span>
            </h5>
            {tabItems.length === 0 ? (
              <div className='text-center py-40 text-secondary-light border border-dashed radius-12'>
                No items in this tab yet. Use &quot;{addLabel}&quot; to create one.
              </div>
            ) : (
              <ul className='list-unstyled d-flex flex-column gap-12 mb-0'>
                {tabItems.map((row, idx) => {
                  const m = row.metadata || {};
                  const img = m.desktopImageUrl || row.imageUrl;
                  const dateLabel = m.startDate || m.endDate ? `${m.startDate ? String(m.startDate).slice(0, 10) : "—"} - ${m.endDate ? String(m.endDate).slice(0, 10) : "—"}` : "";
                  const media = (m.mediaType || "image").toUpperCase();
                  return (
                    <li key={row.id} className='border radius-12 p-16 bg-base'>
                      <div className='d-flex flex-wrap align-items-start gap-16'>
                        <div
                          className='radius-10 bg-neutral-100 flex-shrink-0 overflow-hidden d-flex align-items-center justify-content-center border'
                          style={{ width: 120, height: 72 }}
                        >
                          {img ? (
                            <img src={resolveMediaUrl(img) || img} alt='' className='w-100 h-100 object-fit-cover' onError={(e) => { e.target.style.display = "none"; }} />
                          ) : (
                            <Icon icon='mdi:image-off-outline' className='text-3xl text-secondary-light' />
                          )}
                        </div>
                        <div className='flex-grow-1 min-w-0'>
                          <div className='fw-semibold text-primary-light'>{row.title}</div>
                          <div className='text-sm text-secondary-light mt-4'>
                            {media}
                            {tab === "content" && m.sectionType ? ` · ${String(m.sectionType).replaceAll("_", " ")}` : ""}
                            {tab === "video" && m.durationSec ? ` · ${m.durationSec}s` : ""}
                            {" · "}Order: {row.sortOrder ?? 0}
                            {m.subtitle ? ` · ${m.subtitle}` : ""}
                          </div>
                          {dateLabel && (
                            <div className='text-xs text-neutral-500 mt-2'>
                              <Icon icon='mdi:calendar-blank-outline' className='me-1' />
                              {dateLabel}
                            </div>
                          )}
                          <div className='text-xs text-neutral-500 mt-4'>
                            {m.impressions ?? 0} impressions · {m.clicks ?? 0} clicks
                          </div>
                        </div>
                        <div className='d-flex align-items-center gap-8 flex-shrink-0 ms-auto'>
                          <button type='button' className='btn btn-light border radius-8 p-8' disabled={idx === 0} onClick={() => move(idx, -1)} title='Move up'>
                            <Icon icon='mdi:chevron-up' />
                          </button>
                          <button type='button' className='btn btn-light border radius-8 p-8' disabled={idx === tabItems.length - 1} onClick={() => move(idx, 1)} title='Move down'>
                            <Icon icon='mdi:chevron-down' />
                          </button>
                          <div className='form-check form-switch'>
                            <input
                              className='form-check-input'
                              type='checkbox'
                              checked={row.isActive !== false}
                              onChange={(e) => patchActive(row, e.target.checked)}
                            />
                          </div>
                          <button type='button' className='btn btn-light border radius-8 p-8' onClick={() => openEdit(row)} title='Edit'>
                            <Icon icon='lucide:edit' />
                          </button>
                          <button type='button' className='btn btn-light border radius-8 p-8 text-danger-600' onClick={() => handleDelete(row.id)} title='Delete'>
                            <Icon icon='fluent:delete-24-regular' />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      {modal && (
        <FormModal onClose={() => !submitting && setModal(null)} size='xl'>
          <form onSubmit={handleSubmit} className='d-flex flex-column gap-12'>
            <h4 className='fw-bold mb-0'>{modal.mode === "edit" ? "Edit item" : addLabel}</h4>
            <div className='row g-12'>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-sm'>Title *</label>
                <input className='form-control radius-10' name='title' value={form.title} onChange={handleChange} required />
              </div>
              {tab !== "video" && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-sm'>Subtitle</label>
                  <input className='form-control radius-10' name='subtitle' value={form.subtitle} onChange={handleChange} />
                </div>
              )}
              {tab === "content" && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-sm'>Section Type</label>
                  <select className='form-select radius-10' name='sectionType' value={form.sectionType} onChange={handleChange}>
                    <option value='product_slider'>Product Slider</option>
                    <option value='service_grid'>Service Grid</option>
                    <option value='promo_strip'>Promo Strip</option>
                    <option value='custom_block'>Custom Block</option>
                  </select>
                </div>
              )}
              {tab === "hero" && (
                <div className='col-md-4'>
                  <label className='form-label fw-semibold text-sm'>Media type</label>
                  <select className='form-select radius-10' name='mediaType' value={form.mediaType} onChange={handleChange}>
                    <option value='image'>Image</option>
                    <option value='video'>Video</option>
                  </select>
                </div>
              )}
              <div className='col-md-4'>
                <label className='form-label fw-semibold text-sm'>Display order</label>
                <input className='form-control radius-10' type='number' name='displayOrder' value={form.displayOrder} onChange={handleChange} min={0} />
              </div>
              <div className='col-md-4 d-flex align-items-end'>
                <div className='form-check form-switch w-100'>
                  <input className='form-check-input' type='checkbox' name='isActive' checked={form.isActive} onChange={handleChange} id='cms-active' />
                  <label className='form-check-label fw-medium' htmlFor='cms-active'>Active</label>
                </div>
              </div>
              {tab !== "video" && (
                <>
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold text-sm'>Desktop image *</label>
                    <input className='form-control radius-10 mb-8' name='desktopImageUrl' value={form.desktopImageUrl} onChange={handleChange} placeholder='https://...' />
                    <input type='file' className='form-control radius-10' accept='image/*' onChange={(e) => setPendingDesktop(e.target.files?.[0] || null)} />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold text-sm'>Mobile image (optional)</label>
                    <input className='form-control radius-10 mb-8' name='mobileImageUrl' value={form.mobileImageUrl} onChange={handleChange} placeholder='https://...' />
                    <input type='file' className='form-control radius-10' accept='image/*' onChange={(e) => setPendingMobile(e.target.files?.[0] || null)} />
                  </div>
                </>
              )}
              {tab === "video" && (
                <>
                  <div className='col-12'>
                    <label className='form-label fw-semibold text-sm'>Optimized Video *</label>
                    <input type='file' className='form-control radius-10 mb-8' accept='video/*' onChange={(e) => setPendingVideo(e.target.files?.[0] || null)} />
                    <small className='text-secondary-light'>Pick any video file to upload and optimize for streaming.</small>
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold text-sm'>Video URL (auto-filled)</label>
                    <input className='form-control radius-10' name='videoUrl' value={form.videoUrl} onChange={handleChange} placeholder='Paste a URL or upload above' />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold text-sm'>Thumbnail *</label>
                    <input className='form-control radius-10 mb-8' name='thumbnailUrl' value={form.thumbnailUrl} onChange={handleChange} placeholder='https://...' />
                    <input type='file' className='form-control radius-10' accept='image/*' onChange={(e) => setPendingThumb(e.target.files?.[0] || null)} />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold text-sm'>Duration (seconds)</label>
                    <input className='form-control radius-10' type='number' min={0} name='durationSec' value={form.durationSec} onChange={handleChange} />
                  </div>
                </>
              )}
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-sm'>CTA text</label>
                <input className='form-control radius-10' name='ctaText' value={form.ctaText} onChange={handleChange} />
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-sm'>CTA link</label>
                <input className='form-control radius-10' name='ctaLink' value={form.ctaLink} onChange={handleChange} />
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-sm'>Redirect type</label>
                <select className='form-select radius-10' name='redirectType' value={form.redirectType} onChange={handleChange}>
                  <option value='external'>External URL</option>
                  <option value='internal'>Internal (ID)</option>
                </select>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-sm'>Redirect ID</label>
                <input className='form-control radius-10' name='redirectId' value={form.redirectId} onChange={handleChange} placeholder='Product / category / service ID' />
              </div>
              {(tab === "content" || tab === "video") && (
                <>
                  <div className='col-12'>
                    <div className='border rounded-12 p-12 bg-neutral-50'>
                      <div className='fw-semibold mb-6'>CTA Destination</div>
                      <small className='text-secondary-light'>Where the CTA button takes the customer.</small>
                      <div className='row g-12 mt-6'>
                        <div className='col-md-6'>
                          <label className='form-label fw-semibold text-sm'>Link Type</label>
                          <select className='form-select radius-10' name='linkType' value={form.linkType} onChange={handleChange}>
                            <option value='none'>No link</option>
                            <option value='external_url'>External URL</option>
                            <option value='product_category'>Product Category</option>
                            <option value='service'>Service</option>
                          </select>
                        </div>
                        <div className='col-md-6'>
                          <label className='form-label fw-semibold text-sm'>Target</label>
                          {form.linkType === "product_category" ? (
                            <select className='form-select radius-10' name='linkTarget' value={form.linkTarget} onChange={handleChange}>
                              <option value=''>Pick a category</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          ) : form.linkType === "service" ? (
                            <select className='form-select radius-10' name='linkTarget' value={form.linkTarget} onChange={handleChange}>
                              <option value=''>Pick a service</option>
                              {services.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          ) : (
                            <input className='form-control radius-10' name='linkTarget' value={form.linkTarget} onChange={handleChange} placeholder={form.linkType === "external_url" ? "https://..." : "Pick a link type first"} disabled={form.linkType === "none"} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {tab === "content" && (
                    <>
                      <div className='col-md-6'>
                        <label className='form-label fw-semibold text-sm'>Target Location</label>
                        <input className='form-control radius-10' name='targetLocation' value={form.targetLocation} onChange={handleChange} placeholder="City name or 'all'" />
                      </div>
                      <div className='col-md-6'>
                        <label className='form-label fw-semibold text-sm'>Target Segment</label>
                        <select className='form-select radius-10' name='targetSegment' value={form.targetSegment} onChange={handleChange}>
                          <option value='all_users'>All Users</option>
                          <option value='new_users'>New Users</option>
                          <option value='returning_users'>Returning Users</option>
                          <option value='premium_users'>Premium Users</option>
                        </select>
                      </div>
                    </>
                  )}
                  {tab === "video" && (
                    <>
                      <div className='col-md-6'>
                        <label className='form-label fw-semibold text-sm'>Display Mode</label>
                        <select className='form-select radius-10' name='displayMode' value={form.displayMode} onChange={handleChange}>
                          <option value='floating_pip'>Floating (small PiP)</option>
                          <option value='inline'>Inline</option>
                          <option value='fullscreen'>Fullscreen</option>
                        </select>
                      </div>
                      <div className='col-md-6'>
                        <label className='form-label fw-semibold text-sm'>Show after (seconds)</label>
                        <input className='form-control radius-10' type='number' min={0} name='showAfterSeconds' value={form.showAfterSeconds} onChange={handleChange} />
                      </div>
                      <div className='col-12'>
                        <div className='form-check'>
                          <input className='form-check-input' type='checkbox' id='auto-expand' name='autoExpandFullscreen' checked={form.autoExpandFullscreen} onChange={handleChange} />
                          <label className='form-check-label' htmlFor='auto-expand'>
                            Auto-expand to fullscreen after 5 seconds
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className='col-md-4'>
                <label className='form-label fw-semibold text-sm'>Theme header color</label>
                <input className='form-control radius-10' name='themeHeaderColor' value={form.themeHeaderColor} onChange={handleChange} placeholder='#FFFFFF' />
              </div>
              <div className='col-md-4'>
                <label className='form-label fw-semibold text-sm'>Theme BG color</label>
                <input className='form-control radius-10' name='themeBgColor' value={form.themeBgColor} onChange={handleChange} placeholder='#149A9A' />
              </div>
              <div className='col-md-4'>
                <label className='form-label fw-semibold text-sm'>Theme button color</label>
                <input className='form-control radius-10' name='themeButtonColor' value={form.themeButtonColor} onChange={handleChange} placeholder='#1CCAD8' />
              </div>
              <div className='col-12'>
                <label className='form-label fw-semibold text-sm'>Background gradient (CSS)</label>
                <input className='form-control radius-10' name='backgroundGradient' value={form.backgroundGradient} onChange={handleChange} placeholder='linear-gradient(135deg, #667eea, #764ba2)' />
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-sm'>Start date</label>
                <input className='form-control radius-10' type='datetime-local' name='startDate' value={form.startDate} onChange={handleChange} />
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-sm'>End date</label>
                <input className='form-control radius-10' type='datetime-local' name='endDate' value={form.endDate} onChange={handleChange} />
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-sm'>Festival tag</label>
                <input className='form-control radius-10' name='festivalTag' value={form.festivalTag} onChange={handleChange} placeholder='e.g. Diwali, Christmas' />
              </div>
            </div>
            <div className='d-flex justify-content-end gap-10 pt-8 border-top'>
              <button type='button' className='btn btn-light border radius-10' onClick={() => setModal(null)} disabled={submitting}>Cancel</button>
              <button type='submit' className='btn btn-primary radius-10' disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  );
};

export default HomepageCmsLayer;

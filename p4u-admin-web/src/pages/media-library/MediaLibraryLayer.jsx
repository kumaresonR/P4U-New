import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import {
  browseMediaLibraryB2,
  createMediaLibraryFolder,
  deleteMediaLibraryAsset,
  getMediaLibraryB2Status,
  importMediaLibraryFromB2,
  listMediaLibraryAssets,
  listMediaLibraryFolders,
  listMediaMigrateCandidates,
  migrateMediaAssetToB2,
  uploadMediaLibraryFiles,
  uploadMediaLibraryZip,
} from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { resolveMediaUrl } from "../../lib/resolveMediaUrl";
import { formatDateTime } from "../../lib/formatters";
import FormModal from "../../components/admin/FormModal";

const TABS = [
  { key: "media", label: "Media Files", icon: "mdi:folder-outline" },
  { key: "b2", label: "Browse B2 Bucket", icon: "mdi:cloud-outline" },
  { key: "kyc", label: "KYC Documents", icon: "mdi:shield-account-outline" },
  { key: "migrate", label: "Migrate to B2", icon: "mdi:cloud-upload-outline" },
];

function formatBytes(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return "—";
  if (x < 1024) return `${x} B`;
  if (x < 1024 * 1024) return `${(x / 1024).toFixed(1)} KB`;
  if (x < 1024 * 1024 * 1024) return `${(x / (1024 * 1024)).toFixed(1)} MB`;
  return `${(x / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function parentB2Prefix(p) {
  const t = String(p || "").replace(/\/+$/, "");
  if (!t) return "";
  const parts = t.split("/").filter(Boolean);
  parts.pop();
  return parts.length ? `${parts.join("/")}/` : "";
}

function isImageMime(m) {
  return typeof m === "string" && m.startsWith("image/");
}

const MediaLibraryLayer = () => {
  const [tab, setTab] = useState("media");
  const [folderSearch, setFolderSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [assets, setAssets] = useState([]);
  const [assetsTotal, setAssetsTotal] = useState(0);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [showZipModal, setShowZipModal] = useState(false);
  const [zipTargetId, setZipTargetId] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const [zipBusy, setZipBusy] = useState(false);

  const [b2Configured, setB2Configured] = useState(false);
  const [b2Prefix, setB2Prefix] = useState("");
  const [b2Browse, setB2Browse] = useState(null);
  const [b2Loading, setB2Loading] = useState(false);
  const [b2Selected, setB2Selected] = useState(() => new Set());

  const [showImportModal, setShowImportModal] = useState(false);
  const [importTargetId, setImportTargetId] = useState("");
  const [importFolders, setImportFolders] = useState([]);
  const [importBusy, setImportBusy] = useState(false);

  const [migrateItems, setMigrateItems] = useState([]);
  const [migrateTotal, setMigrateTotal] = useState(0);
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [migrateBusyId, setMigrateBusyId] = useState("");

  const filesInputRef = React.useRef(null);
  const zipInputRef = React.useRef(null);

  const folderKind = tab === "kyc" ? "kyc" : "general";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(folderSearch), 400);
    return () => clearTimeout(t);
  }, [folderSearch]);

  useEffect(() => {
    if (tab !== "media" && tab !== "kyc") setSelectedFolder(null);
  }, [tab]);

  const loadFolders = useCallback(async () => {
    if (tab !== "media" && tab !== "kyc") return;
    setLoadingFolders(true);
    try {
      const res = await listMediaLibraryFolders({
        kind: folderKind,
        q: debouncedQ.trim() || undefined,
      });
      setFolders(Array.isArray(res.items) ? res.items : []);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  }, [tab, folderKind, debouncedQ]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const loadAssets = useCallback(async () => {
    if (!selectedFolder?.id) return;
    setLoadingAssets(true);
    try {
      const res = await listMediaLibraryAssets(selectedFolder.id, { limit: 100, offset: 0 });
      setAssets(Array.isArray(res.items) ? res.items : []);
      setAssetsTotal(typeof res.total === "number" ? res.total : 0);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  }, [selectedFolder?.id]);

  useEffect(() => {
    if (selectedFolder?.id) loadAssets();
    else {
      setAssets([]);
      setAssetsTotal(0);
    }
  }, [selectedFolder?.id, loadAssets]);

  const refreshB2Status = useCallback(async () => {
    try {
      const s = await getMediaLibraryB2Status();
      setB2Configured(!!s.configured);
    } catch {
      setB2Configured(false);
    }
  }, []);

  const loadB2Browse = useCallback(async () => {
    setB2Loading(true);
    try {
      const data = await browseMediaLibraryB2({ prefix: b2Prefix });
      setB2Browse(data);
      setB2Selected(new Set());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
      setB2Browse(null);
    } finally {
      setB2Loading(false);
    }
  }, [b2Prefix]);

  useEffect(() => {
    if (tab === "b2" || tab === "migrate") refreshB2Status();
  }, [tab, refreshB2Status]);

  useEffect(() => {
    if (tab === "b2" && b2Configured) loadB2Browse();
  }, [tab, b2Configured, loadB2Browse]);

  const loadMigrate = useCallback(async () => {
    setMigrateLoading(true);
    try {
      const res = await listMediaMigrateCandidates({ limit: 80, offset: 0 });
      setMigrateItems(Array.isArray(res.items) ? res.items : []);
      setMigrateTotal(typeof res.total === "number" ? res.total : 0);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
      setMigrateItems([]);
    } finally {
      setMigrateLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "migrate") loadMigrate();
  }, [tab, loadMigrate]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) {
      toast.error("Folder name is required.");
      return;
    }
    setCreatingFolder(true);
    try {
      await createMediaLibraryFolder({ name, kind: folderKind });
      toast.success("Folder created.");
      setNewFolderName("");
      setShowNewFolder(false);
      await loadFolders();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setCreatingFolder(false);
    }
  };

  const openZipModal = () => {
    if (!folders.length) {
      toast.info("Create a folder first.");
      return;
    }
    setZipTargetId(selectedFolder?.id || folders[0]?.id || "");
    setZipFile(null);
    setShowZipModal(true);
  };

  const submitZip = async (e) => {
    e.preventDefault();
    if (!zipTargetId) {
      toast.error("Choose a target folder.");
      return;
    }
    if (!zipFile) {
      toast.error("Choose a ZIP file.");
      return;
    }
    setZipBusy(true);
    try {
      const res = await uploadMediaLibraryZip(zipTargetId, zipFile);
      toast.success(`Extracted ${res.created ?? 0} file(s).`);
      setShowZipModal(false);
      setZipFile(null);
      await loadFolders();
      if (selectedFolder?.id === zipTargetId) await loadAssets();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setZipBusy(false);
    }
  };

  const uploadDropped = async (fileList) => {
    const arr = Array.from(fileList || []).filter((f) => f.size > 0);
    if (!arr.length) return;
    if (!selectedFolder?.id) {
      toast.info("Open a folder first, then drop files there.");
      return;
    }
    try {
      await uploadMediaLibraryFiles(selectedFolder.id, arr);
      toast.success(`Uploaded ${arr.length} file(s).`);
      await loadAssets();
      await loadFolders();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    uploadDropped(e.dataTransfer?.files);
  };

  const toggleB2Key = (key) => {
    setB2Selected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openImportModal = async () => {
    if (b2Selected.size === 0) {
      toast.error("Select at least one file in the bucket.");
      return;
    }
    try {
      const res = await listMediaLibraryFolders({ kind: "all" });
      const list = Array.isArray(res.items) ? res.items : [];
      setImportFolders(list);
      setImportTargetId(list[0]?.id || "");
      setShowImportModal(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    }
  };

  const submitImport = async (e) => {
    e.preventDefault();
    if (!importTargetId) {
      toast.error("Choose a destination folder.");
      return;
    }
    const keys = [...b2Selected];
    setImportBusy(true);
    try {
      const res = await importMediaLibraryFromB2({ keys, folderId: importTargetId });
      toast.success(`Imported ${res.imported ?? 0} file(s) into Media Library.`);
      setShowImportModal(false);
      await loadFolders();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setImportBusy(false);
    }
  };

  const handleMigrateOne = async (id) => {
    setMigrateBusyId(id);
    try {
      await migrateMediaAssetToB2(id);
      toast.success("Copied to B2 and updated record.");
      await loadMigrate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setMigrateBusyId("");
    }
  };

  const handleDeleteAsset = async (id) => {
    if (!window.confirm("Delete this file from the library?")) return;
    try {
      await deleteMediaLibraryAsset(id);
      toast.success("Deleted.");
      await loadAssets();
      await loadFolders();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    }
  };

  const b2LocationLabel = useMemo(() => {
    const p = b2Browse?.currentPrefix ?? b2Prefix;
    if (!p) return "/(root)";
    return `/${p.replace(/\/+$/, "")}`;
  }, [b2Browse, b2Prefix]);

  const renderFolderGrid = () => (
    <div>
      <div className='d-flex flex-wrap align-items-center justify-content-between gap-12 mb-16'>
        <h5 className='fw-bold mb-0'>Folders</h5>
        <div className='d-flex flex-wrap align-items-center gap-8'>
          <div className='input-group radius-10' style={{ width: 220, maxWidth: "100%" }}>
            <span className='input-group-text bg-base border-end-0'>
              <Icon icon='mdi:magnify' />
            </span>
            <input
              className='form-control border-start-0 radius-10'
              placeholder='Search folders…'
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
            />
          </div>
          <button type='button' className='btn btn-outline-primary radius-10' onClick={() => setShowNewFolder(true)}>
            <Icon icon='mdi:folder-plus-outline' className='text-lg me-4' />
            New Folder
          </button>
          <button type='button' className='btn btn-outline-secondary radius-10' onClick={openZipModal}>
            <Icon icon='mdi:folder-zip-outline' className='text-lg me-4' />
            Upload ZIP
          </button>
        </div>
      </div>
      {loadingFolders ? (
        <p className='text-secondary-light'>Loading…</p>
      ) : (
        <div className='row g-16'>
          {folders.map((f) => (
            <div key={f.id} className='col-sm-6 col-md-4 col-lg-3'>
              <button
                type='button'
                className='card border-0 shadow-sm radius-12 p-20 w-100 text-start bg-base h-100 hover-border-primary-200'
                style={{ border: "1px solid var(--neutral-200, #e9ecef)" }}
                onClick={() => setSelectedFolder(f)}
              >
                <div className='d-flex flex-column align-items-center text-center gap-8'>
                  <Icon icon='mdi:folder-outline' className='text-4xl text-primary-600' />
                  <div className='fw-semibold text-truncate w-100' title={f.name}>
                    {f.name}
                  </div>
                  <span className='badge bg-primary-50 text-primary-600 radius-8'>
                    {f.fileCount ? `${f.fileCount} files` : "Empty"}
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFolderDetail = () => (
    <div
      className={`radius-12 p-20 ${dragActive ? "border border-primary-600 bg-primary-50" : "border"}`}
      style={{ borderColor: "var(--neutral-200, #e9ecef)" }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className='d-flex flex-wrap align-items-center justify-content-between gap-12 mb-16'>
        <div className='d-flex align-items-center gap-12'>
          <button type='button' className='btn btn-sm btn-outline-secondary radius-8' onClick={() => setSelectedFolder(null)}>
            <Icon icon='mdi:arrow-left' className='text-lg' />
            Back
          </button>
          <h5 className='fw-bold mb-0'>{selectedFolder.name}</h5>
          <span className='text-secondary-light text-sm'>{assetsTotal} files</span>
        </div>
        <div className='d-flex flex-wrap gap-8'>
          <input ref={filesInputRef} type='file' multiple className='d-none' onChange={(e) => uploadDropped(e.target.files)} />
          <button type='button' className='btn btn-primary radius-10' onClick={() => filesInputRef.current?.click()}>
            <Icon icon='mdi:upload' className='text-lg me-4' />
            Upload files
          </button>
          <button
            type='button'
            className='btn btn-outline-secondary radius-10'
            onClick={() => {
              setZipTargetId(selectedFolder.id);
              zipInputRef.current?.click();
            }}
          >
            <Icon icon='mdi:folder-zip-outline' className='text-lg me-4' />
            Upload ZIP
          </button>
          <input
            ref={zipInputRef}
            type='file'
            accept='.zip,application/zip'
            className='d-none'
            onChange={async (e) => {
              const z = e.target.files?.[0];
              e.target.value = "";
              if (!z || !selectedFolder) return;
              try {
                const res = await uploadMediaLibraryZip(selectedFolder.id, z);
                toast.success(`Extracted ${res.created ?? 0} file(s).`);
                await loadAssets();
                await loadFolders();
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : String(err));
              }
            }}
          />
        </div>
      </div>
      {loadingAssets ? (
        <p className='text-secondary-light'>Loading…</p>
      ) : assets.length === 0 ? (
        <p className='text-secondary-light mb-0'>No files in this folder yet. Drop files here or use Upload.</p>
      ) : (
        <div className='row g-12'>
          {assets.map((a) => (
            <div key={a.id} className='col-6 col-md-4 col-lg-3 col-xl-2'>
              <div className='border radius-12 overflow-hidden h-100 position-relative bg-neutral-50'>
                <div className='bg-base d-flex align-items-center justify-content-center' style={{ minHeight: 140 }}>
                  {isImageMime(a.mime) ? (
                    <img src={resolveMediaUrl(a.fileUrl) || a.fileUrl} alt='' className='object-fit-contain w-100 p-8' style={{ maxHeight: 140 }} />
                  ) : (
                    <Icon icon='mdi:file-document-outline' className='text-4xl text-secondary-light' />
                  )}
                </div>
                <div className='p-8'>
                  <div className='text-xs text-truncate' title={a.originalName}>
                    {a.originalName}
                  </div>
                  <div className='text-xs text-neutral-500'>{formatBytes(a.sizeBytes)}</div>
                  <div className='d-flex gap-4 mt-8'>
                    <a className='btn btn-outline-primary btn-sm py-0 px-8 radius-6' href={a.fileUrl} target='_blank' rel='noreferrer'>
                      Open
                    </a>
                    <button type='button' className='btn btn-outline-danger btn-sm py-0 px-8 radius-6' onClick={() => handleDeleteAsset(a.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className='d-flex flex-wrap gap-8 mb-24'>
        {TABS.map((t) => (
          <button
            key={t.key}
            type='button'
            className={`btn radius-10 px-16 py-10 d-inline-flex align-items-center gap-8 ${
              tab === t.key ? "btn-primary shadow-sm" : "btn-outline-secondary"
            }`}
            onClick={() => setTab(t.key)}
          >
            <Icon icon={t.icon} className='text-xl' />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "media" && (
        <div className='card border-0 shadow-sm radius-16 p-24'>
          {!selectedFolder ? renderFolderGrid() : renderFolderDetail()}
        </div>
      )}

      {tab === "kyc" && (
        <div className='card border-0 shadow-sm radius-16 p-24'>
          {!selectedFolder ? renderFolderGrid() : renderFolderDetail()}
        </div>
      )}

      {tab === "b2" && (
        <div className='card border-0 shadow-sm radius-16 p-24'>
          {!b2Configured ? (
            <div className='alert alert-warning radius-12 mb-0'>
              Backblaze B2 is not configured. Set <code>B2_S3_ENDPOINT</code>, <code>B2_APPLICATION_KEY_ID</code>,{" "}
              <code>B2_APPLICATION_KEY</code>, and <code>B2_BUCKET_NAME</code> in the admin service environment (see <code>.env.example</code>
              ).
            </div>
          ) : (
            <>
              <h5 className='fw-bold mb-4'>Live Backblaze B2 Browser</h5>
              <p className='text-secondary-light mb-16'>
                Browse the actual public bucket. Click a folder to navigate; select files and import them into the Media Library.
              </p>
              <div className='d-flex flex-wrap align-items-center gap-8 mb-20'>
                <button type='button' className='btn btn-outline-secondary radius-10' onClick={() => setB2Prefix(parentB2Prefix(b2Prefix))}>
                  <Icon icon='mdi:arrow-left' className='text-lg me-4' />
                  Up
                </button>
                <input
                  className='form-control radius-10 flex-grow-1'
                  style={{ minWidth: 200 }}
                  placeholder='Browse path (e.g. Products/, Vendors/115/)'
                  value={b2Prefix}
                  onChange={(e) => setB2Prefix(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadB2Browse();
                  }}
                />
                <button type='button' className='btn btn-outline-primary radius-10' onClick={() => loadB2Browse()} disabled={b2Loading}>
                  <Icon icon='mdi:refresh' className='text-lg me-4' />
                  Refresh
                </button>
                <span className='text-secondary-light text-sm ms-auto'>Current: {b2LocationLabel}</span>
              </div>
              {b2Loading && !b2Browse ? (
                <p className='text-secondary-light'>Loading…</p>
              ) : (
                <>
                  <div className='d-flex flex-wrap align-items-center justify-content-between gap-8 mb-12'>
                    <h6 className='fw-semibold mb-0'>
                      Folders ({b2Browse?.prefixes?.length ?? 0})
                    </h6>
                    <button type='button' className='btn btn-sm btn-primary radius-8' disabled={!b2Selected.size} onClick={openImportModal}>
                      Import selected into Media Library
                    </button>
                  </div>
                  <div className='row g-12 mb-24'>
                    {(b2Browse?.prefixes || []).map((pf) => (
                      <div key={pf.fullPrefix} className='col-6 col-sm-4 col-md-3 col-lg-2'>
                        <button
                          type='button'
                          className='card border-0 shadow-sm radius-12 p-16 w-100 text-center bg-base'
                          onClick={() => setB2Prefix(pf.fullPrefix)}
                        >
                          <Icon icon='mdi:folder-outline' className='text-3xl text-primary-600' />
                          <div className='text-sm text-truncate mt-4' title={pf.name}>
                            {pf.name}
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                  <h6 className='fw-semibold mb-8'>Files</h6>
                  <div className='table-responsive radius-12 border'>
                    <table className='table align-middle mb-0'>
                      <thead className='bg-neutral-50'>
                        <tr>
                          <th style={{ width: 40 }} />
                          <th>Name</th>
                          <th>Size</th>
                          <th>Modified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(b2Browse?.objects || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className='text-secondary-light py-20 text-center'>
                              No files at this level.
                            </td>
                          </tr>
                        ) : (
                          b2Browse.objects.map((o) => (
                            <tr key={o.key}>
                              <td>
                                <input type='checkbox' checked={b2Selected.has(o.key)} onChange={() => toggleB2Key(o.key)} />
                              </td>
                              <td className='text-truncate' style={{ maxWidth: 280 }} title={o.key}>
                                {o.key.replace(b2Browse.currentPrefix || "", "")}
                              </td>
                              <td>{formatBytes(o.size)}</td>
                              <td className='text-nowrap text-secondary-light text-sm'>{formatDateTime(o.lastModified)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {tab === "migrate" && (
        <div className='card border-0 shadow-sm radius-16 p-24'>
          <h5 className='fw-bold mb-4'>Migrate to B2</h5>
          <p className='text-secondary-light mb-16'>
            Copy files that are still stored on the admin server disk into your B2 bucket. Requires B2 env vars and{" "}
            <code>B2_PUBLIC_FILE_BASE</code> so the library can store a public URL on each asset.
          </p>
          {!b2Configured ? (
            <div className='alert alert-warning radius-12'>Configure B2 first (same as Browse B2 tab).</div>
          ) : migrateLoading ? (
            <p className='text-secondary-light'>Loading…</p>
          ) : migrateItems.length === 0 ? (
            <p className='text-secondary-light mb-0'>No local-only assets pending migration.</p>
          ) : (
            <>
              <p className='text-sm text-secondary-light mb-12'>Showing {migrateItems.length} of {migrateTotal} local file(s).</p>
              <div className='table-responsive radius-12 border'>
                <table className='table align-middle mb-0'>
                  <thead className='bg-neutral-50'>
                    <tr>
                      <th>File</th>
                      <th>Size</th>
                      <th>Updated</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {migrateItems.map((a) => (
                      <tr key={a.id}>
                        <td className='text-truncate' style={{ maxWidth: 260 }} title={a.originalName}>
                          {a.originalName}
                        </td>
                        <td>{formatBytes(a.sizeBytes)}</td>
                        <td className='text-secondary-light text-sm text-nowrap'>{formatDateTime(a.updatedAt)}</td>
                        <td className='text-end'>
                          <button
                            type='button'
                            className='btn btn-sm btn-primary radius-8'
                            disabled={migrateBusyId === a.id}
                            onClick={() => handleMigrateOne(a.id)}
                          >
                            {migrateBusyId === a.id ? "Working…" : "Copy to B2"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {showNewFolder && (
        <FormModal onClose={() => !creatingFolder && setShowNewFolder(false)} size='sm'>
          <h5 className='fw-bold mb-16'>New folder</h5>
          <form onSubmit={handleCreateFolder} className='d-flex flex-column gap-12'>
            <div>
              <label className='form-label text-sm fw-semibold'>Name</label>
              <input className='form-control radius-10' value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus />
            </div>
            <div className='d-flex gap-8 justify-content-end'>
              <button type='button' className='btn btn-outline-secondary radius-10' disabled={creatingFolder} onClick={() => setShowNewFolder(false)}>
                Cancel
              </button>
              <button type='submit' className='btn btn-primary radius-10' disabled={creatingFolder}>
                {creatingFolder ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </FormModal>
      )}

      {showZipModal && (
        <FormModal onClose={() => !zipBusy && setShowZipModal(false)} size='md'>
          <h5 className='fw-bold mb-16'>Upload ZIP</h5>
          <form onSubmit={submitZip} className='d-flex flex-column gap-16'>
            <div>
              <label className='form-label text-sm fw-semibold'>Target folder</label>
              <select className='form-select radius-10' value={zipTargetId} onChange={(e) => setZipTargetId(e.target.value)}>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className='form-label text-sm fw-semibold'>ZIP file</label>
              <input type='file' accept='.zip,application/zip' className='form-control radius-10' onChange={(e) => setZipFile(e.target.files?.[0] || null)} />
            </div>
            <div className='d-flex gap-8 justify-content-end'>
              <button type='button' className='btn btn-outline-secondary radius-10' disabled={zipBusy} onClick={() => setShowZipModal(false)}>
                Cancel
              </button>
              <button type='submit' className='btn btn-primary radius-10' disabled={zipBusy}>
                {zipBusy ? "Uploading…" : "Upload & extract"}
              </button>
            </div>
          </form>
        </FormModal>
      )}

      {showImportModal && (
        <FormModal onClose={() => !importBusy && setShowImportModal(false)} size='md'>
          <h5 className='fw-bold mb-16'>Import into Media Library</h5>
          <p className='text-sm text-secondary-light mb-12'>{b2Selected.size} file(s) selected from B2.</p>
          <form onSubmit={submitImport} className='d-flex flex-column gap-16'>
            <div>
              <label className='form-label text-sm fw-semibold'>Destination folder</label>
              <select className='form-select radius-10' value={importTargetId} onChange={(e) => setImportTargetId(e.target.value)}>
                {importFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.kind})
                  </option>
                ))}
              </select>
            </div>
            <div className='d-flex gap-8 justify-content-end'>
              <button type='button' className='btn btn-outline-secondary radius-10' disabled={importBusy} onClick={() => setShowImportModal(false)}>
                Cancel
              </button>
              <button type='submit' className='btn btn-primary radius-10' disabled={importBusy}>
                {importBusy ? "Importing…" : "Import"}
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  );
};

export default MediaLibraryLayer;

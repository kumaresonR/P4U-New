import { api, ApiError, ensureTokenFresh } from "./client";
import { buildApiUrl } from "./config";
import { getAccessToken } from "./tokenStorage";

/** @param {{ username: string, password: string }} body */
export function loginPublic(body) {
  return api.post("/api/auth/public/login", body, { skipAuth: true });
}

/** Upload a single file and return { url, filename, originalName, size } */
export async function uploadFile(file) {
  if (!file || !(file instanceof Blob)) {
    throw new ApiError(400, "No file to upload", {});
  }
  try {
    await ensureTokenFresh();
  } catch {
    /* same as apiRequest: proceed; 401 handled below */
  }
  const formData = new FormData();
  formData.append("file", file, file.name);
  const url = buildApiUrl("/api/admin/upload");
  const headers = {};
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Do NOT set Content-Type - browser auto-sets multipart/form-data with boundary
  const res = await fetch(url, { method: "POST", headers, body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message || "Upload failed", data);
  }
  return res.json();
}

export function fetchAdminMetadata() {
  return api.get("/api/admin/metadata/all/null");
}

/**
 * @param {{ limit?: number, offset?: number, status?: string, vendorKind?: 'product'|'service', type?: 'PRODUCT'|'SERVICE' }} [params]
 * `type` is sent as `type` query (backend also accepts `vendorKind`).
 */
export function listVendors(params = {}) {
  const p = { ...params };
  if (p.type != null && p.vendorKind == null) {
    const u = String(p.type).trim().toUpperCase();
    if (u === "PRODUCT") p.vendorKind = "product";
    if (u === "SERVICE") p.vendorKind = "service";
    delete p.type;
  }
  return api.get("/api/admin/vendors", p);
}

export function getVendor(id) {
  return api.get(`/api/admin/vendors/${encodeURIComponent(id)}`);
}

export function createVendor(body) {
  return api.post("/api/admin/vendors", body);
}

export function updateVendor(id, body) {
  return api.patch(`/api/admin/vendors/${encodeURIComponent(id)}`, body);
}

export function deleteVendor(id) {
  return api.delete(`/api/admin/vendors/${encodeURIComponent(id)}`);
}

/* ─── Vendor portal (used by vendor users in the same admin shell) ─── */
const VENDOR_BASE = "/api/v1/vendor";

export function getMyVendorPlan() {
  return api.get(`${VENDOR_BASE}/me/plan`);
}

export function listMySettlements(params) {
  return api.get(`${VENDOR_BASE}/me/settlements`, params);
}

export function setVendorCategoryOverride(categoryId, commissionOverridePercent) {
  return api.patch(`${VENDOR_BASE}/me/categories/${encodeURIComponent(categoryId)}/override`, {
    commissionOverridePercent,
  });
}

export function setVendorProductOverride(productId, commissionOverridePercent) {
  return api.patch(`${VENDOR_BASE}/me/products/${encodeURIComponent(productId)}/override`, {
    commissionOverridePercent,
  });
}

export function listCustomers(params) {
  return api.get("/api/admin/customers", params);
}

/** Customer-to-customer referrals (`customer_referrals`), enriched for admin reports. */
export function listCustomerReferrals(params) {
  return api.get("/api/admin/customerReferrals", params);
}

export function getCustomer(id) {
  return api.get(`/api/admin/customers/${encodeURIComponent(id)}`);
}

export function createCustomer(body) {
  return api.post("/api/admin/customers", body);
}

export function updateCustomer(id, body) {
  return api.patch(`/api/admin/customers/${encodeURIComponent(id)}`, body);
}

export function deleteCustomer(id) {
  return api.delete(`/api/admin/customers/${encodeURIComponent(id)}`);
}

export function listOccupations(params) {
  return api.get("/api/admin/occupations", params);
}

export function listProducts(params) {
  return api.get("/api/admin/products", params);
}

export function getProduct(id) {
  return api.get(`/api/admin/products/${encodeURIComponent(id)}`);
}

export function createProduct(body) {
  return api.post("/api/admin/products", body);
}

export function updateProduct(id, body) {
  return api.patch(`/api/admin/products/${encodeURIComponent(id)}`, body);
}

export function deleteProduct(id) {
  return api.delete(`/api/admin/products/${encodeURIComponent(id)}`);
}

/** Vendor ↔ catalog service links (`catalog_vendor_services`). Requires vendorId, serviceId, or moderationStatus. */
export function listVendorServiceLinks(params) {
  return api.get("/api/admin/vendor-services", params);
}

export function updateVendorServiceLink(id, body) {
  return api.patch(`/api/admin/vendor-services/${encodeURIComponent(id)}`, body);
}

export function listProductAttributes(params) {
  return api.get("/api/admin/product-attributes", params);
}

export function getProductAttribute(id) {
  return api.get(`/api/admin/product-attributes/${encodeURIComponent(id)}`);
}

export function createProductAttribute(body) {
  return api.post("/api/admin/product-attributes", body);
}

export function updateProductAttribute(id, body) {
  return api.patch(`/api/admin/product-attributes/${encodeURIComponent(id)}`, body);
}

export function deleteProductAttribute(id) {
  return api.delete(`/api/admin/product-attributes/${encodeURIComponent(id)}`);
}

export function listTaxConfigurations(params) {
  return api.get("/api/admin/taxconfiguration", params);
}

export function listVendorPlans(params) {
  return api.get("/api/admin/vendor-plans", params);
}

export function getVendorPlan(id) {
  return api.get(`/api/admin/vendor-plans/${encodeURIComponent(id)}`);
}

export function createVendorPlan(body) {
  return api.post("/api/admin/vendor-plans", body);
}

export function updateVendorPlan(id, body) {
  return api.patch(`/api/admin/vendor-plans/${encodeURIComponent(id)}`, body);
}

export function deleteVendorPlan(id) {
  return api.delete(`/api/admin/vendor-plans/${encodeURIComponent(id)}`);
}

export function createTaxConfiguration(body) {
  return api.post("/api/admin/taxconfiguration", body);
}

export function updateTaxConfiguration(id, body) {
  return api.patch(`/api/admin/taxconfiguration/${encodeURIComponent(id)}`, body);
}

export function deleteTaxConfiguration(id) {
  return api.delete(`/api/admin/taxconfiguration/${encodeURIComponent(id)}`);
}

/** Merged product roots + subcategories (shape matches legacy list for product forms). */
export async function listCategoriesForProducts(params) {
  const [roots, subs] = await Promise.all([
    api.get("/api/admin/product-categories", params),
    api.get("/api/admin/product-subcategories", params),
  ]);
  const rItems = roots.items || [];
  const sItems = subs.items || [];
  const items = [
    ...rItems.map((c) => ({ ...c, parentId: null })),
    ...sItems.map((s) => ({ ...s, parentId: s.productCategoryId })),
  ];
  return { items };
}

// ─── Product categories (shop) ───
export function listProductCategories(params) {
  return api.get("/api/admin/product-categories", params);
}

export function getProductCategory(id) {
  return api.get(`/api/admin/product-categories/${encodeURIComponent(id)}`);
}

export function createProductCategory(body) {
  return api.post("/api/admin/product-categories", body);
}

export function updateProductCategory(id, body) {
  return api.patch(`/api/admin/product-categories/${encodeURIComponent(id)}`, body);
}

export function deleteProductCategory(id) {
  return api.delete(`/api/admin/product-categories/${encodeURIComponent(id)}`);
}

// ─── Product subcategories ───
export function listProductSubcategories(params) {
  return api.get("/api/admin/product-subcategories", params);
}

export function getProductSubcategory(id) {
  return api.get(`/api/admin/product-subcategories/${encodeURIComponent(id)}`);
}

export function createProductSubcategory(body) {
  return api.post("/api/admin/product-subcategories", body);
}

export function updateProductSubcategory(id, body) {
  return api.patch(`/api/admin/product-subcategories/${encodeURIComponent(id)}`, body);
}

export function deleteProductSubcategory(id) {
  return api.delete(`/api/admin/product-subcategories/${encodeURIComponent(id)}`);
}

// ─── Service categories (booking) ───
export function listServiceCategories(params) {
  return api.get("/api/admin/service-categories", params);
}

export function getServiceCategory(id) {
  return api.get(`/api/admin/service-categories/${encodeURIComponent(id)}`);
}

export function createServiceCategory(body) {
  return api.post("/api/admin/service-categories", body);
}

export function updateServiceCategory(id, body) {
  return api.patch(`/api/admin/service-categories/${encodeURIComponent(id)}`, body);
}

export function deleteServiceCategory(id) {
  return api.delete(`/api/admin/service-categories/${encodeURIComponent(id)}`);
}

export function listCatalogServices(params) {
  return api.get("/api/admin/services", params);
}

export function getCatalogService(id) {
  return api.get(`/api/admin/services/${encodeURIComponent(id)}`);
}

export function createCatalogService(body) {
  return api.post("/api/admin/services", body);
}

export function updateCatalogService(id, body) {
  return api.patch(`/api/admin/services/${encodeURIComponent(id)}`, body);
}

export function deleteCatalogService(id) {
  return api.delete(`/api/admin/services/${encodeURIComponent(id)}`);
}

export function listOrders(params) {
  return api.get("/api/admin/orders", params);
}

/** Global order KPIs (optional filters: status, fromDate, toDate). */
export function getOrderStats(params = {}) {
  return api.get("/api/admin/orders/stats", params);
}

export function listOrdersForCustomer(customerId, params) {
  return api.get(`/api/admin/orders/customer/${encodeURIComponent(customerId)}`, params);
}

export function getOrder(id) {
  return api.get(`/api/admin/orders/individual/${encodeURIComponent(id)}`);
}

export function updateOrder(id, body) {
  return api.patch(`/api/admin/orders/individual/${encodeURIComponent(id)}`, body);
}

export function listServiceBookings(params) {
  return api.get("/api/v1/commerce/bookings/admin", params);
}

export function updateServiceBookingStatus(id, status) {
  return api.patch(`/api/v1/commerce/bookings/${encodeURIComponent(id)}/status`, { status });
}

export function deleteServiceBooking(id) {
  return api.delete(`/api/v1/commerce/bookings/${encodeURIComponent(id)}`);
}

export function listCoupons(params) {
  return api.get("/api/admin/coupons", params);
}

export function createCoupon(body) {
  return api.post("/api/admin/coupons", body);
}

export function updateCoupon(id, body) {
  return api.patch(`/api/admin/coupons/${encodeURIComponent(id)}`, body);
}

export function deleteCoupon(id) {
  return api.delete(`/api/admin/coupons/${encodeURIComponent(id)}`);
}

/** No GET /coupons/:id; locate by paging list (max limit 200 on server). */
export async function fetchCouponById(id) {
  const limit = 200;
  let offset = 0;
  for (let p = 0; p < 25; p++) {
    const res = await listCoupons({ limit, offset });
    const items = res.items || [];
    const row = items.find((c) => c.id === id);
    if (row) return row;
    const total = typeof res.total === "number" ? res.total : 0;
    offset += items.length;
    if (items.length === 0 || offset >= total) break;
  }
  return null;
}

export function getOccupation(id) {
  return api.get(`/api/admin/occupations/${encodeURIComponent(id)}`);
}

export function createOccupation(body) {
  return api.post("/api/admin/occupations", body);
}

export function updateOccupation(id, body) {
  return api.patch(`/api/admin/occupations/${encodeURIComponent(id)}`, body);
}

export function deleteOccupation(id) {
  return api.delete(`/api/admin/occupations/${encodeURIComponent(id)}`);
}

export function listVendorEnquiries(params) {
  return api.get("/api/admin/vendor-enquiries", params);
}

export function getVendorEnquiry(id) {
  return api.get(`/api/admin/vendor-enquiries/${encodeURIComponent(id)}`);
}

export function updateVendorEnquiry(id, body) {
  return api.patch(`/api/admin/vendor-enquiries/${encodeURIComponent(id)}`, body);
}

export function listVendorRequests(params) {
  return api.get("/api/admin/vendor-requests", params);
}

export function deleteVendorRequest(id) {
  return api.delete(`/api/admin/vendor-requests/${encodeURIComponent(id)}`);
}

export const OCCUPATION_ADMIN_CREATE_ENABLED_KEY = "OCCUPATION_ADMIN_CREATE_ENABLED";

export function listPlatformVariables(params) {
  return api.get("/api/admin/platformVariables", params);
}

export function getPlatformVariableByKey(key) {
  return api.get(`/api/admin/platformVariables/by-key/${encodeURIComponent(key)}`);
}

export function createPlatformVariable(body) {
  return api.post("/api/admin/platformVariables", body);
}

export function updatePlatformVariable(id, body) {
  return api.patch(`/api/admin/platformVariables/${encodeURIComponent(id)}`, body);
}

export function deletePlatformVariable(id) {
  return api.delete(`/api/admin/platformVariables/${encodeURIComponent(id)}`);
}

/** Point-style settlements from commerce (settlementType points). */
export function listPointsSettlements(params) {
  return api.get("/api/admin/Settlements/allPoints/null", params);
}

export function listCashSettlements(params) {
  return api.get("/api/admin/Settlements/allCash/null", params);
}

export function getSettlement(id) {
  return api.get(`/api/admin/Settlements/individual/${encodeURIComponent(id)}`);
}

export function createSettlement(body) {
  return api.post("/api/admin/Settlements", body);
}

export function updateSettlement(id, body) {
  return api.patch(`/api/admin/Settlements/individual/${encodeURIComponent(id)}`, body);
}

export function listObjectionableFeedLogs(params) {
  return api.get("/api/admin/objectionableFeedLog", params);
}

export function updateObjectionableFeedLog(id, body) {
  return api.patch(`/api/admin/objectionableFeedLog/batchFeed/${encodeURIComponent(id)}`, body);
}

/** @param {{ limit?: number, offset?: number }} [params] */
export function listRecentPushNotifications(params) {
  return api.get("/api/admin/notifications/recent", params);
}

export function sendPushNotification(body) {
  return api.post("/api/admin/notifications/send", body);
}

/** @param {{ kind?: 'all'|'general'|'kyc', q?: string }} [params] */
export function listMediaLibraryFolders(params) {
  return api.get("/api/admin/media-library/folders", params);
}

export function createMediaLibraryFolder(body) {
  return api.post("/api/admin/media-library/folders", body);
}

/** @param {{ limit?: number, offset?: number }} [params] */
export function listMediaLibraryAssets(folderId, params) {
  return api.get(`/api/admin/media-library/folders/${encodeURIComponent(folderId)}/assets`, params);
}

export async function uploadMediaLibraryFiles(folderId, files) {
  if (!folderId || !files?.length) {
    throw new ApiError(400, "No files to upload", {});
  }
  try {
    await ensureTokenFresh();
  } catch {
    /* proceed */
  }
  const formData = new FormData();
  for (const f of files) {
    formData.append("files", f, f.name);
  }
  const url = buildApiUrl(`/api/admin/media-library/folders/${encodeURIComponent(folderId)}/upload`);
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message || "Upload failed", data);
  }
  return res.json();
}

export async function uploadMediaLibraryZip(folderId, zipFile) {
  if (!folderId || !zipFile) {
    throw new ApiError(400, "No ZIP file", {});
  }
  try {
    await ensureTokenFresh();
  } catch {
    /* proceed */
  }
  const formData = new FormData();
  formData.append("zip", zipFile, zipFile.name);
  const url = buildApiUrl(`/api/admin/media-library/folders/${encodeURIComponent(folderId)}/upload-zip`);
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message || "ZIP upload failed", data);
  }
  return res.json();
}

export function deleteMediaLibraryAsset(id) {
  return api.delete(`/api/admin/media-library/assets/${encodeURIComponent(id)}`);
}

export function getMediaLibraryB2Status() {
  return api.get("/api/admin/media-library/b2/status");
}

/** @param {{ prefix?: string }} [params] */
export function browseMediaLibraryB2(params) {
  return api.get("/api/admin/media-library/b2/browse", params);
}

export function importMediaLibraryFromB2(body) {
  return api.post("/api/admin/media-library/b2/import", body);
}

/** @param {{ limit?: number, offset?: number }} [params] */
export function listMediaMigrateCandidates(params) {
  return api.get("/api/admin/media-library/migrate/candidates", params);
}

export function migrateMediaAssetToB2(id) {
  return api.post(`/api/admin/media-library/assets/${encodeURIComponent(id)}/migrate-to-b2`, {});
}

/** @param {{ limit?: number, offset?: number }} [params] */
export function listBulkUploadJobs(params) {
  return api.get("/api/admin/file-uploads/jobs", params);
}

/** @param {'product'|'customer'|'vendor'} uploadType */
export async function submitBulkCsvUpload(uploadType, file) {
  if (!file) {
    throw new ApiError(400, "No file", {});
  }
  try {
    await ensureTokenFresh();
  } catch {
    /* proceed */
  }
  const formData = new FormData();
  formData.append("uploadType", uploadType);
  formData.append("file", file, file.name);
  const url = buildApiUrl("/api/admin/file-uploads");
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: formData });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  if (!res.ok) {
    throw new ApiError(res.status, (data && data.message) || "Upload failed", data);
  }
  return data;
}

/** @param {'product'|'customer'|'vendor'} uploadType */
export async function downloadBulkSampleCsv(uploadType) {
  try {
    await ensureTokenFresh();
  } catch {
    /* proceed */
  }
  const url = buildApiUrl(`/api/admin/file-uploads/sample/${encodeURIComponent(uploadType)}`);
  const headers = { Accept: "text/csv" };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message || "Download failed", data);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  let name = `sample-${uploadType}.csv`;
  const m = cd && cd.match(/filename[^;=\n]*=(['"]?)([^'"\n]*)\1/i);
  if (m && m[2]) name = m[2].trim();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export async function downloadBulkUploadSource(jobId) {
  try {
    await ensureTokenFresh();
  } catch {
    /* proceed */
  }
  const url = buildApiUrl(`/api/admin/file-uploads/jobs/${encodeURIComponent(jobId)}/source`);
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message || "Download failed", data);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  let name = `upload-${jobId}.csv`;
  const m = cd && cd.match(/filename[^;=\n]*=(['"]?)([^'"\n]*)\1/i);
  if (m && m[2]) name = m[2].trim();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export function retryBulkUploadJob(id) {
  return api.post(`/api/admin/file-uploads/jobs/${encodeURIComponent(id)}/retry`, {});
}

export function listBanners(params) {
  return api.get("/api/admin/allBanners", params);
}

export function getBanner(id) {
  return api.get(`/api/admin/banners/${encodeURIComponent(id)}`);
}

export function createBanner(body) {
  return api.post("/api/admin/banners", body);
}

export function updateBanner(id, body) {
  return api.patch(`/api/admin/banners/${encodeURIComponent(id)}`, body);
}

export function deleteBanner(id) {
  return api.delete(`/api/admin/banners/${encodeURIComponent(id)}`);
}

export function listPopupBanners(params) {
  return api.get("/api/admin/popupBanner", params);
}

export function getPopupBanner(id) {
  return api.get(`/api/admin/popupBanner/${encodeURIComponent(id)}`);
}

export function createPopupBanner(body) {
  return api.post("/api/admin/addPopupBanner", body);
}

export function updatePopupBanner(id, body) {
  return api.patch(`/api/admin/popupBanner/${encodeURIComponent(id)}`, body);
}

export function deletePopupBanner(id) {
  return api.delete(`/api/admin/popupBanner/${encodeURIComponent(id)}`);
}

export function listAdvertisements(params) {
  return api.get("/api/admin/advertisementFeed", params);
}

export function createAdvertisement(body) {
  return api.post("/api/admin/advertisementFeed", body);
}

export function updateAdvertisement(id, body) {
  return api.patch(`/api/admin/advertisementFeed/${encodeURIComponent(id)}`, body);
}

export function deleteAdvertisement(id) {
  return api.delete(`/api/admin/advertisementFeed/${encodeURIComponent(id)}`);
}

export function listAvailableCities(params) {
  return api.get("/api/admin/availableCities", params);
}

export function createAvailableCity(body) {
  return api.post("/api/admin/availableCities", body);
}

export function updateAvailableCity(id, body) {
  return api.patch(`/api/admin/availableCities/${encodeURIComponent(id)}`, body);
}

export function deleteAvailableCity(id) {
  return api.delete(`/api/admin/availableCities/${encodeURIComponent(id)}`);
}

export function listClassifiedCategories(params) {
  return api.get("/api/admin/classifiedCategories", params);
}

export function createClassifiedCategory(body) {
  return api.post("/api/admin/classifiedCategories", body);
}

export function updateClassifiedCategory(id, body) {
  return api.patch(`/api/admin/classifiedCategories/${encodeURIComponent(id)}`, body);
}

export function deleteClassifiedCategory(id) {
  return api.delete(`/api/admin/classifiedCategories/${encodeURIComponent(id)}`);
}

export function listClassifiedServices(params) {
  return api.get("/api/admin/classifiedServices", params);
}

export function createClassifiedService(body) {
  return api.post("/api/admin/classifiedServices", body);
}

export function updateClassifiedService(id, body) {
  return api.patch(`/api/admin/classifiedServices/individual/${encodeURIComponent(id)}`, body);
}

export function deleteClassifiedService(id) {
  return api.delete(`/api/admin/classifiedServices/${encodeURIComponent(id)}`);
}

export function listClassifiedVendors(params) {
  return api.get("/api/admin/classifiedVendors", params);
}

export function createClassifiedVendor(body) {
  return api.post("/api/admin/classifiedVendors", body);
}

export function updateClassifiedVendor(id, body) {
  return api.patch(`/api/admin/classifiedVendors/individual/${encodeURIComponent(id)}`, body);
}

export function deleteClassifiedVendor(id) {
  return api.delete(`/api/admin/classifiedVendors/${encodeURIComponent(id)}`);
}

export function listClassifiedProducts(params) {
  return api.get("/api/admin/classifiedProducts", params);
}

export function createClassifiedProduct(body) {
  return api.post("/api/admin/classifiedProducts", body);
}

export function updateClassifiedProduct(id, body) {
  return api.patch(`/api/admin/classifiedProducts/${encodeURIComponent(id)}`, body);
}

export function deleteClassifiedProduct(id) {
  return api.delete(`/api/admin/classifiedProducts/${encodeURIComponent(id)}`);
}

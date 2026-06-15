# P4U Admin - Backend & Frontend Changes Tracker

> Tracking all module-level changes made to align backend (entity, DTOs) and frontend (admin web forms) with the new design.
> All new fields are **optional** (no validation enforced yet).

---

## 1. Vendor Module - COMPLETED

### Backend Files Changed (admin-management-services)
| File | Path |
|------|------|
| Entity | `admin-management-services/src/modules/vendors/entities/Vendor.ts` |
| Create DTO | `admin-management-services/src/modules/vendors/dto/create-vendor.dto.ts` |
| Update DTO | `admin-management-services/src/modules/vendors/dto/update-vendor.dto.ts` |
| Service | `admin-management-services/src/modules/vendors/vendor.service.ts` |

### Backend Files Changed (vendor-management-services) - SYNCED
| File | Path |
|------|------|
| Entity | `vendor-management-services/src/entities/Vendor.ts` |
| Patch Profile DTO | `vendor-management-services/src/dto/patch-vendor-profile.dto.ts` |
| Registration DTO | `vendor-management-services/src/dto/create-vendor-registration.dto.ts` |
| Portal Service | `vendor-management-services/src/service/vendorPortal.service.ts` |

> Both services share the same DB table `catalog_vendors` in `p4u_admin_db`, so entities must stay in sync.

### New Columns Added to Entity (16 columns)
age, gender, thumbnailUrl, bannerUrl, gst, pan, secondaryPhone, membershipStatus, experience, trending, appliedReferralCode, aboutBusiness, commissionRate, servicesJson, documentsJson, bankJson

### Vendor Workflow
- **Add Vendor** -> creates with `status: not_verified` -> appears in Vendor Enquiry
- **Vendor Enquiry** (`/vendor-enquiry`) -> shows `not_verified` vendors -> Admin can Verify/Edit/Delete
- **Vendor List** (`/vendor`) -> shows only `active` (verified) vendors
- Backend `listVendors` supports `?status=` query param filter

### Frontend Files
| File | Path |
|------|------|
| Form | `p4u-admin-web/src/pages/vendor/VendorFormLayer.jsx` |
| List | `p4u-admin-web/src/pages/vendor/VendorList.jsx` |
| Enquiry List | `p4u-admin-web/src/pages/vendor/VendorEnquiryListLayer.jsx` (NEW) |
| Enquiry Page | `p4u-admin-web/src/pages/vendor/VendorEnquiryPage.jsx` (NEW) |

### Vendor List Columns
S.No, Name, Business Name, Mobile Number, Categories, Services, Membership, Joining Date, Status

### Vendor Enquiry Columns
Date, Name, Business Name, Mobile Number, Categories, Services, City, Pincode, Status, Action (Verify/Edit/Delete)

### Sidebar Updated
- Vendor menu: List Vendor, Add Vendor, Vendor Enquiry

---

## 2. Product Module - COMPLETED

### Backend Files Changed
| File | Path |
|------|------|
| Entity | `admin-management-services/src/modules/products/entities/Product.ts` |
| Create DTO | `admin-management-services/src/modules/products/dto/create-product.dto.ts` |
| Update DTO | `admin-management-services/src/modules/products/dto/update-product.dto.ts` |
| Service | `admin-management-services/src/modules/products/products.service.ts` |

### New Columns (13)
availability, serviceId, sellPrice, discountAmount, finalPrice, durationHours, durationMinutes, shortDescription, longDescription, promiseP4u, helpLineNumber, thumbnailUrl, bannerUrls

### Frontend Files
| File | Path |
|------|------|
| Form | `p4u-admin-web/src/pages/product/ProductFormLayer.jsx` |
| List | `p4u-admin-web/src/pages/product/ProductListLayer.jsx` |

### Product Form Sections
1. **Product Name** (left) - Name, Availability, Vendor, Category, Services + "Currently Selected" summary
2. **Price** (right) - Sell Price, Discount Amount, Final Price, Tax, Duration (Hours + Minutes + Summary badge)
3. **Description** - Short Description, Long Description, Promise P4u, Help Line Number
4. **Image** - Thumbnail (file upload), Banner (multiple file upload)

### Product List Columns
S.No, Name, Vendor, Category, Services, Cost, Services Type, CGST, SGST, Available, Action

---

## 3. Category Module - COMPLETED

### Backend Files Changed
| File | Path |
|------|------|
| Entity | `admin-management-services/src/modules/catalog/entities/CatalogCategory.ts` |
| Create DTO | `admin-management-services/src/modules/catalog/dto/create-category.dto.ts` |
| Update DTO | `admin-management-services/src/modules/catalog/dto/update-category.dto.ts` |
| Service | `admin-management-services/src/modules/catalog/catalog.service.ts` |

### New Columns (5)
availability, emergency, trending, description, bannerUrls

### Frontend Form Fields
Name, Availability (Yes/No), Emergency (Yes/No), Trending (Yes/No), Description, Thumbnail (file), Banner (multiple files)

### Category List Columns
S.No, Name, Image, Sub Categories (Services) with chips, Availability, Emergency, Trending, Verification Status, Action

---

## 4. Service Module - COMPLETED

### Backend Files Changed
| File | Path |
|------|------|
| Entity | `admin-management-services/src/modules/catalog/entities/CatalogServiceItem.ts` |
| Create DTO | `admin-management-services/src/modules/catalog/dto/create-catalog-service.dto.ts` |
| Update DTO | `admin-management-services/src/modules/catalog/dto/update-catalog-service.dto.ts` |
| Service | `admin-management-services/src/modules/catalog/catalog.service.ts` |

### New Columns (3)
availability, trending, iconUrl

### Frontend Form Fields
Service Name, Category (dropdown), Availability (Yes/No), Trending (Yes/No), Service Icon (file upload), Description

### Service List Columns
S.No, Name, Categories, Image, Availability, Trending, Verification Status, Action

---

## 5. Customer Module - COMPLETED

### Frontend Files Changed (no backend changes needed)
| File | Path |
|------|------|
| List | `p4u-admin-web/src/pages/customer/CustomerListLayer.jsx` |
| Form/View | `p4u-admin-web/src/pages/customer/CustomerFormLayer.jsx` |

### Customer List Columns
S.No, Name, Mobile Number, Join Date, Status, Occupation, Wallet, Referral Code, Applied Referral Code, Action

### Customer List Filters
Export with Excel, Status dropdown (All/Active/Inactive/Suspended), Date range (from/to), Search

### Customer View Sections
1. **Basic Info** (read-only) - Name, Mobile Number
2. **Address** - Building Number, Address, Address option, Latitude, Longitude, Primary Address
3. **Account Info** - Status, Coupons, Email, Date of Join, Wallet, Referral Code, Applied Referral Code

### Changes
- "Add Customer" button hidden from list page (route still exists)
- Occupation resolved from occupationId via API
- Metadata fields (wallet, referralCode, appliedReferralCode) displayed in list and view

---

## 6. Orders Module - COMPLETED

> Redesigned 2026-04-13 to a single-page list + modal flow. `OrderStat.jsx`, `OrderFormLayer.jsx`, `ViewOrderPage.jsx`, and `EditOrderPage.jsx` were **deleted**; stats are now inline on the list and view/edit open in `OrderDetailModal`. See `PROJECT-STATUS.md §2.U`.

### Admin frontend
| File | Path |
|------|------|
| List (table + inline stats + filters + CSV) | `p4u-admin-web/src/pages/orders/OrderListLayer.jsx` |
| View / Edit modal | `p4u-admin-web/src/pages/orders/OrderDetailModal.jsx` |
| Page | `p4u-admin-web/src/pages/orders/OrderListPage.jsx` |

### Order list – inline KPI cards (in `OrderListLayer.jsx`)
- 4 stat cards computed from the **filtered, current-page** result set: Total Orders, Revenue (page), Active, Completed. Global totals would require a backend `/orders/stats` endpoint (not yet added).
- Filter bar: search (orderRef / customer / vendor / phone), status dropdown, from/to date pickers, CSV export of the filtered rows.

### Order list – table & customer columns
- **`parseMeta(order.metadata)`** parses `metadata` if it arrives as a JSON string (MySQL/TypeORM edge cases).
- **Customer name / mobile:** `metadata.customerName` / `customerPhone` (cart checkout snapshot), then **`getCustomer(customerId)`** fallback.
- **`customerId`** on the order may be profile UUID or Keycloak `sub`; admin `getCustomer` resolves either (see §8).
- Row actions: view (eye), edit (pencil), cancel (red). Cancel calls `PATCH /api/admin/orders/individual/:id` with `status: cancelled`.

### Order view (`OrderDetailModal.jsx`)
- Header: order ID, date, status pill; **6-step progress tracker** (Placed → Paid → Accepted → In Progress → Delivered → Completed).
- Customer + Vendor summary cards, order items list, totals breakdown (Item Total, Discount, Points Redeemed, Platform Fee, GST on Platform Fee 18%, Product Tax, Grand Total, Payment Ref ID).
- View mode: `Close` / `Edit Status`. Edit mode: status dropdown (`placed`, `paid`, `accepted`, `in_progress`, `delivered`, `completed`, `cancelled`) + `Cancel` / `Save Changes`; save calls `updateOrder` and propagates to the list via `onSaved`.

### Related backend (checkout snapshot)
See **§8** – **`commerce-management-services`** merges **`customer_profiles`** into **`order.metadata`** on **`createOrderFromCart`**.

---

## 7. Platform Variables Module - COMPLETED

### Frontend Files Changed (no backend changes - entity already supports JSON value)
| File | Path |
|------|------|
| Form | `p4u-admin-web/src/pages/platformvariable/PlatformVariableFormLayer.jsx` |
| List | `p4u-admin-web/src/pages/platformvariable/PlatformVariableListLayer.jsx` |
| Edit Page | `p4u-admin-web/src/pages/platformvariable/EditPlatformVariablePage.jsx` |
| View Page | `p4u-admin-web/src/pages/platformvariable/ViewPlatformVariablePage.jsx` |

### API Functions Added
`listPlatformVariables`, `createPlatformVariable`, `updatePlatformVariable`, `deletePlatformVariable`

### Routes Added
`/platform-variables`, `/add-platform-variable`, `/edit-platform-variable/:id`, `/view-platform-variable/:id`

### Platform Variable Form Fields
Variable Type (25 options), Currency Type (Ruppees/Points/None), Value Type (FLAT/PERCENTAGE/TEXT), Value, Description

### Platform Variable List Columns
Checkbox, S.No, Variable Type, Value, Value Type, Currency Type, CreatedAt, Action (info/edit/delete)

### Data Storage
- `key` = variable type (e.g. PLATFORM_FEE)
- `value` = JSON `{ currencyType, valueType, amount/text, description }`

---

## File Upload Infrastructure - COMPLETED

### Backend
| File | Path |
|------|------|
| Upload Route | `admin-management-services/src/modules/upload/upload.routes.ts` |
| Server | `admin-management-services/src/server.ts` (upload before body parsers) |
| Compiled Server | `admin-management-services/dist/server.js` (inline upload route) |
| Upload Directory | `admin-management-services/uploads/` |

- `POST /api/admin/upload` - single file upload via multer
- Files served at `/uploads/<filename>` (express.static)
- Upload route registered BEFORE `express.json()` to preserve multipart stream

### Frontend
- `uploadFile(file)` in `adminApi.js` - direct fetch with FormData (no Accept header override)
- Vite proxy: `/api/admin/upload` -> `localhost:8082` (bypasses gateway)
- Vite proxy: `/uploads` -> `localhost:8082` (serves uploaded files)

### Gateway Fix
- `p4u-api-gateway-services/src/server.ts` + `dist/server.js` - skip `express.json()` for multipart requests

---

## Catalog Service & User Web (public catalog + images)

### Architecture (correct direction)

1. **Single source of truth** – Admin writes catalog data and uploads into **`p4u_admin_db`** (`catalog_products`, `catalog_vendors`, `catalog_categories`, `catalog_service_items`).
2. **Public read API** – **catalog-management-services** uses the **same database** and must expose TypeORM entities that **match those tables** so JSON responses include `thumbnailUrl`, `bannerUrls`, `iconUrl`, `logoUrl`, `bannerUrl`, etc.
3. **User web** – **p4u-new-user-web** calls the API via **`NEXT_PUBLIC_API_GATEWAY_URL`** and resolves stored URLs with **`lib/media.ts`** (`resolveMediaUrl`, `pickProductImage`, `pickVendorImage`, `pickServiceImage`, `buildProductGalleryImages`). Admin uploads often return `http://localhost:8082/uploads/...`; the client rewrites `/uploads` paths and localhost upload hosts to the gateway (or **`NEXT_PUBLIC_MEDIA_ORIGIN`** if uploads are served elsewhere).

### Backend: catalog-management-services (aligned with admin tables)

| Entity | Path | Tables |
|--------|------|--------|
| Product | `catalog-management-services/src/entities/Product.ts` | `catalog_products` |
| Vendor | `catalog-management-services/src/entities/Vendor.ts` | `catalog_vendors` |
| CatalogCategory | `catalog-management-services/src/entities/CatalogCategory.ts` | `catalog_categories` |
| CatalogServiceItem | `catalog-management-services/src/entities/CatalogServiceItem.ts` | `catalog_service_items` |

Keep these entities in sync with **admin-management-services** counterparts whenever new catalog columns are added. If catalog entities omit columns that exist in MySQL, TypeORM will not return those fields to the user app.

### Frontend: p4u-new-user-web

| Area | Path / note |
|------|-------------|
| Media helpers | `p4u-new-user-web/lib/media.ts` |
| Catalog API types | `p4u-new-user-web/lib/api/catalog.ts` (fields such as `thumbnailUrl`, `iconUrl`) |
| Shop / vendor / product / service screens | Use pick* helpers so admin-managed images display consistently |

### Infrastructure requirement

- The **API gateway** (or **`NEXT_PUBLIC_MEDIA_ORIGIN`**) must serve **`GET /uploads/**`** by proxying to **admin-management-services** static files (same as admin’s `express.static` on `/uploads`). Without this, browsers cannot load images even when the catalog API returns correct URLs.

### Other services (no change required for catalog images)

- **commerce-management-services** – Cart lines store `productId`, price, qty, `metadata`; it does not join `catalog_products` for images. Local cart from the shop still carries image URLs; server-enriched cart images would be a separate enhancement.
- **content-management-services**, **socio-management-services**, etc. – Separate features; only relevant where their content stores admin-style `/uploads` URLs (user web may already resolve those via `resolveMediaUrl` where wired).

---

## API Gateway Changes

| File | Path |
|------|------|
| Source | `p4u-api-gateway-services/src/server.ts` |
| Compiled | `p4u-api-gateway-services/dist/server.js` |

- Multipart/form-data requests skip `express.json()` and `express.urlencoded()` to preserve raw stream for proxy forwarding
- **`/uploads`** is proxied to **admin-management-service** in `p4u-api-gateway-services/src/routes/gatewayRoutes.ts` (same pattern as `/api/admin`) so `http://<gateway>/uploads/...` serves files from admin’s `uploads/` folder

---

## 8. Recent integrations (User Web · Commerce · Profile · Admin UI)

_Added to align signup/profile, checkout, admin order visibility, catalog UX, and small admin chrome fixes._

### 8.1 Commerce – order customer snapshot

| File | Path |
|------|------|
| Entity (read-only) | `commerce-management-services/src/entities/CustomerProfile.ts` → table `customer_profiles` |
| DB registration | `commerce-management-services/src/config/database.ts` |
| Cart → order | `commerce-management-services/src/service/cart.service.ts` → **`createOrderFromCart`** |

On checkout, loads **`customer_profiles`** by **`customerId`** (UUID) or **`keycloakUserId`** (JWT `sub`) and merges into **`order.metadata`**: **`customerName`**, **`customerPhone`**, **`customerEmail`**, **`customerProfileId`** (alongside existing **`lines`**, **`source`**, **`cartId`**, etc.).

_Restart **commerce-management-services** after deploying._

### 8.2 Profile service – PATCH `/me`

| File | Path |
|------|------|
| Service | `profile-management-services/src/service/profileQuery.service.ts` → **`updateCustomerById`** |

- Accepts **`name`** as alias for **`fullName`**.
- Merges **`dob`** and **`gender`** into **`metadata`** JSON (with safe merge of existing metadata).

### 8.3 Admin – customer lookup for orders

| File | Path |
|------|------|
| Service | `admin-management-services/src/modules/customers/customer.service.ts` → **`getCustomer`** |

**`getCustomer(id)`** resolves **`customer_profiles`** by **primary `id`** **or** **`keycloakUserId`**, matching **`commerce_orders.customer_id`** whether it stores UUID or Keycloak subject.

### 8.4 User Web – profile API & Personal Information

| File | Path |
|------|------|
| API client | `p4u-new-user-web/lib/api/profile.ts` |
| UI | `p4u-new-user-web/app/profile/Profilepage.tsx` (**`PageProfile`**) |

- **`getMe` / `updateMe` / `getCustomer`** map API **`fullName`** ↔ UI **`name`**; expose **`dob` / `gender`** from **`metadata`**.
- **`updateMe`** sends **`fullName`**, **`email`**, **`phone`**, **`dob`**, **`gender`**.
- **Removed** all Aadhaar fields and card upload UI from Personal Information.
- Save shows **errors** from the API instead of failing silently.

### 8.5 User Web – cart, orders, shop/services UI

| Area | Path / behavior |
|------|------------------|
| Cart metadata | `p4u-new-user-web/lib/api/commerce.ts` – **`addCartItem`** / **`updateCart`** accept **`metadata`** (product name, image, vendor). |
| Cart context | `p4u-new-user-web/providers/CartContext.tsx` – sends metadata on add/sync; **`mapServerItems`** reads **`metadata.productImage`** / **`productName`** / **`vendorName`**. |
| My Orders (profile) | `Profilepage.tsx` – order thumbnails from **line metadata** + **`catalogApi.getProduct`** fallback; **`ProductImg`** placeholder when no URL. |
| Category sidebar images | `pickCategoryImage` + **`CategorySidebarThumb`** in **`app/shop/shop.tsx`**, **`app/service/ServiceListPage.tsx`**. |
| Copy | **`components/catalog/TopServicer.tsx`** heading: **“Top Services”** (typo fix). |

### 8.6 Admin Web – lists & layout

| File | Path |
|------|------|
| Category list | `p4u-admin-web/src/pages/category/CategoryListLayer.jsx` – **View** → `/view-category/:id` |
| Service list | `p4u-admin-web/src/pages/service/ServiceListLayer.jsx` – **View** → `/view-service/:id` |
| Header profile | `p4u-admin-web/src/masterLayout/MasterLayout.jsx` – initials avatar from JWT **`name` / `preferred_username` / `email`**; dropdown shows **name only** (realm roles line removed). |

---

## 9. Tax Configuration Module - COMPLETED

### Frontend Files Changed (backend already had CRUD)
| File | Path |
|------|------|
| Form | `p4u-admin-web/src/pages/tax/TaxFormLayer.jsx` |
| List | `p4u-admin-web/src/pages/tax/TaxListLayer.jsx` |

- API client in `adminApi.js` extended with `createTaxConfiguration`, `updateTaxConfiguration`, `deleteTaxConfiguration`.
- Form fields: `code`, `title`, `percentage`, `isActive`, description (stored in `metadata.description`).
- List uses `?purpose=all` to include inactive rows.

---

## 10. Marketing - Banner / Popup Banner / Advertisement - COMPLETED

### Banner (`banners/` backend module)
- API: `listBanners`, `getBanner`, `createBanner`, `updateBanner`, `deleteBanner` → `/api/admin/allBanners`, `/api/admin/banners[/:id]`.
- Form adds Title, Sort Order, Active, Redirect URL; extras (`bannerRoute`, `bannerType`, `broadcastApplication`, `bannerPlacement`) persisted in `metadata`.
- `uploadFile()` → `imageUrl` string on the entity.

### Popup Banner (`banners/` backend module)
- API: `listPopupBanners`, `getPopupBanner`, `createPopupBanner`, `updatePopupBanner`, `deletePopupBanner` → `/api/admin/popupBanner` + `/api/admin/addPopupBanner`.
- Extras (`appType`, `screenId`) persisted in `metadata`.

### Advertisement (`posts/` backend module - AdvertisementFeedItem)
- **Backend change:** added `metadata` JSON column to `AdvertisementFeedItem` entity + service create/update (both `src/` and `dist/`). **DB migration needed** to add `metadata` column on `content_ad_feed_items`.
- API: `listAdvertisements`, `createAdvertisement`, `updateAdvertisement`, `deleteAdvertisement` → `/api/admin/advertisementFeed[/:id]`.
- Core entity columns: `title`, `imageUrl`, `redirectUrl`, `status`, `sortOrder`. Extras (`caption`, `buttonTitle`, `postType`, `bannerUrl`) in `metadata`.

---

## 11. Classified (CF) Modules - COMPLETED

All share the pattern: backend `classified/` module exposes `UpsertNameActiveDto` (`name`, `isActive`, `metadata`) except CF Product which uses `UpsertClassifiedProductDto` with first-class columns. Extras go in `metadata`.

### CF City
- API: `listAvailableCities`, `createAvailableCity`, `updateAvailableCity`, `deleteAvailableCity` → `/api/admin/availableCities`.
- Extras in `metadata`: `description`, `iconUrl`.

### CF Category
- API: `listClassifiedCategories`, `createClassifiedCategory`, `updateClassifiedCategory`, `deleteClassifiedCategory` → `/api/admin/classifiedCategories`.
- Extras in `metadata`: `description`, `thumbnailUrl`.

### CF Service
- API: `listClassifiedServices`, `createClassifiedService`, `updateClassifiedService` (via `/individual/:id`), `deleteClassifiedService`.
- **CF Category dropdown** populated live from `listClassifiedCategories` (replaced hardcoded list).
- Extras in `metadata`: `categoryId`, `categoryName`, `description`, `thumbnailUrl`.

### CF Vendor
- API: `listClassifiedVendors`, `createClassifiedVendor`, `updateClassifiedVendor` (via `/individual/:id`), `deleteClassifiedVendor`.
- **City + Category dropdowns** populated live from `listAvailableCities` + `listClassifiedCategories`.
- Primary column is `displayName` (business name). All other form fields (contactName, gst, mobileNumber, businessPhone, email, experience, aboutBusiness, address, services, businessHours, logoUrl, bannerUrl, cityId/cityName, categoryId/categoryName) persisted in `metadata`.

### CF Product
- API: `listClassifiedProducts`, `createClassifiedProduct`, `updateClassifiedProduct`, `deleteClassifiedProduct`.
- **Vendor + Category + Service dropdowns** populated from `listClassifiedVendors` / `listClassifiedCategories` / `listClassifiedServices`.
- Uses first-class entity columns: `name`, `description`, `price`, `vendorId`, `categoryId`, `serviceId`, `imageUrls[]`, `isActive`. `metadata.thumbnailUrl` for the list icon.

---

## 12. Settlement Module - COMPLETED

Backend in `orders/` module (`Settlement` entity, `commerce_settlements` table). Settlement list page has tabs for Cash/Points.

### Frontend Files Changed
| File | Path |
|------|------|
| Cash list | `p4u-admin-web/src/pages/settlement/ListCashLayer.jsx` |
| Points list | `p4u-admin-web/src/pages/settlement/ListPointsLayer.jsx` |
| View modal | `p4u-admin-web/src/pages/settlement/SettlementFormLayer.jsx` |

- API: `listCashSettlements` (`/Settlements/allCash/null`), `listPointsSettlements` (`/Settlements/allPoints/null`), `getSettlement`, `createSettlement`, `updateSettlement` (via `/Settlements/individual/:id`).
- Both list layers join vendor data via `listVendors` lookup; vendor name/mobile resolved from `metadata` snapshot first, else vendor record.
- Amount uses `formatInrAmount` for cash, `N Pts` for points.
- Form is view-only (current UX has no Add Settlement button).
- `documentUrl` → "View Attached Receipt" link.

---

## 13. Report Log Module - COMPLETED

Backend: `posts/` module `ObjectionableFeedLog` entity (`content_moderation_logs` table).

### Frontend
| File | Path |
|------|------|
| List | `p4u-admin-web/src/pages/report/ReportLogLayer.jsx` |
| Page | `p4u-admin-web/src/pages/report/ReportLogPage.jsx` (already existed) |

- API: `listObjectionableFeedLogs` (`/objectionableFeedLog`), `updateObjectionableFeedLog` (`/objectionableFeedLog/batchFeed/:id`).
- Inline status dropdown (`pending` / `resolved` / `dismissed`) persists via PATCH.
- No DELETE endpoint on backend, so delete button removed.
- Customer snapshot (`customerName`, `customerMobile`) + feed date read from `metadata`; reason from `metadata.reason` or `reasonCode`.
- **Route added to `App.jsx`:** `/report-log` → `ReportLogPage`. Sidebar in `MasterLayout` already links here.

---

## Socio – DB-backed media storage (posts + stories)

Per current spec the socio service keeps post/story media bytes inside the database rather than on the local disk. The HTTP contract that the user web already consumes is preserved (`/socio-uploads/...` URLs) so no frontend change was required.

### Backend Files Changed (socio-management-services)

| File | Path | What |
|------|------|------|
| Entity (NEW) | `socio-management-services/src/entities/SocialMedia.ts` | `social_media` table — `id`, `kind` ('image'/'video'), `mime_type`, `original_name`, `size_bytes`, `data` (LONGBLOB), `owner_id`, `created_at` |
| DB registration | `socio-management-services/src/config/database.ts` | Registered `SocialMedia` in `entities[]` |
| Upload routes | `socio-management-services/src/routes/upload.routes.ts` | Switched multer to memory storage; `/upload` and `/upload/multiple` INSERT into `social_media` and return `/socio-uploads/media/{id}` URLs; added owner-only `DELETE /api/v1/social/media/:id`; added `createSocioMediaPublicRoutes()` factory exposing public `GET /socio-uploads/media/:id` |
| Server bootstrap | `socio-management-services/src/server.ts` | Mounted `createSocioMediaPublicRoutes()` on `/socio-uploads` (unauthenticated, before JWT routers); removed the `express.static('uploads/')` mount |
| Feed service | `socio-management-services/src/service/feed.service.ts` | `deletePost` now runs in a transaction and hard-deletes any `social_media` rows whose ids appear in `mediaUrls` |
| Story service | `socio-management-services/src/service/story.service.ts` | `expireOldStories` reclaims media blobs for stories crossing the 24h boundary while flipping their status to `expired` |

### DB migration

`admin-management-services/migrations/2026-05-07-bootstrap-schema.sql` – added `CREATE TABLE IF NOT EXISTS social_media (…)` with indexes on `owner_id` and `kind`.

### Behaviour notes
- `POST /api/v1/social/upload` (multipart `file`) – auth required, role `CUSTOMER`/`VENDOR`/`ADMIN`. Returns `{ id, url, filename, originalName, size, mediaType }` where `url` is the path-only `/socio-uploads/media/{id}`. Multipart limits unchanged (50MB, image/video MIME filter).
- `POST /api/v1/social/upload/multiple` – up to 8 files, same envelope, returns `{ files: [...] }`.
- `GET /socio-uploads/media/:id` – public; streams stored bytes with the recorded `Content-Type` and a one-year immutable cache header so `<img>`/`<video>` tags pick it up directly.
- `DELETE /api/v1/social/media/:id` – auth required; only the uploader (`owner_id == sub`) can delete. Used by clients that abandon an in-progress post before save.
- Post deletion cascades to media via `feed.service.ts#deletePost`, story expiry via `story.service.ts#expireOldStories` (lazy, on read).
- Stories: 24h TTL is enforced both by the read query (`expires_at > now`) **and** the lazy sweep, so blobs do not persist past the window even if no user pulls the feed (next reader triggers cleanup).

### Frontend
No code changes required in `p4u-new-user-web`:
- `lib/api/social.ts#uploadMedia` keeps consuming `{ url, mediaType, filename, size }`.
- `lib/media.ts#resolveMediaUrl` already handles `/socio-uploads/...` paths.
- `app/socio/SocialPage.tsx` continues to call `createPost({ mediaUrls })` / `createStory({ mediaUrl, mediaType })` with the returned URL.

### Dist sync
`npm run build` run in `socio-management-services/` to regenerate `dist/` so `node dist/server.js` matches `src/`.

---

## Pending Modules

All PRD admin modules are now wired end-to-end. Next candidates are:
- Batch / bulk UI for tax, products, posts (backend has stubs).
- DB migrations for newly added JSON columns (e.g. `content_ad_feed_items.metadata`).
- Replace `social_media.data` LONGBLOB with object-store URLs once an S3/MinIO bucket is provisioned (entity row keeps a stable id either way).

---

## Notes
- All fields are optional as of now; validation will be added later
- Backend DB migration needed for new columns before deployment
- File upload reusable via `uploadFile()` from adminApi.js
- **Admin dev:** Vite proxies `/api/admin/upload` and `/uploads` directly to admin service (8082) as a workaround when the gateway path is not used
- **User web prod/dev:** Prefer gateway (or `NEXT_PUBLIC_MEDIA_ORIGIN`) serving `/uploads`; catalog service returns URL strings from DB—the browser loads them from that origin

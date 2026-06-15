# P4U User Platform - Project Status

Last updated: 2026-05-07 (§2.AA pricing engine end-to-end + zero-touch DB bootstrap)

## 1) Scope Summary

This status tracks the user-platform microservice work done on top of the existing platform.

Existing platform services:
- `p4u-discovery-service`
- `p4u-api-gateway-services`
- `auth-management-services`
- `admin-management-services`

New user-facing services introduced:
- `catalog-management-services`
- `content-management-services`
- `profile-management-services`
- `commerce-management-services`
- `payment-management-services`
- `notification-management-services`
- `vendor-management-services`
- `socio-management-services`

Naming convention followed:
- Folder: `*-management-services`
- Discovery service name: `*-management-service`

**Database:** all Node services default to **one** MySQL database name, **`p4u_admin_db`** (auth included). Override per service with `DB_NAME` only if you split DBs on purpose.

Database **table** names: **do not** prefix everything with `admin_` — use **domain-respective** names (`commerce_`, `customer_`, `catalog_`, `content_`, `social_`, `vendor_`, etc.). `admin_` is only for true admin-platform tables. Legacy `admin_*` on user/commerce data is documented for migration in **`DATABASE-TABLE-NAMING.md`**. New tables must follow domain prefixes; renames need SQL migrations plus coordinated `@Entity` updates.

---

## 2) Completed Work

### A. Architecture and foundations
- Finalized user-platform direction with shared backend for web + mobile.
- Confirmed OTP is deferred (auth OTP/social can be added later phase).
- Kept versioned API route style (`/api/v1/...`) for forward compatibility.

### B. API Gateway updates (completed)
File: `p4u-api-gateway-services/src/routes/gatewayRoutes.ts`

Added upstream routes:
- `/api/v1/catalog` -> `catalog-management-service`
- `/api/v1/content` -> `content-management-service`
- `/api/v1/profile` -> `profile-management-service`
- `/api/v1/commerce` -> `commerce-management-service`
- `/api/v1/payments` -> `payment-management-service`
- `/api/v1/notifications` -> `notification-management-service`
- `/api/v1/vendor` -> `vendor-management-service`
- `/api/v1/social` -> `socio-management-service`

Gateway root endpoint list now includes:
- `catalog: /api/v1/catalog/*`
- `content: /api/v1/content/*`
- `profile: /api/v1/profile/*`
- `commerce: /api/v1/commerce/*`
- `payments: /api/v1/payments/*`
- `notifications: /api/v1/notifications/*`
- `vendor: /api/v1/vendor/*`
- `social: /api/v1/social/*`

### C. Catalog service (completed, DB-backed, no hardcoding)
Service: `catalog-management-services`

Implemented:
- Service scaffold, discovery registration, health endpoint
- MySQL + TypeORM integration (read from admin DB tables)
- Entities and query service
- API routes with paging and optional inactive inclusion

Implemented endpoints:
- `GET /api/v1/catalog/public/health`
- `GET /api/v1/catalog/categories`
- `GET /api/v1/catalog/categories/:id/children`
- `GET /api/v1/catalog/vendors`
- `GET /api/v1/catalog/vendors/:vendorId`
- `GET /api/v1/catalog/vendors/:vendorId/products`
- `GET /api/v1/catalog/products/:productId`
- `GET /api/v1/catalog/services`
- `GET /api/v1/catalog/services/:id`
- `GET /api/v1/catalog/search?q=...`

Notes:
- Supports query params like `limit`, `offset`, `includeInactive=true`, `purpose=all`.
- Build check completed successfully.

### D. Content service (completed, DB-backed, no hardcoding)
Service: `content-management-services`

Implemented:
- Service scaffold, discovery registration, health endpoint
- MySQL + TypeORM integration (read/write using admin DB tables)
- Entities and query service
- Aggregated home API and newsletter subscribe API

Implemented endpoints:
- `GET /api/v1/content/public/health`
- `GET /api/v1/content/banners`
- `GET /api/v1/content/popups`
- `GET /api/v1/content/reels`
- `GET /api/v1/content/classified`
- `GET /api/v1/content/home`
- `POST /api/v1/content/newsletter/subscribe`
- `GET /api/v1/content/brands` (tables: `content_brands`)
- `GET /api/v1/content/featured-products` (tables: `content_featured_products`)
- `GET /api/v1/content/service-highlights` (tables: `content_service_highlights`)
- **Admin CRUD** (JWT **ADMIN** + permission `content.admin.manage`), mount `/api/v1/content/admin`:
  - `POST|GET|PATCH|DELETE /brands` and `/brands/:id`
  - `POST|GET|PATCH|DELETE /featured-products` and `/featured-products/:id`
  - `POST|GET|PATCH|DELETE /service-highlights` and `/service-highlights/:id`

Notes:
- `newsletter/subscribe` persists a row into `content_website_queries`.
- OpenAPI overview specs for all eight user-facing services live under `docs/openapi/` (see `docs/openapi/README.md`).
- Build check completed successfully.

### E. Cleanup and consistency
- Removed old `catalog-service` folder.
- Kept only `catalog-management-services` for consistency.

### F. Auth maturity and access control rollout (completed for current phase)
Implemented:
- Explicit permission extraction and normalized role/permission handling in auth service token flows.
- Ownership/relationship middleware patterns:
  - `requireCustomerSelfOrAdmin`
  - `requireVendorSelfOrAdmin`
  - `requireLinkedCustomerAccessOrAdmin`
- Permission enforcement rollout to admin modules and new user-facing services.
- Documentation for token claim issuance in Keycloak mapper/policy layer:
  - `KEYCLOAK-PERMISSIONS-SETUP.md`
  - `AUTHORIZATION-POLICY.md`

Additional flow alignment (2026-03-25):
- Customer self-serve: on `userType=CUSTOMER` signup, auth service now auto-provisions `customer_profiles` with `keycloak_user_id = sub` (so profile APIs work without admin intervention).
- Vendor onboarding: on `userType=VENDOR` signup, auth service now creates a pending record in `vendor_signup_requests`; admin approves via `PATCH /api/admin/vendor-requests/:id/approve` which creates/links `catalog_vendors` and marks request approved.
- Permissions merge fix: services now merge permissions from `permissions` claim + `scope` + role-derived fallback (previously `scope` like `email profile` could mask role-based permissions).

### G. Profile service (completed, DB-backed, no hardcoding)
Service: `profile-management-services`

Implemented endpoints:
- `GET /api/v1/profile/public/health`
- `GET /api/v1/profile/me`
- `PATCH /api/v1/profile/me`
- `GET /api/v1/profile/customers/:customerId`
- `GET /api/v1/profile/me/addresses`
- `POST /api/v1/profile/me/addresses`
- `PUT /api/v1/profile/me/addresses/:addressId`
- `DELETE /api/v1/profile/me/addresses/:addressId`
- `GET /api/v1/profile/me/wishlist`
- `POST /api/v1/profile/me/wishlist`
- `DELETE /api/v1/profile/me/wishlist/:productId`
- `GET /api/v1/profile/me/referral-code`
- `GET /api/v1/profile/me/referrals`
- `GET /api/v1/profile/me/reward-points`

Notes:
- Uses permission checks and customer self/admin ownership guard.
- Addresses support default address management (auto-unsets previous default).
- Wishlist is idempotent (adding same product twice returns existing entry).
- Referral code is auto-generated on first request (P4U-XXXXXX format).
- Build check completed successfully.

### H. Commerce service (completed, DB-backed, no hardcoding)
Service: `commerce-management-services`

Implemented endpoints:
- `GET /api/v1/commerce/public/health`
- `GET /api/v1/commerce/cart`
- `PUT /api/v1/commerce/cart`
- `POST /api/v1/commerce/cart/items`
- `PATCH /api/v1/commerce/cart/items/:itemId`
- `DELETE /api/v1/commerce/cart/items/:itemId`
- `DELETE /api/v1/commerce/cart`
- `POST /api/v1/commerce/cart/merge`
- `POST /api/v1/commerce/orders/from-cart`
- `GET /api/v1/commerce/customers/:customerId/orders`
- `GET /api/v1/commerce/orders/:orderId`
- `POST /api/v1/commerce/orders`
- `POST /api/v1/commerce/orders/:orderId/cancel`
- `POST /api/v1/commerce/checkout/quote`
- `POST /api/v1/commerce/coupons/validate`
- `POST /api/v1/commerce/bookings`
- `GET /api/v1/commerce/bookings`
- `GET /api/v1/commerce/bookings/:bookingId`
- `POST /api/v1/commerce/bookings/:bookingId/cancel`
- `GET /api/v1/commerce/bookings/available-slots?vendorId=&date=`
- `POST /api/v1/commerce/reviews`
- `GET /api/v1/commerce/reviews?targetType=&targetId=`
- `GET /api/v1/commerce/reviews/summary?targetType=&targetId=`

Notes:
- Uses permission checks and customer self/admin ownership guard.
- Permission extraction now merges `scope` + role-derived permissions to avoid `scope=email profile` masking domain permissions.
- Cart supports full CRUD, merge, and order creation from cart.
- Coupon validation checks: code validity, date range, usage limits, min order amount, vendor applicability.
- Bookings support time slot availability check (Morning/Afternoon/Evening slots).
- Reviews support upsert (update if already reviewed) and average rating summary.
- Build check completed successfully.

### I. Payment service (completed, DB-backed, no hardcoding)
Service: `payment-management-services`

Implemented endpoints:
- `GET /api/v1/payments/public/health`
- `POST /api/v1/payments/intents`
- `GET /api/v1/payments/intents/:id`
- `POST /api/v1/payments/webhooks/:provider`

Notes:
- Includes payment intent persistence and webhook ingestion endpoint.
- Local dev: Razorpay client is optional at startup; service can run without keys, but intent creation requires valid `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`.
- Build check completed successfully.

### J. Notification service (completed, DB-backed, no hardcoding)
Service: `notification-management-services`

Implemented endpoints:
- `GET /api/v1/notifications/public/health`
- `GET /api/v1/notifications/me`
- `POST /api/v1/notifications/me/:id/read`
- `POST /api/v1/notifications/devices/register`

Notes:
- Includes in-app notification read flow and device token registration flow.
- Build check completed successfully.

### K. Vendor portal service (completed, DB-backed, VENDOR-scoped)
Service: `vendor-management-services`

Implemented:
- VENDOR role + `vendor.portal.*` permission checks; vendor resolved from JWT `vendor_id` or `catalog_vendors.keycloak_user_id` = token `sub`.
- Profile, orders, organization orders, reviews, referral summaries, push-registration hint (points to notification device register).
- Vendor registration flow for CUSTOMER role users.

Implemented endpoints (high level):
- `GET /api/v1/vendor/public/health`
- `GET|PATCH /api/v1/vendor/me` and legacy provider phone patch when it matches the vendor row
- Order read/update under `/api/v1/vendor/orders/...` (canonical + legacy path aliases)
- Organization orders CRUD-style routes under `/api/v1/vendor/organization-orders` (+ legacy aliases)
- Reviews by order, referrals by code, integrations hint for device registration
- `POST /api/v1/vendor/register` (CUSTOMER role — become a vendor)
- `GET /api/v1/vendor/register/status` (CUSTOMER role — check registration status)

Notes:
- Default port `8089`; discovery name `vendor-management-service`.
- Registration routes accessible to CUSTOMER role; all other routes require VENDOR role.
- Vendor approval now supported via admin: `PATCH /api/admin/vendor-requests/:id/approve` creates/links `catalog_vendors` and marks request approved.
- Build check completed successfully.

### L. Socio service (completed, DB-backed, NEW service)
Service: `socio-management-services`

Implemented:
- Full social feed service with posts, likes, comments, follows, and stories.
- Available to CUSTOMER and VENDOR roles.

Implemented endpoints:
- `GET /api/v1/social/public/health`
- `GET /api/v1/social/feed` (personalized feed from followed users)
- `GET /api/v1/social/feed/public` (explore/public feed)
- `GET /api/v1/social/posts/:postId`
- `POST /api/v1/social/posts`
- `DELETE /api/v1/social/posts/:postId`
- `POST /api/v1/social/posts/:postId/like`
- `DELETE /api/v1/social/posts/:postId/like`
- `GET /api/v1/social/posts/:postId/comments`
- `POST /api/v1/social/posts/:postId/comments`
- `POST /api/v1/social/users/:userId/follow`
- `DELETE /api/v1/social/users/:userId/follow`
- `GET /api/v1/social/users/:userId/followers`
- `GET /api/v1/social/users/:userId/following`
- `GET /api/v1/social/users/suggestions`
- `GET /api/v1/social/stories/feed`
- `GET /api/v1/social/stories/me`
- `POST /api/v1/social/stories`
- `POST /api/v1/social/stories/:storyId/view`

Notes:
- Default port `8090`; discovery name `socio-management-service`.
- Stories auto-expire after 24 hours.
- Like/unlike operations auto-update post like_count.
- Comments support nested replies via parentCommentId.
- Feed uses QueryBuilder join with user_follows for personalized content.
- Build check completed successfully.

### M. User Web — Frontend restructuring and API wiring (completed, 2026-03-26; updated 2026-04-01)
App: `p4u-new-user-web` (Next.js 13, App Router; **not** static export — see **§2.S**)

#### Structure overhaul
- Created `lib/api/` — centralised HTTP client (`client.ts`) + 9 service modules: `auth.ts`, `catalog.ts`, `content.ts`, `profile.ts`, `commerce.ts`, `payments.ts`, `notifications.ts`, `vendor.ts`, `social.ts`, barrel `index.ts`
- Created `.env.local` + `.env.example` with `NEXT_PUBLIC_API_GATEWAY_URL` (standardized to gateway default `http://localhost:8080`)
- Reorganized `components/` into domain folders:
  - `components/layout/` — Header, Footer, Navigation
  - `components/home/` — HeroSlider, BestProducts, BrandSections, PickupSection, ServiceCards, SubscriptionNewsletter
  - `components/catalog/` — MostBookedServices, TopServicer, ClassifiedResale, ReelsVideo
  - `components/auth/` — Authmodal
  - `components/ui/` — Shadcn (unchanged)
- Moved AuthContext & CartContext to `providers/` folder
- Created `providers/AuthGuard.tsx` — reusable auth guard component
- Removed unused `@supabase/supabase-js` dependency
- Removed dead folders: `app/auth/`, `pages/`

#### New route pages added
- `/notifications` — notification list + mark-as-read (auth guarded)
- `/vendor-portal` — vendor profile, orders, reviews tabs (auth guarded)
- `/checkout` — order summary, coupon, payment flow (auth guarded)
- `/bookings` — booking list + cancel (auth guarded)
- `/orders` — order history + cancel (auth guarded)

#### Frontend → Backend API wiring
All pages call backend APIs via `lib/api/`. For most surfaces, **§2.S** removed mock fallbacks in favor of **empty + loading** states when the API is offline or returns no data (see wiring table below).

| Page / Component | API Module | Endpoints called |
|---|---|---|
| HeroSlider | `contentApi` | `getBanners()` |
| BestProducts | `catalogApi` | `getVendorProducts()` |
| MostBookedServices | `catalogApi` | `getServices()` |
| TopServicer | `catalogApi` | `getVendors()` |
| ClassifiedResale | `contentApi` | `getClassified()` |
| ReelsVideo | `contentApi` | `getReels()` |
| SubscriptionNewsletter | `contentApi` | `subscribeNewsletter()` |
| Shop listing (`/shop`) | `catalogApi` | `getVendors()` |
| Vendor detail (`/shop/:id`) | `catalogApi` | `getVendor()`, `getVendorProducts()` |
| Service listing (`/service`) | `catalogApi` | `getServices()` |
| Service vendor detail | `catalogApi` | `getVendor()`, `getVendorProducts()` |
| Social feed (`/socio`) | `socialApi` | `getPublicFeed()`, `getStoryFeed()`, `getSuggestions()`; explore grid + “People” tab use feed/suggestions; no `socialData.ts` |
| Profile (`/profile`) | `profileApi` | `getMe()`, `updateMe()`, `getAddresses()`, `createAddress()`, `updateAddress()`, `deleteAddress()`, `getWishlist()`, `addToWishlist()`, `removeFromWishlist()`, `getReferralCode()`, `getRewardPoints()` |
| Profile — Orders | `commerceApi` | `getOrders()` |
| Profile — Favourites | `profileApi` | `getWishlist()`, `addToWishlist()`, `removeFromWishlist()` |
| Profile — Refer & Earn | `profileApi` | `getReferralCode()` (supports `referralCode`/`code` payloads) |
| Profile — Reward Points | `profileApi` | `getRewardPoints()` |
| Profile — Become Vendor | `vendorApi` | `register()`, `getRegistrationStatus()` |
| Cart | `commerceApi` | `getCart()`, `mergeCart()`, `addCartItem()`, `updateCartItem()`, `removeCartItem()`, `clearCart()` |
| Checkout | `commerceApi`, `paymentsApi` | `getCheckoutQuote()`, `createOrderFromCart()`, `createIntent()` |
| Notifications | `notificationsApi` | `getMyNotifications()`, `markAsRead()` |
| Orders | `commerceApi` | `getOrders()`, `cancelOrder()` |
| Bookings | `commerceApi` | `getBookings()`, `cancelBooking()` |
| Vendor Portal | `vendorApi` | `getMe()`, `getOrders()` |

#### Auth integration
- `AuthContext` now supports JWT token flow: `login(phone, password)` calls `authApi.login()`, stores `access_token` + `refresh_token` in localStorage
- Auto-refresh: token is refreshed 30s before expiry via `authApi.refreshToken()`
- Logout: calls `authApi.logout()` and clears all stored tokens
- Backwards-compatible: `login(phone)` without password still works (OTP-deferred local-only flow)
- `authApi` module: `login`, `signup`, `refreshToken`, `logout` endpoints via gateway `/api/auth/public/*`
- Header now uses shared `useAuth()` hook (no more duplicate local state)
- All protected routes wrapped with `AuthGuard` component (redirects to `/` if not logged in)
- `customer_id` persistence hardened: store from auth response or JWT claim fallback (`customer_id`/`customerId`) for downstream profile/commerce usage

#### 2026-03-26 integration hardening updates
- API Gateway proxy body-forwarding fix applied to prevent upstream empty-body/ECONNRESET on proxied JSON POST requests
- Frontend API client now unwraps standard envelope responses (`{ success, data }`) and surfaces envelope errors consistently
- Profile Saved Addresses now uses backend CRUD APIs (create/update/delete) instead of local-only state
- Profile Notifications tab now uses notifications APIs (`getMyNotifications`, `markAsRead`) instead of mock-only behavior
- Profile Reviews tab now calls commerce review APIs for create + fetch, with response-shape mapping (`reviewText`/`items`) compatibility
- Orders loading switched from hardcoded customer id to stored `p4u_customer_id`
- Environment/docs aligned to single frontend base URL via API gateway (`http://localhost:8080`)

#### Cart enhancements
- Cart now persists to `localStorage` (survives page refresh)
- On login (token present), cart auto-syncs with server: merges local items → server, loads server cart
- All cart mutations (add, update, remove, clear) fire-and-forget sync to commerce API when logged in

Notes:
- **`output: 'export'` was removed** (see **§2.S**) so dynamic shop/service routes work without hardcoded `generateStaticParams`; all API calls remain client-side.
- TypeScript compiles clean with zero errors
- Build check completed successfully

### N. Standardized response envelopes, validation middleware, and error handling (completed, 2026-03-26)

Rolled out across **all 8 backend services** (catalog, content, profile, commerce, payment, notification, vendor, socio).

#### New shared middleware files (per service, in `src/middleware/`):

1. **`responseEnvelope.ts`** — Standard API response envelope
   - Success: `{ success: true, data: T, meta?: { total, limit, offset } }`
   - Error: `{ success: false, error: { code: string, message: string, details?: unknown } }`
   - Helpers: `sendSuccess()`, `sendCreated()`, `sendBadRequest()`, `sendUnauthorized()`, `sendForbidden()`, `sendNotFound()`, `sendConflict()`, `sendServerError()`

2. **`validateDto.ts`** — Express middleware for DTO validation
   - `validateBody(DtoClass)` — validates req.body against class-validator DTO, returns 400 with field-level error details on failure
   - `validateBodyPartial(DtoClass)` — same but skips missing properties (for PATCH endpoints)
   - Replaces inline manual validation checks

3. **`errorHandlers.ts`** — Enhanced global error handler
   - Catches JWT `UnauthorizedError` → 401 envelope
   - Catches all uncaught errors → 500 envelope
   - Replaces previous bare `{ message: 'Internal server error' }` response

#### Route file updates:
All route handlers across 9 route files updated to use envelope helpers:
- `res.json(data)` → `sendSuccess(res, data)`
- `res.status(201).json(data)` → `sendCreated(res, data)`
- `res.status(400).json({message})` → `sendBadRequest(res, message)`
- `res.status(404).json({message})` → `sendNotFound(res, message)`
- `res.status(500).json({message})` → `sendServerError(res, message)`
- Paginated endpoints include `meta: { total, limit, offset }`

#### Dependencies added:
- `class-validator` + `class-transformer` installed in 6 services (catalog, content, profile, commerce, payment, notification, socio). Auth and vendor already had them.

Notes:
- All 8 services compile clean with zero TypeScript errors
- Envelope format is consistent: frontend `lib/api/client.ts` already handles `res.json()` parsing, envelope is backwards-compatible
- Validation DTOs can now be progressively added to any endpoint using `validateBody(CreateXxxDto)` middleware

### O. User Web — Git sync, merge cleanup, and API contract alignment (completed, 2026-04-01)

App: `p4u-new-user-web`

#### Git / merge
- Pulled `origin/main` into local `main` using stash (`git stash push -u` → pull → `git stash pop`).
- Resolved conflicts: `app/socio/page.tsx` (layout `Header`/`Footer`), vendor vs stashed deletes for `components/layout/Header.tsx` and `components/catalog/ClassifiedResale.tsx` (kept refactored paths; ported small upstream tweaks: classified nav → `/classified`, listing card font weight).
- Dropped redundant stash entry `stash@{0}` after successful re-apply (PowerShell: `git stash drop "stash@{0}"`).
- Cleared follow-up conflict state on `app/socio/page.tsx` and re-staged resolved files.

#### `lib/api/client.ts`
- When the backend returns `{ success, data: T[], meta: { total, limit, offset } }`, the client now returns a **`PaginatedResponse`**-shaped object so list endpoints match commerce/catalog patterns.

#### `lib/api/commerce.ts` (aligned with `commerce-management-services`)
- **Checkout quote**: `POST /checkout/quote` body uses `itemTotal`, `platformFee`, `discount`; `CheckoutQuote` type matches response (`itemTotal`, `platformFee`, `discount`, `total`, `currency`).
- **Coupons**: `validateCoupon(code, cartTotal, vendorId?)` sends required `cartTotal` (and optional `vendorId`).
- **Bookings**: create payload uses `bookingDate` / `timeSlot`; `getBookings` unwraps `{ items, total, limit, offset }`; rows normalized with string UUID `id` and `date`/`slot` UI aliases; `getAvailableSlots` reads `slots` from API wrapper.
- **Review summary**: maps backend `{ average, count }` to `{ averageRating, totalReviews, breakdown }`.
- **Orders**: `Order.id` as string (UUID); `getOrders` / `cancelOrder` accept string ids.

#### `lib/api/vendor.ts`
- `getOrders` unwraps `{ items, total, limit, offset }` from vendor service (not raw `PaginatedResponse` in envelope).
- `getReviewsByOrder` calls `GET /api/v1/vendor/reviews/by-order/:orderId` and returns `items`.
- `VendorOrder.id` / `customerId` typed as string.

#### `lib/api/notifications.ts`
- `registerDevice` sends `{ deviceToken, platform }` (matches notification service).

#### `lib/api/payments.ts`
- `createIntent` sends `orderId` as string for UUID compatibility.

#### `lib/api/social.ts`
- `createPost` / `createComment` map to backend `contentText` / `mediaUrls`.
- `getPublicFeed` / `getFeed` normalize array or paginated `{ data }` and map API post fields (`contentText` → `content`, first `mediaUrl`).
- `getComments` supports array or paginated shape.

#### `lib/api/content.ts`
- `getBanners`, `getPopups`, `getReels`, `getClassified` unwrap `{ items }` when the content service returns paged objects.
- `subscribeNewsletter` accepts optional `fullName` / `phone`.

#### Pages / UX
- **`/checkout`**: platform fee constant; optional coupon → `validateCoupon` → `getCheckoutQuote`; UI shows item total, platform fee, discount, total.
- **`/orders`**, **`/bookings`**: `p4u_customer_id` read as **string** (UUID), not `Number()`.
- **`Profilepage`**: `PageYourOrders` uses string `customerId` for `getOrders`.
- **`app/booking/page.tsx`**, **`app/classified/page.tsx`**: imports fixed to `@/components/layout/Header` and `Footer` (removed broken `@/components/Header` paths).

#### Socio (superseded — see **§2.S**)
- Legacy duplicate files **`app/socio/social.tsx`** and **`app/socio/socialData.ts`** were **removed**. The `/socio` route uses **`SocialPage.tsx` only**, wired to **`socialApi`** (no mock STORIES/POSTS files).

#### Documentation / planning (same day)
- Confirmed gateway ↔ microservice route coverage vs `lib/api` (auth on `/api/auth`, v1 services on `/api/v1/*`).
- Follow-up work rolled into **§2.P** / **§2.S** (full API wiring and removal of hardcoded fallbacks).

Notes:
- **`SocialPage.tsx`**: TypeScript clean; feed/stories/suggestions from **`socialApi`** — see **§2.S** and **§3**.

### P. User Web — Full API wiring: zero hardcoded data (completed, 2026-04-01)

App: `p4u-new-user-web` + `content-management-services`

#### Goal
Eliminate hardcoded/mock data from the frontend so content comes from backend APIs. **§2.S** extended this to **no silent mock replacement** on most pages (empty/loading instead). Some **§2.P** component rows below still describe the earlier “API-first + small local fallback” phase where applicable.

#### Backend — 3 new content APIs added

New entities created in `content-management-services/src/entities/`:
- **`Brand`** → table `content_brands` (name, imageUrl, redirectUrl, sortOrder, isActive)
- **`FeaturedProduct`** → table `content_featured_products` (name, imageUrl, section, price, redirectUrl, sortOrder, isActive)
- **`ServiceHighlight`** → table `content_service_highlights` (title, description, imageUrl, iconUrl, redirectUrl, sortOrder, isActive)

New endpoints in `content-management-services/src/routes/content.routes.ts`:
- `GET /api/v1/content/brands` — brand/partner logos for homepage carousel
- `GET /api/v1/content/featured-products` — featured products grouped by section for "Pick up where you left off"
- `GET /api/v1/content/service-highlights` — Emergency/Urgent/Help service cards

Updated `GET /api/v1/content/home` aggregate to include `brands`, `featuredProducts`, `serviceHighlights` in response.

All 3 entities registered in DataSource, query methods added to `ContentQueryService`, routes follow existing permission pattern (`content.read.public`).

#### Frontend — API functions added

New functions in `lib/api/content.ts`:
- `contentApi.getBrands()` → `GET /api/v1/content/brands`
- `contentApi.getFeaturedProducts()` → `GET /api/v1/content/featured-products`
- `contentApi.getServiceHighlights()` → `GET /api/v1/content/service-highlights`

New types: `BrandItem`, `FeaturedProductItem`, `ServiceHighlightItem`. `HomeContent` type updated to include all three.

#### Components wired (previously 100% hardcoded → now API-first)

| Component | API Call | Fallback |
|-----------|----------|----------|
| `components/home/BrandSections.tsx` | `contentApi.getBrands()` | 3 local brand images |
| `components/home/PickupSection.tsx` | `contentApi.getFeaturedProducts()` | 12 local product cards (groups by `section`) |
| `components/home/ServiceCards.tsx` | `contentApi.getServiceHighlights()` | 3 hardcoded Emergency/Urgent/Help cards |
| `components/catalog/MostBookedServices.tsx` (homeServices) | `catalogApi.getVendorProducts()` | 8 hardcoded home service items |

#### Components wired (previously hardcoded → now API-first, same session)

| Component | API Call | What changed |
|-----------|----------|--------------|
| `app/shop/shop.tsx` | `catalogApi.getCategories()` | Categories sidebar fetched from API |
| `app/shop/[vendorId]/[productId]/ProductRoute.tsx` | `catalogApi.getProduct()` | Product detail fetched by ID from API |
| `app/shop/[vendorId]/page.tsx` | `generateStaticParams()` **restored** (+ `dynamicParams = true`) | Pre-renders paths from `VENDORS` keys; other IDs still work at runtime |
| `app/shop/[vendorId]/[productId]/page.tsx` | `generateStaticParams()` **restored** (+ `dynamicParams = true`) | Pre-renders product pairs from `VENDORS`; static export compatible |
| `app/service/ServiceListPage.tsx` | `catalogApi.getCategories()` | Service categories sidebar fetched from API |
| `app/classified/classified.jsx` | `contentApi.getClassified()` | Classified ads fetched from API instead of ALL_ADS |

#### Already wired (confirmed, no changes needed)
- `ClassifiedResale` → `contentApi.getClassified()`
- `ReelsVideo` → `contentApi.getReels()`
- `MostBookedServices` (most booked) → `catalogApi.getServices()`
- `TopServicer` → `catalogApi.getVendors()`
- `HeroSlider` → `contentApi.getBanners()`
- `BestProducts` → `catalogApi.getVendorProducts()`

#### Full API coverage summary (user web)

Every frontend component calls a backend API. After **§2.S**, key flows use **API-only** presentation (empty/loading) rather than swapping in mock arrays when the API fails.

Notes:
- Backend compiles clean (zero TS errors)
- Frontend: `SocialPage.tsx` TypeScript clean; **`npm run build`** verified after `generateStaticParams` restore — see **§3 Recently verified**
- Tables auto-created via TypeORM `synchronize` in non-production mode
- **Content admin CRUD** for the three `content_*` tables is available at `/api/v1/content/admin/*` (see **§2.D**).

### Q. Frontend API image field alignment + Vendor `logoUrl` column (completed, 2026-04-01)

App: `p4u-new-user-web` + `catalog-management-services` + `admin-management-services`

#### Problem
Frontend components were fetching API data correctly but still rendering hardcoded/fallback images because field names didn't match the backend response shape:
- Banners: backend returns `imageUrl`, frontend read `image`
- Products: image stored in `metadata.imageUrl` JSON, frontend read `image` (top-level, doesn't exist)
- Services: image stored in `metadata.imageUrl` JSON, frontend hardcoded `socket` image
- Vendors: no image column existed at all, frontend hardcoded `plumbing1` image

#### Fixes applied

**`lib/api/content.ts`** — `Banner` interface: added `imageUrl` and `redirectUrl` fields alongside existing `image`/`link` for backwards compatibility.

**`lib/api/catalog.ts`** — `Product` interface: added `metadata?: { imageUrl?: string; brand?: string }`. `ServiceItem` interface: added `metadata?: { imageUrl?: string; price?: string }`. `Vendor` interface: added `businessName`, `ownerName`, `logoUrl` fields.

**`components/home/HeroSlider.tsx`** — Changed `b.image` → `b.imageUrl || b.image` so API banners render the correct URL.

**`components/home/BestProducts.tsx`** — Changed `p.image` → `p.metadata?.imageUrl || p.image` so product images come from metadata JSON.

**`components/catalog/MostBookedServices.tsx`** — Services: changed hardcoded `socket` → `s.metadata?.imageUrl || socket`. Home services: changed `p.image` → `p.metadata?.imageUrl || p.image`.

**`components/catalog/TopServicer.tsx`** — Changed hardcoded `plumbing1` → `v.logoUrl || v.logo || plumbing1`. Also uses `v.businessName || v.name` for title (backend column is `businessName`, not `name`).

**`catalog-management-services/src/entities/Vendor.ts`** — Added `logoUrl` column (`logo_url`, varchar 512, nullable) to `catalog_vendors` table.

**`admin-management-services/src/modules/vendors/entities/Vendor.ts`** — Added matching `logoUrl` column so admin CRUD can set vendor logos.

Notes:
- `next.config.js` already has `images: { unoptimized: true }` — external image URLs (Unsplash, etc.) work without domain allowlisting.
- TypeORM `synchronize` auto-adds `logo_url` column on service restart.
- All components retain hardcoded images as offline fallback (API-first, fallback-second pattern preserved).
- Vendors created before this change need a PATCH to set `logoUrl`.

### R. Initial database seeding guide (documented, 2026-04-01)

#### Data population order (via admin APIs through gateway)

All requests require admin JWT token. Gateway: `http://localhost:8080`.

| Step | Entity | Endpoint | Depends on |
|------|--------|----------|------------|
| 1 | Categories | `POST /api/admin/categories` | — |
| 2 | Vendors | `POST /api/admin/vendors` | — |
| 3 | Products | `POST /api/admin/products` | Vendor ID + Category ID |
| 4 | Services | `POST /api/admin/services` | Category ID |
| 5 | Banners | `POST /api/admin/banners` | — |
| 6 | Popup Banners | `POST /api/admin/addPopupBanner` | — |
| 7a | Brands | `POST /api/v1/content/admin/brands` | — |
| 7b | Featured Products | `POST /api/v1/content/admin/featured-products` | — |
| 7c | Service Highlights | `POST /api/v1/content/admin/service-highlights` | — |
| 8 | Coupons (optional) | `POST /api/admin/coupons` | — |
| 9 | Classified (optional) | `POST /api/admin/classifiedCategories` → vendors → products | — |

#### Homepage section → data dependency

| Homepage Section | Data Needed |
|------------------|-------------|
| Hero Slider | Banners (Step 5) |
| Best Products | Products + Vendors (Steps 2–3) |
| Most Booked Services | Services + Categories (Steps 1, 4) |
| Top Servicer | Vendors with `logoUrl` (Step 2) |
| Brand Carousel | Content Brands (Step 7a) |
| Pick Up Section | Content Featured Products (Step 7b) |
| Service Cards | Content Service Highlights (Step 7c) |

Notes:
- Images stored as external URLs (Unsplash, S3, etc.) in `imageUrl`/`logoUrl`/`metadata.imageUrl` fields.
- Products and services store images inside `metadata` JSON column: `{ "imageUrl": "https://..." }`.
- Vendors store logo in dedicated `logoUrl` column (added in §2.Q).

### S. User Web — Hardcoded data removal and pure API-driven architecture (2026-04-02)

App: `p4u-new-user-web`

#### Goal
Remove ALL hardcoded/mock/fallback data from the frontend. Previously, every component had a `FALLBACK_*` array that silently replaced API data when the backend was offline. Now components start empty, show loading states, and rely purely on API responses.

#### E-commerce flow fixes (completed)

| File | What changed |
|------|-------------|
| `app/shop/[vendorId]/[productId]/ProductRoute.tsx` | Removed `VENDORS` import and hardcoded fallback. Now fetches product + reviews + review summary from `catalogApi.getProduct()`, `commerceApi.getReviews()`, `commerceApi.getReviewSummary()`. Rating comes from API, not hardcoded `4.5` |
| `app/shop/Productdetailpage.jsx` | Removed 4 hardcoded fake reviews, 3 hardcoded offers, hardcoded "In Stock"/"Return Policy" specs. Uses empty arrays when API has no data |
| `app/shop/shop.tsx` | Removed `RAW_SELLERS` and `FALLBACK_CATEGORIES` imports. Starts with empty state + loading spinner. Vendors and categories come purely from API |
| `app/shop/VendorPage.tsx` | Removed `VENDORS` import and fallback. Starts with `null` + loading spinner. All vendor data from `catalogApi.getVendor()` + `getVendorProducts()` |
| `app/shop/[vendorId]/page.tsx` | `generateStaticParams()` returns `[]` — all vendor routes resolved dynamically via API |
| `app/shop/[vendorId]/[productId]/page.tsx` | `generateStaticParams()` returns `[]` — all product routes resolved dynamically via API |
| `providers/CartContext.tsx` | Added `syncError` state exposed via context. All cart sync operations (add/remove/update/clear/merge) now surface errors instead of silently swallowing them |
| `app/checkout/page.tsx` | Auto-fetches quote on page load. Separated coupon validation from quote fetch. Added payment status polling after `createIntent()`. Added success/failed screens with links to orders |
| `app/orders/page.tsx` | Uses `useAuth()` hook to check login state. Better error messages for missing customer profile |
| `next.config.js` | Removed `output: "export"` — incompatible with dynamic API-driven routes that no longer pre-generate from hardcoded data |

#### Home component cleanup (completed)

| Component | What changed |
|-----------|-------------|
| `components/home/BestProducts.tsx` | Removed `FALLBACK_PRODUCTS` (8 products). Starts empty, hides section if API returns nothing |
| `components/home/HeroSlider.tsx` | Removed `FALLBACK_SLIDES` (3 banners). Shows skeleton placeholder while loading |
| `components/home/BrandSections.tsx` | Removed `FALLBACK_BRANDS` (3 brands). Hides section if API returns nothing |
| `components/home/PickupSection.tsx` | Removed `FALLBACK_SECTIONS` (12 products). Hides section if API returns nothing |
| `components/home/ServiceCards.tsx` | Removed `FALLBACK_CARDS` (3 cards). Starts empty |

#### Catalog component cleanup (completed)

| Component | What changed |
|-----------|-------------|
| `components/catalog/MostBookedServices.tsx` | Removed `FALLBACK_SERVICES` (10 services) and `FALLBACK_HOME_SERVICES` (8 items). Starts empty, no hardcoded ratings/prices |
| `components/catalog/TopServicer.tsx` | Removed `FALLBACK_SERVICES` (4 vendors). Starts empty |
| `components/catalog/ClassifiedResale.tsx` | Removed `FALLBACK_LISTINGS` (6 listings with unsplash URLs). Starts empty |
| `components/catalog/ReelsVideo.tsx` | Removed `FALLBACK_PRODUCTS` (8 reels). Starts empty |

#### Service page cleanup (completed)

| File | What changed |
|------|-------------|
| `app/service/ServiceListPage.tsx` | Removed `SELLERS` and `FALLBACK_CATS` imports. Starts with empty arrays, loads from `catalogApi.getCategories()` and `catalogApi.getServices()` |

#### Other cleanup (completed)

| File | What changed |
|------|-------------|
| `app/classified/classified.jsx` | Removed `FALLBACK_ADS` (36 hardcoded ads) and `CLASSIFIED_CATS`. Categories now derived from API data via `useMemo` |
| `app/profile/Profilepage.tsx` | Removed `IMG` object with 13 hardcoded unsplash URLs. All `IMG.xxx` references replaced with `""` |

#### Pre-existing type fixes (completed)

| File | Fix |
|------|-----|
| `app/profile/Profilepage.tsx` | `AddressFormFields` → `AddressFormState` type reference |
| `components/catalog/MostBookedServices.tsx` | Image type widened to `string \| StaticImageData` |
| `components/catalog/TopServicer.tsx` | Image type widened to `string \| StaticImageData` |

#### Socio + service vendor detail + shop constants (completed, 2026-04-01)

| Area | What changed |
|------|----------------|
| **`app/socio/SocialPage.tsx`** | Feed, stories, and suggestions use **`socialApi`** (`getPublicFeed`, `getStoryFeed`, `getSuggestions`). Stories map **`mediaUrl`** for the viewer. Explore uses public feed + suggestions for “People”; Tags/Places show empty-state copy until APIs exist. Messages/notifications start empty; profile UI uses **`getPublicFeed`** for grid thumbnails where applicable; removed pravatar/picsum-style placeholders in favor of neutral placeholders. |
| **`app/socio/social.tsx`** | **Deleted** (unused duplicate; route uses `SocialPage` only). |
| **`app/socio/socialData.ts`** | **Deleted** (mock STORIES/POSTS/CONTACTS/etc. removed). |
| **`app/service/service.tsx`** | **Deleted** (unused; `app/service/page.tsx` uses `ServiceListPage` + `VendorDetailPage` only). |
| **`app/service/serviceData.ts`** | **Types + TEAL constants + filter/sort options only** — removed `VENDORS`, `SELLERS`, `makeProducts`, and image pools. |
| **`app/service/VendorDetailPage.tsx`** | **No `VENDORS` fallback** — loads **`catalogApi.getVendor`**, **`getVendorProducts`**, **`commerceApi.getReviewSummary('vendor', …)`**; loading + not-found states; default gradient **banner** slide from vendor name; rating section **without fake star-distribution bars**; product/gallery **no Unsplash fallbacks** (placeholder when missing image); **`VendorLogo`** supports **`logoUrl`**-style URLs. |
| **`app/service/ServiceListPage.tsx`** | Card images API-only; on error, gray **“No image”** (no rotating Unsplash fallbacks). |
| **`app/shop/constants.js`** | **Trimmed** to **`TEAL_GRADIENT`** + **`ITEMS_PER_PAGE`** only — removed **`VENDORS`**, **`RAW_SELLERS`**, **`BADGE_STYLES`**, **`CATEGORIES`**, **`CAT_IMAGES`**, and local image imports. |

Notes:
- **`npm run build`** verified — 16 pages, zero TypeScript errors (2026-04-01).
- Pattern remains **API-only with loading/empty states** (no silent mock replacement).
- `output: "export"` remains removed from `next.config.js` for dynamic API-driven routes.

### T. Admin Web — `p4u-admin-web` (Vite + React) API integration (completed, 2026-04-02)

App: **`p4u-admin-web`** (admin dashboard template wired to gateway + `admin-management-services` via `/api/admin/*` and `/api/auth/*`).

#### Infrastructure
- **`src/lib/api/client.js`** — `fetch` wrapper, JWT from `localStorage`, `ApiError`, 401 → clear tokens / redirect login.
- **`src/lib/api/config.js`** — `VITE_API_GATEWAY_URL`; dev proxy in **`vite.config.js`** (`/api` → gateway, e.g. `VITE_DEV_PROXY_TARGET`).
- **`src/lib/api/tokenStorage.js`** — access/refresh persistence.
- **`src/lib/api/adminApi.js`** — single module exporting all admin HTTP helpers used by pages.
- **`AuthContext`** + **`ProtectedRouteLayout`** — login at `/` and `/login`; app routes behind auth; **ADMIN** role check; logout in layout.

#### Screens wired to real APIs (not theme placeholders)

| Area | UI routes (examples) | APIs used |
|------|----------------------|-----------|
| **Login** | `/`, `/login` | `POST /api/auth/public/login` |
| **Dashboard** | `/dashboard` | `GET /api/admin/metadata/all/null`; widget uses `GET /api/admin/customers`, `GET /api/admin/vendors` |
| **Vendors** | `/vendor`, `/add-vendor`, `/edit-vendor/:id`, `/view-vendor/:id` | vendors CRUD |
| **Customers** | `/customer`, `/add-customer`, `/edit-customer/:id`, `/view-customer/:id` | customers CRUD; `GET /api/admin/occupations?purpose=all` for occupation dropdown |
| **Products** | `/product`, `/add-product`, `/edit-product/:id`, `/view-product/:id` | products CRUD; `GET /api/admin/taxconfiguration`; categories + vendors for dropdowns |
| **Categories** | `/category`, `/add-category`, `/edit-category/:id`, `/view-category/:id` | categories CRUD |
| **Catalog services** | `/service`, `/add-service`, `/edit-service/:id`, `/view-service/:id` | `/api/admin/services` CRUD |
| **Orders** | `/orders` (view/edit as **modals** — see **§2.U**) | `GET /api/admin/orders`; `GET` + `PATCH /api/admin/orders/individual/:id` |
| **Coupons** | `/coupons`, `/add-coupon`, `/edit-coupon/:id`, `/view-coupon/:id` | coupons list/create/update/delete; edit/view load via **`fetchCouponById`** (paged `GET /api/admin/coupons` — no backend GET-by-id) |
| **Occupations** | `/occupations`, `/add-occupation`, `/edit-occupation/:id`, `/view-occupation/:id` | occupations CRUD + list for customer form |
| **Points** | `/points` | `GET /api/admin/Settlements/allPoints/null` |

#### Sidebar / navigation
- Primary business links: Dashboard, Vendors, Product (submenu), Category, Service, Customers, **Coupons**, **Occupations**, Orders, Points.
- Template-only pages (invoices, blog, extra dashboards, etc.) remain in **`App.jsx`** but are **not** integrated with admin APIs unless listed above.

#### Explicitly not integrated in this app (backend may still expose them)
- Order **POST** (create order from admin UI).
- Full **settlement** CRUD / document upload (only **points** settlement **list** is shown).
- Any other admin modules not covered by `adminApi.js` usage.

Notes:
- Env: set **`VITE_API_GATEWAY_URL`** (or rely on dev proxy) so `/api/*` reaches **`p4u-api-gateway-services`**.
- Admin JWT must include permissions expected by `admin-management-services` (e.g. `vendor.admin.manage`, `customer.admin.manage`, `order.admin.manage`, etc.).

### U. Admin Web — Orders page redesign (completed, 2026-04-13)

App: **`p4u-admin-web`**

#### Redesign
- **Single-page list + modal flow** — `/view-order/:id` and `/edit-order/:id` routes **removed**; view/edit now render in a modal over `/orders`.
- **Header**: "Orders" + total count.
- **Inline stat cards** (4): Total Orders, Revenue (page), Active, Completed — computed from the filtered result set.
- **Filter row**: Search (order ref / customer / vendor / phone), Status dropdown, From Date, To Date, **Export CSV** (client-side export of currently filtered rows).
- **Table columns**: `ORDER ID | CUSTOMER | VENDOR | SUBTOTAL | TAX | DISCOUNT | TOTAL | STATUS | actions`.
- **Row actions**: view (eye), edit (pencil), cancel (red). Cancel calls `PATCH /api/admin/orders/individual/:id` with `status: cancelled`.

#### New component
- **`OrderDetailModal.jsx`** — reusable modal that supports both `view` and `edit` modes:
  - Header: order ID, date, status pill.
  - 6-step progress tracker: **Placed → Paid → Accepted → In Progress → Delivered → Completed**.
  - Customer + Vendor summary cards.
  - Order items list (name, qty, line total).
  - Totals breakdown: Item Total (MRP), Discount, Points Redeemed, Platform Fee, **GST on Platform Fee (18%)**, Product Tax, **Grand Total**, Payment Ref ID.
  - View mode: `Close` / `Edit Status` buttons.
  - Edit mode: status dropdown (`placed`, `paid`, `accepted`, `in_progress`, `delivered`, `completed`, `cancelled`) + `Cancel` / `Save Changes`.

#### Files touched
- New: `src/pages/orders/OrderDetailModal.jsx`.
- Rewritten: `src/pages/orders/OrderListLayer.jsx`.
- Simplified: `src/pages/orders/OrderListPage.jsx` (dropped separate `OrderStat` block).
- **Deleted**: `ViewOrderPage.jsx`, `EditOrderPage.jsx`, `OrderFormLayer.jsx`, `OrderStat.jsx`.
- `App.jsx`: removed imports + `/view-order/:id`, `/edit-order/:id` routes.

Notes:
- Build verified (`npm run build`, exit 0) on 2026-04-13.
- Stats reflect the **currently filtered** list, not global DB totals.
- Status enum aligned with the new stepper flow; legacy statuses (`pending`, `created`, `order_await_completion`) still render but map to the "Placed" step for display.

### V. Admin Web — List + modal consolidation across all modules (completed, 2026-04-13)

App: **`p4u-admin-web`**

#### Pattern
Every admin module is now a **single page**: list-with-modal. Separate `/add-*`, `/edit-*/:id`, `/view-*/:id` routes and their page wrappers are gone. Add / Edit / View all open inside a `FormModal` over the list page; saving closes the modal and refreshes the list.

#### New shared component
- **`src/components/admin/FormModal.jsx`** — reusable modal shell (sm / md / lg / xl sizes, Esc to close, body-scroll lock, backdrop click to close). Used by every module.

#### Per-module changes
For each module:
- `XxxFormLayer.jsx` — accepts `onSuccess` + `onCancel` props. When provided, `handleSubmit` calls `onSuccess()` instead of `navigate("/xxx")`; Cancel/Back calls `onCancel()` instead of `navigate(-1)` / `window.history.back()`.
- `XxxListLayer.jsx` — replaces `<Link to="/add-xxx">` / `/view-xxx/:id` / `/edit-xxx/:id` with modal-triggering buttons. Adds `{modal && <FormModal>…</FormModal>}` render at the bottom.

#### Modules consolidated (14)
| Module | Notes |
|---|---|
| **vendor** | List + Vendor Enquiry in submenu; Add Vendor now modal. Vendor Enquiry kept as a separate page. |
| **category, service, product** | Top-level sidebar links (no more dropdowns). |
| **customer** | Edit-only flow (status). |
| **coupon, occupation, platform-variable** | Full CRUD in modal. |
| **cf-vendor** | Submenu: List CF Vendors + Vendor Enquiry. |
| **cf-category, cf-product, cf-service, cf-city** | Top-level sidebar links. |
| **tax** | Add + Edit in modal. |
| **banner, popup-banner, advertisement** | Full CRUD in modal. |
| **settlement (ListCash, ListPoints)** | View-only modal (`SettlementFormLayer` has no submit path). |

#### Routes — net changes in `src/App.jsx`
- **Removed**: 23 `/add-*`, `/edit-*/:id`, `/view-*/:id` routes across the 14 modules (vendor, category, customer, product, service, platform-variable, coupon, occupation).
- **Added (were missing before)**: list routes for `/cf-vendors`, `/cf-categories`, `/cf-products`, `/cf-services`, `/cf-cities`, `/tax`, `/banners`, `/popup-banners`, `/advertisements`, `/list-cash`, `/list-points`. These sidebar links were previously 404-ing.
- **Created** `src/pages/cf-product/CFProductsListPage.jsx` (page wrapper was missing for cf-product).

#### Sidebar — `src/masterLayout/MasterLayout.jsx`
Collapsed dropdowns → single `NavLink` where the module no longer has multiple sub-pages:
- Category, Product, Service, Occupations, Platform Variables (first pass).
- CF Categories, CF Products, CF Services, CF City Locations, Tax Management, Banners, Popup Banners, Advertisements (second pass).
- Kept as dropdowns: **Vendor** (List + Vendor Enquiry), **CF Vendors** (List + Vendor Enquiry), **Settlements** (List Cash + List Points).

#### Files deleted (~46)
All `Add*`, `Edit*Page`, `View*Page` wrappers across the 14 modules, plus `OrderFormLayer.jsx` + `OrderStat.jsx` from the earlier Orders redesign.

Notes:
- `npm run build` exits 0 after each batch (category/customer/service/product/coupon/occupation/platform-variable, vendor, CF/tax/marketing/settlement).
- CF and marketing modules were always mock-only (no backend wiring) — consolidation preserves that; `handleSubmit` still `console.log`s then closes the modal.
- Pattern is consistent across every module so adding a new one means: list layer + form layer + single list route; never a separate add/edit/view page.

### W. Admin Web — post-audit gap-fill (completed, 2026-04-21)

App: **`p4u-admin-web`** + **`admin-management-services`**

Post-audit pass addressing reachability bugs, dead UI, and the one documented prod-DB gap. All items surfaced by the end-to-end review are now closed.

#### Fixes
- **Coupons reachable from sidebar** — added a top-level **Coupons** NavLink in `src/masterLayout/MasterLayout.jsx` under *Sales & Financials* (route existed, sidebar entry was missing — would have been 404 by UI navigation only).
- **Orphan CF Vendor Enquiry removed** — deleted `src/pages/cf-vendor/VendorEnquiryListLayer.jsx` and `VendorEnquiryListPage.jsx`. Both were mock-data pages with no backend and no sidebar entry. `§2.V` doc line "CF Vendors submenu List + Vendor Enquiry" was aspirational; flat `/cf-vendors` is the real state.
- **Vendor status filter UI** — `src/pages/vendor/VendorList.jsx` hardcoded `status: "active"`, hiding `suspended` / `rejected` vendors. Added a Status dropdown (All / Active / Not Verified / Suspended / Rejected); passes `?status=` through to backend (`vendor.routes.ts` already honored it).
- **Advertisement `metadata` prod migration** — `AdvertisementFeedItem` entity has a `metadata` JSON column that relies on TypeORM `synchronize` in dev. Added `admin-management-services/migrations/2026-04-21-add-metadata-to-content-ad-feed-items.sql` for production MySQL where `synchronize=false`.
- **Dead UI removed** — `src/pages/orders/OrderListLayer.jsx` had unselectable checkbox column with no bulk actions. Removed header + row cell, adjusted colspan.
- **Docs drift fixed** — `BACKEND_FRONTEND_CHANGES.md §6 (Orders)` rewritten to reflect the list+modal redesign (`OrderDetailModal.jsx` + inline stats). Stale references to deleted `OrderStat.jsx` / `OrderFormLayer.jsx` removed.

#### Build
- `npm run build` → exit 0 (2176 modules transformed, 27.3s, no TS/React errors).

#### Explicitly deferred (out of scope for this pass)
- **Admin backend response envelope alignment**: `admin-management-services` still returns raw `res.json(row)` / `res.status(400).json({ message })`; user-facing services use `{ success, data }` / `{ success, error }`. Frontend `lib/api/adminApi.js` handles raw shape; refactor is non-trivial (15+ route files) with no user-visible impact.
- **Global order stats** (`/api/admin/orders/stats` aggregation endpoint): Orders page still computes Revenue / Active / Completed over the currently filtered page, not the global DB. Acceptable for now.
- **DTO validation decorators** on new admin columns — `BACKEND_FRONTEND_CHANGES.md` explicitly defers this.

### X. User Web — checkout / payment + password flows completion (completed, 2026-04-21)

App: **`p4u-new-user-web`**

Post-audit pass closing the two blocker gaps uncovered by the end-to-end API coverage audit (Razorpay flow incomplete, password-reset UI missing) plus low-severity cleanups.

#### Checkout — real Razorpay integration (previously incomplete)

The prior checkout flow called `createIntent` then polled `getIntent` for a status change, never opening the Razorpay modal and never calling `/api/v1/payments/verify`. In production this meant the customer literally could not pay.

**Now (`app/checkout/page.tsx`):**
1. `commerceApi.createOrderFromCart()` → order
2. `paymentsApi.createIntent({ orderId, amount })` → returns `providerRef` (Razorpay `order_id`) + Razorpay order metadata
3. Loads `https://checkout.razorpay.com/v1/checkout.js` on demand and instantiates `window.Razorpay` with `order_id: intent.providerRef` + `key: NEXT_PUBLIC_RAZORPAY_KEY_ID`
4. On success handler → `paymentsApi.verify({ razorpay_order_id, razorpay_payment_id, razorpay_signature })` → backend HMAC-verifies signature and flips intent to `captured`
5. On signature mismatch / API error → "Payment Failed" screen with retry path to `/orders`
6. On modal dismissal → "Payment Pending" screen (not a false success) with link to `/orders` so the customer can retry

**Supporting updates:**
- `lib/api/payments.ts` — `PaymentIntent.id` / `orderId` corrected to `string` (were `number`), added `providerRef`, added `paymentsApi.verify()` helper (POST `/api/v1/payments/verify`).
- `.env.example` — documented new `NEXT_PUBLIC_RAZORPAY_KEY_ID` (public key only; secret stays server-side).

#### Password flows — forgot + change password UI

- **`lib/api/auth.ts`** — added `authApi.forgotPassword(email)` and `authApi.changePassword(currentPassword, newPassword)`. Backend endpoints existed (`/api/auth/public/forgot-password` triggers Keycloak email; `/api/auth/change-password` requires JWT) but had no frontend.
- **`components/auth/Authmodal.tsx`** — added a new `ForgotPasswordStep` screen and a "Forgot password?" link in the login step. The screen validates the email, calls `forgotPassword`, and shows a neutral confirmation (backend returns generic success regardless of account existence, to prevent enumeration).
- **`app/profile/Profilepage.tsx`** — added a `ChangePasswordBlock` inside `PageAccountPrivacy` with three fields (current password, new password, confirm) and inline success/error feedback. Enforces local match + 6-char min before calling the API.

#### Low-severity cleanups
- `lib/api/social.ts` — `socialApi.getSuggestions()` now accepts an optional `{ limit, offset }` params object. Backend already supported `?limit=`; frontend was hardcoded.

#### Pre-existing TypeScript errors fixed to land a green production build
The audit-driven edits surfaced several latent type errors unrelated to the audit items. Fixed minimally so `next build` passes:
- `tsconfig.json` — added `"downlevelIteration": true` (keeps `target: es5` but allows Set/Map iteration in type-check).
- `app/profile/Profilepage.tsx:964` — `[...needIds]` → `Array.from(needIds)` (Set spread over ES5 target).
- `app/service/VendorDetailPage.tsx:500` — `defaultBanners(v.name, ...)` hardened to `v.name ?? "Vendor"` (`Vendor.name` is `string | undefined`).
- `app/service/VendorDetailPage.tsx:364` — mock "Starts at ₹{[49,79,99][product.id % 3]}" replaced with real `product.price` (id is now UUID string; modulo was nonsensical).
- `app/service/serviceData.ts` — `Product.id` and `Seller.id` widened from `number` to `string | number` to match API UUIDs.
- `app/service/ServiceListPage.tsx:243` and `app/shop/shop.tsx:352` — "newest" sort `b.id - a.id` → `(Number(b.id) || 0) - (Number(a.id) || 0)` (stable no-op for UUIDs, preserves old behavior for legacy numeric IDs).
- `app/shop/shop.tsx` — `ShopItem.id` widened to `string | number`; mapped `title` / `provider` defaulted to `""` / `"Vendor"` to drop `string | undefined`.
- `components/catalog/TopServicer.tsx:68` — same `string | undefined` tightening on `title` / `provider`.
- `app/shop/[vendorId]/[productId]/ProductRoute.tsx:112` — removed orphan call to undefined `notifyNavigationIntent()`.

#### Build
- `npm run build` → exit 0, **16 pages** generated, zero TypeScript errors.

#### Required production config (ops, not code)
These are now the only things blocking a live deployment:
1. **Razorpay env**: set `NEXT_PUBLIC_RAZORPAY_KEY_ID` in user-web `.env.local`; set `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET` in `payment-management-services` env.
2. **DB migration**: run `admin-management-services/migrations/2026-04-21-add-metadata-to-content-ad-feed-items.sql` on prod MySQL.
3. **Razorpay webhook**: configure the dashboard to POST `payment.captured` / `payment.failed` to `/api/v1/payments/webhooks/razorpay` so async captures update intent state (backend handler already exists; HMAC verified against `RAZORPAY_WEBHOOK_SECRET`).
4. **Browser smoke-test**: the green build proves types + compilation; it doesn't prove the Razorpay modal opens, Keycloak SMTP sends reset emails, or the change-password flow hits a real realm. Needs a running stack to validate these user-facing paths.

---

## 3) Rolling status (checklist)

### Completed

| # | Task | Status |
|---|------|--------|
| 1 | Fix `SocialPage.tsx` TypeScript errors (48 → 0) | Done |
| 2 | Full API wiring — user web API-first (see **§2.P**); hardcoded data only as offline fallback | Done |
| 3 | 3 new backend content APIs: **brands**, **featured-products**, **service-highlights** (+ `home` aggregate) | Done |
| 4 | `PROJECT-STATUS.md` + `ALL-APIS.md` updated | Done |
| 5 | **Admin CRUD** for `content_brands`, `content_featured_products`, `content_service_highlights` (`/api/v1/content/admin/*`) | Done |
| 6 | **OpenAPI** overview YAMLs for all **8** user-facing services (`docs/openapi/*.openapi.yaml`) | Done |
| 7 | Frontend API image field alignment — all components now render API images correctly (see **§2.Q**) | Done |
| 8 | Vendor `logoUrl` column added to `catalog_vendors` (admin + catalog entities) | Done |
| 9 | Initial DB seeding guide documented (see **§2.R**) | Done |
| 10 | **Hardcoded data removal** — ecom flow (shop, cart, checkout, orders) fully API-driven (see **§2.S**) | Done |
| 11 | **Hardcoded data removal** — home components (HeroSlider, BestProducts, BrandSections, PickupSection, ServiceCards) start empty, API-only | Done |
| 12 | **Hardcoded data removal** — catalog components (MostBookedServices, TopServicer, ClassifiedResale, ReelsVideo) start empty, API-only | Done |
| 13 | **Hardcoded data removal** — service pages (ServiceListPage) start empty, API-only | Done |
| 14 | **Hardcoded data removal** — classified page wired to contentApi, profile IMG object removed | Done |
| 15 | `next.config.js` — removed `output: "export"` for dynamic API-driven routes | Done |
| 16 | `CartContext.tsx` — sync errors now surfaced to UI via `syncError` state | Done |
| 17 | `checkout/page.tsx` — auto-fetches quote, payment status polling, success/fail screens | Done |
| 18 | `orders/page.tsx` — uses `useAuth()` context, better error handling | Done |
| 19 | **Socio** — `SocialPage.tsx` API-driven; removed `social.tsx`, `socialData.ts` | Done |
| 20 | **Service** — removed `service.tsx`; `serviceData.ts` types-only + filters; `VendorDetailPage` catalog + review summary | Done |
| 21 | **`app/shop/constants.js`** — only `TEAL_GRADIENT`, `ITEMS_PER_PAGE` | Done |
| 22 | **Admin Web (`p4u-admin-web`)** — auth, dashboard, vendors, customers, products, categories, services, orders (list + view/edit), coupons, occupations, points list; `adminApi` + protected routes (see **§2.T**) | Done |
| 23 | **Admin Web — Orders page redesign** — single-page list + modal view/edit, 4 stat cards, date filters, CSV export, 6-step status tracker (see **§2.U**) | Done |
| 24 | **Admin Web — List + modal consolidation** — every module (except Vendor Enquiry) is now a single list page with modal Add/Edit/View; shared `FormModal` shell; 14 modules converted, 46 page files deleted, sidebar flattened; missing CF/marketing/tax/settlement list routes added (see **§2.V**) | Done |
| 25 | **Admin Web — post-audit gap-fill** — Coupons sidebar link, CF Vendor Enquiry orphan removal, Vendor status-filter UI, Advertisement `metadata` prod SQL migration, Orders dead-checkbox removal, docs drift fixed (see **§2.W**) | Done |
| 26 | **User Web — Razorpay checkout integration** — real `checkout.js` modal + `/api/v1/payments/verify` HMAC verify, success / pending / failed screens (see **§2.X**) | Done |
| 27 | **User Web — password flows** — `forgotPassword` + `changePassword` wired; "Forgot password?" link in Authmodal + `ChangePasswordBlock` in profile > Account Privacy (see **§2.X**) | Done |
| 28 | **User Web — type-check hardening** — `tsconfig.downlevelIteration`, Product/Seller/ShopItem id widened to `string \| number`, Set spreads moved to `Array.from`, undefined guards on vendor name/title, removed orphan `notifyNavigationIntent` call (see **§2.X**) | Done |

### Recently verified

| # | Task | Status |
|---|------|--------|
| 1 | **`next build`** (`p4u-new-user-web`) after §2.X audit gap-fill | **Pass** (2026-04-21): `npm run build` exit 0; 16 pages generated, zero TS errors |
| 2 | **`vite build`** (`p4u-admin-web`) after §2.W audit gap-fill | **Pass** (2026-04-21): `npm run build` exit 0; 2176 modules transformed, no TS/React errors |

### Still pending — code (priority)

| # | Task | Priority |
|---|------|----------|
| 1 | Expand OpenAPI specs to **full** route coverage (today overview + `ALL-APIS.md` exhaustive list) | Low |
| 2 | Admin backend response envelope alignment (`admin-management-services` still returns raw JSON; 8 user-facing services use `{ success, data }` envelope) | Low |
| 3 | Global order stats endpoint (`/api/admin/orders/stats`) — admin Orders page currently computes Revenue / Active / Completed per filtered page, not global DB totals | Low |
| 4 | DTO validation decorators on new admin columns (`BACKEND_FRONTEND_CHANGES.md` explicitly defers) | Low |
| 5 | Role/permission + ownership guard integration tests | Medium |
| 6 | Observability — structured logs, correlation IDs, trace propagation | Medium |
| 7 | OTP phase — wire OTP verification via notification service (auth modal UI exists, backend deferred) | Medium |

### Still pending — required prod config (ops)

These are now the only blockers for a live deployment. No more code changes required.

| # | Task | Owner hint |
|---|------|------------|
| 1 | Set **`NEXT_PUBLIC_RAZORPAY_KEY_ID`** in `p4u-new-user-web/.env.local` (test key for dev, live key for prod) | Frontend deploy |
| 2 | Set **`RAZORPAY_KEY_ID`**, **`RAZORPAY_KEY_SECRET`**, **`RAZORPAY_WEBHOOK_SECRET`** in `payment-management-services` env | Backend deploy |
| 3 | Run **`admin-management-services/migrations/2026-04-21-add-metadata-to-content-ad-feed-items.sql`** on prod MySQL (dev auto-syncs via TypeORM) | DBA |
| 4 | Configure Razorpay dashboard webhook → **`/api/v1/payments/webhooks/razorpay`** for `payment.captured` + `payment.failed` | Ops |
| 5 | Gateway `/uploads` proxy to admin static files must serve on prod origin (or set **`NEXT_PUBLIC_MEDIA_ORIGIN`**) — see `BACKEND_FRONTEND_CHANGES.md` | Ops |
| 6 | Browser smoke-test: checkout → real Razorpay modal → verify → success screen; forgot-password triggers Keycloak email; change-password updates Keycloak realm | QA |

---

## 4) Pending Work (detail)

### A. Feature-level pending items
- **Low:** Optional full OpenAPI coverage (all routes); overview specs are in `docs/openapi/`.
- **Low:** Admin backend response-envelope alignment (`admin-management-services` still returns raw `res.json` / `{ message }` shapes; 8 user-facing services use the standard `{ success, data }` / `{ success, error }` envelope). Low impact — admin frontend already handles both shapes.
- **Low:** Global order stats endpoint for admin Orders page (currently client-side over filtered page).
- **Medium:** Add tests (unit + API integration) for role/permission matrix and ownership guards.
- **Medium:** Add observability (structured logs, correlation IDs, tracing).
- **Medium:** OTP phase — wire OTP verification flow via notification service (auth modal UI exists, backend deferred).
- **Low:** DTO validation decorators on new admin columns (explicitly deferred in `BACKEND_FRONTEND_CHANGES.md`).
- Consider SSR or middleware-based auth redirects if needed (static **`output: 'export'`** already removed — see **§2.S**).

### B. Infra and data concerns
- Confirm DB permissions for read/write access used by new services.
- Decide long-term model:
  - continue shared admin DB reads for now, or
  - move to projection/event-driven read models per service.
- Add production config management for env secrets.

### C. Required production config (blocks live deployment — no code changes needed)
- Razorpay credentials on both frontend (`NEXT_PUBLIC_RAZORPAY_KEY_ID`) and payment service (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).
- Run `admin-management-services/migrations/2026-04-21-add-metadata-to-content-ad-feed-items.sql` on prod MySQL.
- Configure Razorpay dashboard webhook → `/api/v1/payments/webhooks/razorpay`.
- Prod origin must serve `/uploads` (or set `NEXT_PUBLIC_MEDIA_ORIGIN`).
- Browser smoke-test of checkout + forgot-password + change-password against a running stack.

---

## 5) Recommended Next Execution Order

1. Do the **required prod config** in §4.C — these are the only deployment blockers.
2. Browser smoke-test the new Razorpay checkout + forgot/change-password flows against a live stack.
3. Add role/permission + ownership integration tests.
4. Add observability (request IDs, structured logs, trace propagation).
5. Prepare OTP phase via notification channel integration.
6. Optionally expand OpenAPI to mirror every route in `ALL-APIS.md`.
7. Optionally align admin backend to standard response envelope used by user-facing services.

---

## 6) Quick Run Checklist

Core services:
- discovery
- auth
- gateway
- admin

New services:
- catalog-management-services
- content-management-services
- profile-management-services
- commerce-management-services
- payment-management-services
- notification-management-services
- vendor-management-services
- socio-management-services

User web:
- p4u-new-user-web (Next.js, `npm run dev` → http://localhost:3000)
  - Requires: `.env.local` with `NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080`

Admin web:
- p4u-admin-web (Vite + React, `npm run dev` — see project README / Vite default port)
  - Requires: `VITE_API_GATEWAY_URL` and/or dev proxy target for `/api` → gateway (see **§2.T**)

Health checks to verify:
- `GET /health` on gateway
- `GET /api/v1/catalog/public/health`
- `GET /api/v1/content/public/health`
- `GET /api/v1/profile/public/health`
- `GET /api/v1/commerce/public/health`
- `GET /api/v1/payments/public/health`
- `GET /api/v1/notifications/public/health`
- `GET /api/v1/vendor/public/health`
- `GET /api/v1/social/public/health`

---

## 7) Current Overall Completion (practical)

- Foundation + eight user-facing backend services (including vendor portal and socio): done
- Frontend restructuring + API wiring across all pages: done
- Auth integration (JWT token flow, auto-refresh, auth guards): done
- Cart persistence + server sync: done
- Standardized response envelopes + validation middleware + error handling: done
- User web API contract alignment with gateway/services + merge cleanup (2026-04-01): done — see **§2.O**
- **Full API wiring — user web (2026-04-01): done — see §2.P + §2.S**
  - 3 new backend APIs: brands, featured-products, service-highlights
  - Components API-driven; **§2.S** removes mock fallbacks on shop/service/socio and related surfaces (empty/loading instead)
- API docs: overview OpenAPI in `docs/openapi/`; tests and observability still pending
- **Frontend image field alignment (2026-04-01): done — see §2.Q**
  - All components now render API images (banners, products, services, vendors)
  - Vendor `logoUrl` column added to `catalog_vendors`
  - Products/services use `metadata.imageUrl`; banners use `imageUrl`
- **DB seeding guide documented (2026-04-01): see §2.R** — step-by-step population order with dependencies

- **Hardcoded data removal (2026-04-01): user web complete for listed surfaces — see §2.S**
  - Ecom flow (shop, cart, checkout, orders): fully API-driven, zero fallback data
  - Home + catalog components: start empty, load from API
  - Service list + **vendor detail** (`VendorDetailPage`): API-only; **`serviceData`** mock vendors/sellers removed; duplicate **`service.tsx`** removed
  - Classified, profile: cleaned up
  - **Socio**: **`SocialPage`** wired to **`socialApi`**; **`social.tsx`** / **`socialData.ts`** removed
  - **`constants.js`**: shop mock sellers/vendors removed
- **Admin Web (`p4u-admin-web`, 2026-04-02): business screens wired to gateway + admin service — see §2.T**
- **Admin Web post-audit gap-fill (2026-04-21): Coupons sidebar link, CF Vendor Enquiry cleanup, Vendor status filter, ad-metadata prod migration, Orders UI cleanup — see §2.W**
- **User Web checkout + password flows (2026-04-21): real Razorpay `checkout.js` + `/payments/verify`, forgot-password + change-password UI — see §2.X**

Approximate status:
- Completed (code): **~100%** — all user-facing flows, admin modules, backend services wired end-to-end. Builds: `npm run build` green on both apps (2026-04-21).
- Pending (code): tests, observability, OTP — tracked in §3 and §4.A, none blocking.
- Pending (ops): Razorpay env, SQL migration, webhook config, smoke-test — tracked in §3 and §4.C. Before a production deploy these five items must be done; none require code changes.

### Y. Admin Web — UI modernization batch (completed, 2026-04-25)

App: **`p4u-admin-web`**

Implemented a broad visual and workflow upgrade to match the provided design references while keeping API compatibility.

#### Dashboard
- Reworked dashboard composition to include:
  - KPI summary cards with improved data fallback handling
  - **Recent Orders** panel
  - **Top Vendors** panel (chart)
  - Existing revenue/category charts retained and aligned
- Added active-ad count derivation in dashboard summary from advertisement feed states.

#### Product Vendors (`/cf-vendors`)
- Rebuilt list page:
  - approval tabs, summary cards, search/date/payment filters, CSV export
  - simplified operational table (`commission`, `payment`, `status`, timestamps, actions)
- Reworked vendor modal to tabbed view:
  - `Details`, `KYC & Documents`, `Plan & Payment`
  - integrated view/edit/save flow in one modal.

#### Service Vendors (`/vendor`)
- Rebuilt list page to design system:
  - approval tabs, summary cards, search/date filters, add/export actions
  - compact table (`ID`, business, email, mobile, actions)
- Reworked modal to tabbed structure:
  - `Details`, `KYC & Documents`, `Plan & Payment`
  - GST/tax block, shop photo handling, plan/payment controls.

#### Products (`/product`)
- Rebuilt list page:
  - `Pending Approval` + `All Products` tabs
  - metrics (`Total`, `Active`, `Avg Price`)
  - search/date filters + add/export actions
  - redesigned table (`ID`, product, vendor, price, discount, status, created)
- Rebuilt product modal with tabs:
  - `General`, `Pricing`, `Attributes`, `SEO`
  - added only practical extra fields where backend was sparse (e.g., `sku`, deal-of-day toggle, simple specs, SEO metadata) using metadata-safe mapping.

#### Points dashboard (`/points`)
- Converted from settlement table-first page to dashboard:
  - top points KPI cards (issued/redeemed/welcome/referrals/social interactions)
  - left `Points Configuration` card
  - right `Recent Transactions` stream.

#### Social dashboard (new)
- Added new social admin module:
  - files: `src/pages/social/SocialDashboardPage.jsx`, `src/pages/social/SocialDashboardLayer.jsx`
  - route: `/admin/social`
  - includes top module tabs, summary cards, and two analytics charts.

Build/lint note:
- Touched files passed lint checks during implementation.

### Z. Admin Web — login/session persistence hardening (completed, 2026-04-25)

App: **`p4u-admin-web`**

Issue observed:
- Users could be redirected to login on refresh after some time due to auth state not being fully rehydrated/validated before protected-route checks.

Fix implemented:
- `AuthContext` startup rehydration now:
  - reads stored access token
  - decodes expiry
  - refreshes token on app init if access token is expired and refresh token exists
  - clears tokens only when refresh fails
- Added `isInitializing` auth state to prevent premature route redirects.
- `ProtectedRouteLayout` now waits for initialization before auth redirect.
- Login redirect flow now respects initialization state.
- Token update event synchronization improved after login.

Files updated:
- `src/context/AuthContext.jsx`
- `src/components/ProtectedRouteLayout.jsx`
- `src/pages/auth/Login.jsx`

### AA. Pricing engine end-to-end + zero-touch DB bootstrap (completed, 2026-05-07)

Context:
- Spreadsheet specified a complete vendor-tier / commission / wallet / loyalty flow (Local & VIP plans, per-vendor commission, category & product overrides, platform fee + GST, points redemption capped per vendor, signup / referral / social earn-on-event credits).
- Verified against current code state (not the stale tracker MD): `VendorPlan` entity + admin UI already existed, `RewardPointsLedger` already credited post-likes, and `PlatformVariable` storage existed but nothing read it for business logic. Big gaps: no checkout fees, no commission resolver, no override columns, no bootstrap.

#### Backend changes

**Database (admin-owned, shared `p4u_admin_db`):**
- `catalog_vendors` — added `vendor_plan_id`, `enrollment_cost`, `coverage_radius_km`, `restriction` (district/state/pan_india/international), `self_delivery`, `max_redemption_percent` (per-vendor override of plan default).
- `product_categories`, `catalog_categories`, `catalog_products` — added `commission_override_percent`.
- Idempotent migration at `admin-management-services/migrations/2026-05-07-pricing-engine.sql` (uses `INFORMATION_SCHEMA` checks via stored procedure).

**Platform variables (admin):**
- New canonical key constants + cached reader at `admin-management-services/src/modules/platform-config/platform-variable.reader.ts`.
- 11 keys: `WELCOME_BONUS`, `REFERRAL_BONUS`, `VENDOR_REFERRAL_BONUS`, `POST_SHARE_POINTS`, `POST_LIKE_POINTS`, `STORY_LIKE_POINTS`, `PLATFORM_FEE`, `GST_ON_PLATFORM_FEE_PERCENT`, `MIN_CART_VALUE`, `SURGE_COST`, `DELIVERY_FEE`.
- 5-min in-process cache; cache busts on admin update of any platform variable row.
- Mirrored read-only entity + reader util in `commerce-management-services`, `socio-management-services`, `profile-management-services`.

**Wallet earn-on-event hooks:**
- `profile-management-services/src/service/referral.service.ts` — replaced hardcoded 300/200 with `getPlatformVarNumber(WELCOME_BONUS / VENDOR_REFERRAL_BONUS)`. Added `REFERRAL_BONUS` credit to the referee on top of the welcome bonus.
- `socio-management-services/src/service/socioRewardPoints.service.ts` — refactored to single `creditEvent()` helper covering `post_like`/`post_share`/`story_like`. Each reads its respective platform variable.
- New socio routes: `POST /api/v1/social/posts/:postId/share` and `POST /api/v1/social/stories/:storyId/like`.

**Commission resolver (commerce):**
- `commerce-management-services/src/service/commissionResolver.ts` — pure function with precedence chain: product override → category vendor-override (per-vendor in `category.metadata.vendorOverrides[vendorId]`) → category global override → vendor commission rate → vendor plan commission % → 0.
- `resolveMaxRedemptionPercent()` — vendor max-redemption override → plan default → 0.

**Checkout pricing engine (commerce):**
- `commerce-management-services/src/service/pricing.service.ts` — `priceCart()` loads products/categories/vendors/plans in batched queries, computes per-line commission (with source tag), aggregates per-vendor `subtotal`/`commissionTotal`/`netToVendor`, reads platform variables, caps redemption at `min(requested, walletBalance, maxRedeemableValue)`, returns full breakdown including `warnings[]`. Pure read.
- `cart.service.ts createOrderFromCart()` rewrite — calls `priceCart()` first; throws if `meetsMinCart === false`. Wraps everything in a transaction:
  - Creates order with full breakdown in `order.metadata.totals`
  - Creates one `commerce_settlements` row per vendor (cash split)
  - Debits redeemed points to `RewardPointsLedger` (negative `points` row, `type: order_redeem`)
  - Updates customer profile wallet balance
  - Clears cart
- New endpoint: `POST /api/v1/commerce/cart/quote` — pre-checkout breakdown without committing.
- `POST /api/v1/commerce/orders/from-cart` now accepts `redeemPoints` in body.

**Vendor portal (vendor-management-services):**
- New endpoints (vendor-scoped via `requireVendorId`):
  - `GET /api/v1/vendor/me/plan` — returns vendor + linked plan + effective rates
  - `GET /api/v1/vendor/me/settlements` — payout history
  - `PATCH /api/v1/vendor/me/categories/:id/override` — sets per-vendor category % into `metadata.vendorOverrides[vendorId]` (does NOT touch admin's global value)
  - `PATCH /api/v1/vendor/me/products/:id/override` — with ownership check (vendor can only edit own products)
- Read-only mirror entities added (`VendorPlan`, `Product`, `ProductCategory`, `Settlement`).

#### Frontend changes

**Admin web (`p4u-admin-web`):**
- `src/pages/vendor/VendorFormLayer.jsx` — new **Vendor Plan** dropdown (loads from `listVendorPlans()`); selecting a plan auto-fills commission %, max redemption %, radius, enrollment cost. New fields: enrollment cost, coverage radius (km), restriction zone, self-delivery toggle.
- `src/pages/category/CategoryFormLayer.jsx` — new `Commission Override %` field for product categories.
- `src/pages/product/ProductFormLayer.jsx` — new `Commission Override % (this product)` field in pricing tab.
- New `src/pages/vendor-portal/VendorPortalPage.jsx` (route `/vendor-portal`) — 4 tabs for vendor-role users: My Plan, Settlements, Category Override (per-vendor, with global shown for reference), Product Override.
- `src/lib/api/adminApi.js` — added `getMyVendorPlan`, `listMySettlements`, `setVendorCategoryOverride`, `setVendorProductOverride`.

**User web (`p4u-new-user-web`):**
- `app/cart/CartCheckout.tsx` — removed hardcoded `PLATFORM_FEE = 50`. Calls `commerceApi.quoteCart({ redeemPoints })` whenever cart or applied points change. Sidebar dynamically shows Item Total / Platform Fee / GST on Platform Fee / Delivery / Surge / Points Redeemed / Total. Shows real wallet balance + max-redeemable cap, surfaces server warnings, disables `Proceed to Buy` when min-cart not met.
- `app/profile/Profilepage.tsx` `PageRewardPoints` — Earned/Redeemed tabs read from real ledger `recentHistory` with type labels (Welcome bonus / Referral bonus / Liked a post / Order redeemed / etc.).
- `lib/api/commerce.ts` — added `quoteCart()` + `CartQuoteBreakdown` type; `createOrderFromCart()` now accepts `{ redeemPoints, vendorId }`.

#### Zero-touch DB bootstrap (the critical operational change)

Goal: a brand-new prod DB needs no manual SQL, no `DB_SYNCHRONIZE` env toggling, no manual seeding.

**New files:**
- `admin-management-services/migrations/2026-05-07-bootstrap-schema.sql` — canonical schema dump (66 tables, all `CREATE TABLE IF NOT EXISTS`) covering admin + commerce + profile + socio + payment + notification + vendor + classified + content + pos + media + auth shared tables.
- `admin-management-services/src/config/bootstrapSchema.ts` — `bootstrapAllSharedTables()`: connects without DB → `CREATE DATABASE IF NOT EXISTS` → runs the schema dump with `FOREIGN_KEY_CHECKS=0` so order doesn't matter.
- `admin-management-services/scripts/verify-fresh-db-bootstrap.cjs` — smoke test: drops empty DB, runs bootstrap path, asserts table count + seeds.

**Extensions to `admin-management-services/src/config/schemaRepair.ts`:**
- `repairPricingEngineSchema()` — adds the 9 pricing-engine columns to existing tables (idempotent via `INFORMATION_SCHEMA` checks).
- `seedPlatformVariableDefaults()` — inserts the 11 platform-variable defaults; skips any key that already exists (admin overrides preserved on restart).
- `seedDefaultVendorPlans()` — inserts the 9 spreadsheet tiers (Basic / Standard / Premium / General + Bronze / Silver / Gold / Diamond / Platinum) only when `vendor_plans` table is empty.

**Wired into `admin-management-services/src/server.ts` startup, in order:**
1. `bootstrapAllSharedTables()` — DB + 66 tables
2. Column repairs (`repairCustomerProfilesSchema`, `repairCatalogVendorsSchema`, `repairVendorPlansSchema`, `repairPushNotificationSendsSchema`, `repairMediaLibrarySchema`, `repairBulkUploadJobsSchema`, `repairProductAttributesSchema`, `repairPricingEngineSchema`)
3. Seeds (`repairOccupationAdminCreatePlatformVariableSeed`, `seedPlatformVariableDefaults`, `seedDefaultVendorPlans`)
4. `AppDataSource.initialize()` — TypeORM connects to the now-prepared DB

**Synchronize policy:**
- `commerce-management-services` and `profile-management-services` and `socio-management-services` set to `synchronize: false` (admin owns the schema).
- Other services keep their existing env-gated synchronize behavior; with bootstrap creating everything first, they all just connect.

**Verified on this machine** against an empty database (`p4u_admin_db_test`):
```
[verify] Tables created:        66
[verify] Platform variables:    12   (11 seeds + pre-existing OCCUPATION key)
[verify] Vendor plan tiers:     9
[verify] catalog_vendors.vendor_plan_id present: yes
[verify] PASSED — fresh DB came up zero-touch.
```
Re-ran a second time — counts stayed at exactly 9 plans + 12 vars (idempotent, no duplicates).

**Operator runbook for prod deployment:**
1. Set `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` in `admin-management-services/.env` (and same in every other service's `.env`).
2. Start admin first (`npm run dev` or `npm start`). Console will show schema bootstrap + seed lines.
3. Start the other services in any order.

If the prod MySQL user lacks `CREATE DATABASE` privilege, the DBA must run `CREATE DATABASE <db> CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;` once. Everything else is automatic.

#### Type-checking

All seven projects type-check clean: `admin-management-services`, `commerce-management-services`, `profile-management-services`, `socio-management-services`, `vendor-management-services`, `catalog-management-services`, `p4u-new-user-web` (`npx tsc --noEmit` on each).

#### Pending / out-of-scope

- DB migration to convert `customer_reward_points_ledger.type` from flexible `varchar(32)` to enum (using strings is fine for now).
- `dist/` rebuild (not needed for `npm run dev` ts-node-dev mode; required for `npm run start` production mode — operator runs `npm run build`).
- Vendor-referring-vendor reward variant (only customer→customer wired; spreadsheet's "vendor referral 200" used as customer-referrer bonus).
- Auto-running `socio-management-services` / `profile-management-services` / `commerce-management-services` schema dumps separately — not needed since admin owns the bootstrap, but worth noting if those services are later split to separate DBs.

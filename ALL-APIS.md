# P4U Backend API List

Last updated: 2026-03-24

This file lists current APIs across all backend services.

## Backend API counts

These numbers come from scanning Express route registrations in service `src` trees and applying each service’s URL mount prefix.

| Metric | Count | Meaning |
|--------|------:|---------|
| Route registrations | **348** | Every `.get` / `.post` / `.patch` / `.put` / `.delete` handler matched in scanned files |
| Unique endpoints | **336** | Distinct **HTTP method + full path** (same path+method counted once only) |
| Unique business endpoints | **325** | Same as unique endpoints, excluding `GET /`, `GET /health`, and `GET …/public/health` |

Notes:

- Full paths include mounts (e.g. `/api/admin/...`, `/api/v1/catalog/...`, discovery `/eureka/...`).
- Legacy aliases with **different path strings** (e.g. `/vendor/:id` vs `/vendors/:id`) are separate endpoints in the unique count.

Regenerate counts + exhaustive list below:

```bash
node scripts/count-api-endpoints.mjs
node scripts/generate-all-apis-md.mjs
```

## Base URLs

- Gateway: `http://localhost:8080`
- Auth service direct: `http://localhost:8081`
- Admin service direct: `http://localhost:8082`
- Catalog service direct: `http://localhost:8084`
- Content service direct: `http://localhost:8085`
- Profile service direct: `http://localhost:8086`
- Payment service direct: `http://localhost:8087`
- Notification service direct: `http://localhost:8088`
- Vendor portal direct: `http://localhost:8089`
- Discovery service direct: `http://localhost:8761`

## Common headers

- Protected APIs: `Authorization: Bearer <accessToken>`
- JSON APIs: `Content-Type: application/json`

## Gateway proxied prefixes (reference)

When calling through the gateway (`http://localhost:8080`):

- `/api/auth/*` → auth-management-service
- `/api/admin/*` → admin-management-service
- `/api/v1/catalog/*` → catalog-management-service
- `/api/v1/content/*` → content-management-service
- `/api/v1/profile/*` → profile-management-service
- `/api/v1/commerce/*` → commerce-management-service
- `/api/v1/payments/*` → payment-management-service
- `/api/v1/notifications/*` → notification-management-service
- `/api/v1/vendor/*` → vendor-management-service


## Exhaustive API list (by service and source file)

Each bullet is one Express route registration. The same **method + path** may appear more than once if registered in different modules (for example overlapping legacy routes).

### `p4u-api-gateway-services` — `src/routes/gatewayRoutes.ts`

- `GET /`
- `GET /health`

### `p4u-discovery-service` — `src/routes/discoveryRoutes.ts`

- `GET /eureka/apps`
- `GET /eureka/apps/:serviceName`
- `GET /eureka/apps/:serviceName/:instanceId`
- `GET /health`
- `GET /status`
- `POST /eureka/apps/:serviceName`
- `PUT /eureka/apps/:serviceName/:instanceId`
- `DELETE /eureka/apps/:serviceName/:instanceId`

### `p4u-discovery-service` — `src/server.ts`

- `GET /`

### `auth-management-services` — `src/routes/authRoutes.ts`

- `GET /api/auth/admin/info`
- `GET /api/auth/customer/:customerId/info`
- `GET /api/auth/customer/info`
- `GET /api/auth/public/health`
- `GET /api/auth/vendor/:vendorId/info`
- `GET /api/auth/vendor/customers/:customerId/info`
- `GET /api/auth/vendor/info`
- `POST /api/auth/change-password`
- `POST /api/auth/introspect`
- `POST /api/auth/logout`
- `POST /api/auth/public/forgot-password`
- `POST /api/auth/public/login`
- `POST /api/auth/public/refresh`
- `POST /api/auth/public/reset-password`
- `POST /api/auth/public/signup`

### `auth-management-services` — `src/server.ts`

- `GET /`

### `admin-management-services` — `src/modules/admin-core/admin-core.routes.ts`

- `GET /api/admin/audit-logs`
- `GET /api/admin/hierarchy/nodes`
- `GET /api/admin/hierarchy/nodes/:id`
- `GET /api/admin/layouts`
- `GET /api/admin/layouts/:id`
- `GET /api/admin/layouts/published/screen/:screenKey`
- `GET /api/admin/me`
- `GET /api/admin/public/health`
- `GET /api/admin/public/layouts/screen/:screenKey`
- `POST /api/admin/hierarchy/nodes`
- `POST /api/admin/layouts`
- `POST /api/admin/layouts/:id/publish`
- `POST /api/admin/layouts/:id/unpublish`
- `PATCH /api/admin/hierarchy/nodes/:id`
- `PATCH /api/admin/layouts/:id`

### `admin-management-services` — `src/modules/analytics/analytics.routes.ts`

- `GET /api/admin/metadata/all/null`
- `GET /api/admin/usersJoined/customers`
- `GET /api/admin/usersJoined/vendors`

### `admin-management-services` — `src/modules/banners/banners.routes.ts`

- `GET /api/admin/allBanners`
- `GET /api/admin/banners/:id`
- `GET /api/admin/popupBanner`
- `GET /api/admin/popupBanner/:id`
- `POST /api/admin/add_banner`
- `POST /api/admin/addPopupBanner`
- `POST /api/admin/banners`
- `PATCH /api/admin/banners/:id`
- `PATCH /api/admin/Banners/:id`
- `PATCH /api/admin/popupBanner/:id`
- `DELETE /api/admin/banners/:id`
- `DELETE /api/admin/popupBanner/:id`

### `admin-management-services` — `src/modules/catalog/catalog.routes.ts`

- `GET /api/admin/categories`
- `GET /api/admin/categories/:id`
- `GET /api/admin/categories/all`
- `GET /api/admin/services`
- `GET /api/admin/services/:id`
- `GET /api/admin/services/all`
- `POST /api/admin/add_categories`
- `POST /api/admin/add_services`
- `POST /api/admin/categories`
- `POST /api/admin/services`
- `PATCH /api/admin/categories/:id`
- `PATCH /api/admin/category/:id`
- `PATCH /api/admin/products/batchCategory/:categoryId`
- `PATCH /api/admin/services/:id`
- `PATCH /api/admin/services/batch/:categoryId`
- `PATCH /api/admin/services/individual/:id`
- `DELETE /api/admin/categories/:id`
- `DELETE /api/admin/service/:id`
- `DELETE /api/admin/services/:id`

### `admin-management-services` — `src/modules/classified/classified.routes.ts`

- `GET /api/admin/availableAreas`
- `GET /api/admin/availableCities`
- `GET /api/admin/classifiedCategories`
- `GET /api/admin/classifiedProducts`
- `GET /api/admin/classifiedServices`
- `GET /api/admin/classifiedVendors`
- `POST /api/admin/availableAreas`
- `POST /api/admin/availableCities`
- `POST /api/admin/classifiedCategories`
- `POST /api/admin/classifiedProducts`
- `POST /api/admin/ClassifiedProducts`
- `POST /api/admin/classifiedServices`
- `POST /api/admin/classifiedVendors`
- `POST /api/admin/upload/ClassifiedProducts/:id`
- `PATCH /api/admin/availableAreas/individual/:id`
- `PATCH /api/admin/availableCities/:id`
- `PATCH /api/admin/availableCities/individual/:id`
- `PATCH /api/admin/classifiedCategories/:id`
- `PATCH /api/admin/classifiedProducts/:id`
- `PATCH /api/admin/classifiedServices/individual/:id`
- `PATCH /api/admin/classifiedVendors/individual/:id`
- `DELETE /api/admin/availableAreas/:id`
- `DELETE /api/admin/availableCities/:id`
- `DELETE /api/admin/classifiedCategories/:id`
- `DELETE /api/admin/classifiedProducts/:id`
- `DELETE /api/admin/ClassifiedProducts/:id`
- `DELETE /api/admin/classifiedServices/:id`
- `DELETE /api/admin/classifiedVendors/:id`

### `admin-management-services` — `src/modules/customers/customer.routes.ts`

- `GET /api/admin/coupons`
- `GET /api/admin/coupons/all/null`
- `GET /api/admin/customers`
- `GET /api/admin/customers/:id`
- `GET /api/admin/occupations`
- `GET /api/admin/Occupations`
- `GET /api/admin/occupations/:id`
- `POST /api/admin/coupons`
- `POST /api/admin/customers`
- `POST /api/admin/occupations`
- `POST /api/admin/Occupations`
- `PATCH /api/admin/coupons/:id`
- `PATCH /api/admin/customers/:id`
- `PATCH /api/admin/occupations/:id`
- `PATCH /api/admin/occupations/individual/:id`
- `PATCH /api/admin/Occupations/individual/:id`
- `DELETE /api/admin/coupons/:id`
- `DELETE /api/admin/customers/:id`
- `DELETE /api/admin/occupations/:id`

### `admin-management-services` — `src/modules/orders/orders.routes.ts`

- `GET /api/admin/orders`
- `GET /api/admin/orders/all/null`
- `GET /api/admin/orders/individual/:id`
- `GET /api/admin/orders/individualOrder/:id`
- `GET /api/admin/orders/vendors/:vendorId`
- `GET /api/admin/settlements/all/null`
- `GET /api/admin/Settlements/all/null`
- `GET /api/admin/Settlements/allCash/null`
- `GET /api/admin/Settlements/allPoints/null`
- `GET /api/admin/Settlements/individual/:id`
- `GET /api/admin/Settlements/individualByVendorSingle/:id`
- `POST /api/admin/orders`
- `POST /api/admin/settlements`
- `POST /api/admin/Settlements`
- `POST /api/admin/upload/Settlements/:id`
- `PATCH /api/admin/orders/individual/:id`
- `PATCH /api/admin/Settlements/individual/:id`

### `admin-management-services` — `src/modules/organization-orders/organization-orders.routes.ts`

- `GET /api/admin/organizationOrders/all/null`
- `GET /api/admin/organizationOrders/allVendors/null`
- `GET /api/admin/organizationOrders/topReferrals/null`
- `POST /api/admin/organizationOrders`
- `PATCH /api/admin/organizationOrders/individual/:id`
- `PATCH /api/admin/organizationOrders/individualVendorAllUnclaimed/:vendorId`

### `admin-management-services` — `src/modules/platform-config/platform-config.routes.ts`

- `GET /api/admin/platformVariables`
- `GET /api/admin/websiteQueries`
- `POST /api/admin/platformVariables`
- `PATCH /api/admin/platformVariables/:id`
- `PATCH /api/admin/websiteQueries/:id`
- `DELETE /api/admin/platformVariables/:id`

### `admin-management-services` — `src/modules/pos/pos.routes.ts`

- `GET /api/admin/posCategories`
- `GET /api/admin/posProducts`
- `GET /api/admin/posVendors`
- `POST /api/admin/posCategories`
- `POST /api/admin/posProducts`
- `POST /api/admin/posVendors`
- `PATCH /api/admin/posCategories/:id`
- `PATCH /api/admin/POSCategories/:id`
- `PATCH /api/admin/posProducts/individual/:id`
- `PATCH /api/admin/POSProducts/individual/:id`
- `PATCH /api/admin/posVendors/individual/:id`
- `PATCH /api/admin/POSVendors/individual/:id`
- `DELETE /api/admin/posCategories/:id`
- `DELETE /api/admin/posProducts/:id`
- `DELETE /api/admin/posVendors/:id`

### `admin-management-services` — `src/modules/posts/posts.routes.ts`

- `GET /api/admin/advertisementFeed`
- `GET /api/admin/objectionableFeedLog`
- `GET /api/admin/posts`
- `GET /api/admin/posts/:id`
- `POST /api/admin/add_posts`
- `POST /api/admin/advertisementFeed`
- `PATCH /api/admin/advertisementFeed/:id`
- `PATCH /api/admin/comments/batchCustomersFor/:id`
- `PATCH /api/admin/objectionableFeedLog/batchFeed/:id`
- `PATCH /api/admin/posts/:id`
- `PATCH /api/admin/posts/individual/:id`
- `DELETE /api/admin/advertisementFeed/:id`
- `DELETE /api/admin/posts/:id`

### `admin-management-services` — `src/modules/products/products.routes.ts`

- `GET /api/admin/products`
- `GET /api/admin/products_request`
- `GET /api/admin/products_request/:id`
- `GET /api/admin/products/:id`
- `GET /api/admin/Products/all/null`
- `GET /api/admin/taxconfiguration`
- `GET /api/admin/taxConfiguration`
- `POST /api/admin/add_products`
- `POST /api/admin/products`
- `POST /api/admin/taxconfiguration`
- `POST /api/admin/taxConfiguration`
- `PATCH /api/admin/product_reviews/batchProducts/:productId`
- `PATCH /api/admin/products_request/batchTaxConfiguration/:id`
- `PATCH /api/admin/products_request/individual/:id`
- `PATCH /api/admin/products/:id`
- `PATCH /api/admin/Products/batchTaxConfiguration/:id`
- `PATCH /api/admin/products/individual/:id`
- `PATCH /api/admin/Products/individual/:id`
- `PATCH /api/admin/taxconfiguration/:id`
- `PATCH /api/admin/taxConfiguration/:id`
- `DELETE /api/admin/product/:id`
- `DELETE /api/admin/products/:id`
- `DELETE /api/admin/taxconfiguration/:id`
- `DELETE /api/admin/taxConfiguration/:id`

### `admin-management-services` — `src/modules/vendor-reviews/vendor-reviews.routes.ts`

- `GET /api/admin/vendorReviews`
- `GET /api/admin/vendorReviews/all/null`
- `POST /api/admin/vendorReviews`
- `PATCH /api/admin/vendorReviews/:id`
- `DELETE /api/admin/vendorReviews/:id`

### `admin-management-services` — `src/modules/vendors/vendor.routes.ts`

- `GET /api/admin/orders/vendors/:vendorId`
- `GET /api/admin/vendor-enquiries`
- `GET /api/admin/vendor-enquiries/:id`
- `GET /api/admin/vendor-requests`
- `GET /api/admin/vendor/:id`
- `GET /api/admin/vendorEnquiry`
- `GET /api/admin/vendorEnquiry/:id`
- `GET /api/admin/vendors`
- `GET /api/admin/vendors_request`
- `GET /api/admin/vendors/:id`
- `POST /api/admin/add_vendors`
- `POST /api/admin/vendors`
- `PATCH /api/admin/coupons/batch/:vendorId`
- `PATCH /api/admin/orders/batchVendors/:vendorId`
- `PATCH /api/admin/organizationOrders/batchVendors/:vendorId`
- `PATCH /api/admin/products_request/batch/:vendorId`
- `PATCH /api/admin/products_Request/batch/:vendorId`
- `PATCH /api/admin/products/batchVendor/:vendorId`
- `PATCH /api/admin/settlements/batch/:vendorId`
- `PATCH /api/admin/Settlements/batch/:vendorId`
- `PATCH /api/admin/vendor-enquiries/:id`
- `PATCH /api/admin/vendor-requests/:id/approve`
- `PATCH /api/admin/vendor/:id`
- `PATCH /api/admin/vendorEnquiry/:id`
- `PATCH /api/admin/vendorReviews/batchVendors/:vendorId`
- `PATCH /api/admin/vendors/:id`
- `DELETE /api/admin/serviceNotifications/vendors/:vendorId`
- `DELETE /api/admin/vendor-requests/:id`
- `DELETE /api/admin/vendor/:id`
- `DELETE /api/admin/vendors_request/:id`
- `DELETE /api/admin/vendors/:id`

### `admin-management-services` — `src/server.ts`

- `GET /`

### `catalog-management-services` — `src/routes/catalog.routes.ts`

- `GET /api/v1/catalog/categories`
- `GET /api/v1/catalog/categories/:id/children`
- `GET /api/v1/catalog/products/:productId`
- `GET /api/v1/catalog/public/health`
- `GET /api/v1/catalog/search`
- `GET /api/v1/catalog/services`
- `GET /api/v1/catalog/services/:id`
- `GET /api/v1/catalog/vendors`
- `GET /api/v1/catalog/vendors/:vendorId`
- `GET /api/v1/catalog/vendors/:vendorId/products`

### `catalog-management-services` — `src/server.ts`

- `GET /`

### `content-management-services` — `src/routes/content.routes.ts`

- `GET /api/v1/content/banners`
- `GET /api/v1/content/brands`
- `GET /api/v1/content/classified`
- `GET /api/v1/content/featured-products`
- `GET /api/v1/content/home`
- `GET /api/v1/content/popups`
- `GET /api/v1/content/public/health`
- `GET /api/v1/content/reels`
- `GET /api/v1/content/service-highlights`
- `POST /api/v1/content/newsletter/subscribe`

### `content-management-services` — `src/routes/contentAdmin.routes.ts`

- `GET /api/v1/content/admin/brands/:id`
- `GET /api/v1/content/admin/featured-products/:id`
- `GET /api/v1/content/admin/service-highlights/:id`
- `POST /api/v1/content/admin/brands`
- `POST /api/v1/content/admin/featured-products`
- `POST /api/v1/content/admin/service-highlights`
- `PATCH /api/v1/content/admin/brands/:id`
- `PATCH /api/v1/content/admin/featured-products/:id`
- `PATCH /api/v1/content/admin/service-highlights/:id`
- `DELETE /api/v1/content/admin/brands/:id`
- `DELETE /api/v1/content/admin/featured-products/:id`
- `DELETE /api/v1/content/admin/service-highlights/:id`

### `content-management-services` — `src/server.ts`

- `GET /`

### `profile-management-services` — `src/routes/profile.routes.ts`

- `GET /api/v1/profile/customers/:customerId`
- `GET /api/v1/profile/me`
- `GET /api/v1/profile/me/addresses`
- `GET /api/v1/profile/me/referral-code`
- `GET /api/v1/profile/me/referrals`
- `GET /api/v1/profile/me/reward-points`
- `GET /api/v1/profile/me/wishlist`
- `GET /api/v1/profile/public/health`
- `POST /api/v1/profile/me/addresses`
- `POST /api/v1/profile/me/wishlist`
- `PUT /api/v1/profile/me/addresses/:addressId`
- `PATCH /api/v1/profile/me`
- `DELETE /api/v1/profile/me/addresses/:addressId`
- `DELETE /api/v1/profile/me/wishlist/:productId`

### `profile-management-services` — `src/server.ts`

- `GET /`

### `commerce-management-services` — `src/routes/commerce.routes.ts`

- `GET /api/v1/commerce/bookings`
- `GET /api/v1/commerce/bookings/:bookingId`
- `GET /api/v1/commerce/bookings/available-slots`
- `GET /api/v1/commerce/cart`
- `GET /api/v1/commerce/customers/:customerId/orders`
- `GET /api/v1/commerce/orders/:orderId`
- `GET /api/v1/commerce/public/health`
- `GET /api/v1/commerce/reviews`
- `GET /api/v1/commerce/reviews/summary`
- `POST /api/v1/commerce/bookings`
- `POST /api/v1/commerce/bookings/:bookingId/cancel`
- `POST /api/v1/commerce/cart/items`
- `POST /api/v1/commerce/cart/merge`
- `POST /api/v1/commerce/checkout/quote`
- `POST /api/v1/commerce/coupons/validate`
- `POST /api/v1/commerce/orders`
- `POST /api/v1/commerce/orders/:orderId/cancel`
- `POST /api/v1/commerce/orders/from-cart`
- `POST /api/v1/commerce/reviews`
- `PUT /api/v1/commerce/cart`
- `PATCH /api/v1/commerce/cart/items/:itemId`
- `DELETE /api/v1/commerce/cart`
- `DELETE /api/v1/commerce/cart/items/:itemId`

### `commerce-management-services` — `src/server.ts`

- `GET /`

### `payment-management-services` — `src/routes/payment.routes.ts`

- `GET /api/v1/payments/intents/:id`
- `GET /api/v1/payments/public/health`
- `POST /api/v1/payments/intents`
- `POST /api/v1/payments/verify`

### `payment-management-services` — `src/routes/webhook.routes.ts`

- `POST /api/v1/payments/webhooks/razorpay`

### `payment-management-services` — `src/server.ts`

- `GET /`

### `notification-management-services` — `src/routes/notification.routes.ts`

- `GET /api/v1/notifications/me`
- `GET /api/v1/notifications/public/health`
- `POST /api/v1/notifications/devices/register`
- `POST /api/v1/notifications/me/:id/read`

### `notification-management-services` — `src/server.ts`

- `GET /`

### `vendor-management-services` — `src/routes/vendor.routes.ts`

- `GET /api/v1/vendor/integrations/push-notification`
- `GET /api/v1/vendor/me`
- `GET /api/v1/vendor/orders`
- `GET /api/v1/vendor/orders/:orderId`
- `GET /api/v1/vendor/orders/individualOrder/:orderId`
- `GET /api/v1/vendor/organization-orders`
- `GET /api/v1/vendor/organizationOrders/individualVendors/:keycloakSub`
- `GET /api/v1/vendor/public/health`
- `GET /api/v1/vendor/referrals/code-usage/:code`
- `GET /api/v1/vendor/referrals/my-organization-orders/:code`
- `GET /api/v1/vendor/register/status`
- `GET /api/v1/vendor/reviews/by-order/:orderId`
- `GET /api/v1/vendor/vendorReviews/individualOrder/:orderId`
- `POST /api/v1/vendor/organization-orders`
- `POST /api/v1/vendor/organizationOrders`
- `POST /api/v1/vendor/register`
- `PATCH /api/v1/vendor/me`
- `PATCH /api/v1/vendor/orders/:orderId`
- `PATCH /api/v1/vendor/orders/individual/:orderId`
- `PATCH /api/v1/vendor/organization-orders/:id`
- `PATCH /api/v1/vendor/organizationOrders/individual/:id`
- `PATCH /api/v1/vendor/providers/:phoneNumber`

### `vendor-management-services` — `src/server.ts`

- `GET /`


## Curl templates

### Protected GET
```bash
curl -X GET "http://localhost:8080/<path>" -H "Authorization: Bearer <accessToken>"
```

### Protected POST
```bash
curl -X POST "http://localhost:8080/<path>" -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{"key":"value"}'
```

### Protected PATCH
```bash
curl -X PATCH "http://localhost:8080/<path>" -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{"key":"value"}'
```

# Keycloak Permission Claim Setup

This guide makes permission issuance explicit at the token source (Keycloak), so services do not rely only on local fallback maps.

## Goal

Access tokens should include:
- `permissions` (array or space-delimited scopes)
- optional `vendor_id`
- optional `customer_id`
- `realm_access.roles`

## Recommended setup

## 1) Create client scope for permissions

In Keycloak Admin Console:
1. Go to **Client Scopes**
2. Create scope: `p4u-permissions`
3. Type: `Default`

## 2) Add protocol mapper for permissions claim

Add mapper in `p4u-permissions`:
- Mapper Type: `User Realm Role` (or script mapper if you maintain custom mapping)
- Token Claim Name: `permissions`
- Claim JSON Type: `String` (multivalued true) or `JSON` array if supported by mapper strategy
- Add to access token: `ON`

If you use script mapper, convert roles to permissions according to `AUTHORIZATION-POLICY.md`.

## 3) Add mappers for ownership identifiers

Add user attribute mappers:
- `vendor_id` -> token claim `vendor_id`
- `customer_id` -> token claim `customer_id`
- `linked_customer_ids` -> token claim `linked_customer_ids` (for vendor linked-access use-cases)

Set these as access-token claims.

## 4) Attach scope to auth client

Go to client used by auth service (for example `auth-management-client`) and:
- assign `p4u-permissions` as default client scope

## 5) Validate token output

After login, decode access token and confirm:
- `realm_access.roles` exists
- `permissions` exists
- ownership claims (`vendor_id`/`customer_id`) appear when applicable

## Commerce cart & orders (`commerce-management-services`, CUSTOMER)

For **CUSTOMER** users calling `/api/v1/commerce/cart` and related routes, include (or rely on role fallback in the commerce service):

- `cart.read.self` — `GET /api/v1/commerce/cart`
- `cart.write.self` — `PUT /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart`, `DELETE /cart/items/:id`, `POST /cart/merge`
- `order.read.self` / `order.write.self` — orders and `POST /api/v1/commerce/orders/from-cart`

Ensure **`customer_id`** on the access token matches `admin_customers.id` (customer rows still use the existing customer table naming).

**Database:** run `commerce-management-services/sql/001_commerce_carts.sql` before using cart APIs (`synchronize: false`). Tables: **`commerce_carts`**, **`commerce_cart_items`** (commerce/user cart domain, not admin configuration tables).

## Vendor portal (`vendor-management-services`)


For **VENDOR** users calling `/api/v1/vendor/*`, include these permissions (via mapper or composite role), or rely on the service’s role-derived fallback map:

- `vendor.portal.me.read`
- `vendor.portal.me.write`
- `vendor.portal.order.read`
- `vendor.portal.order.write`
- `vendor.portal.org_order.read`
- `vendor.portal.org_order.write`
- `vendor.portal.review.read`
- `vendor.portal.referral.read`

Ensure **`vendor_id`** is on the access token, or link `admin_vendors.keycloak_user_id` to the user’s Keycloak `sub` so the service can resolve the vendor row.

## Content service admin CRUD (`content-management-services`, ADMIN)

For **`ADMIN`** users calling `POST|GET|PATCH|DELETE /api/v1/content/admin/*` (brands, featured-products, service-highlights), include:

- `content.admin.manage`

The content service also accepts the role-derived fallback: **`ADMIN`** maps to `['*']`, which satisfies this permission when Keycloak does not yet emit explicit permission strings.

## Notes for current codebase

- Services already support permission extraction from:
  1) `permissions` claim
  2) `scope`
  3) role-derived fallback (last resort)

To enforce strict source-issued permissions in production, disable fallback logic in middleware once Keycloak mapping is stable.

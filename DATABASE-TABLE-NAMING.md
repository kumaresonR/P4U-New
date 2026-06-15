# Database table naming (P4U)

## Database

Platform services default to **one MySQL database**: `p4u_admin_db` (including **auth-management-services**). Use `DB_NAME` only if you intentionally split databases. The **database name** can stay `p4u_admin_db` for history; that does **not** mean every **table** inside it should start with `admin_`.

## Do not put `admin_` on everything

- **Wrong:** Using `admin_` as a generic prefix for customers, orders, products, banners, etc., just because they live in the same MySQL database or because staff can edit them in the admin UI.
- **Right:** Use **respective / domain** names — `commerce_*`, `customer_*`, `catalog_*`, `content_*`, `vendor_*`, `classified_*`, `pos_*`, etc. — so the table name matches **what the data is**, not **which app screen can touch it**.

**`admin_` is only for** tables whose **main job** is the **admin control plane** itself (e.g. screen layouts, hierarchy nodes, audit logs of admin actions, global platform knobs managed from admin).

## Why this exists (legacy)

~~Many tables still use `admin_*` from an older convention (one shared schema).~~ **Migration completed (2026-03-25).** All legacy `admin_*` tables have been renamed to domain-correct prefixes. See `migrations/001_rename_tables_domain_prefixes.sql`.

Only true admin-platform tables retain `admin_*`: `admin_hierarchy_nodes`, `admin_app_screen_layouts`, `admin_audit_logs`, `admin_platform_variables`.

---

## Prefix guidelines

| Prefix | Use for |
|--------|---------|
| `admin_` | Admin-only configuration and governance: layouts, hierarchy nodes, audit logs, platform variables if treated as global config. |
| `customer_` | End-user identity and profile data (registrations, KYC fields, addresses when split). |
| `commerce_` | Shopping flow: carts, orders, settlements, organization orders tied to checkout. |
| `catalog_` | Sellable/browseable master data: categories, products, catalog services, vendors as listed in storefront (if not split further). |
| `vendor_` | Vendor-specific operational records that are not generic catalog (enquiries, vendor requests). |
| `content_` | Marketing and editorial: banners, popups, feed posts used by apps (names may stay until migrated). |
| `classified_` | Classifieds domain (categories, products, services, areas, cities). |
| `pos_` | POS-specific entities. |
| `payment_` | Payment intents, transactions (already partially used). |
| `notification_` or `user_` | User notifications and devices (you already use `user_notifications`, `user_devices`). |

Use **snake_case**, plural table names where the row represents one of many (`commerce_orders`, not `commerce_order`).

---

## Current → recommended target (inventory)

Use this when planning migrations. **Do not** change code until the matching `RENAME TABLE` (or create-new + backfill) has been applied.

### Already aligned or close

| Current physical name | Notes |
|----------------------|--------|
| `commerce_carts`, `commerce_cart_items` | Commerce domain (customer cart). |
| `user_payment_intents` | Payment domain. |
| `user_devices`, `user_notifications` | User notification domain. |
| `users` (auth service) | Auth; keep or later `auth_users` if you split DBs. |

### Commerce / orders (today often `admin_*`)

| Current | Recommended target |
|---------|---------------------|
| `admin_orders` | `commerce_orders` |
| `admin_settlements` | `commerce_settlements` |
| `admin_organization_orders` | `commerce_organization_orders` |

### Customer

| Current | Recommended target |
|---------|---------------------|
| `admin_customers` | `customer_profiles` (or `customers` if you standardize on one word) |

### Catalog / vendors (shared storefront master data)

| Current | Recommended target |
|---------|---------------------|
| `admin_products` | `catalog_products` |
| `admin_catalog_categories` | `catalog_categories` |
| `admin_catalog_service_items` | `catalog_service_items` |
| `admin_vendors` | `catalog_vendors` or `vendor_accounts` (pick one model and document FKs) |

### Classified

| Current | Recommended target |
|---------|---------------------|
| `admin_classified_*` | `classified_*` (e.g. `classified_categories`, `classified_products`) |
| `admin_available_areas`, `admin_available_cities` | `classified_available_areas`, `classified_available_cities` |

### POS

| Current | Recommended target |
|---------|---------------------|
| `admin_pos_*` | `pos_*` |

### Content / social-style surfaces

| Current | Recommended target |
|---------|---------------------|
| `admin_banners`, `admin_popup_banners` | `content_banners`, `content_popup_banners` |
| `admin_posts`, `admin_advertisement_feed_items`, `admin_objectionable_feed_logs` | `content_posts`, `content_ad_feed_items`, `content_moderation_logs` (or `social_*` if you split a social service) |

### Vendor operations (not generic catalog)

| Current | Recommended target |
|---------|---------------------|
| `admin_vendor_reviews` | `vendor_reviews` |
| `admin_vendor_enquiries` | `vendor_enquiries` |
| `admin_vendor_requests` | `vendor_registration_requests` |

### Products / tax (admin-managed master data)

| Current | Recommended target |
|---------|---------------------|
| `admin_product_requests` | `catalog_product_requests` |
| `admin_tax_configurations` | `catalog_tax_configurations` |

### Customer marketing / coupons

| Current | Recommended target |
|---------|---------------------|
| `admin_coupons` | `commerce_coupons` or `marketing_coupons` |
| `admin_occupations` | `customer_occupations` or `reference_occupations` |

### Admin platform (keep `admin_` or narrow)

| Current | Typical stance |
|---------|----------------|
| `admin_app_screen_layouts` | Keep `admin_` or `platform_app_layouts`. |
| `admin_hierarchy_nodes` | Keep `admin_` or `platform_hierarchy_nodes`. |
| `admin_audit_logs` | Keep `admin_audit_logs`. |
| `admin_platform_variables` | Keep or `platform_variables`. |
| `admin_website_queries` | `content_website_queries` or `marketing_leads`. |

---

## Migration status

**Completed (2026-03-25):** All 30 legacy `admin_*` tables renamed in one batch.

- Forward SQL: `migrations/001_rename_tables_domain_prefixes.sql`
- Rollback SQL: `migrations/001_rename_tables_domain_prefixes_rollback.sql`
- All `@Entity()` decorators updated across all 9 services

**For existing databases:** Run the forward migration SQL before starting updated services.
**For fresh databases:** No migration needed — TypeORM `synchronize` will create tables with the new names.

---

## New work

Any **new** table MUST use the domain prefix from this document, not `admin_`, unless it is strictly admin-platform configuration.

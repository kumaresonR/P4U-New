# P4U Platform — Setup & Run Guide

Last updated: 2026-04-02

## Step 1: Start Infrastructure

```bash
cd C:\Users\Kumareson\Desktop\P4U-New
docker-compose up -d
```

This starts MySQL and any other required infrastructure.

---

## Step 2: Start Backend Services (in order)

Open separate terminals for each:

```bash
# 1. Discovery Service (port 8761)
cd p4u-discovery-service && npm run dev

# 2. Auth Service (port 8081)
cd auth-management-services && npm run dev

# 3. API Gateway (port 8080)
cd p4u-api-gateway-services && npm run dev

# 4. Admin Service (port 8082)
cd admin-management-services && npm run dev

# 5. Catalog Service (port 8084)
cd catalog-management-services && npm run dev

# 6. Content Service (port 8085)
cd content-management-services && npm run dev

# 7. Profile Service (port 8086)
cd profile-management-services && npm run dev

# 8. Commerce Service (port 8087)
cd commerce-management-services && npm run dev

# 9. Payment Service (port 8088)
cd payment-management-services && npm run dev

# 10. Notification Service (port 8089)
cd notification-management-services && npm run dev

# 11. Vendor Service (port 8089)
cd vendor-management-services && npm run dev

# 12. Socio Service (port 8090)
cd socio-management-services && npm run dev
```

---

## Step 3: Verify All Services Are Healthy

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/catalog/public/health
curl http://localhost:8080/api/v1/content/public/health
curl http://localhost:8080/api/v1/profile/public/health
curl http://localhost:8080/api/v1/commerce/public/health
curl http://localhost:8080/api/v1/payments/public/health
curl http://localhost:8080/api/v1/notifications/public/health
curl http://localhost:8080/api/v1/vendor/public/health
curl http://localhost:8080/api/v1/social/public/health
```

All should return: `{ "success": true, "data": { "status": "UP" } }`

---

## Step 4: Database Tables (Auto-Created)

TypeORM `synchronize: true` (non-production) auto-creates all tables in `p4u_admin_db` on first run.

### Content Service Tables
| Table | What it holds |
|-------|---------------|
| `content_banners` | Homepage slider banners |
| `content_brands` | Brand logos (iPhone, Realme, etc.) |
| `content_featured_products` | "Pick up where you left off" products |
| `content_service_highlights` | Emergency/Urgent/Help cards |
| `content_posts` | Reels/videos |
| `admin_classified_products` | Classified ads |
| `content_website_queries` | Newsletter subscriptions |

### Catalog Service Tables
| Table | What it holds |
|-------|---------------|
| `catalog_categories` | Product/service categories |
| `catalog_vendors` | Vendor profiles |
| `catalog_products` | Products per vendor |
| `catalog_services` | Services |

### Profile Service Tables
| Table | What it holds |
|-------|---------------|
| `customer_profiles` | Customer profiles |
| `customer_addresses` | Saved addresses |
| `customer_wishlist` | Wishlist items |
| `customer_referral_codes` | Referral codes |
| `customer_reward_points` | Reward points |

### Commerce Service Tables
| Table | What it holds |
|-------|---------------|
| `commerce_carts` | Shopping carts |
| `commerce_cart_items` | Cart line items |
| `commerce_orders` | Orders |
| `commerce_order_items` | Order line items |
| `commerce_bookings` | Service bookings |
| `commerce_reviews` | Product/service reviews |
| `commerce_coupons` | Coupon codes |

### Payment Service Tables
| Table | What it holds |
|-------|---------------|
| `payment_intents` | Payment records |

### Notification Service Tables
| Table | What it holds |
|-------|---------------|
| `notification_devices` | Push notification tokens |
| `notifications` | In-app notifications |

### Social Service Tables
| Table | What it holds |
|-------|---------------|
| `social_posts` | Social feed posts |
| `social_comments` | Post comments |
| `social_likes` | Post likes |
| `social_stories` | Stories (24h expiry) |
| `user_follows` | Follow relationships |

---

## Step 5: Seed Data Into Database

Tables are empty after first run. Insert sample data so APIs return content.

### 5a. Content — Brands (homepage carousel)

```sql
INSERT INTO content_brands (id, name, image_url, sort_order, is_active, created_at, updated_at) VALUES
(UUID(), 'iPhone',  '/images/brand-section/iphone-card.png',  1, true, NOW(), NOW()),
(UUID(), 'Realme',  '/images/brand-section/realme-card.png',  2, true, NOW(), NOW()),
(UUID(), 'Xiaomi',  '/images/brand-section/xiaomi-card.png',  3, true, NOW(), NOW());
```

### 5b. Content — Featured Products (pickup section)

```sql
INSERT INTO content_featured_products (id, name, image_url, section, price, sort_order, is_active, created_at, updated_at) VALUES
(UUID(), 'Cushion covers & more', '/images/pickup-section/home-theater.png', 'Pick up where you left off', NULL, 1, true, NOW(), NOW()),
(UUID(), 'Sport Shoes',           '/images/pickup-section/sport-shoes.png',  'Pick up where you left off', NULL, 2, true, NOW(), NOW()),
(UUID(), 'Galaxy Refrigerator',   '/images/pickup-section/galaxy.png',       'Pick up where you left off', NULL, 3, true, NOW(), NOW()),
(UUID(), 'Utility Table',         '/images/pickup-section/utility-table.png','Pick up where you left off', NULL, 4, true, NOW(), NOW()),
(UUID(), 'Face Wash',             '/images/pickup-section/face-wash.png',    'Hair & Skin Care for Monsoon', NULL, 1, true, NOW(), NOW()),
(UUID(), 'Bath Soap',             '/images/pickup-section/bath-soap.png',    'Hair & Skin Care for Monsoon', NULL, 2, true, NOW(), NOW()),
(UUID(), 'Skin Care',             '/images/pickup-section/skin-care.png',    'Hair & Skin Care for Monsoon', NULL, 3, true, NOW(), NOW()),
(UUID(), 'Rubber Bands',          '/images/pickup-section/rubber-bands.png', 'Hair & Skin Care for Monsoon', NULL, 4, true, NOW(), NOW());
```

### 5c. Content — Service Highlights (emergency cards)

```sql
INSERT INTO content_service_highlights (id, title, description, image_url, icon_url, sort_order, is_active, created_at, updated_at) VALUES
(UUID(), 'Emergency', 'Immediate response, anytime',  '/images/home-banner-bottom/ambulace.png', '🚑', 1, true, NOW(), NOW()),
(UUID(), 'Urgent',    'Fast-track priority care',     '/images/home-banner-bottom/urgent.png',   '⚡', 2, true, NOW(), NOW()),
(UUID(), 'Help',      'We are always here for you',   '/images/home-banner-bottom/help.png',     '🤝', 3, true, NOW(), NOW());
```

### 5d. Content — Banners (hero slider)

```sql
INSERT INTO content_banners (id, title, image_url, redirect_url, sort_order, is_active, created_at, updated_at) VALUES
(UUID(), 'Welcome Banner',    '/images/banners/banner1.png', '/', 1, true, NOW(), NOW()),
(UUID(), 'Sale Banner',       '/images/banners/banner2.png', '/shop', 2, true, NOW(), NOW()),
(UUID(), 'Services Banner',   '/images/banners/banner3.png', '/service', 3, true, NOW(), NOW());
```

### 5e. Catalog — Categories

```sql
INSERT INTO catalog_categories (id, name, parent_id, image, is_active) VALUES
(1, 'Electronics', NULL, NULL, true),
(2, 'Restaurants', NULL, NULL, true),
(3, 'Clothing', NULL, NULL, true),
(4, 'Groceries', NULL, NULL, true),
(5, 'Medical', NULL, NULL, true),
(6, 'Cosmetics', NULL, NULL, true),
(7, 'Plumbing', NULL, NULL, true),
(8, 'Electrical', NULL, NULL, true),
(9, 'Event Management', NULL, NULL, true),
(10, 'Cleaning', NULL, NULL, true);
```

### 5f. Catalog — Vendors (sample)

```sql
INSERT INTO catalog_vendors (id, name, description, logo, banner, rating, is_active) VALUES
(1, 'Orange Mobiles',    'Mobile & Accessories',    NULL, NULL, 4.7, true),
(2, 'Salem RR Biryani',  'Food & Beverages',        NULL, NULL, 4.9, true),
(3, 'Galaxy Style',       'Fashion & Apparel',       NULL, NULL, 4.6, true),
(4, 'Fresh Basket',       'Daily Essentials',        NULL, NULL, 4.5, true),
(5, 'MediCare Plus',      'Healthcare Services',     NULL, NULL, 4.8, true),
(6, 'Glow Studio',        'Beauty & Skin Care',      NULL, NULL, 4.7, true);
```

### 5g. Catalog — Products (sample for vendor 1)

```sql
INSERT INTO catalog_products (id, name, description, price, original_price, image, vendor_id, category_id, is_active) VALUES
(1, 'Apple iPhone 17',         'Latest iPhone with A19 chip', 102900, 115000, 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&q=80', 1, 1, true),
(2, 'Samsung Galaxy S25',       '12GB RAM, 256GB Storage',     89900,  99000,  'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400&q=80', 1, 1, true),
(3, 'Noise Two Wireless',       'Bluetooth earbuds',           3499,   4999,   'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80', 1, 1, true),
(4, 'Boat Storm Infinity Plus', 'Smart Watch',                 4999,   6999,   'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80', 1, 1, true);
```

### 5h. Catalog — Services (sample)

```sql
INSERT INTO catalog_services (id, name, description, price, duration, vendor_id, is_active) VALUES
(1, 'Switch/Socket repair',    'Repair or replacement using quality parts', 79,  '20 mins', 1, true),
(2, 'Fan Installation',        'Ceiling fan installation service',          149, '30 mins', 1, true),
(3, 'Light Fitting',           'LED/Tube light fitting service',            99,  '20 mins', 1, true),
(4, 'Wiring Work',             'Electrical wiring for homes',               499, '2 hours', 1, true),
(5, 'AC Service',              'Split/Window AC servicing',                 599, '1 hour',  1, true);
```

For other data (orders, users, social posts), these are created dynamically as users interact with the app.

---

## Step 6: Start the Frontend

```bash
cd p4u-new-user-web
cp .env.example .env.local   # if not already done
```

Ensure `.env.local` contains:
```
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080
```

Then:
```bash
npm run dev
```

Open http://localhost:3000

---

## Step 7: Verify Data Flows From API

Open browser DevTools → **Network** tab. You should see these API calls:

| Request | Returns |
|---------|---------|
| `GET /api/v1/content/banners` | Banner slider images |
| `GET /api/v1/content/brands` | Brand logos |
| `GET /api/v1/content/featured-products` | Featured products by section |
| `GET /api/v1/content/service-highlights` | Emergency/Urgent/Help cards |
| `GET /api/v1/content/reels` | Video reels |
| `GET /api/v1/content/classified` | Classified ads |
| `GET /api/v1/catalog/categories` | Category list |
| `GET /api/v1/catalog/vendors` | Vendor list |
| `GET /api/v1/catalog/services` | Services list |
| `GET /api/v1/catalog/vendors/:id/products` | Products per vendor |

If any returns empty → component shows fallback. Once DB has rows → real data appears.

---

## Architecture Flow

```
MySQL (p4u_admin_db)
    ↓
Backend Microservices (12 services)
    ↓
API Gateway (localhost:8080)
    ↓
Frontend (localhost:3000) — calls all APIs via lib/api/
    ↓
User sees real data from database
```

---

## Gateway Proxy Map

| Frontend calls | Gateway routes to |
|----------------|-------------------|
| `/api/auth/*` | auth-management-service (:8081) |
| `/api/admin/*` | admin-management-service (:8082) |
| `/api/v1/catalog/*` | catalog-management-service (:8084) |
| `/api/v1/content/*` | content-management-service (:8085) |
| `/api/v1/profile/*` | profile-management-service (:8086) |
| `/api/v1/commerce/*` | commerce-management-service (:8087) |
| `/api/v1/payments/*` | payment-management-service (:8088) |
| `/api/v1/notifications/*` | notification-management-service (:8088) |
| `/api/v1/vendor/*` | vendor-management-service (:8089) |
| `/api/v1/social/*` | socio-management-service (:8090) |

---

## Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| API returns empty data | Seed the database (Step 5) |
| Frontend shows fallback images | Backend not running or DB empty |
| `ECONNREFUSED` on gateway | Start discovery + gateway first |
| `401 Unauthorized` | Login first to get JWT token |
| Tables not created | Check MySQL is running, credentials in `.env` match |
| Service not found in gateway | Start discovery service first, then the service |

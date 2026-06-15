# P4U Production Validation Checklist

Use this after prod credentials are set and all services are deployed. Check each item manually unless noted.

**Prerequisites:** MySQL, Keycloak, discovery, gateway, all microservices, and frontends running with prod env vars (see prior prod credentials guide).

---

## 1. Service health (automated curl)

Replace `https://api.yourdomain.com` with your gateway URL.

```bash
curl -s https://api.yourdomain.com/health
curl -s https://api.yourdomain.com/api/v1/catalog/public/health
curl -s https://api.yourdomain.com/api/v1/content/public/health
curl -s https://api.yourdomain.com/api/v1/profile/public/health
curl -s https://api.yourdomain.com/api/v1/commerce/public/health
curl -s https://api.yourdomain.com/api/v1/payments/public/health
curl -s https://api.yourdomain.com/api/v1/notifications/public/health
curl -s https://api.yourdomain.com/api/v1/vendor/public/health
curl -s https://api.yourdomain.com/api/v1/social/public/health
curl -s https://api.yourdomain.com/api/auth/public/health
```

- [ ] All return success / UP (user-facing services use `{ success: true, data: { status: "UP" } }`)

---

## 2. Database bootstrap

- [ ] Fresh prod DB: start **admin-management-services** first; logs show schema bootstrap + platform variable seeds + vendor plans
- [ ] Existing prod DB: required SQL migrations applied (e.g. ad metadata, pricing engine if not bootstrapped)
- [ ] `DB_SYNCHRONIZE` is **not** `true` in production
- [ ] App DB user has SELECT/INSERT/UPDATE/DELETE (CREATE only if using bootstrap on empty server)

---

## 3. Static media / uploads (gateway)

- [ ] `GET https://api.yourdomain.com/uploads/<known-file>` serves admin-uploaded image (404 on missing file is OK; connection/502 is not)
- [ ] `GET https://api.yourdomain.com/vendor-uploads/<known-file>` serves vendor image (after vendor upload test)
- [ ] `GET https://api.yourdomain.com/socio-uploads/media/<id>` serves socio post media (after socio upload test)
- [ ] User web: product/banner images render (not broken icons) — `NEXT_PUBLIC_API_GATEWAY_URL` or `NEXT_PUBLIC_MEDIA_ORIGIN` correct

---

## 4. Auth & Keycloak

- [ ] Admin login at admin web with ADMIN user → dashboard loads
- [ ] Customer signup/login (password flow if used) → JWT stored, protected routes work
- [ ] **Phone OTP (user web):** Firebase OTP → exchange → logged in or registration token
- [ ] **Phone OTP (vendor web):** same flow for VENDOR intended role
- [ ] **Forgot password:** email received (Keycloak SMTP configured)
- [ ] **Change password:** profile → Account Privacy → success
- [ ] Token refresh: stay logged in >5 min without forced logout
- [ ] Logout clears session and blocks protected routes

---

## 5. Admin → catalog data → user web

- [ ] Admin: create category, vendor (with logo), product (with thumbnail)
- [ ] User web home: banners / products / vendors appear (may need content seeds)
- [ ] User web `/shop`: vendor list and product detail load from API
- [ ] User web `/service`: services list loads
- [ ] Search/filter on shop pages works

---

## 6. Commerce flow (user web)

- [ ] Add product to cart (guest) → persists on refresh
- [ ] Login → cart merges with server cart
- [ ] Cart quote shows platform fee, GST, totals (`quoteCart`)
- [ ] Coupon validate (if coupon exists in admin)
- [ ] Checkout → Razorpay modal opens (`NEXT_PUBLIC_RAZORPAY_KEY_ID` set)
- [ ] Test payment success → verify endpoint → order success screen
- [ ] Order appears under `/orders`; cancel works if allowed
- [ ] Booking flow (if service vendor): slots + create + list + cancel

---

## 7. Payments (Razorpay + webhook)

- [ ] `payment-management-services` has live/test `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- [ ] Razorpay dashboard webhook: `https://api.yourdomain.com/api/v1/payments/webhooks/razorpay`
- [ ] Events: `payment.captured`, `payment.failed`
- [ ] After webhook test, payment intent status updates in DB

---

## 8. Profile & rewards

- [ ] Profile `/profile`: addresses CRUD, wishlist, referral code
- [ ] Reward points balance and history load
- [ ] Become vendor / vendor registration status (if applicable)

---

## 9. Socio (user web)

- [ ] `/socio` feed loads (empty OK if no posts)
- [ ] Create post with image → upload → post visible
- [ ] Explore → Tags / Places (after posts with location/tags metadata)
- [ ] Like / comment on post

---

## 10. Vendor portal

- [ ] Vendor login (OTP or password)
- [ ] Dashboard / orders list
- [ ] Product create with image upload (`/vendor-uploads/...` URL stored)
- [ ] Service icon upload
- [ ] Order status update (if exposed in vendor web)

---

## 11. Admin operations

- [ ] Orders list: global stats (Total, Revenue, Active, Completed) match filtered DB
- [ ] Order view/edit modal, status update, CSV export
- [ ] Vendor status filter (active / suspended / etc.)
- [ ] Settlement list (cash / points)
- [ ] File upload on vendor/product/banner forms → URL saved and image visible in admin + user web

---

## 12. Security & CORS

- [ ] No secrets in frontend bundles except public keys (Razorpay key id, Firebase api key)
- [ ] `CORS_ALLOWED_ORIGINS` on auth includes prod web origins (if browsers call auth directly)
- [ ] Gateway only exposes expected routes; admin upload requires ADMIN JWT
- [ ] HTTPS everywhere in prod

---

## 13. Build verification (pre-deploy)

```bash
# Admin web
cd p4u-admin-web && npm run build

# User web
cd p4u-new-user-web && npm run build

# Vendor web
cd p4u-new-vendor-web && npm run build

# Backend (sample)
cd admin-management-services && npx tsc --noEmit
cd payment-management-services && npx tsc --noEmit
```

- [ ] All builds / typechecks pass

---

## 14. Sign-off

| Role | Name | Date | Pass/Fail |
|------|------|------|-----------|
| Dev | | | |
| QA | | | |
| Ops | | | |

**Notes / blockers:**

---

Last updated: 2026-06-10

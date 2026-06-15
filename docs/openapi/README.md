# OpenAPI specs (P4U user-facing services)

These YAML files describe the **eight** backend services behind the API gateway. They are **overview** specs: health checks, a few representative resources, and (for content) admin CRUD. The exhaustive route list is generated in `ALL-APIS.md` (`node scripts/generate-all-apis-md.mjs`).

## Files

| File | Service | Base path (via gateway) |
|------|---------|-------------------------|
| `catalog.openapi.yaml` | catalog-management-services | `/api/v1/catalog` |
| `content.openapi.yaml` | content-management-services | `/api/v1/content` |
| `profile.openapi.yaml` | profile-management-services | `/api/v1/profile` |
| `commerce.openapi.yaml` | commerce-management-services | `/api/v1/commerce` |
| `payment.openapi.yaml` | payment-management-services | `/api/v1/payments` |
| `notification.openapi.yaml` | notification-management-services | `/api/v1/notifications` |
| `vendor.openapi.yaml` | vendor-management-services | `/api/v1/vendor` |
| `socio.openapi.yaml` | socio-management-services | `/api/v1/social` |

## How to view

- Paste a file into [Swagger Editor](https://editor.swagger.io/) or use the OpenAPI extension in VS Code / Cursor.
- Call APIs through the gateway, e.g. `http://localhost:8080`, with `Authorization: Bearer <access_token>` where routes are protected.

## Security

Most paths use **HTTP Bearer** (JWT). Exact roles and permissions match each service’s middleware and `KEYCLOAK-PERMISSIONS-SETUP.md`.

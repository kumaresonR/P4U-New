/**
 * Regenerates ALL-APIS.md with an exhaustive per-route list grouped by
 * service folder and source file (module path under src/).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outFile = path.join(root, 'ALL-APIS.md');

const routeRe =
  /\b(router|r|secured|app)\.(get|post|patch|put|delete)\s*\(\s*['"]([^'"]+)['"]/g;

const METHOD_ORDER = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4 };

const SERVICE_ORDER = [
  'p4u-api-gateway-services',
  'p4u-discovery-service',
  'auth-management-services',
  'admin-management-services',
  'catalog-management-services',
  'content-management-services',
  'profile-management-services',
  'commerce-management-services',
  'payment-management-services',
  'notification-management-services',
  'vendor-management-services',
];

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

function normalizeFull(base, routePath) {
  let p = routePath.startsWith('/') ? routePath : `/${routePath}`;
  if (!base) return p.replace(/\/+/g, '/') || '/';
  const b = base.replace(/\/+$/, '');
  return `${b}${p}`.replace(/\/+/g, '/');
}

function extractFromFile(file, base) {
  const content = fs.readFileSync(file, 'utf8');
  const out = [];
  let m;
  routeRe.lastIndex = 0;
  while ((m = routeRe.exec(content)) !== null) {
    out.push({
      method: m[2].toUpperCase(),
      path: normalizeFull(base, m[3]),
      absFile: file,
    });
  }
  return out;
}

function serviceNameFromRel(rel) {
  return rel.split('/')[0];
}

/** e.g. admin-management-services/src/modules/foo/bar.routes.ts -> src/modules/foo/bar.routes.ts */
function srcRelativeFromProjectRel(rel) {
  const i = rel.indexOf('/src/');
  if (i === -1) return rel;
  return rel.slice(i + 1);
}

function collectAllRoutes() {
  const all = [];

  walk(path.join(root, 'admin-management-services/src/modules')).forEach((f) => {
    all.push(...extractFromFile(f, '/api/admin'));
  });
  all.push(...extractFromFile(path.join(root, 'admin-management-services/src/server.ts'), ''));

  all.push(
    ...extractFromFile(path.join(root, 'auth-management-services/src/routes/authRoutes.ts'), '/api/auth')
  );
  all.push(...extractFromFile(path.join(root, 'auth-management-services/src/server.ts'), ''));

  const micro = [
    ['catalog-management-services', '/api/v1/catalog'],
    ['content-management-services', '/api/v1/content'],
    ['profile-management-services', '/api/v1/profile'],
    ['commerce-management-services', '/api/v1/commerce'],
    ['payment-management-services', '/api/v1/payments'],
    ['notification-management-services', '/api/v1/notifications'],
    ['vendor-management-services', '/api/v1/vendor'],
  ];

  for (const [svc, base] of micro) {
    const src = path.join(root, svc, 'src');
    walk(src).forEach((f) => {
      if (f.includes(`${path.sep}routes${path.sep}`) || f.endsWith(`${path.sep}routes.ts`)) {
        let routeBase = base;
        if (svc === 'content-management-services' && f.endsWith(`${path.sep}contentAdmin.routes.ts`)) {
          routeBase = `${base}/admin`;
        }
        all.push(...extractFromFile(f, routeBase));
      }
      if (f.endsWith(`${path.sep}server.ts`)) {
        all.push(...extractFromFile(f, ''));
      }
    });
  }

  all.push(
    ...extractFromFile(path.join(root, 'p4u-api-gateway-services/src/routes/gatewayRoutes.ts'), '')
  );

  walk(path.join(root, 'p4u-discovery-service/src')).forEach((f) => {
    if (f.includes(`${path.sep}routes${path.sep}`) || f.endsWith('discoveryRoutes.ts')) {
      all.push(...extractFromFile(f, ''));
    }
    if (f.endsWith(`${path.sep}server.ts`)) {
      all.push(...extractFromFile(f, ''));
    }
  });

  return all.map((r) => {
    const rel = path.relative(root, r.absFile).replace(/\\/g, '/');
    return {
      method: r.method,
      path: r.path,
      service: serviceNameFromRel(rel),
      srcFile: srcRelativeFromProjectRel(rel),
    };
  });
}

function sortKeyService(svc) {
  const i = SERVICE_ORDER.indexOf(svc);
  return i === -1 ? 999 : i;
}

function buildMarkdown(routes) {
  const groups = new Map();
  for (const r of routes) {
    const key = `${r.service}\n${r.srcFile}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const [sa, fa] = a.split('\n');
    const [sb, fb] = b.split('\n');
    const oa = sortKeyService(sa);
    const ob = sortKeyService(sb);
    if (oa !== ob) return oa - ob;
    if (sa !== sb) return sa.localeCompare(sb);
    return fa.localeCompare(fb);
  });

  const lines = [
    '## Exhaustive API list (by service and source file)',
    '',
    'Each bullet is one Express route registration. The same **method + path** may appear more than once if registered in different modules (for example overlapping legacy routes).',
    '',
  ];

  for (const key of sortedKeys) {
    const [service, srcFile] = key.split('\n');
    const items = groups.get(key);
    items.sort((a, b) => {
      const ma = METHOD_ORDER[a.method] ?? 99;
      const mb = METHOD_ORDER[b.method] ?? 99;
      if (ma !== mb) return ma - mb;
      return a.path.localeCompare(b.path);
    });

    lines.push(`### \`${service}\` — \`${srcFile}\``);
    lines.push('');
    for (const r of items) {
      lines.push(`- \`${r.method} ${r.path}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function uniqueStats(routes) {
  const u = new Set(routes.map((r) => `${r.method} ${r.path}`));
  const boiler = routes.filter((r) => {
    if (r.method === 'GET' && (r.path === '/' || r.path === '/health')) return true;
    if (r.method === 'GET' && r.path.endsWith('/public/health')) return true;
    return false;
  });
  const bus = [...u].filter((k) => {
    const [method, ...ps] = k.split(' ');
    const p = ps.join(' ');
    if (method === 'GET' && (p === '/' || p === '/health')) return false;
    if (method === 'GET' && p.endsWith('/public/health')) return false;
    return true;
  });
  return {
    totalRegistrations: routes.length,
    uniqueEndpoints: u.size,
    uniqueBusinessEndpoints: bus.length,
  };
}

const routes = collectAllRoutes();
const stats = uniqueStats(routes);
const exhaustive = buildMarkdown(routes);

const header = `# P4U Backend API List

Last updated: 2026-03-24

This file lists current APIs across all backend services.

## Backend API counts

These numbers come from scanning Express route registrations in service \`src\` trees and applying each service’s URL mount prefix.

| Metric | Count | Meaning |
|--------|------:|---------|
| Route registrations | **${stats.totalRegistrations}** | Every \`.get\` / \`.post\` / \`.patch\` / \`.put\` / \`.delete\` handler matched in scanned files |
| Unique endpoints | **${stats.uniqueEndpoints}** | Distinct **HTTP method + full path** (same path+method counted once only) |
| Unique business endpoints | **${stats.uniqueBusinessEndpoints}** | Same as unique endpoints, excluding \`GET /\`, \`GET /health\`, and \`GET …/public/health\` |

Notes:

- Full paths include mounts (e.g. \`/api/admin/...\`, \`/api/v1/catalog/...\`, discovery \`/eureka/...\`).
- Legacy aliases with **different path strings** (e.g. \`/vendor/:id\` vs \`/vendors/:id\`) are separate endpoints in the unique count.

Regenerate counts + exhaustive list below:

\`\`\`bash
node scripts/count-api-endpoints.mjs
node scripts/generate-all-apis-md.mjs
\`\`\`

## Base URLs

- Gateway: \`http://localhost:8080\`
- Auth service direct: \`http://localhost:8081\`
- Admin service direct: \`http://localhost:8082\`
- Catalog service direct: \`http://localhost:8084\`
- Content service direct: \`http://localhost:8085\`
- Profile service direct: \`http://localhost:8086\`
- Payment service direct: \`http://localhost:8087\`
- Notification service direct: \`http://localhost:8088\`
- Vendor portal direct: \`http://localhost:8089\`
- Discovery service direct: \`http://localhost:8761\`

## Common headers

- Protected APIs: \`Authorization: Bearer <accessToken>\`
- JSON APIs: \`Content-Type: application/json\`

## Gateway proxied prefixes (reference)

When calling through the gateway (\`http://localhost:8080\`):

- \`/api/auth/*\` → auth-management-service
- \`/api/admin/*\` → admin-management-service
- \`/api/v1/catalog/*\` → catalog-management-service
- \`/api/v1/content/*\` → content-management-service
- \`/api/v1/profile/*\` → profile-management-service
- \`/api/v1/commerce/*\` → commerce-management-service
- \`/api/v1/payments/*\` → payment-management-service
- \`/api/v1/notifications/*\` → notification-management-service
- \`/api/v1/vendor/*\` → vendor-management-service

`;

const footer = `
## Curl templates

### Protected GET
\`\`\`bash
curl -X GET "http://localhost:8080/<path>" -H "Authorization: Bearer <accessToken>"
\`\`\`

### Protected POST
\`\`\`bash
curl -X POST "http://localhost:8080/<path>" -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{"key":"value"}'
\`\`\`

### Protected PATCH
\`\`\`bash
curl -X PATCH "http://localhost:8080/<path>" -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{"key":"value"}'
\`\`\`
`;

fs.writeFileSync(outFile, header + '\n' + exhaustive + '\n' + footer, 'utf8');
console.log('Wrote', path.relative(root, outFile));
console.log(JSON.stringify(stats, null, 2));

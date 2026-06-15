/**
 * Counts Express route registrations and unique (METHOD, path) pairs.
 * Paths are normalized with service base mounts where applicable.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const routeRe =
  /\b(router|r|secured|app)\.(get|post|patch|put|delete)\s*\(\s*['"]([^'"]+)['"]/g;

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
      file: path.relative(root, file).replace(/\\/g, '/'),
    });
  }
  return out;
}

const all = [];

// Admin: all route modules mounted at /api/admin
walk(path.join(root, 'admin-management-services/src/modules')).forEach((f) => {
  all.push(...extractFromFile(f, '/api/admin'));
});
all.push(...extractFromFile(path.join(root, 'admin-management-services/src/server.ts'), ''));

// Auth
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
      all.push(...extractFromFile(f, base));
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

const unique = new Map();
for (const r of all) {
  const k = `${r.method} ${r.path}`;
  if (!unique.has(k)) unique.set(k, r);
}

const isBoilerplate = (r) => {
  if (r.method === 'GET' && (r.path === '/' || r.path === '/health')) return true;
  if (r.method === 'GET' && r.path.endsWith('/public/health')) return true;
  return false;
};

const business = [...unique.values()].filter((r) => !isBoilerplate(r));

console.log(
  JSON.stringify(
    {
      description:
        'totalRegistrations = every .get/.post/... in scanned files; uniqueEndpoints = distinct METHOD+fullPath; uniqueBusiness = same minus service root /, /health, */public/health',
      totalRegistrations: all.length,
      uniqueEndpoints: unique.size,
      uniqueBusinessEndpoints: business.length,
    },
    null,
    2
  )
);

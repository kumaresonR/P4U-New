import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080'
  return {
    plugins: [react()],
    server: {
      proxy: {
        // Most specific first: admin uploads, then all other /api/admin (lists, CRUD).
        // Sending /api/admin directly to admin-management-services (8082) avoids the gateway
        // hitting a different Eureka instance whose MySQL never got the vendor_kind migration.
        '/api/admin/upload': {
          target: env.VITE_ADMIN_SERVICE_URL || 'http://localhost:8082',
          changeOrigin: true,
        },
        '/api/admin': {
          target: env.VITE_ADMIN_SERVICE_URL || 'http://localhost:8082',
          changeOrigin: true,
        },
        '/uploads': {
          target: env.VITE_ADMIN_SERVICE_URL || 'http://localhost:8082',
          changeOrigin: true,
        },
        // Vendor portal product thumbnails are stored as `/vendor-uploads/...` (served via API gateway).
        '/vendor-uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/socio-uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})

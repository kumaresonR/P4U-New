# P4U Microservices Architecture

## Overview

This project follows a **microservices architecture** with service discovery and API gateway pattern. All services are connected and work together to provide a scalable, distributed system.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT / FRONTEND                      │
└────────────────────────────┬──────────────────────────────────┘
                              │
                              │ HTTP Requests
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              API GATEWAY (Port 8080)                        │
│  - Request Routing                                           │
│  - Load Balancing                                            │
│  - Rate Limiting                                             │
│  - Service Discovery Integration                             │
└────────────────────────────┬──────────────────────────────────┘
                              │
                              │ Discovers Services
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         DISCOVERY SERVICE (Port 8761)                        │
│  - Service Registry                                          │
│  - Health Monitoring                                         │
│  - Heartbeat Management                                      │
└────────────────────────────┬──────────────────────────────────┘
                              │
                              │ Service Registration
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   AUTH       │    │   PRODUCT    │    │   ORDER      │
│  SERVICE     │    │   SERVICE    │    │   SERVICE    │
│  (Port 8081) │    │  (Port 8082) │    │  (Port 8083) │
│              │    │              │    │              │
│ - Signup     │    │ - CRUD       │    │ - CRUD       │
│ - Login      │    │ - Search     │    │ - Payment    │
│ - JWT        │    │ - Catalog    │    │ - Tracking   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
              ┌──────────────────────┐
              │   SHARED SERVICES    │
              │                      │
              │ - MySQL Database     │
              │ - Keycloak (Auth)    │
              │ - Redis (Cache)      │
              └──────────────────────┘
```

## Services Overview

### 1. **Discovery Service** (`p4u-discovery-service`)
- **Port:** 8761
- **Purpose:** Central service registry
- **Responsibilities:**
  - Service registration
  - Health monitoring
  - Service discovery
  - Heartbeat management

### 2. **API Gateway** (`p4u-api-gateway-services`)
- **Port:** 8080
- **Purpose:** Single entry point for all client requests
- **Responsibilities:**
  - Request routing to microservices
  - Load balancing
  - Rate limiting
  - Service discovery integration

### 3. **Auth Service** (`auth-management-services`)
- **Port:** 8081 (recommended, or 8080 if gateway is on different port)
- **Purpose:** Authentication and authorization
- **Responsibilities:**
  - User signup/login
  - JWT token generation
  - Role-based access control
  - Keycloak integration

## How Services Are Connected

### Connection Flow

1. **Service Startup:**
   ```
   Auth Service → Registers with Discovery Service
   Discovery Service → Stores service instance
   ```

2. **Client Request:**
   ```
   Client → API Gateway (Port 8080)
   API Gateway → Queries Discovery Service
   Discovery Service → Returns service instances
   API Gateway → Load balances & routes to Auth Service
   Auth Service → Processes request & returns response
   API Gateway → Returns response to client
   ```

3. **Health Monitoring:**
   ```
   Auth Service → Sends heartbeat every 30s to Discovery
   Discovery Service → Monitors health, removes stale services
   API Gateway → Refreshes service list every 30s
   ```

## Service Communication

### Service-to-Service Communication

**Direct Communication (Not Recommended):**
```
Service A → Service B (Direct HTTP call)
```

**Recommended (Via Gateway):**
```
Service A → API Gateway → Service B
```

**Service Discovery:**
```
Service A → Discovery Service → Get Service B instances → Direct call
```

## Configuration

### Environment Variables

**Discovery Service:**
```env
SERVER_PORT=8761
HEARTBEAT_INTERVAL=30000
SERVICE_TIMEOUT=90000
```

**API Gateway:**
```env
SERVER_PORT=8080
DISCOVERY_SERVICE_URL=http://localhost:8761
DISCOVERY_REFRESH_INTERVAL=30000
```

**Auth Service:**
```env
SERVER_PORT=8081
DISCOVERY_SERVICE_URL=http://localhost:8761
KEYCLOAK_SERVER_URL=http://localhost:8180
```

## Starting the Microservices

### Step 1: Start Discovery Service
```bash
cd p4u-discovery-service
npm install
npm run dev
```
✅ Discovery Service running on http://localhost:8761

### Step 2: Start Auth Service
```bash
cd auth-management-services
npm install
npm run dev
```
✅ Auth Service registers with Discovery
✅ Auth Service running on http://localhost:8081

### Step 3: Start API Gateway
```bash
cd p4u-api-gateway-services
npm install
npm run dev
```
✅ API Gateway connects to Discovery
✅ API Gateway running on http://localhost:8080

## Testing the Architecture

### 1. Check Discovery Service
```bash
curl http://localhost:8761/status
```

### 2. Check Registered Services
```bash
curl http://localhost:8761/eureka/apps
```

### 3. Test via API Gateway
```bash
# Health check
curl http://localhost:8080/health

# Auth service via gateway
curl http://localhost:8080/api/auth/public/health
```

## Benefits of This Architecture

1. **Scalability:** Each service can scale independently
2. **Resilience:** Service failures don't cascade
3. **Flexibility:** Services can be developed/deployed independently
4. **Load Balancing:** Automatic distribution of requests
5. **Service Discovery:** Dynamic service location
6. **Centralized Routing:** Single entry point via API Gateway

## Adding New Services

1. **Create Service:**
   - Create new service directory
   - Implement service logic
   - Add service registration code

2. **Register with Discovery:**
   ```typescript
   const discovery = new DiscoveryRegistration();
   await discovery.register({
     serviceName: 'product-service',
     host: 'localhost',
     port: 8082,
     healthCheckUrl: 'http://localhost:8082/health'
   });
   ```

3. **Add Route to Gateway:**
   ```typescript
   // In gatewayRoutes.ts
   router.use('/api/products', 
     gatewayMiddleware.createServiceProxy('product-service')
   );
   ```

## Service Dependencies

```
API Gateway → Discovery Service
Auth Service → Discovery Service
Auth Service → MySQL Database
Auth Service → Keycloak
```

## Health Checks

All services expose health check endpoints:
- Discovery: `GET /health`
- Gateway: `GET /health`
- Auth Service: `GET /api/auth/public/health`

## Monitoring

- **Discovery Service:** Tracks all registered services
- **API Gateway:** Logs all routed requests
- **Services:** Send heartbeats to discovery

## Summary

✅ **Yes, we are following microservices architecture**
✅ **All services are connected via:**
   - Service Discovery (Discovery Service)
   - API Gateway (routing & load balancing)
   - Service Registration (automatic on startup)

The architecture is **fully functional** and ready for production use!


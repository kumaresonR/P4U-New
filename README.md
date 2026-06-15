# P4U Auth Management Services

Authentication and Authorization microservice for P4U using Node.js, TypeScript, Express, MySQL, and Keycloak.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Local Setup Guide](#local-setup-guide)
- [Database Setup](#database-setup)
- [Keycloak Setup](#keycloak-setup)
- [Application Configuration](#application-configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Production Setup](#production-setup)
- [Troubleshooting](#troubleshooting)

---

## Overview

This service provides authentication and authorization functionality for P4U microservices architecture. It uses:
- **Node.js 18+** with **TypeScript** and **Express.js**
- **MySQL** for user metadata storage
- **Keycloak** for identity and access management
- **JWT tokens** for stateless authentication

### Features

- User signup (VENDOR, CUSTOMER, and ADMIN roles)
- User login with JWT token generation
- Token refresh
- Role-based access control (RBAC)
- RESTful API endpoints

---

## Prerequisites

Before starting, ensure you have the following installed:

1. **Node.js 18+** and **npm**
   - Check: `node -v` and `npm -v`
   - Download: [Node.js](https://nodejs.org/)

2. **TypeScript** (installed via npm)
   - Will be installed as a dev dependency

3. **MySQL 8.0+**
   - Install MySQL Server locally
   - Download: [MySQL](https://dev.mysql.com/downloads/mysql/)
   - Or use MySQL Workbench (includes MySQL Server)

4. **Docker Desktop**
   - Required for running Keycloak
   - Download: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - Make sure Docker is running before proceeding

5. **MySQL Workbench** (Optional but recommended)
   - For database management
   - Download: [MySQL Workbench](https://dev.mysql.com/downloads/workbench/)

6. **Postman** or **cURL** (Optional)
   - For testing API endpoints
   - Download: [Postman](https://www.postman.com/downloads/)

---

## Local Setup Guide

Follow these steps in order to set up the project locally.

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd P4U-New/auth-management-services
```

### Step 1.5: Install Dependencies

```bash
npm install
```

### Step 2: Database Setup

#### 2.1 Install MySQL (if not already installed)

1. Download and install MySQL Server from [MySQL Downloads](https://dev.mysql.com/downloads/mysql/)
2. During installation, set root password (remember this password)
3. Start MySQL service (Windows: Services → MySQL, or it starts automatically)

#### 2.2 Create Databases

Open **MySQL Workbench** and connect to your local MySQL server:

1. Open MySQL Workbench
2. Create a new connection if needed:
   - Host: `localhost`
   - Port: `3306`
   - Username: `root`
   - Password: (your MySQL root password)
3. Click "Test Connection" to verify
4. Click "OK" to save

**Create the databases:**

Run these SQL commands in MySQL Workbench:

```sql
-- Database for Spring Boot application
CREATE DATABASE p4u_db;

-- Database for Keycloak
CREATE DATABASE keycloak;
```

**Verify databases are created:**

```sql
SHOW DATABASES;
```

You should see both `p4u_db` and `keycloak` in the list.

#### 2.3 Update Database Password in Configuration

Create a `.env` file in the `auth-management-services` directory (or copy from `.env.example`) and update the password if your MySQL root password is different:

```env
DB_PASSWORD=your_actual_password_here
```

Replace `your_actual_password_here` with your actual MySQL root password.

**Also update `docker-compose.yml`** if your MySQL password is different:

```yaml
KC_DB_PASSWORD: root@123  # Change this to your MySQL root password
```

---

### Step 3: Keycloak Setup

#### 3.1 Start Keycloak using Docker

Open terminal/command prompt in the project root directory (where `docker-compose.yml` is located):

```bash
docker-compose up -d keycloak
```

**Verify Keycloak is running:**

```bash
docker ps
```

You should see `p4u_keycloak` container running.

**Check Keycloak logs (wait for startup):**

```bash
docker logs -f p4u_keycloak
```

Wait until you see: `Keycloak started in X seconds` (this may take 1-2 minutes on first startup).

#### 3.2 Access Keycloak Admin Console

1. Open browser and go to: **http://localhost:8180**
2. Click **"Administration Console"** (top right or center)
3. Login with:
   - **Username:** `admin`
   - **Password:** `admin`

#### 3.3 Create Realm

1. In Keycloak, hover over **"master"** dropdown (top-left)
2. Click **"Create Realm"**
3. **Realm name:** `p4u-realm`
4. Click **"Create"**

#### 3.4 Create Roles

1. In `p4u-realm`, go to **"Realm roles"** (left sidebar under "Manage")
2. Click **"Create role"**
3. **Role name:** `VENDOR`
4. Click **"Create"**
5. Repeat for **`CUSTOMER`**:
   - Click **"Create role"**
   - **Role name:** `CUSTOMER`
   - Click **"Create"**
6. Repeat for **`ADMIN`**:
   - Click **"Create role"**
   - **Role name:** `ADMIN`
   - Click **"Create"**

#### 3.5 Create Client

1. Go to **"Clients"** (left sidebar under "Manage")
2. Click **"Create client"**
3. **Client type:** Select **"OpenID Connect"**
4. **Client ID:** `auth-management-client`
5. Click **"Next"**
6. **Client authentication:** Toggle **"On"** (important!)
7. **Authorization:** Toggle **"Off"**
8. Click **"Next"**
9. **Login settings:**
   - **Valid redirect URIs:** `http://localhost:8080/*`
   - **Web origins:** `http://localhost:8080`
10. Click **"Save"**

#### 3.6 Get Client Secret

1. In the client details page, click **"Credentials"** tab (at the top)
2. If you don't see "Credentials" tab:
   - Go to **"Settings"** tab
   - Scroll down and ensure **"Client authentication"** is **"On"**
   - Click **"Save"**
   - The "Credentials" tab should appear
3. Copy the **"Client secret"** value (long string)

#### 3.7 Enable Service Accounts Roles

**Important:** This step is required for the application to create users in Keycloak.

1. In the client details page (`auth-management-client`), go to **"Settings"** tab
2. Scroll down to **"Capability config"** section (or click "Capability config" in the right sidebar)
3. Find **"Service accounts roles"** toggle
4. Toggle it **"On"** (enabled)
5. Click **"Save"** at the bottom

#### 3.8 Assign Admin Roles to Service Account

1. After enabling Service accounts, go to **"Service accounts roles"** tab (should appear at the top)
2. Click the blue **"Assign role"** button
3. In the modal that opens:
   - Change the filter dropdown from **"Filter by realm roles"** to **"Filter by clients"**
   - In the list, find and select **"realm-management"**
   - Check the checkbox for **"realm-admin"** role (or select all admin roles)
   - Click **"Assign"**
4. Verify: You should see **"realm-management realm-admin"** in the roles table

**Why this is needed:** The service account needs admin permissions to create users and assign roles in Keycloak.

#### 3.9 Update Environment Variables

Update your `.env` file with the client secret:

```env
KEYCLOAK_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
KEYCLOAK_ADMIN_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

Replace `YOUR_CLIENT_SECRET_HERE` with the client secret you copied (use the same secret for both).

**Note:** The admin client uses the same `auth-management-client` with its service account for admin operations.

---

### Step 4: Application Configuration

The application is configured via environment variables in the `.env` file. Verify these settings:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=p4u_db
DB_USERNAME=root
DB_PASSWORD=root@123  # Update if different

# Keycloak
KEYCLOAK_SERVER_URL=http://localhost:8180
KEYCLOAK_REALM=p4u-realm
KEYCLOAK_CLIENT_ID=auth-management-client
KEYCLOAK_CLIENT_SECRET=YOUR_CLIENT_SECRET  # Update with actual secret
```

**Note:** All configuration is done through environment variables in the `.env` file.

---

### Step 5: Running the Application

#### 5.1 Build the Project (TypeScript Compilation)

```bash
cd auth-management-services
npm run build
```

#### 5.2 Run the Application

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

#### 5.3 Verify Application Started

You should see in the console:

```
Started AuthManagementServicesApplication in X.XXX seconds
```

The application runs on: **http://localhost:8080**

#### 5.4 Test Health Endpoint

Open browser or use cURL:

```bash
curl http://localhost:8080/api/auth/public/health
```

Expected response: `Auth Management Service is running`

---

## API Endpoints

### Public Endpoints (No Authentication Required)

#### 1. Health Check

```http
GET /api/auth/public/health
```

**Response:**
```
Auth Management Service is running
```

#### 2. User Signup

```http
POST /api/auth/public/signup
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "vendor1",
  "email": "vendor1@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "VENDOR"
}
```

**Valid userType values:** `VENDOR`, `CUSTOMER`, or `ADMIN`

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 300,
  "refreshExpiresIn": 2592000,
  "message": null
}
```

**Note:** 
- `expiresIn`: Access token expiration time in seconds (default: 300 seconds = 5 minutes)
- `refreshExpiresIn`: Refresh token expiration time in seconds (default: 2592000 seconds = 30 days)

#### 3. User Login

```http
POST /api/auth/public/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "vendor1",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 300,
  "refreshExpiresIn": 2592000,
  "message": null
}
```

#### 4. Refresh Token

```http
POST /api/auth/public/refresh?refreshToken=YOUR_REFRESH_TOKEN
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 300,
  "refreshExpiresIn": 2592000,
  "message": null
}
```

**Important:** Each refresh returns a NEW refresh token. The old refresh token becomes invalid (refresh token rotation).

#### 5. Logout

```http
POST /api/auth/logout
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

**Or as Query Parameter:**
```http
POST /api/auth/logout?refreshToken=YOUR_REFRESH_TOKEN
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

**Note:** This invalidates the refresh token. The user will need to login again to get new tokens.

#### 6. Token Introspection

```http
POST /api/auth/introspect
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "YOUR_ACCESS_TOKEN_OR_REFRESH_TOKEN",
  "tokenType": "access_token"
}
```

**Or as Query Parameters:**
```http
POST /api/auth/introspect?token=YOUR_TOKEN&tokenType=access_token
```

**tokenType values:** `access_token` (default) or `refresh_token`

**Response (Active Token):**
```json
{
  "active": true,
  "exp": 1234567890,
  "iat": 1234567590,
  "sub": "user-id",
  "username": "vendor1",
  "email": "vendor1@example.com",
  "preferred_username": "vendor1",
  "realm_access": {
    "roles": ["VENDOR"]
  },
  "client_id": "auth-management-client",
  "token_type": "Bearer"
}
```

**Response (Invalid/Expired Token):**
```json
{
  "active": false
}
```

#### 7. Forgot Password

```http
POST /api/auth/public/forgot-password
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, a password reset link has been sent"
}
```

**Note:** 
- A password reset email will be sent to the user if the email exists
- The response is always the same (to prevent email enumeration attacks)
- The email contains a link to reset the password via Keycloak's UI

#### 8. Reset Password

```http
POST /api/auth/public/reset-password
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "RESET_TOKEN_FROM_EMAIL",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successful. Please check your email for the reset link."
}
```

**Note:** 
- The reset token is typically obtained from the email link sent by Keycloak
- For API-based reset, use the forgot password endpoint to receive the reset email
- The reset link in the email will guide the user through the password reset process

### Protected Endpoints (Authentication Required)

#### 9. Change Password

```http
POST /api/auth/change-password
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

**Note:** 
- Requires valid JWT token
- Current password must be correct
- New password must be at least 6 characters

#### 10. Get Vendor Info

```http
GET /api/auth/vendor/info
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Required Role:** `VENDOR`

**Response:**
```json
{
  "sub": "user-id",
  "email": "vendor1@example.com",
  "preferred_username": "vendor1",
  "realm_access": {
    "roles": ["VENDOR"]
  }
}
```

#### 11. Get Customer Info

```http
GET /api/auth/customer/info
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Required Role:** `CUSTOMER`

**Response:**
```json
{
  "sub": "user-id",
  "email": "customer1@example.com",
  "preferred_username": "customer1",
  "realm_access": {
    "roles": ["CUSTOMER"]
  }
}
```

#### 12. Get Admin Info

```http
GET /api/auth/admin/info
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Required Role:** `ADMIN`

**Response:**
```json
{
  "sub": "user-id",
  "email": "admin1@example.com",
  "preferred_username": "admin1",
  "realm_access": {
    "roles": ["ADMIN"]
  }
}
```

---

## Client-Side Token Management Guide

This guide explains how to properly manage authentication tokens in your client application.

### Token Overview

- **Access Token**: Short-lived token (5 minutes) used to authenticate API requests
- **Refresh Token**: Long-lived token (30 days) used to obtain new access tokens
- **Token Rotation**: Each refresh returns a NEW refresh token, invalidating the old one

### Token Storage Best Practices

#### Web Applications (Browser)

**Recommended: Use httpOnly cookies (most secure)**
- Store refresh token in httpOnly cookie (server-side)
- Store access token in memory only (not in localStorage/sessionStorage)
- Prevents XSS attacks from stealing tokens

**Alternative: sessionStorage (if cookies not available)**
```javascript
// Store tokens in sessionStorage (cleared when tab closes)
sessionStorage.setItem('accessToken', response.accessToken);
sessionStorage.setItem('refreshToken', response.refreshToken);
sessionStorage.setItem('tokenExpiry', Date.now() + (response.expiresIn * 1000));
```

**⚠️ Avoid localStorage for sensitive tokens** - vulnerable to XSS attacks

#### Mobile Applications

**Recommended: Secure storage**
- iOS: Keychain
- Android: Keystore/EncryptedSharedPreferences
- React Native: `react-native-keychain` or `expo-secure-store`

### Token Lifecycle Management

#### 1. Initial Login/Signup

```javascript
async function login(username, password) {
  const response = await fetch('http://localhost:8080/api/auth/public/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  
  // Store tokens securely
  storeTokens(data.accessToken, data.refreshToken, data.expiresIn, data.refreshExpiresIn);
  
  return data;
}

function storeTokens(accessToken, refreshToken, expiresIn, refreshExpiresIn) {
  // Store access token in memory or sessionStorage
  sessionStorage.setItem('accessToken', accessToken);
  sessionStorage.setItem('tokenExpiry', Date.now() + (expiresIn * 1000));
  
  // Store refresh token securely
  sessionStorage.setItem('refreshToken', refreshToken);
  sessionStorage.setItem('refreshTokenExpiry', Date.now() + (refreshExpiresIn * 1000));
}
```

#### 2. Making Authenticated Requests

```javascript
async function makeAuthenticatedRequest(url, options = {}) {
  let accessToken = sessionStorage.getItem('accessToken');
  const tokenExpiry = parseInt(sessionStorage.getItem('tokenExpiry') || '0');
  
  // Check if token is expired or about to expire (within 30 seconds)
  if (Date.now() >= tokenExpiry - 30000) {
    accessToken = await refreshAccessToken();
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    ...options.headers
  };
  
  const response = await fetch(url, { ...options, headers });
  
  // If token expired, try refreshing once
  if (response.status === 401) {
    accessToken = await refreshAccessToken();
    headers['Authorization'] = `Bearer ${accessToken}`;
    return await fetch(url, { ...options, headers });
  }
  
  return response;
}
```

#### 3. Refreshing Access Token

```javascript
async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem('refreshToken');
  const refreshTokenExpiry = parseInt(sessionStorage.getItem('refreshTokenExpiry') || '0');
  
  // Check if refresh token is expired
  if (Date.now() >= refreshTokenExpiry) {
    // Redirect to login
    window.location.href = '/login';
    throw new Error('Refresh token expired. Please login again.');
  }
  
  try {
    const response = await fetch(
      `http://localhost:8080/api/auth/public/refresh?refreshToken=${refreshToken}`,
      { method: 'POST' }
    );
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    
    // IMPORTANT: Update with NEW tokens (refresh token rotation)
    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage.setItem('refreshToken', data.refreshToken); // New refresh token
    sessionStorage.setItem('tokenExpiry', Date.now() + (data.expiresIn * 1000));
    sessionStorage.setItem('refreshTokenExpiry', Date.now() + (data.refreshExpiresIn * 1000));
    
    return data.accessToken;
  } catch (error) {
    // Refresh failed - redirect to login
    clearTokens();
    window.location.href = '/login';
    throw error;
  }
}
```

#### 4. Logout

```javascript
async function logout() {
  const refreshToken = sessionStorage.getItem('refreshToken');
  
  try {
    await fetch('http://localhost:8080/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear tokens locally, even if server call fails
    clearTokens();
    window.location.href = '/login';
  }
}

function clearTokens() {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('tokenExpiry');
  sessionStorage.removeItem('refreshTokenExpiry');
}
```

#### 5. Token Validation (Optional)

```javascript
async function validateToken(token) {
  try {
    const response = await fetch('http://localhost:8080/api/auth/introspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, tokenType: 'access_token' })
    });
    
    const data = await response.json();
    return data.active === true;
  } catch (error) {
    return false;
  }
}
```

### Complete Example: React Hook

```javascript
import { useState, useEffect, useCallback } from 'react';

function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    checkAuthStatus();
  }, []);
  
  const checkAuthStatus = async () => {
    const accessToken = sessionStorage.getItem('accessToken');
    const tokenExpiry = parseInt(sessionStorage.getItem('tokenExpiry') || '0');
    
    if (!accessToken || Date.now() >= tokenExpiry) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }
    
    // Optionally validate token
    const isValid = await validateToken(accessToken);
    setIsAuthenticated(isValid);
    setIsLoading(false);
  };
  
  const login = async (username, password) => {
    const data = await login(username, password);
    setIsAuthenticated(true);
    return data;
  };
  
  const logout = async () => {
    await logout();
    setIsAuthenticated(false);
  };
  
  return { isAuthenticated, isLoading, login, logout, makeAuthenticatedRequest };
}
```

### Error Handling

```javascript
async function handleApiError(response) {
  if (response.status === 401) {
    // Unauthorized - token expired or invalid
    try {
      await refreshAccessToken();
      // Retry the original request
    } catch (error) {
      // Refresh failed - redirect to login
      window.location.href = '/login';
    }
  } else if (response.status === 403) {
    // Forbidden - user doesn't have required role
    alert('You do not have permission to perform this action');
  } else if (response.status >= 500) {
    // Server error
    alert('Server error. Please try again later.');
  }
}
```

### Security Considerations

1. **Never expose refresh tokens in URLs or logs**
2. **Use HTTPS in production** to prevent token interception
3. **Implement token rotation** - always use the new refresh token after refresh
4. **Set appropriate token expiration times** based on your security requirements
5. **Clear tokens on logout** - both client-side and server-side
6. **Handle token expiration gracefully** - auto-refresh before expiry
7. **Validate tokens before use** - check expiration times client-side

### Token Expiration Times

- **Access Token**: 5 minutes (300 seconds)
  - Used for API authentication
  - Short-lived for security
  - Automatically refreshed using refresh token
  
- **Refresh Token**: 30 days (2,592,000 seconds)
  - Used to obtain new access tokens
  - Long-lived for user convenience
  - Invalidated on logout or after expiration

---

## Testing

### Using Postman

1. **Signup a Vendor:**
   - Method: `POST`
   - URL: `http://localhost:8080/api/auth/public/signup`
   - Body (JSON):
     ```json
     {
       "username": "testvendor",
       "email": "vendor@test.com",
       "password": "test123",
       "firstName": "Test",
       "lastName": "Vendor",
       "userType": "VENDOR"
     }
     ```

2. **Login:**
   - Method: `POST`
   - URL: `http://localhost:8080/api/auth/public/login`
   - Body (JSON):
     ```json
     {
       "username": "testvendor",
       "password": "test123"
     }
     ```
   - Copy the `accessToken` from response

3. **Access Protected Endpoint:**
   - Method: `GET`
   - URL: `http://localhost:8080/api/auth/vendor/info`
   - Headers:
     - `Authorization: Bearer YOUR_ACCESS_TOKEN`

### Using cURL

**Signup:**
```bash
curl -X POST http://localhost:8080/api/auth/public/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testvendor",
    "email": "vendor@test.com",
    "password": "test123",
    "firstName": "Test",
    "lastName": "Vendor",
    "userType": "VENDOR"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8080/api/auth/public/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testvendor",
    "password": "test123"
  }'
```

**Access Protected Endpoint:**
```bash
curl -X GET http://localhost:8080/api/auth/vendor/info \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Production Setup

### Database Configuration

1. **Get database connection details from DevOps team:**
   - Host: `your-db-host.com`
   - Port: `3306`
   - Database name: `p4u_db`
   - Username: `your-username`
   - Password: `your-password`

2. **Update `application-prod.properties`:**
   ```properties
   spring.datasource.url=jdbc:mysql://${DB_HOST}:${DB_PORT}/${DB_NAME}
   spring.datasource.username=${DB_USERNAME}
   spring.datasource.password=${DB_PASSWORD}
   ```

3. **Set environment variables:**
   ```bash
   export DB_HOST=your-db-host.com
   export DB_PORT=3306
   export DB_NAME=p4u_db
   export DB_USERNAME=your-username
   export DB_PASSWORD=your-password
   ```

### Keycloak Configuration

#### Option 1: Use Shared Keycloak (if provided by DevOps)

1. **Get Keycloak details:**
   - Server URL: `https://keycloak.yourdomain.com` or `http://10.0.0.50:8180`
   - Realm: `p4u-realm` (or provided realm name)
   - Client ID: `auth-management-client`
   - Client Secret: (get from Keycloak admin)

2. **Update `application-prod.properties`:**
   ```properties
   keycloak.server-url=${KEYCLOAK_SERVER_URL}
   keycloak.realm=${KEYCLOAK_REALM}
   keycloak.client-id=${KEYCLOAK_CLIENT_ID}
   keycloak.client-secret=${KEYCLOAK_CLIENT_SECRET}
   ```

3. **Set environment variables:**
   ```bash
   export KEYCLOAK_SERVER_URL=https://keycloak.yourdomain.com
   export KEYCLOAK_REALM=p4u-realm
   export KEYCLOAK_CLIENT_ID=auth-management-client
   export KEYCLOAK_CLIENT_SECRET=your-client-secret
   ```

#### Option 2: Deploy Your Own Keycloak

1. **Deploy Keycloak on server:**
   - Use Docker or standalone installation
   - Configure database connection
   - Set up domain name or IP

2. **Configure Keycloak:**
   - Create realm: `p4u-realm`
   - Create roles: `VENDOR`, `CUSTOMER`, `ADMIN`
   - Create client: `auth-management-client`
   - Get client secret

3. **Update application properties** (same as Option 1)

### Running in Production

1. **Build JAR:**
   ```bash
   mvn clean package -DskipTests
   ```

2. **Run with production profile:**
   ```bash
   java -jar -Dspring.profiles.active=prod target/auth-management-services-1.0.0.jar
   ```

3. **Or set environment variables and run:**
   ```bash
   export SPRING_PROFILES_ACTIVE=prod
   java -jar target/auth-management-services-1.0.0.jar
   ```

---

## Troubleshooting

### Issue: Keycloak not starting

**Symptoms:** Container exits immediately or shows connection errors

**Solutions:**
1. Check if MySQL is running:
   ```bash
   docker ps
   # Or check Windows Services for MySQL
   ```

2. Verify `keycloak` database exists:
   ```sql
   SHOW DATABASES;
   ```

3. Check Keycloak logs:
   ```bash
   docker logs p4u_keycloak
   ```

4. Verify MySQL password in `docker-compose.yml` matches your MySQL root password

5. Restart Keycloak:
   ```bash
   docker-compose restart keycloak
   ```

### Issue: Cannot connect to Keycloak from application

**Symptoms:** Application fails to start or shows Keycloak connection errors

**Solutions:**
1. Verify Keycloak is running:
   ```bash
   docker ps
   # Should see p4u_keycloak running
   ```

2. Check Keycloak is accessible:
   - Open: http://localhost:8180
   - Should see Keycloak welcome page

3. Verify client secret in `application.properties` is correct

4. Check realm name matches: `p4u-realm`

### Issue: Database connection failed

**Symptoms:** Application fails to start with database connection error

**Solutions:**
1. Verify MySQL is running (Windows Services or `docker ps`)

2. Check database exists:
   ```sql
   SHOW DATABASES;
   # Should see p4u_db
   ```

3. Verify credentials in `application.properties`:
   - Username: `root` (or your MySQL username)
   - Password: matches your MySQL root password

4. Test connection in MySQL Workbench:
   - Create new connection
   - Test connection with same credentials

### Issue: "Invalid username or password" in Keycloak login

**Solutions:**
1. Use correct credentials:
   - Username: `admin`
   - Password: `admin`

2. Make sure you're on Administration Console (not Account Console)

3. Try hard refresh: `Ctrl + Shift + R`

4. Try incognito/private window

5. Verify Keycloak admin was created:
   ```bash
   docker logs p4u_keycloak | grep admin
   ```

### Issue: "Credentials" tab not visible in Keycloak

**Solutions:**
1. Go to "Settings" tab
2. Scroll down to "Capability config"
3. Ensure "Client authentication" is **"On"**
4. Click "Save"
5. "Credentials" tab should appear

### Issue: "Failed to create user" error during signup

**Symptoms:** Signup returns error "Failed to create user" or "HTTP 401 Unauthorized"

**Solutions:**
1. **Enable Service Accounts Roles:**
   - Go to client `auth-management-client` → "Settings" tab
   - Scroll to "Capability config"
   - Enable "Service accounts roles" toggle
   - Click "Save"

2. **Assign Admin Roles to Service Account:**
   - Go to "Service accounts roles" tab
   - Click "Assign role"
   - Filter by "Filter by clients" (not realm roles)
   - Select "realm-management"
   - Assign "realm-admin" role
   - Click "Assign"

3. **Verify client secret is correct** in `application.properties`

4. **Check if user already exists:**
   - The error message will now show if user/email already exists in Keycloak
   - Try with a different username/email

5. **Restart application** after making Keycloak changes

### Issue: Port already in use

**Symptoms:** Application fails to start with port binding error

**Solutions:**
1. Change port in `application.properties`:
   ```properties
   server.port=8081
   ```

2. Or stop the process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :8080
   taskkill /PID <PID> /F
   ```

### Issue: User signup fails

**Solutions:**
1. **Check Service Account setup** (see "Failed to create user" troubleshooting above)

2. Check if username/email already exists (must be unique in both database and Keycloak)

3. Verify userType is either `VENDOR`, `CUSTOMER`, or `ADMIN` (case-sensitive)

4. Check Keycloak logs:
   ```bash
   docker logs p4u_keycloak
   ```

5. Verify roles `VENDOR`, `CUSTOMER`, and `ADMIN` exist in Keycloak realm

6. **Error messages are now more descriptive** - check the actual error message in the API response

### Issue: Protected endpoints return 403 Forbidden

**Solutions:**
1. Verify JWT token is valid (not expired)

2. Check user has correct role:
   - For `/api/auth/vendor/info` → user must have `VENDOR` role
   - For `/api/auth/customer/info` → user must have `CUSTOMER` role

3. Verify token format in Authorization header:
   ```
   Authorization: Bearer YOUR_TOKEN
   ```
   (Note: "Bearer" with capital B and space before token)

---

## Project Structure

```
auth-management-services/
├── src/
│   ├── main/
│   │   ├── java/com/p4u/auth/
│   │   │   ├── config/
│   │   │   │   ├── KeycloakAdminConfig.java
│   │   │   │   └── KeycloakSecurityConfig.java
│   │   │   ├── constants/
│   │   │   │   └── AuthConstants.java
│   │   │   ├── controller/
│   │   │   │   └── AuthController.java
│   │   │   ├── dto/
│   │   │   │   ├── AuthResponse.java
│   │   │   │   ├── LoginRequest.java
│   │   │   │   └── SignUpRequest.java
│   │   │   ├── entity/
│   │   │   │   └── User.java
│   │   │   ├── repository/
│   │   │   │   └── UserRepository.java
│   │   │   ├── service/
│   │   │   │   └── AuthService.java
│   │   │   └── AuthManagementServicesApplication.java
│   │   └── resources/
│   │       ├── application.properties
│   │       └── application-prod.properties
│   └── test/
├── pom.xml
└── README.md
```

---

## Additional Notes

- **Database Schema:** The application uses `p4u_db` database. Tables are auto-created by Hibernate (`spring.jpa.hibernate.ddl-auto=update`)

- **Keycloak Database:** Keycloak uses separate `keycloak` database for its internal data

- **User Types:** Currently supports `VENDOR`, `CUSTOMER`, and `ADMIN`. To add more, update `AuthConstants.java`

- **Token Expiry:** 
  - Access tokens expire in 5 minutes (300 seconds) by default. Use refresh token to get new access token
  - Refresh tokens expire in 30 days (2,592,000 seconds) by default. After expiration, user must login again
  - Both expiration times are returned in the API response (`expiresIn` and `refreshExpiresIn`)

- **Development Mode:** Keycloak runs in development mode (`start-dev`). For production, use `start` command with proper configuration

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review application logs
3. Check Keycloak logs: `docker logs p4u_keycloak`
4. Contact the development team

---

## License

[Add your license information here]


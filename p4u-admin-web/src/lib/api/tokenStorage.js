const ACCESS = "p4u_admin_access_token";
const REFRESH = "p4u_admin_refresh_token";
const ROLES = "p4u_admin_roles";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH);
}

/** Pass `undefined` for refreshToken or roles to leave them unchanged in storage. */
export function setTokens(accessToken, refreshToken, roles) {
  localStorage.setItem(ACCESS, accessToken);
  if (refreshToken !== undefined) {
    if (refreshToken) localStorage.setItem(REFRESH, refreshToken);
    else localStorage.removeItem(REFRESH);
  }
  if (roles !== undefined) {
    if (roles && roles.length) localStorage.setItem(ROLES, JSON.stringify(roles));
    else localStorage.removeItem(ROLES);
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(ROLES);
}

export function getStoredRoles() {
  try {
    const raw = localStorage.getItem(ROLES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

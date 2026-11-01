import { Role, UserSummary } from '../types/user';

const TOKEN_KEY = 'fixmycity_token';
const USER_KEY = 'fixmycity_user';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  exp?: number;
  iat?: number;
}

export function isClient(): boolean {
  return typeof window !== 'undefined';
}

export function getStoredToken(): string | null {
  if (!isClient()) return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // LocalStorage quota or access denied
  }
}

export function removeStoredToken(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore
  }
}

export function getStoredUser(): UserSummary | null {
  if (!isClient()) return null;
  const token = getStoredToken();
  if (!token) return null;

  const payload = decodeToken(token);
  if (!payload) {
    removeStoredToken();
    return null;
  }

  try {
    const rawUser = localStorage.getItem(USER_KEY);
    if (rawUser) {
      return JSON.parse(rawUser) as UserSummary;
    }
  } catch {
    // Malformed stored user
  }

  // Fallback to JWT payload
  return {
    id: payload.sub,
    email: payload.email,
    firstName: '',
    lastName: '',
    role: payload.role,
  };
}

export function setStoredUser(user: UserSummary): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Ignore
  }
}

export function decodeToken(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Base64URL decode
    const base64Url = parts[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    const parsed: JwtPayload = JSON.parse(jsonPayload);

    // Validate expiration
    if (parsed.exp && parsed.exp * 1000 < Date.now()) {
      return null;
    }

    if (!parsed.sub || !parsed.role) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    if (!base64Url) return true;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const parsed: JwtPayload = JSON.parse(jsonPayload);
    if (!parsed.exp) return false;
    return parsed.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function isTokenValid(): boolean {
  const token = getStoredToken();
  if (!token) return false;
  return decodeToken(token) !== null;
}

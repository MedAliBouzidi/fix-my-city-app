import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiFetch,
  ApiError,
  getBaseApiUrl,
  authApi,
  incidentsApi,
  mediaApi,
  usersApi,
} from '../api';
import { setStoredToken, getStoredToken } from '../auth';

describe('API Client (apiFetch and ApiError)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('resolves correct base URL with fallback', () => {
    const url = getBaseApiUrl();
    expect(url).toMatch(/^http:\/\//);
  });

  it('attaches Content-Type application/json by default for json requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    await apiFetch('/test-endpoint');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callHeaders = mockFetch.mock.calls[0][1].headers as Headers;
    expect(callHeaders.get('Content-Type')).toBe('application/json');
  });

  it('does not force application/json if body is FormData', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    const formData = new FormData();
    await apiFetch('/upload', {
      method: 'POST',
      body: formData,
    });

    const callHeaders = mockFetch.mock.calls[0][1].headers as Headers;
    expect(callHeaders.has('Content-Type')).toBe(false);
  });

  it('attaches Authorization bearer token when token exists in storage', async () => {
    setStoredToken('test-jwt-token');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    await apiFetch('/test-endpoint');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callHeaders = mockFetch.mock.calls[0][1].headers as Headers;
    expect(callHeaders.get('Authorization')).toBe('Bearer test-jwt-token');
  });

  it('clears stored token and handles 401 Unauthorized', async () => {
    setStoredToken('expired-jwt-token');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Token expired', error: 'Unauthorized' }),
    });
    global.fetch = mockFetch;

    await expect(apiFetch('/protected-resource')).rejects.toThrow(ApiError);
    expect(getStoredToken()).toBeNull();
  });

  it('normalizes validation error arrays from NestJS backend into ApiError', async () => {
    const validationErrors = [
      'title must be at least 3 characters',
      'latitude must be a valid number',
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        statusCode: 400,
        message: validationErrors,
        error: 'Bad Request',
      }),
    });
    global.fetch = mockFetch;

    try {
      await apiFetch('/incidents');
      expect.unreachable('Should have thrown ApiError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(400);
      expect(apiErr.validationErrors).toEqual(validationErrors);
      expect(apiErr.message).toContain('title must be at least 3 characters');
    }
  });

  it('normalizes string error messages from backend into ApiError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        statusCode: 409,
        message: 'Email already registered',
        error: 'Conflict',
      }),
    });
    global.fetch = mockFetch;

    try {
      await apiFetch('/auth/register', { method: 'POST' });
      expect.unreachable('Should have thrown ApiError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(409);
      expect(apiErr.message).toBe('Email already registered');
    }
  });

  it('falls back to statusText when error body is not json', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      headers: new Headers({ 'content-type': 'text/html' }),
      json: async () => {
        throw new Error('Not JSON');
      },
    });
    global.fetch = mockFetch;

    try {
      await apiFetch('/server-error');
      expect.unreachable('Should have thrown ApiError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(502);
      expect(apiErr.message).toBe('Bad Gateway');
    }
  });

  it('normalizes network exceptions into ApiError with status 0', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    try {
      await apiFetch('/incidents');
      expect.unreachable('Should have thrown ApiError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(0);
      expect(apiErr.error).toBe('NetworkError');
    }
  });
});

describe('API Service Modules Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('authApi.login sends POST to /auth/login', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ accessToken: 'xyz', user: { id: 'u1' } }),
    });
    global.fetch = mockFetch;

    await authApi.login({ email: 'test@example.com', password: 'Password1!' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/login$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password1!',
        }),
      }),
    );
  });

  it('incidentsApi.list formats query parameters correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: [], total: 0, page: 1, limit: 10 }),
    });
    global.fetch = mockFetch;

    await incidentsApi.list({
      status: 'RECEIVED',
      category: 'ROADS',
      streetAddress: 'Bourguiba',
      page: 2,
      limit: 10,
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('status=RECEIVED');
    expect(calledUrl).toContain('category=ROADS');
    expect(calledUrl).toContain('streetAddress=Bourguiba');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('limit=10');
  });

  it('incidentsApi.validate sends PATCH to /incidents/:id/validate', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'inc-1', status: 'VALIDATED' }),
    });
    global.fetch = mockFetch;

    await incidentsApi.validate('inc-1', {
      isValid: true,
      priority: 'HIGH',
      note: 'Verified pothole',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/incidents\/inc-1\/validate$/),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          isValid: true,
          priority: 'HIGH',
          note: 'Verified pothole',
        }),
      }),
    );
  });

  it('usersApi.getStaff sends GET with optional role filter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => [],
    });
    global.fetch = mockFetch;

    await usersApi.getStaff('AGENT');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/users\?role=AGENT$/),
      expect.anything(),
    );
  });
});

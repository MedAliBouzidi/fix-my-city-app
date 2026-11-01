import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, ApiError, getBaseApiUrl } from '../api';
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

import { describe, it, expect } from 'vitest';
import { getRoleRedirectPath } from '../AuthContext';
import { ROUTES } from '../../lib/constants';

describe('getRoleRedirectPath', () => {
  it('redirects ADMIN to the admin operations center', () => {
    expect(getRoleRedirectPath('ADMIN')).toBe(ROUTES.ADMIN);
    expect(getRoleRedirectPath('admin')).toBe(ROUTES.ADMIN);
  });

  it('redirects AGENT to the field inspection portal', () => {
    expect(getRoleRedirectPath('AGENT')).toBe(ROUTES.FIELD);
    expect(getRoleRedirectPath('agent')).toBe(ROUTES.FIELD);
  });

  it('redirects TECHNICIAN to the field repair portal', () => {
    expect(getRoleRedirectPath('TECHNICIAN')).toBe(ROUTES.FIELD);
    expect(getRoleRedirectPath('technician')).toBe(ROUTES.FIELD);
  });

  it('redirects CITIZEN to their my-reports dashboard', () => {
    expect(getRoleRedirectPath('CITIZEN')).toBe(ROUTES.MY_REPORTS);
    expect(getRoleRedirectPath('citizen')).toBe(ROUTES.MY_REPORTS);
  });

  it('falls back to HOME for unknown or missing role', () => {
    expect(getRoleRedirectPath(undefined)).toBe(ROUTES.HOME);
    expect(getRoleRedirectPath('')).toBe(ROUTES.HOME);
  });
});

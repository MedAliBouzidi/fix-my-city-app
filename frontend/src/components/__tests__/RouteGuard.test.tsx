import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouteGuard } from '../RouteGuard';
import * as AuthContextModule from '../../context/AuthContext';

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/admin',
}));

describe('RouteGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner when session is initializing', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      loading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getRoleRedirectPath: vi.fn(),
    });

    render(
      <RouteGuard>
        <div>Protected Content</div>
      </RouteGuard>,
    );

    expect(
      screen.getAllByText('Authenticating session...')[0],
    ).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('redirects unauthenticated user to login', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getRoleRedirectPath: vi.fn(),
    });

    render(
      <RouteGuard>
        <div>Protected Content</div>
      </RouteGuard>,
    );

    expect(
      screen.getAllByText('Redirecting to login...')[0],
    ).toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('/login?redirect=%2Fadmin'),
    );
  });

  it('redirects unauthorized user to their role home portal', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'u1',
        email: 'citizen@example.com',
        role: 'CITIZEN',
        firstName: 'Jane',
        lastName: 'Doe',
      },
      token: 'jwt-123',
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getRoleRedirectPath: () => '/my-reports',
    });

    render(
      <RouteGuard allowedRoles={['ADMIN']}>
        <div>Admin Dashboard Content</div>
      </RouteGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith('/my-reports');
    expect(screen.queryByText('Admin Dashboard Content')).toBeNull();
  });

  it('renders protected children when user possesses required role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@city.gov',
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User',
      },
      token: 'jwt-admin',
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getRoleRedirectPath: () => '/admin',
    });

    render(
      <RouteGuard allowedRoles={['ADMIN']}>
        <div>Admin Dashboard Content</div>
      </RouteGuard>,
    );

    expect(screen.getByText('Admin Dashboard Content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

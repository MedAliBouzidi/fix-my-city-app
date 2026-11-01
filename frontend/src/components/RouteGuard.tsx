'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types/user';
import { ROUTES } from '../lib/constants';
import { Spinner } from './ui/Spinner';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const { user, loading, getRoleRedirectPath } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const redirectUrl =
        pathname && pathname !== ROUTES.HOME
          ? `${ROUTES.LOGIN}?redirect=${encodeURIComponent(pathname)}`
          : ROUTES.LOGIN;
      router.replace(redirectUrl);
      return;
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // User is logged in but doesn't have the required role; send them to their home portal
      const target = getRoleRedirectPath(user.role);
      router.replace(target);
    }
  }, [user, loading, allowedRoles, router, pathname, getRoleRedirectPath]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" label="Authenticating session..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="md" label="Redirecting to login..." />
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="md" label="Redirecting to your authorized portal..." />
      </div>
    );
  }

  return <>{children}</>;
}

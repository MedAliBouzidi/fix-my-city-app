'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  decodeToken,
  getStoredToken,
  isTokenExpired,
  removeStoredToken,
  setStoredToken,
} from '../lib/auth';
import { authApi } from '../lib/api';
import { ROUTES } from '../lib/constants';
import { Role, UserSummary } from '../types/user';
import { LoginFormData, RegisterFormData } from '../lib/validations';

interface AuthContextType {
  user: UserSummary | null;
  token: string | null;
  loading: boolean;
  login: (data: LoginFormData) => Promise<UserSummary>;
  register: (data: RegisterFormData) => Promise<UserSummary>;
  logout: () => void;
  getRoleRedirectPath: (role?: Role) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getRoleRedirectPath(role?: Role): string {
  switch (role) {
    case 'ADMIN':
      return ROUTES.ADMIN;
    case 'AGENT':
    case 'TECHNICIAN':
      return ROUTES.FIELD;
    case 'CITIZEN':
      return ROUTES.MY_REPORTS;
    default:
      return ROUTES.HOME;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  // Initialize auth state from local storage on mount
  useEffect(() => {
    try {
      const storedToken = getStoredToken();
      if (storedToken && !isTokenExpired(storedToken)) {
        const decoded = decodeToken(storedToken);
        if (decoded) {
          setToken(storedToken);
          setUser({
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
            firstName: decoded.firstName || '',
            lastName: decoded.lastName || '',
          });
        } else {
          removeStoredToken();
        }
      } else if (storedToken) {
        removeStoredToken();
      }
    } catch {
      removeStoredToken();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (data: LoginFormData): Promise<UserSummary> => {
      const response = await authApi.login(data);
      const { accessToken, user: apiUser } = response;

      setStoredToken(accessToken);
      setToken(accessToken);

      const resolvedUser: UserSummary = {
        id: apiUser.id,
        email: apiUser.email,
        role: apiUser.role,
        firstName: apiUser.firstName,
        lastName: apiUser.lastName,
      };

      setUser(resolvedUser);
      return resolvedUser;
    },
    [],
  );

  const register = useCallback(
    async (data: RegisterFormData): Promise<UserSummary> => {
      await authApi.register({
        ...data,
        role: 'CITIZEN',
      });

      // Automatically log in after registration
      return await login({
        email: data.email,
        password: data.password,
      });
    },
    [login],
  );

  const logout = useCallback(() => {
    removeStoredToken();
    setToken(null);
    setUser(null);
    router.push(ROUTES.LOGIN);
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        getRoleRedirectPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

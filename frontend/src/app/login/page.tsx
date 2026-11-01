'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { loginSchema } from '../../lib/validations';
import { ROUTES } from '../../lib/constants';
import { ApiError } from '../../lib/api';
import { AlertCircle, CheckCircle2, Lock, Mail, MapPin } from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, getRoleRedirectPath } = useAuth();

  const redirectUrl = searchParams.get('redirect');
  const isExpired = searchParams.get('expired') === '1';
  const isRegistered = searchParams.get('registered') === '1';

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Validate with Zod
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const formatted = result.error.format();
      setFieldErrors({
        email: formatted.email?._errors[0],
        password: formatted.password?._errors[0],
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(result.data);
      const destination = redirectUrl || getRoleRedirectPath(user.role);
      router.push(destination);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          setErrorMessage('Invalid email or password. Please check your credentials.');
        } else if (err.statusCode === 429) {
          setErrorMessage('Too many failed login attempts. Please wait a minute and try again.');
        } else {
          setErrorMessage(err.message || 'Unable to sign in. Please try again.');
        }
      } else {
        setErrorMessage('A network error occurred. Please check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <MapPin className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in to FixMyCity
          </h1>
          <p className="text-sm text-slate-500">
            Access citizen reporting or municipal management
          </p>
        </div>

        {/* Informational banners */}
        {isExpired && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 border border-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Your session has expired. Please sign in again to continue.</span>
          </div>
        )}

        {isRegistered && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Registration successful! Please log in with your email and password.</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Email address
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`block w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                  fieldErrors.email
                    ? 'border-rose-400 bg-rose-50/20'
                    : 'border-slate-300 bg-white'
                }`}
                placeholder="citizen@example.com"
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Password
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className={`block w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                  fieldErrors.password
                    ? 'border-rose-400 bg-rose-50/20'
                    : 'border-slate-300 bg-white'
                }`}
                placeholder="••••••••"
              />
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          <span>Don&apos;t have a citizen account? </span>
          <Link
            href={ROUTES.REGISTER}
            className="font-semibold text-blue-600 hover:text-blue-700 underline"
          >
            Register as a Citizen
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner size="lg" label="Loading sign-in..." />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

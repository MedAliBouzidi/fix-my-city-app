'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { registerSchema } from '../../lib/validations';
import { ROUTES } from '../../lib/constants';
import { ApiError } from '../../lib/api';
import {
  AlertCircle,
  Check,
  Info,
  Lock,
  Mail,
  MapPin,
  User,
  X,
} from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';

function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password rules checks for live feedback
  const pwd = formData.password;
  const rules = {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    numOrSpecial: /(?=.*\d)|(?=.*\W+)/.test(pwd),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const formatted = result.error.format();
      setFieldErrors({
        firstName: formatted.firstName?._errors[0],
        lastName: formatted.lastName?._errors[0],
        email: formatted.email?._errors[0],
        password: formatted.password?._errors[0],
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await register(result.data);
      router.push(ROUTES.MY_REPORTS);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setErrorMessage(
            'An account with this email address already exists. Please sign in instead.',
          );
        } else {
          setErrorMessage(
            err.message || 'Unable to register account. Please check your information.',
          );
        }
      } else {
        setErrorMessage('A network error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-6 rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <MapPin className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Citizen Registration
          </h1>
          <p className="text-sm text-slate-500">
            Create an account to report and track municipal incidents
          </p>
        </div>

        {/* Staff note */}
        <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
          <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
          <span>
            <strong>Note:</strong> Public registration grants Citizen access. Staff
            accounts (Admins, Agents, Technicians) are provisioned directly by
            municipal administrators.
          </span>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                First name
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className={`block w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                    fieldErrors.firstName
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-300 bg-white'
                  }`}
                  placeholder="Jean"
                />
              </div>
              {fieldErrors.firstName && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {fieldErrors.firstName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Last name
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className={`block w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                    fieldErrors.lastName
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-300 bg-white'
                  }`}
                  placeholder="Dupont"
                />
              </div>
              {fieldErrors.lastName && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {fieldErrors.lastName}
                </p>
              )}
            </div>
          </div>

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
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
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
                autoComplete="new-password"
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

            {/* Password complexity checklist */}
            <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px] text-slate-500">
              <span className={`flex items-center gap-1 ${rules.length ? 'text-emerald-600 font-medium' : ''}`}>
                {rules.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-slate-400" />}
                8+ characters
              </span>
              <span className={`flex items-center gap-1 ${rules.upper ? 'text-emerald-600 font-medium' : ''}`}>
                {rules.upper ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-slate-400" />}
                1 uppercase letter
              </span>
              <span className={`flex items-center gap-1 ${rules.lower ? 'text-emerald-600 font-medium' : ''}`}>
                {rules.lower ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-slate-400" />}
                1 lowercase letter
              </span>
              <span className={`flex items-center gap-1 ${rules.numOrSpecial ? 'text-emerald-600 font-medium' : ''}`}>
                {rules.numOrSpecial ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-slate-400" />}
                1 number / special
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Creating Account...</span>
              </>
            ) : (
              'Create Citizen Account'
            )}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          <span>Already registered? </span>
          <Link
            href={ROUTES.LOGIN}
            className="font-semibold text-blue-600 hover:text-blue-700 underline"
          >
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner size="lg" label="Loading registration..." />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

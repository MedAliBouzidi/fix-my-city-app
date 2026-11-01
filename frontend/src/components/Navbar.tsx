'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  LogOut,
  MapPin,
  Menu,
  PlusCircle,
  Shield,
  User,
  Wrench,
  X,
} from 'lucide-react';

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href={ROUTES.HOME}
          className="flex items-center gap-2 font-bold text-xl text-blue-700 tracking-tight transition hover:opacity-90"
          onClick={closeMobile}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <MapPin className="h-5 w-5" />
          </div>
          <span>FixMy<span className="text-slate-900">City</span></span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex md:items-center md:gap-1">
          <Link
            href={ROUTES.HOME}
            className={`px-3 py-2 text-sm font-medium rounded-md transition ${
              isActive(ROUTES.HOME)
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Public Feed
          </Link>

          {/* Citizen Links */}
          {(!user || user.role === 'CITIZEN') && (
            <Link
              href={ROUTES.REPORT}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition ${
                isActive(ROUTES.REPORT)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="h-4 w-4 text-blue-600" />
              Report Issue
            </Link>
          )}

          {user?.role === 'CITIZEN' && (
            <Link
              href={ROUTES.MY_REPORTS}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition ${
                isActive(ROUTES.MY_REPORTS)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <FileText className="h-4 w-4" />
              My Reports
            </Link>
          )}

          {/* Admin Link */}
          {user?.role === 'ADMIN' && (
            <Link
              href={ROUTES.ADMIN}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition ${
                isActive(ROUTES.ADMIN)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Shield className="h-4 w-4 text-purple-600" />
              Operations Center
            </Link>
          )}

          {/* Field Agent / Technician Link */}
          {(user?.role === 'AGENT' || user?.role === 'TECHNICIAN') && (
            <Link
              href={ROUTES.FIELD}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition ${
                isActive(ROUTES.FIELD)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {user.role === 'AGENT' ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <Wrench className="h-4 w-4 text-sky-600" />
              )}
              Field Work
            </Link>
          )}
        </nav>

        {/* User / Auth CTA Area */}
        <div className="hidden md:flex md:items-center md:gap-3">
          {loading ? (
            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-md" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800">
                  {user.firstName} {user.lastName}
                </span>
                <span className="inline-block text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={ROUTES.LOGIN}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition"
              >
                Sign In
              </Link>
              <Link
                href={ROUTES.REGISTER}
                className="px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            className="p-2 text-slate-600 hover:text-slate-900 focus:outline-hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 pt-2 pb-5 md:hidden space-y-2">
          {user && (
            <div className="mb-3 border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-slate-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {user.role}
              </span>
            </div>
          )}

          <Link
            href={ROUTES.HOME}
            onClick={closeMobile}
            className={`block rounded-md px-3 py-2 text-base font-medium ${
              isActive(ROUTES.HOME)
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Public Feed
          </Link>

          {(!user || user.role === 'CITIZEN') && (
            <Link
              href={ROUTES.REPORT}
              onClick={closeMobile}
              className={`block rounded-md px-3 py-2 text-base font-medium ${
                isActive(ROUTES.REPORT)
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Report Issue
            </Link>
          )}

          {user?.role === 'CITIZEN' && (
            <Link
              href={ROUTES.MY_REPORTS}
              onClick={closeMobile}
              className={`block rounded-md px-3 py-2 text-base font-medium ${
                isActive(ROUTES.MY_REPORTS)
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              My Reports
            </Link>
          )}

          {user?.role === 'ADMIN' && (
            <Link
              href={ROUTES.ADMIN}
              onClick={closeMobile}
              className={`block rounded-md px-3 py-2 text-base font-medium ${
                isActive(ROUTES.ADMIN)
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Operations Center
            </Link>
          )}

          {(user?.role === 'AGENT' || user?.role === 'TECHNICIAN') && (
            <Link
              href={ROUTES.FIELD}
              onClick={closeMobile}
              className={`block rounded-md px-3 py-2 text-base font-medium ${
                isActive(ROUTES.FIELD)
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Field Work
            </Link>
          )}

          <div className="pt-3 border-t border-slate-100">
            {user ? (
              <button
                onClick={() => {
                  closeMobile();
                  logout();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            ) : (
              <div className="space-y-2">
                <Link
                  href={ROUTES.LOGIN}
                  onClick={closeMobile}
                  className="block text-center rounded-md border border-slate-300 px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  href={ROUTES.REGISTER}
                  onClick={closeMobile}
                  className="block text-center rounded-md bg-blue-600 px-3 py-2 text-base font-medium text-white hover:bg-blue-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

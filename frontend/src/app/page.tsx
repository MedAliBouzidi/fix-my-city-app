'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { incidentsApi } from '../lib/api';
import { IncidentPublicResolved } from '../types/incident';
import { ROUTES } from '../lib/constants';
import { IncidentCard } from '../components/IncidentCard';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Map as MapIcon,
  MapPin,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

// Dynamically import Leaflet Map with SSR disabled
const IncidentMap = dynamic(() => import('../components/IncidentMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
      <Spinner size="lg" label="Loading interactive municipal map..." />
    </div>
  ),
});

export default function LandingPage() {
  const { user } = useAuth();

  const [incidents, setIncidents] = useState<IncidentPublicResolved[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View toggle: 'cards' or 'map'
  const [activeView, setActiveView] = useState<'cards' | 'map'>('cards');

  // Track by report number state
  const [trackNumber, setTrackNumber] = useState('');
  const [trackError, setTrackError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentPublicResolved | null>(null);

  const fetchResolvedIncidents = useCallback(async (targetPage = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await incidentsApi.publicResolved({ page: targetPage, limit: 9 });
      if (append) {
        setIncidents((prev) => [...prev, ...res.data]);
      } else {
        setIncidents(res.data);
      }
      setTotal(res.total);
      setPage(res.page);
    } catch (err: unknown) {
      setError('Unable to load recently resolved incidents. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchResolvedIncidents(1);
  }, [fetchResolvedIncidents]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    const cleaned = trackNumber.trim().replace(/^#/, '');

    if (!cleaned) {
      setTrackError('Please enter a valid report number.');
      return;
    }

    const num = parseInt(cleaned, 10);
    if (isNaN(num)) {
      setTrackError('Report number must be numeric (e.g. 1001).');
      return;
    }

    // Check if incident is in the currently loaded public resolved incidents
    const found = incidents.find((i) => i.reportNumber === num);
    if (found) {
      setSelectedIncident(found);
      return;
    }

    // If not found in public resolved list
    setTrackError(
      `Report #${cleaned} was not found among public resolved incidents. If this is your report, please sign in to track active progress in your citizen dashboard.`,
    );
  };

  const handleLoadMore = () => {
    fetchResolvedIncidents(page + 1, true);
  };

  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 pt-16 pb-20 text-white shadow-inner">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-700/60 px-3.5 py-1 text-xs font-semibold text-blue-200 border border-blue-500/40 backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-blue-300" />
              <span>Civic Transparency & Rapid Municipal Action</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white">
              FixMy<span className="text-blue-300">City</span>
            </h1>

            <p className="text-lg text-blue-100 sm:text-xl font-normal leading-relaxed">
              Report potholes, faulty street lighting, water leaks, or waste issues in seconds.
              Directly connect with municipal agents and monitor field repairs until resolution.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href={ROUTES.REPORT}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-bold text-blue-900 shadow-lg hover:bg-blue-50 hover:shadow-xl transition transform hover:-translate-y-0.5"
              >
                <PlusCircle className="h-5 w-5 text-blue-600" />
                Report an Issue Now
              </Link>

              {!user && (
                <Link
                  href={ROUTES.REGISTER}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600/80 px-6 py-3.5 text-base font-bold text-white shadow-md hover:bg-blue-600 border border-blue-400/30 transition"
                >
                  Create Citizen Account
                </Link>
              )}

              {user?.role === 'CITIZEN' && (
                <Link
                  href={ROUTES.MY_REPORTS}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600/80 px-6 py-3.5 text-base font-bold text-white shadow-md hover:bg-blue-600 border border-blue-400/30 transition"
                >
                  My Reports Tracker
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            {/* Track by report number */}
            <div id="track" className="mx-auto mt-8 max-w-lg rounded-2xl bg-white/10 p-3 backdrop-blur-md border border-white/20 shadow-xl">
              <form onSubmit={handleTrackSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-blue-200">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value)}
                    placeholder="Track by Report # (e.g. 1001)"
                    className="block w-full rounded-xl bg-white/90 pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-400 transition shrink-0"
                >
                  Lookup
                </button>
              </form>
              {trackError && (
                <p className="mt-2 text-left text-xs text-amber-200 font-medium px-1">
                  {trackError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Municipal Pillars Banner */}
        <div className="mx-auto mt-14 max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-white/10 p-4 border border-white/10 backdrop-blur-xs">
              <div className="font-bold text-xl text-white">Direct GPS Dispatch</div>
              <div className="text-xs text-blue-200 mt-1">Precise location tags dispatched directly to inspection agents</div>
            </div>
            <div className="rounded-xl bg-white/10 p-4 border border-white/10 backdrop-blur-xs">
              <div className="font-bold text-xl text-white">Photo Verification</div>
              <div className="text-xs text-blue-200 mt-1">Pre-signed S3 encrypted photo uploads for immediate visual validation</div>
            </div>
            <div className="rounded-xl bg-white/10 p-4 border border-white/10 backdrop-blur-xs">
              <div className="font-bold text-xl text-white">100% Transparent</div>
              <div className="text-xs text-blue-200 mt-1">Open public archive of completed municipal interventions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Public Resolved Feed & Map */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Recently Resolved Municipal Incidents
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Showing official fixes certified by field technicians across the city ({total} completed)
            </p>
          </div>

          {/* View toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-2xs self-start sm:self-auto">
            <button
              onClick={() => setActiveView('cards')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeView === 'cards'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Feed List
            </button>
            <button
              onClick={() => setActiveView('map')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeView === 'map'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              City Map
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex min-h-[300px] items-center justify-center">
            <Spinner size="lg" label="Loading resolved incidents..." />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <ErrorState
            title="Unable to load public feed"
            message={error}
            onRetry={() => fetchResolvedIncidents(1)}
          />
        )}

        {/* Empty state */}
        {!loading && !error && incidents.length === 0 && (
          <EmptyState
            title="No resolved incidents recorded yet"
            description="Our municipal crews are actively processing reported issues. Be the first citizen to report a hazard!"
            actionLabel="Submit Incident Report"
            actionHref={ROUTES.REPORT}
          />
        )}

        {/* Cards View */}
        {!loading && !error && incidents.length > 0 && activeView === 'cards' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {incidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onClick={() => setSelectedIncident(incident)}
                  showPhoto={false}
                  actionSlot={
                    <button
                      onClick={() => setSelectedIncident(incident)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      View Details
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  }
                />
              ))}
            </div>

            {/* Load more button */}
            {incidents.length < total && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-60 transition"
                >
                  {loadingMore ? (
                    <>
                      <Spinner size="sm" />
                      <span>Loading more...</span>
                    </>
                  ) : (
                    `Load More (${total - incidents.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Interactive Map View */}
        {!loading && !error && incidents.length > 0 && activeView === 'map' && (
          <div className="space-y-4">
            <IncidentMap
              incidents={incidents}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
            />
            <p className="text-xs text-slate-500 text-center">
              Click on any pin on the map to inspect resolved municipal repairs.
            </p>
          </div>
        )}
      </section>

      {/* Incident Details Modal for Public / Tracked Incident */}
      {selectedIncident && (
        <Modal
          isOpen={!!selectedIncident}
          onClose={() => setSelectedIncident(null)}
          title={`Report #${selectedIncident.reportNumber} — ${selectedIncident.title}`}
          description={`Resolved municipal incident at ${selectedIncident.streetAddress}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                {selectedIncident.category}
              </span>
              <StatusBadge status={selectedIncident.status} />
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-sm space-y-2">
              <div className="flex items-center text-slate-600">
                <MapPin className="h-4 w-4 mr-2 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-900">
                  {selectedIncident.streetAddress}
                </span>
              </div>
              {selectedIncident.latitude && selectedIncident.longitude && (
                <div className="text-xs text-slate-500 pl-6">
                  GPS: {selectedIncident.latitude.toFixed(6)}, {selectedIncident.longitude.toFixed(6)}
                </div>
              )}
            </div>

            {/* Resolved timeline badge */}
            <div className="flex items-center gap-2 rounded-lg bg-teal-50 p-3 text-xs text-teal-800 border border-teal-200">
              <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
              <span>
                <strong>Resolution Certified:</strong> This incident has been inspected by municipal agents and officially repaired by city technicians.
              </span>
            </div>

            <div className="text-xs text-slate-400 flex items-center justify-between pt-2">
              <span>Reported on: {new Date(selectedIncident.createdAt).toLocaleDateString()}</span>
              <span>Closed on: {new Date(selectedIncident.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

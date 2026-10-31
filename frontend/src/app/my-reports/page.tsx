'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RouteGuard } from '../../components/RouteGuard';
import { incidentsApi } from '../../lib/api';
import { Incident } from '../../types/incident';
import { CATEGORY_LABELS, ROUTES } from '../../lib/constants';
import { IncidentCard } from '../../components/IncidentCard';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { IncidentTimeline } from '../../components/IncidentTimeline';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Modal } from '../../components/ui/Modal';
import {
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  FileText,
  MapPin,
  MessageSquare,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';

type TabKey = 'ACTIVE' | 'IN_PROGRESS' | 'RESOLVED' | 'ALL';

export default function MyReportsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabKey>('ACTIVE');

  // Selected incident for detail view
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  const fetchMyReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const data = await incidentsApi.my();
      // Sort newest first
      data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setIncidents(data);
    } catch (err: unknown) {
      setError('Unable to load your incident reports. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  // Tab filtering counts and subsets
  const counts = useMemo(() => {
    const active = incidents.filter((i) =>
      ['RECEIVED', 'PENDING_VALIDATION', 'VALIDATED', 'ASSIGNED'].includes(
        i.status,
      ),
    ).length;
    const inProgress = incidents.filter((i) => i.status === 'IN_PROGRESS').length;
    const resolved = incidents.filter((i) =>
      ['RESOLVED', 'REJECTED'].includes(i.status),
    ).length;
    return {
      active,
      inProgress,
      resolved,
      all: incidents.length,
    };
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    switch (activeTab) {
      case 'ACTIVE':
        return incidents.filter((i) =>
          ['RECEIVED', 'PENDING_VALIDATION', 'VALIDATED', 'ASSIGNED'].includes(
            i.status,
          ),
        );
      case 'IN_PROGRESS':
        return incidents.filter((i) => i.status === 'IN_PROGRESS');
      case 'RESOLVED':
        return incidents.filter((i) =>
          ['RESOLVED', 'REJECTED'].includes(i.status),
        );
      case 'ALL':
      default:
        return incidents;
    }
  }, [incidents, activeTab]);

  return (
    <RouteGuard allowedRoles={['CITIZEN', 'ADMIN']}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              <FileText className="h-4 w-4" />
              <span>Citizen Dashboard</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              My Reported Incidents
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Track real-time progress, inspection outcomes, and certified repairs for your submitted hazards.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => fetchMyReports(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
              title="Refresh reports list"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              href={ROUTES.REPORT}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <PlusCircle className="h-4 w-4" />
              Report Issue
            </Link>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-6 overflow-x-auto pb-1" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition ${
                activeTab === 'ACTIVE'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <span>Active Reports</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {counts.active}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('IN_PROGRESS')}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition ${
                activeTab === 'IN_PROGRESS'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <span>Repairs In Progress</span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 font-bold">
                {counts.inProgress}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('RESOLVED')}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition ${
                activeTab === 'RESOLVED'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <span>Resolved & Closed</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                {counts.resolved}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition ${
                activeTab === 'ALL'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <span>All Reports</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {counts.all}
              </span>
            </button>
          </nav>
        </div>

        {/* Content Loading State */}
        {loading && (
          <div className="flex min-h-[350px] items-center justify-center">
            <Spinner size="lg" label="Loading your personal reports..." />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <ErrorState
            title="Failed to load reports"
            message={error}
            onRetry={() => fetchMyReports()}
          />
        )}

        {/* Empty State */}
        {!loading && !error && filteredIncidents.length === 0 && (
          <EmptyState
            title={
              activeTab === 'ACTIVE'
                ? 'No active incident reports'
                : activeTab === 'IN_PROGRESS'
                ? 'No reports currently undergoing repairs'
                : activeTab === 'RESOLVED'
                ? 'No resolved reports yet'
                : 'You have not submitted any reports yet'
            }
            description="When you submit an incident, you can monitor inspection progress and field repairs right here."
            actionLabel="Submit Incident Report"
            actionHref={ROUTES.REPORT}
          />
        )}

        {/* Incidents Grid */}
        {!loading && !error && filteredIncidents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIncidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onClick={() => {
                  setSelectedIncident(incident);
                  setActivePhotoIndex(0);
                }}
                actionSlot={
                  <button
                    onClick={() => {
                      setSelectedIncident(incident);
                      setActivePhotoIndex(0);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    View Details & Timeline
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                }
              />
            ))}
          </div>
        )}

        {/* Incident Detail Drawer / Modal */}
        {selectedIncident && (
          <Modal
            isOpen={!!selectedIncident}
            onClose={() => setSelectedIncident(null)}
            title={`Report #${selectedIncident.reportNumber}: ${selectedIncident.title}`}
            description={`Submitted on ${new Date(
              selectedIncident.createdAt,
            ).toLocaleDateString()} at ${selectedIncident.streetAddress}`}
            maxWidth="xl"
            footer={
              <button
                onClick={() => setSelectedIncident(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
            }
          >
            <div className="space-y-6">
              {/* Badges & Category */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    {CATEGORY_LABELS[selectedIncident.category]}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <StatusBadge status={selectedIncident.status} />
                </div>
                {selectedIncident.priority && (
                  <PriorityBadge priority={selectedIncident.priority} />
                )}
              </div>

              {/* Photo Gallery (Pre-signed S3 URLs) */}
              {selectedIncident.photos && selectedIncident.photos.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Camera className="h-4 w-4 text-slate-500" />
                      Attached Photos ({selectedIncident.photos.length})
                    </span>
                  </div>

                  <div className="relative h-64 w-full overflow-hidden rounded-xl bg-slate-900">
                    {selectedIncident.photos[activePhotoIndex]?.url ? (
                      <Image
                        src={selectedIncident.photos[activePhotoIndex].url!}
                        alt={selectedIncident.title}
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs">
                        Photo URL unavailable
                      </div>
                    )}
                  </div>

                  {selectedIncident.photos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pt-1">
                      {selectedIncident.photos.map((photo, idx) => (
                        <button
                          key={photo.id}
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                            activePhotoIndex === idx
                              ? 'border-blue-600 ring-2 ring-blue-600/30'
                              : 'border-slate-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          {photo.url && (
                            <Image
                              src={photo.url}
                              alt="thumbnail"
                              fill
                              className="object-cover"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-500">
                  No photographic evidence was attached to this report.
                </div>
              )}

              {/* Description & Location */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Description
                </h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                  {selectedIncident.description}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-800">
                  {selectedIncident.streetAddress}
                </span>
                {selectedIncident.latitude && selectedIncident.longitude && (
                  <span className="text-slate-400">
                    ({selectedIncident.latitude.toFixed(5)}, {selectedIncident.longitude.toFixed(5)})
                  </span>
                )}
              </div>

              {/* Resolution Timeline */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3">
                  Resolution Progress Workflow
                </h4>
                <IncidentTimeline status={selectedIncident.status} />
              </div>

              {/* Staff Notes History */}
              {selectedIncident.notes && selectedIncident.notes.length > 0 && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    <span>Inspection & Progress Log ({selectedIncident.notes.length})</span>
                  </div>

                  <div className="space-y-2">
                    {selectedIncident.notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-1"
                      >
                        <p className="text-slate-800 font-medium">
                          {note.content}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </RouteGuard>
  );
}

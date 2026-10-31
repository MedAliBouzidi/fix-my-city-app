'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { RouteGuard } from '../../components/RouteGuard';
import { useAuth } from '../../context/AuthContext';
import { incidentsApi, mediaApi, ApiError } from '../../lib/api';
import { Incident, IncidentPriority } from '../../types/incident';
import {
  CATEGORY_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../../lib/constants';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Modal } from '../../components/ui/Modal';
import { PhotoUploader } from '../../components/PhotoUploader';
import { useToast } from '../../components/ui/Toast';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Hammer,
  HardHat,
  MapPin,
  MessageSquare,
  Navigation,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';

export default function FieldPortalPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active view toggle for Admins (can toggle between Agent & Technician views)
  const [adminViewMode, setAdminViewMode] = useState<'AGENT' | 'TECHNICIAN'>(
    user?.role === 'TECHNICIAN' ? 'TECHNICIAN' : 'AGENT',
  );

  const effectiveRole = user?.role === 'ADMIN' ? adminViewMode : user?.role;

  // Agent Validation Modal State
  const [inspectingIncident, setInspectingIncident] = useState<Incident | null>(
    null,
  );
  const [validatePriority, setValidatePriority] =
    useState<IncidentPriority>('MEDIUM');
  const [validateNote, setValidateNote] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Technician Progress Modal State
  const [repairIncident, setRepairIncident] = useState<Incident | null>(null);
  const [progressActionType, setProgressActionType] = useState<
    'START' | 'COMPLETE'
  >('START');
  const [progressNote, setProgressNote] = useState<string>('');
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  const fetchAssignedIncidents = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const data = await incidentsApi.assigned();
        // Sort prioritized or pending first
        data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setIncidents(data);
      } catch (err: unknown) {
        setError('Failed to load assigned field jobs.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchAssignedIncidents();
  }, [fetchAssignedIncidents]);

  // Handle Agent Validation Decision (isValid = true or false)
  const handleAgentDecision = async (isValid: boolean) => {
    if (!inspectingIncident) return;

    if (!validateNote.trim()) {
      toast.error('Please enter inspection notes detailing your field findings.');
      return;
    }

    setSubmittingAction(true);
    try {
      await incidentsApi.validate(inspectingIncident.id, {
        isValid,
        priority: validatePriority,
        note: validateNote.trim(),
      });

      toast.success(
        isValid
          ? `Report #${inspectingIncident.reportNumber} validated successfully.`
          : `Report #${inspectingIncident.reportNumber} has been rejected.`,
      );

      setInspectingIncident(null);
      setValidateNote('');
      fetchAssignedIncidents(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Validation request failed.');
      } else {
        toast.error('Network error during validation.');
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Technician Progress Update (Start Work or Mark Complete)
  const handleTechnicianProgress = async () => {
    if (!repairIncident) return;

    const nextStatus =
      progressActionType === 'START' ? 'IN_PROGRESS' : 'RESOLVED';

    if (!progressNote.trim()) {
      toast.error('Please enter a brief note describing the repair work.');
      return;
    }

    setSubmittingAction(true);
    try {
      // 1. Submit progress status update
      await incidentsApi.progress(repairIncident.id, {
        status: nextStatus,
        reportNote: progressNote.trim(),
      });

      // 2. Upload completion photo if attached
      if (completionPhoto && nextStatus === 'RESOLVED') {
        setIsUploadingPhoto(true);
        try {
          const presigned = await mediaApi.getPresignedUrl({
            incidentId: repairIncident.id,
            fileName: completionPhoto.name,
            contentType: completionPhoto.type,
          });

          await mediaApi.uploadToS3(
            presigned.uploadUrl,
            completionPhoto,
            completionPhoto.type,
            (pct) => setUploadProgress(pct),
          );

          await mediaApi.confirmUpload({
            incidentId: repairIncident.id,
            s3Key: presigned.s3Key,
            fileName: completionPhoto.name,
            fileSizeBytes: completionPhoto.size,
            mimeType: completionPhoto.type,
          });
        } catch {
          toast.error(
            'Repair marked resolved, but completion photo failed to upload.',
          );
        } finally {
          setIsUploadingPhoto(false);
        }
      }

      toast.success(
        nextStatus === 'IN_PROGRESS'
          ? `Work started on Report #${repairIncident.reportNumber}.`
          : `Report #${repairIncident.reportNumber} marked as certified resolved!`,
      );

      setRepairIncident(null);
      setProgressNote('');
      setCompletionPhoto(null);
      fetchAssignedIncidents(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Failed to update repair status.');
      } else {
        toast.error('Network error during status update.');
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  // Filter tasks matching current role workflow
  const roleTasks = incidents.filter((inc) => {
    if (effectiveRole === 'AGENT') {
      return ['PENDING_VALIDATION', 'VALIDATED', 'REJECTED'].includes(
        inc.status,
      );
    }
    // TECHNICIAN
    return ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].includes(inc.status);
  });

  return (
    <RouteGuard allowedRoles={['AGENT', 'TECHNICIAN', 'ADMIN']}>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Mobile-Friendly Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-800">
                {effectiveRole === 'AGENT' ? (
                  <UserCheck className="h-3.5 w-3.5" />
                ) : (
                  <HardHat className="h-3.5 w-3.5" />
                )}
                {effectiveRole} Field Portal
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              {effectiveRole === 'AGENT'
                ? 'Inspection & Validation Queue'
                : 'Assigned Repair Jobs'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {effectiveRole === 'AGENT'
                ? 'Verify incident accuracy on-site, assign priority levels, and validate for repair crews.'
                : 'Execute on-site maintenance, start repair jobs, and record completed resolutions.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {user?.role === 'ADMIN' && (
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                <button
                  onClick={() => setAdminViewMode('AGENT')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                    adminViewMode === 'AGENT'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Agent View
                </button>
                <button
                  onClick={() => setAdminViewMode('TECHNICIAN')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                    adminViewMode === 'TECHNICIAN'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tech View
                </button>
              </div>
            )}

            <button
              onClick={() => fetchAssignedIncidents(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
              title="Refresh assigned jobs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex min-h-[300px] items-center justify-center">
            <Spinner size="lg" label="Loading assigned field tasks..." />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <ErrorState
            title="Failed to load field jobs"
            message={error}
            onRetry={() => fetchAssignedIncidents()}
          />
        )}

        {/* Empty State */}
        {!loading && !error && roleTasks.length === 0 && (
          <EmptyState
            title="No assigned field jobs"
            description={
              effectiveRole === 'AGENT'
                ? 'You currently have no unconfirmed reports pending site inspection.'
                : 'You currently have no repair work orders assigned.'
            }
          />
        )}

        {/* Task Cards List (Mobile-Optimized) */}
        {!loading && !error && roleTasks.length > 0 && (
          <div className="space-y-4">
            {roleTasks.map((incident) => {
              const isPendingValidation =
                incident.status === 'PENDING_VALIDATION';
              const isAssigned = incident.status === 'ASSIGNED';
              const isInProgress = incident.status === 'IN_PROGRESS';
              const isResolved = incident.status === 'RESOLVED';
              const hasPhotos = incident.photos && incident.photos.length > 0;
              const mapUrl = `https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`;

              return (
                <div
                  key={incident.id}
                  className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-xs transition ${
                    isPendingValidation || isInProgress
                      ? 'border-blue-300 ring-1 ring-blue-100'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Top Header: ID, Category & Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-slate-900">
                        #{incident.reportNumber}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        {CATEGORY_LABELS[incident.category]}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={incident.status} size="sm" />
                      {incident.priority && (
                        <PriorityBadge priority={incident.priority} size="sm" />
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="py-3 space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      {incident.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600">
                      {incident.description}
                    </p>
                  </div>

                  {/* Location & Navigation Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs text-slate-600 mb-4">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-800">
                          {incident.streetAddress}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          GPS: {incident.latitude.toFixed(5)},{' '}
                          {incident.longitude.toFixed(5)}
                        </div>
                      </div>
                    </div>

                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-slate-50 shrink-0"
                    >
                      <Navigation className="h-3.5 w-3.5 text-blue-600" />
                      <span>Directions</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </a>
                  </div>

                  {/* Attached Photos Preview */}
                  {hasPhotos && (
                    <div className="mb-4 space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Citizen Evidence Photo
                      </span>
                      <div className="flex gap-2 overflow-x-auto">
                        {incident.photos.map((p) => (
                          <div
                            key={p.id}
                            className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                          >
                            {p.url ? (
                              <Image
                                src={p.url}
                                alt="Inspection photo"
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                                Photo expired
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Panel */}
                  <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-end gap-2">
                    {/* Agent Inspection Actions */}
                    {effectiveRole === 'AGENT' && isPendingValidation && (
                      <button
                        onClick={() => {
                          setInspectingIncident(incident);
                          setValidatePriority(incident.priority || 'MEDIUM');
                          setValidateNote('');
                        }}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-blue-700 transition"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Perform Inspection & Decision</span>
                      </button>
                    )}

                    {/* Technician Actions */}
                    {effectiveRole === 'TECHNICIAN' && isAssigned && (
                      <button
                        onClick={() => {
                          setRepairIncident(incident);
                          setProgressActionType('START');
                          setProgressNote('Technician arrived on site and commenced repairs.');
                        }}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-sky-700 transition"
                      >
                        <Play className="h-4 w-4" />
                        <span>Start Repair Work</span>
                      </button>
                    )}

                    {effectiveRole === 'TECHNICIAN' && isInProgress && (
                      <button
                        onClick={() => {
                          setRepairIncident(incident);
                          setProgressActionType('COMPLETE');
                          setProgressNote('Repairs finished and inspected for public safety.');
                        }}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-teal-700 transition"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Certify Repairs Complete</span>
                      </button>
                    )}

                    {isResolved && (
                      <span className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-teal-600" />
                        Repairs certified and closed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Agent Inspection Decision */}
        {inspectingIncident && (
          <Modal
            isOpen={!!inspectingIncident}
            onClose={() => setInspectingIncident(null)}
            title={`Field Inspection — Report #${inspectingIncident.reportNumber}`}
            description={`Verify veracity and urgency for ${inspectingIncident.streetAddress}`}
            maxWidth="lg"
            footer={
              <div className="flex w-full items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleAgentDecision(false)}
                  disabled={submittingAction}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50 transition"
                >
                  <XCircle className="h-4 w-4 text-rose-600" />
                  <span>Reject Issue</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectingIncident(null)}
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAgentDecision(true)}
                    disabled={submittingAction}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{submittingAction ? 'Saving...' : 'Validate for Repair'}</span>
                  </button>
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200">
                <p className="font-bold text-slate-800">
                  {inspectingIncident.title}
                </p>
                <p className="text-slate-500 mt-0.5">
                  {inspectingIncident.description}
                </p>
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Designate Repair Urgency (Priority) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(PRIORITIES).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setValidatePriority(val as IncidentPriority)}
                      className={`rounded-xl border p-2.5 text-center text-xs font-bold transition ${
                        validatePriority === val
                          ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-xs ring-2 ring-blue-600/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {PRIORITY_LABELS[val as IncidentPriority]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field Notes Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  On-Site Inspection Notes *
                </label>
                <textarea
                  rows={3}
                  value={validateNote}
                  onChange={(e) => setValidateNote(e.target.value)}
                  placeholder="e.g. Inspected site at 10:15 AM. Hazard confirmed, road fissure extends 2 meters. High traffic disruption."
                  className="block w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </Modal>
        )}

        {/* Modal: Technician Progress Action */}
        {repairIncident && (
          <Modal
            isOpen={!!repairIncident}
            onClose={() => setRepairIncident(null)}
            title={
              progressActionType === 'START'
                ? `Commence Work — Report #${repairIncident.reportNumber}`
                : `Certify Completion — Report #${repairIncident.reportNumber}`
            }
            description={`Field repairs at ${repairIncident.streetAddress}`}
            maxWidth="lg"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setRepairIncident(null)}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTechnicianProgress}
                  disabled={submittingAction || isUploadingPhoto}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {submittingAction || isUploadingPhoto
                    ? 'Updating progress...'
                    : progressActionType === 'START'
                    ? 'Confirm Work Start'
                    : 'Submit Completion Certification'}
                </button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200">
                <p className="font-bold text-slate-800">
                  {repairIncident.title}
                </p>
                <p className="text-slate-500 mt-0.5">
                  {repairIncident.streetAddress}
                </p>
              </div>

              {/* Progress Note */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  {progressActionType === 'START'
                    ? 'Work Start Description *'
                    : 'Repair Completion Note *'}
                </label>
                <textarea
                  rows={3}
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder={
                    progressActionType === 'START'
                      ? 'e.g. Crew arrived with asphalt equipment. Work initiated.'
                      : 'e.g. Pothole filled with reinforced asphalt and leveled. Street reopened to normal traffic.'
                  }
                  className="block w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Optional Completion Photo for RESOLVED */}
              {progressActionType === 'COMPLETE' && (
                <div className="border-t border-slate-100 pt-3">
                  <PhotoUploader
                    file={completionPhoto}
                    onFileSelect={setCompletionPhoto}
                    isUploading={isUploadingPhoto}
                    uploadProgress={uploadProgress}
                  />
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </RouteGuard>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RouteGuard } from '../../components/RouteGuard';
import { LocationPicker } from '../../components/LocationPicker';
import { PhotoUploader } from '../../components/PhotoUploader';
import { Spinner } from '../../components/ui/Spinner';
import { incidentsApi, mediaApi, ApiError } from '../../lib/api';
import { CATEGORIES, CATEGORY_LABELS, ROUTES } from '../../lib/constants';
import { createIncidentSchema, CreateIncidentFormData } from '../../lib/validations';
import { IncidentCategory } from '../../types/incident';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  MapPin,
  PlusCircle,
  Sparkles,
} from 'lucide-react';

export default function ReportIncidentPage() {
  const router = useRouter();

  // Form Fields State
  const [formData, setFormData] = useState({
    title: '',
    category: '' as IncidentCategory | '',
    streetAddress: '',
    description: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo State & Lifecycle
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Success State
  const [createdReport, setCreatedReport] = useState<{
    id: string;
    reportNumber: number;
    title: string;
    photoUploaded: boolean;
  } | null>(null);

  const uploadPhotoForIncident = async (incidentId: string, photo: File) => {
    setIsUploadingPhoto(true);
    setPhotoError(null);
    setUploadProgress(10);

    try {
      // 1. Request pre-signed S3 URL
      const presigned = await mediaApi.getPresignedUrl({
        incidentId,
        fileName: photo.name,
        contentType: photo.type,
      });

      setUploadProgress(30);

      // 2. Binary PUT to S3 with progress
      await mediaApi.uploadToS3(presigned.uploadUrl, photo, photo.type, (percent) => {
        // Map 0-100% of S3 upload to 30%-90% total progress
        setUploadProgress(30 + Math.round((percent / 100) * 60));
      });

      // 3. Confirm upload
      await mediaApi.confirmUpload({
        incidentId,
        s3Key: presigned.s3Key,
        fileName: photo.name,
        fileSizeBytes: photo.size,
        mimeType: photo.type,
      });

      setUploadProgress(100);
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to upload photo attachment to S3 storage.';
      setPhotoError(msg);
      return false;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Client-side Zod validation
    const result = createIncidentSchema.safeParse({
      ...formData,
      latitude: formData.latitude ?? 0,
      longitude: formData.longitude ?? 0,
    });

    if (!result.success) {
      const formatted = result.error.format();
      const errors: Record<string, string> = {};
      if (formatted.title?._errors[0]) errors.title = formatted.title._errors[0];
      if (formatted.category?._errors[0])
        errors.category = formatted.category._errors[0];
      if (formatted.streetAddress?._errors[0])
        errors.streetAddress = formatted.streetAddress._errors[0];
      if (formatted.description?._errors[0])
        errors.description = formatted.description._errors[0];
      if (formData.latitude === null || formData.longitude === null) {
        errors.location = 'Please capture or enter valid GPS coordinates.';
      } else {
        if (formatted.latitude?._errors[0])
          errors.location = formatted.latitude._errors[0];
        if (formatted.longitude?._errors[0])
          errors.location = formatted.longitude._errors[0];
      }
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create incident in backend
      const incident = await incidentsApi.create(result.data);

      let photoSuccess = true;

      // Step 2: Upload photo if attached
      if (selectedPhoto) {
        photoSuccess = await uploadPhotoForIncident(incident.id, selectedPhoto);
      }

      setCreatedReport({
        id: incident.id,
        reportNumber: incident.reportNumber,
        title: incident.title,
        photoUploaded: photoSuccess,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setGeneralError(
          err.message || 'Unable to submit incident report. Please verify your entries.',
        );
      } else {
        setGeneralError('Network error occurred while submitting incident.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryPhoto = async () => {
    if (!createdReport || !selectedPhoto) return;
    const ok = await uploadPhotoForIncident(createdReport.id, selectedPhoto);
    if (ok) {
      setCreatedReport((prev) => (prev ? { ...prev, photoUploaded: true } : null));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      streetAddress: '',
      description: '',
      latitude: null,
      longitude: null,
    });
    setSelectedPhoto(null);
    setCreatedReport(null);
    setFieldErrors({});
    setGeneralError(null);
    setPhotoError(null);
  };

  return (
    <RouteGuard allowedRoles={['CITIZEN', 'ADMIN']}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
            <PlusCircle className="h-4 w-4" />
            <span>Citizen Incident Intake</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Report a Municipal Issue
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Submit road hazards, streetlight outages, waste, or infrastructure issues directly to city operations.
          </p>
        </div>

        {/* Success View */}
        {createdReport ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm space-y-6 animate-in fade-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">
                Incident Report Successfully Submitted!
              </h2>
              <p className="text-sm text-slate-600">
                Your report has been entered into the municipal queue with reference:
              </p>
              <div className="inline-block rounded-xl bg-slate-900 px-5 py-2 text-xl font-mono font-bold text-white shadow-inner">
                #{createdReport.reportNumber}
              </div>
            </div>

            {/* Photo upload status in case photo failed */}
            {!createdReport.photoUploaded && photoError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>Report created, but photo upload failed</span>
                </div>
                <p>
                  Your incident #{createdReport.reportNumber} is safely recorded. However, the photo could not be stored: {photoError}
                </p>
                {selectedPhoto && (
                  <button
                    type="button"
                    onClick={handleRetryPhoto}
                    disabled={isUploadingPhoto}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                  >
                    {isUploadingPhoto ? 'Retrying...' : 'Retry Photo Upload'}
                  </button>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={ROUTES.MY_REPORTS}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-xs hover:bg-blue-700 transition"
              >
                <FileText className="h-4 w-4" />
                Track in My Reports
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Submit Another Report
              </button>
            </div>
          </div>
        ) : (
          /* Intake Form */
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            {generalError && (
              <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-sm text-rose-800 border border-rose-200">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Incident Title *
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  placeholder="e.g. Deep pothole on Avenue Jean Jaurès"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className={`mt-1 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                    fieldErrors.title
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-300 bg-white'
                  }`}
                />
                {fieldErrors.title && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Category *
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as IncidentCategory,
                    })
                  }
                  className={`mt-1 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                    fieldErrors.category
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  <option value="">Select an incident category</option>
                  {Object.entries(CATEGORIES).map(([key, value]) => (
                    <option key={key} value={value}>
                      {CATEGORY_LABELS[value as IncidentCategory]}
                    </option>
                  ))}
                </select>
                {fieldErrors.category && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {fieldErrors.category}
                  </p>
                )}
              </div>

              {/* Street Address */}
              <div>
                <label
                  htmlFor="streetAddress"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Street Address or Landmark *
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <input
                    id="streetAddress"
                    type="text"
                    required
                    placeholder="e.g. 14 Boulevard Saint-Germain, near Metro station"
                    value={formData.streetAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, streetAddress: e.target.value })
                    }
                    className={`block w-full rounded-lg border pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                      fieldErrors.streetAddress
                        ? 'border-rose-400 bg-rose-50/20'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                </div>
                {fieldErrors.streetAddress && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {fieldErrors.streetAddress}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Detailed Description *
                </label>
                <textarea
                  id="description"
                  rows={4}
                  required
                  placeholder="Describe the severity, exact position, or safety risks involved..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={`mt-1 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                    fieldErrors.description
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-300 bg-white'
                  }`}
                />
                {fieldErrors.description && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {fieldErrors.description}
                  </p>
                )}
              </div>

              {/* Location Picker */}
              <div className="border-t border-slate-100 pt-5">
                <LocationPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onChange={(lat, lng) =>
                    setFormData({ ...formData, latitude: lat, longitude: lng })
                  }
                  error={fieldErrors.location}
                />
              </div>

              {/* Photo Attachment */}
              <div className="border-t border-slate-100 pt-5">
                <PhotoUploader
                  file={selectedPhoto}
                  onFileSelect={setSelectedPhoto}
                  isUploading={isUploadingPhoto}
                  uploadProgress={uploadProgress}
                  uploadError={photoError}
                  onRetry={handleRetryPhoto}
                />
              </div>

              {/* Submit Button */}
              <div className="border-t border-slate-100 pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingPhoto}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-bold text-white shadow-md hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition"
                >
                  {isSubmitting || isUploadingPhoto ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      <span>
                        {isUploadingPhoto
                          ? 'Uploading photo evidence to S3...'
                          : 'Submitting report to municipal operations...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Submit Incident Report</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </RouteGuard>
  );
}

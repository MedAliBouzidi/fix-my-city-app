'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { Spinner } from './ui/Spinner';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB matching backend constraint
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

interface PhotoUploaderProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  uploadProgress?: number;
  isUploading?: boolean;
  uploadError?: string | null;
  onRetry?: () => void;
  required?: boolean;
}

export function PhotoUploader({
  file,
  onFileSelect,
  uploadProgress = 0,
  isUploading = false,
  uploadError = null,
  onRetry,
  required = false,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Generate and revoke object URL preview
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate type
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setValidationError(
        'Invalid file type. Only PNG, JPG, and JPEG images are allowed.',
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size
    if (selected.size > MAX_FILE_SIZE) {
      const sizeMb = (selected.size / (1024 * 1024)).toFixed(1);
      setValidationError(
        `File is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    onFileSelect(selected);
  };

  const handleRemove = () => {
    onFileSelect(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Photo Evidence {required ? '*' : '(Optional)'}
        </label>
        <span className="text-[11px] text-slate-400">Max 5MB (PNG, JPG)</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Validation or upload error banner */}
      {(validationError || uploadError) && (
        <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <span>{validationError || uploadError}</span>
            {uploadError && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1.5 flex items-center gap-1 font-semibold text-rose-900 underline"
              >
                <RotateCcw className="h-3 w-3" /> Retry photo upload
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
            <span className="flex items-center gap-1.5">
              <Spinner size="sm" />
              Uploading directly to secure S3 storage...
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, uploadProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Selected File Preview or Dropzone */}
      {file && previewUrl ? (
        <div className="relative flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {file.name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatFileSize(file.size)} • {file.type}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                Change photo
              </button>
            </div>
          </div>

          {!isUploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Remove photo"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-6 text-center hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer transition"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition mb-3">
            <Camera className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600">
            Upload incident photo
          </p>
          <p className="mt-1 text-xs text-slate-500">
            PNG, JPG or JPEG up to 5MB (taken on smartphone or desktop)
          </p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <Upload className="h-3.5 w-3.5" />
            Browse files
          </button>
        </div>
      )}
    </div>
  );
}

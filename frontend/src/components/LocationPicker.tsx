'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Crosshair, MapPin } from 'lucide-react';
import { Spinner } from './ui/Spinner';

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  error?: string;
}

export function LocationPicker({
  latitude,
  longitude,
  onChange,
  error,
}: LocationPickerProps) {
  const [detecting, setDetecting] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSuccess, setGeoSuccess] = useState(false);

  const handleDetectLocation = () => {
    setGeoError(null);
    setGeoSuccess(false);

    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported by your browser. Please enter coordinates manually.');
      return;
    }

    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        onChange(lat, lng);
        setDetecting(false);
        setGeoSuccess(true);
      },
      (err) => {
        setDetecting(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError('Location permission denied. Please allow access in browser settings or enter coordinates manually.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError('GPS position unavailable. Please enter coordinates manually.');
            break;
          case err.TIMEOUT:
            setGeoError('Location request timed out. Please try again or enter manually.');
            break;
          default:
            setGeoError('Failed to retrieve your location. Please enter coordinates manually.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
          GPS Coordinates *
        </label>
        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={detecting}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition"
        >
          {detecting ? (
            <>
              <Spinner size="sm" />
              <span>Detecting GPS...</span>
            </>
          ) : (
            <>
              <Crosshair className="h-3.5 w-3.5 text-blue-600" />
              <span>Detect my current location</span>
            </>
          )}
        </button>
      </div>

      {geoError && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>{geoError}</span>
        </div>
      )}

      {geoSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>GPS location captured accurately from device sensors.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="latitude"
            className="block text-[11px] font-medium text-slate-500 mb-1"
          >
            Latitude (-90 to 90)
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <input
              id="latitude"
              type="number"
              step="any"
              placeholder="e.g. 48.856614"
              value={latitude !== null ? latitude : ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange(isNaN(val) ? 0 : val, longitude ?? 0);
              }}
              className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="longitude"
            className="block text-[11px] font-medium text-slate-500 mb-1"
          >
            Longitude (-180 to 180)
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <input
              id="longitude"
              type="number"
              step="any"
              placeholder="e.g. 2.352222"
              value={longitude !== null ? longitude : ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange(latitude ?? 0, isNaN(val) ? 0 : val);
              }}
              className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

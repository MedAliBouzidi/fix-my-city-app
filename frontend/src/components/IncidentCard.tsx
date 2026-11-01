import React from 'react';
import Image from 'next/image';
import {
  Incident,
  IncidentListItem,
  IncidentPublicResolved,
} from '../types/incident';
import { CATEGORY_LABELS } from '../lib/constants';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { Calendar, Camera, MapPin } from 'lucide-react';

interface IncidentCardProps {
  incident: Incident | IncidentListItem | IncidentPublicResolved;
  onClick?: () => void;
  actionSlot?: React.ReactNode;
  showPhoto?: boolean;
}

export function IncidentCard({
  incident,
  onClick,
  actionSlot,
  showPhoto = true,
}: IncidentCardProps) {
  // Check if full Incident with photos
  const fullIncident = incident as Incident;
  const firstPhoto = fullIncident.photos && fullIncident.photos.length > 0 ? fullIncident.photos[0] : null;
  const photoUrl = firstPhoto?.url;

  const categoryName = CATEGORY_LABELS[incident.category] || incident.category;
  const hasPriority = 'priority' in incident && incident.priority;

  const formattedDate = incident.createdAt
    ? new Date(incident.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md hover:border-slate-300 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Optional Photo Thumbnail */}
        {showPhoto && (
          <div className="relative h-44 sm:h-auto sm:w-48 shrink-0 bg-slate-100 overflow-hidden">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={incident.title}
                fill
                sizes="(max-width: 640px) 100vw, 192px"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300 min-h-36">
                <Camera className="h-10 w-10 stroke-[1.5]" />
              </div>
            )}
            <div className="absolute top-2 left-2 sm:hidden">
              <span className="rounded-md bg-slate-900/75 px-2 py-0.5 text-[11px] font-semibold text-white tracking-wider backdrop-blur-xs">
                #{incident.reportNumber}
              </span>
            </div>
          </div>
        )}

        {/* Content Details */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          <div>
            {/* Top row: Badges & ID */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="hidden sm:inline-flex">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 tracking-wide border border-slate-200">
                  #{incident.reportNumber}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                <StatusBadge status={incident.status} size="sm" />
                {hasPriority && (
                  <PriorityBadge priority={incident.priority} size="sm" />
                )}
              </div>
            </div>

            {/* Category */}
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              {categoryName}
            </span>

            {/* Title */}
            <h3 className="mt-1 text-base font-bold text-slate-900 line-clamp-2">
              {incident.title}
            </h3>

            {/* Description if full incident */}
            {'description' in incident && incident.description && (
              <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                {incident.description}
              </p>
            )}

            {/* Street Address */}
            <div className="mt-2.5 flex items-center text-xs text-slate-500">
              <MapPin className="mr-1.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{incident.streetAddress}</span>
            </div>
          </div>

          {/* Bottom metadata & Action */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            {formattedDate ? (
              <div className="flex items-center text-[11px] text-slate-400">
                <Calendar className="mr-1 h-3 w-3" />
                <span>{formattedDate}</span>
              </div>
            ) : <div />}

            {actionSlot && <div className="shrink-0">{actionSlot}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

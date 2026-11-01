'use client';

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { IncidentCategory, IncidentPublicResolved } from '../types/incident';
import { CATEGORY_LABELS } from '../lib/constants';
import { StatusBadge } from './StatusBadge';
import { MapPin } from 'lucide-react';

interface IncidentMapProps {
  incidents: IncidentPublicResolved[];
  className?: string;
  onSelectIncident?: (incident: IncidentPublicResolved) => void;
}

// Custom Marker icon using Leaflet divIcon with SVG pin
const createCustomIcon = (category: IncidentCategory) => {
  const getBadgeColor = (cat: IncidentCategory) => {
    switch (cat) {
      case 'ROADS':
        return '#f97316'; // orange
      case 'LIGHTING':
        return '#eab308'; // yellow
      case 'WATER':
        return '#0284c7'; // blue
      case 'WASTE':
        return '#10b981'; // emerald
      case 'GREENERY':
        return '#16a34a'; // green
      default:
        return '#6366f1'; // indigo
    }
  };

  const color = getBadgeColor(category);

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.2);
        border: 2px solid white;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export default function IncidentMap({
  incidents,
  className = 'h-[480px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200',
  onSelectIncident,
}: IncidentMapProps) {
  // Filter incidents that have valid coordinates
  const mappedIncidents = useMemo(
    () =>
      incidents.filter(
        (inc) =>
          typeof inc.latitude === 'number' &&
          typeof inc.longitude === 'number' &&
          !isNaN(inc.latitude) &&
          !isNaN(inc.longitude),
      ),
    [incidents],
  );

  // Compute map center (average of incident coordinates or default to Paris / City center)
  const defaultCenter: [number, number] = useMemo(() => {
    if (mappedIncidents.length === 0) {
      return [48.8566, 2.3522]; // Default Paris city center
    }
    const avgLat =
      mappedIncidents.reduce((sum, inc) => sum + (inc.latitude || 0), 0) /
      mappedIncidents.length;
    const avgLng =
      mappedIncidents.reduce((sum, inc) => sum + (inc.longitude || 0), 0) /
      mappedIncidents.length;
    return [avgLat, avgLng];
  }, [mappedIncidents]);

  return (
    <div className={className}>
      <MapContainer
        center={defaultCenter}
        zoom={mappedIncidents.length > 0 ? 13 : 11}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mappedIncidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.latitude!, incident.longitude!]}
            icon={createCustomIcon(incident.category)}
            eventHandlers={{
              click: () => onSelectIncident?.(incident),
            }}
          >
            <Popup className="fixmycity-map-popup">
              <div className="p-1 space-y-1.5 max-w-[220px]">
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="font-bold text-slate-700">
                    #{incident.reportNumber}
                  </span>
                  <StatusBadge status={incident.status} size="sm" />
                </div>
                <h4 className="font-semibold text-xs text-slate-900 leading-snug">
                  {incident.title}
                </h4>
                <div className="text-[11px] font-medium text-blue-600">
                  {CATEGORY_LABELS[incident.category]}
                </div>
                <div className="flex items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                  <MapPin className="h-3 w-3 mr-1 text-slate-400 shrink-0" />
                  <span className="truncate">{incident.streetAddress}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

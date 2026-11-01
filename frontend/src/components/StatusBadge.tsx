import React from 'react';
import { IncidentStatus } from '../types/incident';
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '../lib/constants';

interface StatusBadgeProps {
  status: IncidentStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  const styles = STATUS_BADGE_CLASSES[status] || {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
  };
  const label = STATUS_LABELS[status] || status;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] font-medium'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} ${className}`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

import React from 'react';
import { IncidentPriority } from '../types/incident';
import { PRIORITY_BADGE_CLASSES, PRIORITY_LABELS } from '../lib/constants';
import { AlertCircle, AlertOctagon, AlertTriangle, ArrowDown } from 'lucide-react';

interface PriorityBadgeProps {
  priority: IncidentPriority;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function PriorityBadge({
  priority,
  size = 'md',
  showIcon = true,
  className = '',
}: PriorityBadgeProps) {
  const styles = PRIORITY_BADGE_CLASSES[priority] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };
  const label = PRIORITY_LABELS[priority] || priority;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] font-medium'
      : 'px-2.5 py-1 text-xs font-semibold';

  const renderIcon = () => {
    const iconSize = size === 'sm' ? 'h-3 w-3 mr-1' : 'h-3.5 w-3.5 mr-1';
    switch (priority) {
      case 'CRITICAL':
        return <AlertOctagon className={`${iconSize} text-red-600`} />;
      case 'HIGH':
        return <AlertTriangle className={`${iconSize} text-orange-600`} />;
      case 'MEDIUM':
        return <AlertCircle className={`${iconSize} text-blue-600`} />;
      case 'LOW':
        return <ArrowDown className={`${iconSize} text-slate-500`} />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} ${className}`}
    >
      {showIcon && renderIcon()}
      {label}
    </span>
  );
}

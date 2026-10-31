import { IncidentCategory, IncidentPriority, IncidentStatus } from '../types/incident';
import { Role } from '../types/user';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  REPORT: '/report',
  MY_REPORTS: '/my-reports',
  ADMIN: '/admin',
  FIELD: '/field',
} as const;

export const ROLES: Record<Role, Role> = {
  CITIZEN: 'CITIZEN',
  ADMIN: 'ADMIN',
  AGENT: 'AGENT',
  TECHNICIAN: 'TECHNICIAN',
};

export const STATUSES: Record<IncidentStatus, IncidentStatus> = {
  RECEIVED: 'RECEIVED',
  PENDING_VALIDATION: 'PENDING_VALIDATION',
  VALIDATED: 'VALIDATED',
  REJECTED: 'REJECTED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
};

export const PRIORITIES: Record<IncidentPriority, IncidentPriority> = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export const CATEGORIES: Record<IncidentCategory, IncidentCategory> = {
  ROADS: 'ROADS',
  LIGHTING: 'LIGHTING',
  WATER: 'WATER',
  WASTE: 'WASTE',
  GREENERY: 'GREENERY',
  OTHER: 'OTHER',
};

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  ROADS: 'Roads & Pavement',
  LIGHTING: 'Street Lighting',
  WATER: 'Water & Sewage',
  WASTE: 'Waste & Sanitation',
  GREENERY: 'Parks & Trees',
  OTHER: 'Other Infrastructure',
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  RECEIVED: 'Received',
  PENDING_VALIDATION: 'Pending Validation',
  VALIDATED: 'Validated',
  REJECTED: 'Rejected',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};

export const PRIORITY_LABELS: Record<IncidentPriority, string> = {
  LOW: 'Low Priority',
  MEDIUM: 'Medium Priority',
  HIGH: 'High Priority',
  CRITICAL: 'Critical Priority',
};

export const STATUS_BADGE_CLASSES: Record<
  IncidentStatus,
  { bg: string; text: string; border: string }
> = {
  RECEIVED: {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
  },
  PENDING_VALIDATION: {
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    border: 'border-amber-300',
  },
  VALIDATED: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
  },
  REJECTED: {
    bg: 'bg-rose-100',
    text: 'text-rose-900',
    border: 'border-rose-300',
  },
  ASSIGNED: {
    bg: 'bg-purple-100',
    text: 'text-purple-900',
    border: 'border-purple-300',
  },
  IN_PROGRESS: {
    bg: 'bg-sky-100',
    text: 'text-sky-900',
    border: 'border-sky-300',
  },
  RESOLVED: {
    bg: 'bg-teal-100',
    text: 'text-teal-900',
    border: 'border-teal-300',
  },
};

export const PRIORITY_BADGE_CLASSES: Record<
  IncidentPriority,
  { bg: string; text: string; border: string }
> = {
  LOW: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
  MEDIUM: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  HIGH: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
  },
  CRITICAL: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
  },
};

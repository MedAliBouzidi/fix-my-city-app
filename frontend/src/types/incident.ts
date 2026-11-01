import { IncidentPhoto } from './media';

export type IncidentStatus =
  | 'RECEIVED'
  | 'PENDING_VALIDATION'
  | 'VALIDATED'
  | 'REJECTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED';

export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentCategory =
  | 'ROADS'
  | 'LIGHTING'
  | 'WATER'
  | 'WASTE'
  | 'GREENERY'
  | 'OTHER';

export interface IncidentNote {
  id: string;
  incidentId: string;
  authorId: string | null;
  content: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  reportNumber: number;
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  priority: IncidentPriority;
  streetAddress: string;
  latitude: number;
  longitude: number;
  reporterId: string | null;
  agentId: string | null;
  technicianId: string | null;
  photos: IncidentPhoto[];
  notes: IncidentNote[];
  createdAt: string;
  updatedAt: string;
}

export interface IncidentListItem {
  id: string;
  reportNumber: number;
  title: string;
  category: IncidentCategory;
  status: IncidentStatus;
  priority: IncidentPriority;
  streetAddress: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncidentPublicResolved {
  id: string;
  reportNumber: number;
  title: string;
  category: IncidentCategory;
  status: IncidentStatus;
  streetAddress: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface IncidentFilterParams {
  status?: IncidentStatus;
  category?: IncidentCategory;
  streetAddress?: string;
  page?: number;
  limit?: number;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  category: IncidentCategory;
  streetAddress: string;
  latitude: number;
  longitude: number;
}

export interface AssignAgentInput {
  agentId: string;
}

export interface ValidateIncidentInput {
  isValid: boolean;
  priority: IncidentPriority;
  note: string;
}

export interface AssignTechnicianInput {
  technicianId: string;
}

export interface ProgressIncidentInput {
  status: 'IN_PROGRESS' | 'RESOLVED';
  reportNote: string;
}

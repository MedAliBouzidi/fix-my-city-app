import { getStoredToken, removeStoredToken } from './auth';
import {
  AssignAgentInput,
  AssignTechnicianInput,
  CreateIncidentInput,
  Incident,
  IncidentFilterParams,
  IncidentListItem,
  IncidentPublicResolved,
  PaginatedResponse,
  ProgressIncidentInput,
  ValidateIncidentInput,
} from '../types/incident';
import {
  ConfirmUploadInput,
  IncidentPhoto,
  PresignedUploadInput,
  PresignedUploadResponse,
} from '../types/media';
import { AuthResponse, RegisterResponse, UserSummary } from '../types/user';

export class ApiError extends Error {
  statusCode: number;
  error?: string;
  validationErrors?: string[];

  constructor(
    message: string,
    statusCode: number,
    error?: string,
    validationErrors?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.error = error;
    this.validationErrors = validationErrors;
  }
}

export function getBaseApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    'http://localhost:4000/api/v1'
  );
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = getBaseApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Network connection failed';
    throw new ApiError(message, 0, 'NetworkError');
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    removeStoredToken();
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login?expired=1';
      }
    }
  }

  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    let message = 'An unexpected error occurred';
    let validationErrors: string[] | undefined;

    if (data && typeof data === 'object') {
      if (Array.isArray(data.message)) {
        validationErrors = data.message;
        message = data.message.join('. ');
      } else if (typeof data.message === 'string') {
        message = data.message;
      } else if (typeof data.error === 'string') {
        message = data.error;
      }
    } else {
      message = response.statusText || `HTTP ${response.status} Error`;
    }

    throw new ApiError(
      message,
      response.status,
      data?.error || response.statusText,
      validationErrors,
    );
  }

  return data as T;
}

// ──────────────────────────────────────────────
// API Modules
// ──────────────────────────────────────────────

export const authApi = {
  login: (input: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  register: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'CITIZEN';
  }) =>
    apiFetch<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};

export const incidentsApi = {
  create: (input: CreateIncidentInput) =>
    apiFetch<{
      id: string;
      reportNumber: number;
      title: string;
      category: string;
      status: string;
      priority: string;
      createdAt: string;
    }>('/incidents', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  list: (params?: IncidentFilterParams) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.streetAddress)
      searchParams.set('streetAddress', params.streetAddress);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    return apiFetch<PaginatedResponse<IncidentListItem>>(
      `/incidents${qs ? `?${qs}` : ''}`,
    );
  },

  my: () => apiFetch<Incident[]>('/incidents/my'),

  assigned: () => apiFetch<Incident[]>('/incidents/assigned'),

  publicResolved: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    return apiFetch<PaginatedResponse<IncidentPublicResolved>>(
      `/incidents/public/resolved${qs ? `?${qs}` : ''}`,
    );
  },

  getById: (id: string) => apiFetch<Incident>(`/incidents/${id}`),

  assignAgent: (id: string, input: AssignAgentInput) =>
    apiFetch<Incident>(`/incidents/${id}/assign-agent`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  validate: (id: string, input: ValidateIncidentInput) =>
    apiFetch<Incident>(`/incidents/${id}/validate`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  assignTechnician: (id: string, input: AssignTechnicianInput) =>
    apiFetch<Incident>(`/incidents/${id}/assign-technician`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  progress: (id: string, input: ProgressIncidentInput) =>
    apiFetch<Incident>(`/incidents/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
};

export const mediaApi = {
  getPresignedUrl: (input: PresignedUploadInput) =>
    apiFetch<PresignedUploadResponse>('/media/presigned-upload-url', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  uploadToS3: async (
    uploadUrl: string,
    file: File | Blob,
    contentType: string,
    onProgress?: (percent: number) => void,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', contentType);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(
            new ApiError(
              `Direct upload to S3 failed with HTTP status ${xhr.status}`,
              xhr.status,
              'S3UploadError',
            ),
          );
        }
      };

      xhr.onerror = () => {
        reject(
          new ApiError(
            'Direct binary upload to S3 failed due to a network error.',
            0,
            'S3NetworkError',
          ),
        );
      };

      xhr.send(file);
    });
  },

  confirmUpload: (input: ConfirmUploadInput) =>
    apiFetch<IncidentPhoto>('/media/confirm-upload', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};

export const usersApi = {
  getStaff: (role?: 'AGENT' | 'TECHNICIAN') => {
    const qs = role ? `?role=${role}` : '';
    return apiFetch<UserSummary[]>(`/users${qs}`);
  },
};

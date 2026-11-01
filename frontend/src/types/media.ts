export interface IncidentPhoto {
  id: string;
  incidentId: string;
  s3Key: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  url?: string;
  createdAt: string;
}

export interface PresignedUploadInput {
  incidentId: string;
  fileName: string;
  contentType: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  s3Key: string;
}

export interface ConfirmUploadInput {
  incidentId: string;
  s3Key: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

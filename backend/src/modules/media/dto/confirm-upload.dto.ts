import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ALLOWED_MIME_TYPES } from './presigned-upload.dto';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class ConfirmUploadDto {
  @ApiProperty({
    example: 'e672f0db-2b47-497d-bfa2-fcbbfa66782d',
    description: 'UUID of the incident to attach photo to',
  })
  @IsUUID('4', { message: 'incidentId must be a valid UUID' })
  @IsNotEmpty({ message: 'incidentId is required' })
  incidentId: string;

  @ApiProperty({
    example:
      'incidents/e672f0db-2b47-497d-bfa2-fcbbfa66782d/928c038f-a9ce-4458-94ef-650a8037f374.jpg',
    description: 'S3 storage key returned from pre-signed upload URL endpoint',
  })
  @IsString()
  @IsNotEmpty({ message: 's3Key is required' })
  s3Key: string;

  @ApiProperty({ example: 'pothole_evidence.jpg' })
  @IsString()
  @IsNotEmpty({ message: 'fileName is required' })
  fileName: string;

  @ApiProperty({
    example: 1450280,
    description: 'File size in bytes (maximum 5MB)',
  })
  @IsInt()
  @Min(1, { message: 'fileSizeBytes must be greater than 0' })
  @Max(MAX_FILE_SIZE_BYTES, {
    message: `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES} bytes (5 MB)`,
  })
  fileSizeBytes: number;

  @ApiProperty({
    enum: ALLOWED_MIME_TYPES,
    example: 'image/jpeg',
    description: 'MIME type of the uploaded file',
  })
  @IsString()
  @IsNotEmpty({ message: 'mimeType is required' })
  @IsIn(ALLOWED_MIME_TYPES, {
    message: `mimeType must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
  })
  mimeType: string;
}

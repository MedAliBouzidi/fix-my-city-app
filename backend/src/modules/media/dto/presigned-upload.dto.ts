import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export class PresignedUploadDto {
  @ApiProperty({
    example: 'e672f0db-2b47-497d-bfa2-fcbbfa66782d',
    description: 'UUID of the incident to attach photo to',
  })
  @IsUUID('4', { message: 'incidentId must be a valid UUID' })
  @IsNotEmpty({ message: 'incidentId is required' })
  incidentId: string;

  @ApiProperty({ example: 'pothole_evidence.jpg' })
  @IsString()
  @IsNotEmpty({ message: 'fileName is required' })
  fileName: string;

  @ApiProperty({
    enum: ALLOWED_MIME_TYPES,
    example: 'image/jpeg',
    description: 'MIME type of the image (image/jpeg, image/jpg, image/png)',
  })
  @IsString()
  @IsNotEmpty({ message: 'contentType is required' })
  @IsIn(ALLOWED_MIME_TYPES, {
    message: `contentType must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
  })
  contentType: string;
}

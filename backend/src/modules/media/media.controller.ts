import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { PresignedUploadDto } from './dto/presigned-upload.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presigned-upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate temporary pre-signed S3 PUT URL for direct client upload',
  })
  @ApiResponse({
    status: 200,
    description: 'Pre-signed URL generated successfully',
    schema: {
      example: {
        uploadUrl: 'https://fixmycity-media-storage-production.s3.us-east-1.amazonaws.com/...',
        s3Key:
          'incidents/e672f0db-2b47-497d-bfa2-fcbbfa66782d/928c038f-a9ce-4458-94ef-650a8037f374.jpg',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid mime type or body' })
  @ApiResponse({ status: 403, description: 'Forbidden: not caller incident' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async getPresignedUploadUrl(
    @Body() dto: PresignedUploadDto,
    @CurrentUser() caller: { id: string; role: Role },
  ) {
    return this.mediaService.generatePresignedUploadUrl(dto, caller);
  }

  @Post('confirm-upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Confirm direct upload completion and persist photo metadata',
  })
  @ApiResponse({
    status: 201,
    description: 'Confirmed IncidentPhoto metadata created',
  })
  @ApiResponse({ status: 400, description: 'File size exceeded or bad s3Key' })
  @ApiResponse({ status: 403, description: 'Forbidden: not caller incident' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async confirmUpload(
    @Body() dto: ConfirmUploadDto,
    @CurrentUser() caller: { id: string; role: Role },
  ) {
    return this.mediaService.confirmUpload(dto, caller);
  }
}

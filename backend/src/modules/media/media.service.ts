import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { Role } from '../../common/enums/role.enum';
import { Incident } from '../../entities/incident.entity';
import { IncidentPhoto } from '../../entities/incident-photo.entity';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { PresignedUploadDto } from './dto/presigned-upload.dto';
import { S3Service } from './s3.service';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
    @InjectRepository(IncidentPhoto)
    private readonly photoRepository: Repository<IncidentPhoto>,
    private readonly s3Service: S3Service,
  ) {}

  async generatePresignedUploadUrl(
    dto: PresignedUploadDto,
    caller: { id: string; role: Role },
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    const incident = await this.incidentRepository.findOne({
      where: { id: dto.incidentId },
    });

    if (!incident) {
      throw new NotFoundException(
        `Incident with ID "${dto.incidentId}" not found`,
      );
    }

    if (caller.role === Role.CITIZEN && incident.reporterId !== caller.id) {
      throw new ForbiddenException(
        'Citizens are only authorized to upload media to their own incidents',
      );
    }

    // Determine extension
    let extension = path.extname(dto.fileName).toLowerCase().replace('.', '');
    if (!extension) {
      if (dto.contentType === 'image/png') extension = 'png';
      else extension = 'jpg';
    }

    const uniquePhotoId = randomUUID();
    const s3Key = `incidents/${incident.id}/${uniquePhotoId}.${extension}`;

    const uploadUrl = await this.s3Service.getSignedUploadUrl(
      s3Key,
      dto.contentType,
    );

    return {
      uploadUrl,
      s3Key,
    };
  }

  async confirmUpload(
    dto: ConfirmUploadDto,
    caller: { id: string; role: Role },
  ): Promise<IncidentPhoto> {
    const incident = await this.incidentRepository.findOne({
      where: { id: dto.incidentId },
    });

    if (!incident) {
      throw new NotFoundException(
        `Incident with ID "${dto.incidentId}" not found`,
      );
    }

    if (caller.role === Role.CITIZEN && incident.reporterId !== caller.id) {
      throw new ForbiddenException(
        'Citizens are only authorized to confirm uploads to their own incidents',
      );
    }

    // Security check: ensure s3Key belongs to this incident
    if (!dto.s3Key.startsWith(`incidents/${dto.incidentId}/`)) {
      throw new BadRequestException(
        'Invalid s3Key: s3Key does not match the target incident namespace',
      );
    }

    const photo = this.photoRepository.create({
      incidentId: dto.incidentId,
      s3Key: dto.s3Key,
      fileName: dto.fileName.trim(),
      fileSizeBytes: dto.fileSizeBytes,
      mimeType: dto.mimeType,
    });

    return this.photoRepository.save(photo);
  }
}

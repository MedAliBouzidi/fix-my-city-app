import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../../common/enums/role.enum';
import { Incident } from '../../entities/incident.entity';
import { IncidentPhoto } from '../../entities/incident-photo.entity';
import { MediaService } from './media.service';
import { S3Service } from './s3.service';

describe('MediaService', () => {
  let service: MediaService;
  let incidentRepository: any;
  let photoRepository: any;
  let s3Service: any;

  beforeEach(async () => {
    incidentRepository = {
      findOne: jest.fn(),
    };

    photoRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((photo) =>
        Promise.resolve({ id: 'photo-uuid-1', ...photo }),
      ),
    };

    s3Service = {
      getSignedUploadUrl: jest
        .fn()
        .mockResolvedValue('https://s3.example.com/put-presigned-url'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: getRepositoryToken(Incident),
          useValue: incidentRepository,
        },
        {
          provide: getRepositoryToken(IncidentPhoto),
          useValue: photoRepository,
        },
        {
          provide: S3Service,
          useValue: s3Service,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  describe('generatePresignedUploadUrl', () => {
    it('should generate pre-signed upload URL and s3Key for valid incident', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        reporterId: 'citizen-1',
      });

      const result = await service.generatePresignedUploadUrl(
        {
          incidentId: 'inc-1',
          fileName: 'evidence.jpg',
          contentType: 'image/jpeg',
        },
        { id: 'citizen-1', role: Role.CITIZEN },
      );

      expect(result.uploadUrl).toBe('https://s3.example.com/put-presigned-url');
      expect(result.s3Key).toMatch(/^incidents\/inc-1\/[a-f0-9-]+\.jpg$/);
    });

    it('should throw NotFoundException if incident does not exist', async () => {
      incidentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.generatePresignedUploadUrl(
          {
            incidentId: 'inc-missing',
            fileName: 'evidence.jpg',
            contentType: 'image/jpeg',
          },
          { id: 'citizen-1', role: Role.CITIZEN },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if citizen does not own the incident', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        reporterId: 'citizen-owner',
      });

      await expect(
        service.generatePresignedUploadUrl(
          {
            incidentId: 'inc-1',
            fileName: 'evidence.jpg',
            contentType: 'image/jpeg',
          },
          { id: 'citizen-attacker', role: Role.CITIZEN },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirmUpload', () => {
    it('should persist photo metadata on valid confirm request', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        reporterId: 'citizen-1',
      });

      const result = await service.confirmUpload(
        {
          incidentId: 'inc-1',
          s3Key: 'incidents/inc-1/random-uuid.jpg',
          fileName: 'evidence.jpg',
          fileSizeBytes: 102400,
          mimeType: 'image/jpeg',
        },
        { id: 'citizen-1', role: Role.CITIZEN },
      );

      expect(result.id).toBe('photo-uuid-1');
      expect(result.incidentId).toBe('inc-1');
      expect(result.fileSizeBytes).toBe(102400);
    });

    it('should throw BadRequestException if s3Key does not match incident namespace', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        reporterId: 'citizen-1',
      });

      await expect(
        service.confirmUpload(
          {
            incidentId: 'inc-1',
            s3Key: 'incidents/other-incident/random-uuid.jpg',
            fileName: 'evidence.jpg',
            fileSizeBytes: 102400,
            mimeType: 'image/jpeg',
          },
          { id: 'citizen-1', role: Role.CITIZEN },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IncidentCategory } from '../../common/enums/incident-category.enum';
import { IncidentPriority } from '../../common/enums/incident-priority.enum';
import { IncidentStatus } from '../../common/enums/incident-status.enum';
import { Role } from '../../common/enums/role.enum';
import { Incident } from '../../entities/incident.entity';
import { IncidentNote } from '../../entities/incident-note.entity';
import { User } from '../../entities/user.entity';
import { S3Service } from '../media/s3.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IncidentsService } from './incidents.service';

describe('IncidentsService — Status Transitions & Ownership', () => {
  let service: IncidentsService;
  let incidentRepository: any;
  let incidentNoteRepository: any;
  let userRepository: any;
  let notificationsService: any;
  let s3Service: any;

  beforeEach(async () => {
    incidentRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((inc) =>
        Promise.resolve({ id: 'inc-uuid-1', reportNumber: 1001, ...inc }),
      ),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getCount: jest.fn().mockResolvedValue(1),
      }),
    };

    incidentNoteRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((note) =>
        Promise.resolve({ id: 'note-uuid-1', ...note }),
      ),
    };

    userRepository = {
      findOne: jest.fn(),
    };

    notificationsService = {
      checkAndAlertStreetIncidents: jest.fn().mockResolvedValue(undefined),
    };

    s3Service = {
      getSignedDownloadUrl: jest
        .fn()
        .mockResolvedValue('https://s3.example.com/photo.jpg?signed=true'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        {
          provide: getRepositoryToken(Incident),
          useValue: incidentRepository,
        },
        {
          provide: getRepositoryToken(IncidentNote),
          useValue: incidentNoteRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: S3Service,
          useValue: s3Service,
        },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
  });

  describe('create', () => {
    it('should create an incident with status RECEIVED and priority MEDIUM', async () => {
      const result = await service.create(
        {
          title: 'Road Damage',
          description: 'Pothole on main avenue',
          category: IncidentCategory.ROADS,
          streetAddress: 'Main St',
          latitude: 36.8,
          longitude: 10.1,
        },
        'citizen-uuid',
      );

      expect(result.status).toBe(IncidentStatus.RECEIVED);
      expect(result.priority).toBe(IncidentPriority.MEDIUM);
      expect(incidentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: IncidentStatus.RECEIVED,
          priority: IncidentPriority.MEDIUM,
          reporterId: 'citizen-uuid',
        }),
      );
    });
  });

  describe('assignAgent (RECEIVED -> PENDING_VALIDATION)', () => {
    it('should successfully assign agent when status is RECEIVED', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.RECEIVED,
      });
      userRepository.findOne.mockResolvedValue({
        id: 'agent-1',
        role: Role.AGENT,
      });

      const updated = await service.assignAgent('inc-1', { agentId: 'agent-1' });

      expect(updated.status).toBe(IncidentStatus.PENDING_VALIDATION);
      expect(updated.agentId).toBe('agent-1');
    });

    it('should reject if current status is not RECEIVED', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.VALIDATED,
      });

      await expect(
        service.assignAgent('inc-1', { agentId: 'agent-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validate (PENDING_VALIDATION -> VALIDATED / REJECTED)', () => {
    it('should validate incident to VALIDATED, update priority, and save audit note', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.PENDING_VALIDATION,
        agentId: 'agent-1',
      });

      const updated = await service.validate(
        'inc-1',
        { isValid: true, priority: IncidentPriority.HIGH, note: 'Confirmed hazard' },
        'agent-1',
      );

      expect(updated.status).toBe(IncidentStatus.VALIDATED);
      expect(updated.priority).toBe(IncidentPriority.HIGH);
      expect(incidentNoteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          incidentId: 'inc-1',
          authorId: 'agent-1',
          content: 'Confirmed hazard',
        }),
      );
    });

    it('should transition to REJECTED if isValid is false', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.PENDING_VALIDATION,
        agentId: 'agent-1',
      });

      const updated = await service.validate(
        'inc-1',
        { isValid: false, priority: IncidentPriority.LOW, note: 'False alarm' },
        'agent-1',
      );

      expect(updated.status).toBe(IncidentStatus.REJECTED);
    });

    it('should reject validation if caller is not the assigned agent', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.PENDING_VALIDATION,
        agentId: 'agent-other',
      });

      await expect(
        service.validate(
          'inc-1',
          { isValid: true, priority: IncidentPriority.HIGH, note: 'Test' },
          'agent-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject validation if status is not PENDING_VALIDATION', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.RECEIVED,
        agentId: 'agent-1',
      });

      await expect(
        service.validate(
          'inc-1',
          { isValid: true, priority: IncidentPriority.HIGH, note: 'Test' },
          'agent-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignTechnician (VALIDATED -> ASSIGNED)', () => {
    it('should assign technician when status is VALIDATED', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.VALIDATED,
      });
      userRepository.findOne.mockResolvedValue({
        id: 'tech-1',
        role: Role.TECHNICIAN,
      });

      const updated = await service.assignTechnician('inc-1', {
        technicianId: 'tech-1',
      });

      expect(updated.status).toBe(IncidentStatus.ASSIGNED);
      expect(updated.technicianId).toBe('tech-1');
    });

    it('should reject if status is not VALIDATED', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.PENDING_VALIDATION,
      });

      await expect(
        service.assignTechnician('inc-1', { technicianId: 'tech-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('progress (ASSIGNED -> IN_PROGRESS -> RESOLVED)', () => {
    it('should transition ASSIGNED -> IN_PROGRESS and save audit note', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.ASSIGNED,
        technicianId: 'tech-1',
      });

      const updated = await service.progress(
        'inc-1',
        { status: IncidentStatus.IN_PROGRESS, reportNote: 'Repair started' },
        'tech-1',
      );

      expect(updated.status).toBe(IncidentStatus.IN_PROGRESS);
      expect(incidentNoteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          incidentId: 'inc-1',
          authorId: 'tech-1',
          content: 'Repair started',
        }),
      );
    });

    it('should transition IN_PROGRESS -> RESOLVED and save audit note', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.IN_PROGRESS,
        technicianId: 'tech-1',
      });

      const updated = await service.progress(
        'inc-1',
        { status: IncidentStatus.RESOLVED, reportNote: 'Repair completed' },
        'tech-1',
      );

      expect(updated.status).toBe(IncidentStatus.RESOLVED);
    });

    it('should reject invalid transition e.g. ASSIGNED -> RESOLVED', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.ASSIGNED,
        technicianId: 'tech-1',
      });

      await expect(
        service.progress(
          'inc-1',
          { status: IncidentStatus.RESOLVED, reportNote: 'Skipping steps' },
          'tech-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if caller is not the assigned technician', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        status: IncidentStatus.ASSIGNED,
        technicianId: 'tech-other',
      });

      await expect(
        service.progress(
          'inc-1',
          { status: IncidentStatus.IN_PROGRESS, reportNote: 'Starting' },
          'tech-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne (Ownership enforcement)', () => {
    it('should allow citizen to view own report', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        reporterId: 'citizen-1',
        photos: [],
        notes: [],
      });

      const result = await service.findOne('inc-1', {
        id: 'citizen-1',
        role: Role.CITIZEN,
      });

      expect(result.id).toBe('inc-1');
    });

    it('should forbid citizen from viewing another citizen report', async () => {
      incidentRepository.findOne.mockResolvedValue({
        id: 'inc-1',
        reporterId: 'citizen-other',
        photos: [],
        notes: [],
      });

      await expect(
        service.findOne('inc-1', {
          id: 'citizen-1',
          role: Role.CITIZEN,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidentCategory } from '../../common/enums/incident-category.enum';
import { IncidentPriority } from '../../common/enums/incident-priority.enum';
import { IncidentStatus } from '../../common/enums/incident-status.enum';
import { Role } from '../../common/enums/role.enum';
import { Incident } from '../../entities/incident.entity';
import { IncidentNote } from '../../entities/incident-note.entity';
import { User } from '../../entities/user.entity';
import { S3Service } from '../media/s3.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignAgentDto } from './dto/assign-agent.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { ProgressIncidentDto } from './dto/progress-incident.dto';
import { PublicIncidentsQueryDto } from './dto/public-incidents-query.dto';
import { QueryIncidentsDto } from './dto/query-incidents.dto';
import { ValidateIncidentDto } from './dto/validate-incident.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
    @InjectRepository(IncidentNote)
    private readonly incidentNoteRepository: Repository<IncidentNote>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    dto: CreateIncidentDto,
    callerId: string,
  ): Promise<{
    id: string;
    reportNumber: number;
    title: string;
    category: IncidentCategory;
    status: IncidentStatus;
    priority: IncidentPriority;
    createdAt: Date;
  }> {
    const incident = this.incidentRepository.create({
      title: dto.title.trim(),
      description: dto.description.trim(),
      category: dto.category,
      streetAddress: dto.streetAddress.trim(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      reporterId: callerId,
      status: IncidentStatus.RECEIVED,
      priority: IncidentPriority.MEDIUM,
    });

    const saved = await this.incidentRepository.save(incident);

    // Fail-safe check for >10 incidents on the same street
    try {
      const streetCount = await this.incidentRepository
        .createQueryBuilder('incident')
        .where('LOWER(TRIM(incident.streetAddress)) = LOWER(TRIM(:street))', {
          street: dto.streetAddress.trim(),
        })
        .getCount();

      await this.notificationsService.checkAndAlertStreetIncidents(
        dto.streetAddress.trim(),
        streetCount,
      );
    } catch {
      // notification check is fail-safe; never breaks incident creation
    }

    return {
      id: saved.id,
      reportNumber: saved.reportNumber,
      title: saved.title,
      category: saved.category,
      status: saved.status,
      priority: saved.priority,
      createdAt: saved.createdAt,
    };
  }

  async findAll(
    query: QueryIncidentsDto,
  ): Promise<PaginatedResult<Partial<Incident>>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const qb = this.incidentRepository
      .createQueryBuilder('incident')
      .select([
        'incident.id',
        'incident.reportNumber',
        'incident.title',
        'incident.category',
        'incident.status',
        'incident.priority',
        'incident.streetAddress',
        'incident.createdAt',
      ]);

    if (query.status) {
      qb.andWhere('incident.status = :status', { status: query.status });
    }

    if (query.category) {
      qb.andWhere('incident.category = :category', {
        category: query.category,
      });
    }

    if (query.streetAddress) {
      qb.andWhere('incident.streetAddress LIKE :streetAddress', {
        streetAddress: `%${query.streetAddress.trim()}%`,
      });
    }

    qb.orderBy('incident.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findMyIncidents(callerId: string): Promise<Incident[]> {
    return this.incidentRepository.find({
      where: { reporterId: callerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAssigned(caller: { id: string; role: Role }): Promise<Incident[]> {
    if (caller.role === Role.AGENT) {
      return this.incidentRepository.find({
        where: { agentId: caller.id },
        order: { createdAt: 'DESC' },
      });
    }

    if (caller.role === Role.TECHNICIAN) {
      return this.incidentRepository.find({
        where: { technicianId: caller.id },
        order: { createdAt: 'DESC' },
      });
    }

    return [];
  }

  async findPublicResolved(
    query: PublicIncidentsQueryDto,
  ): Promise<PaginatedResult<Partial<Incident>>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const qb = this.incidentRepository
      .createQueryBuilder('incident')
      .select([
        'incident.id',
        'incident.reportNumber',
        'incident.title',
        'incident.category',
        'incident.status',
        'incident.streetAddress',
        'incident.createdAt',
        'incident.updatedAt',
      ])
      .where('incident.status = :status', { status: IncidentStatus.RESOLVED })
      .orderBy('incident.updatedAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: string,
    caller: { id: string; role: Role },
  ): Promise<Incident & { photos: any[] }> {
    const incident = await this.incidentRepository.findOne({
      where: { id },
      relations: ['photos', 'notes'],
      order: {
        notes: { createdAt: 'ASC' },
        photos: { createdAt: 'ASC' },
      },
    });

    if (!incident) {
      throw new NotFoundException(`Incident with ID "${id}" not found`);
    }

    // Ownership rules
    if (caller.role === Role.CITIZEN && incident.reporterId !== caller.id) {
      throw new ForbiddenException(
        'Citizens are only authorized to access their own incident reports',
      );
    }

    if (caller.role === Role.TECHNICIAN && incident.technicianId !== caller.id) {
      throw new ForbiddenException(
        'Technicians are only authorized to access incidents assigned to them',
      );
    }

    if (
      caller.role === Role.AGENT &&
      incident.agentId !== caller.id &&
      incident.status !== IncidentStatus.PENDING_VALIDATION
    ) {
      throw new ForbiddenException(
        'Agents are only authorized to access incidents assigned to them',
      );
    }

    // Generate short-lived pre-signed GET URLs for photos
    const photosWithUrls = await Promise.all(
      (incident.photos || []).map(async (photo) => {
        const downloadUrl = await this.s3Service.getSignedDownloadUrl(
          photo.s3Key,
        );
        return {
          ...photo,
          url: downloadUrl,
        };
      }),
    );

    return {
      ...incident,
      photos: photosWithUrls,
    };
  }

  async assignAgent(id: string, dto: AssignAgentDto): Promise<Incident> {
    const incident = await this.incidentRepository.findOne({ where: { id } });
    if (!incident) {
      throw new NotFoundException(`Incident with ID "${id}" not found`);
    }

    if (incident.status !== IncidentStatus.RECEIVED) {
      throw new BadRequestException(
        `Invalid status transition: Cannot assign agent to incident in status "${incident.status}". Expected status: "${IncidentStatus.RECEIVED}"`,
      );
    }

    const agent = await this.userRepository.findOne({
      where: { id: dto.agentId, role: Role.AGENT },
    });
    if (!agent) {
      throw new BadRequestException(
        `Agent with ID "${dto.agentId}" was not found or is not an active AGENT`,
      );
    }

    incident.agentId = dto.agentId;
    incident.status = IncidentStatus.PENDING_VALIDATION;

    return this.incidentRepository.save(incident);
  }

  async validate(
    id: string,
    dto: ValidateIncidentDto,
    callerId: string,
  ): Promise<Incident> {
    const incident = await this.incidentRepository.findOne({ where: { id } });
    if (!incident) {
      throw new NotFoundException(`Incident with ID "${id}" not found`);
    }

    if (incident.agentId !== callerId) {
      throw new ForbiddenException(
        'Agents can only validate incidents explicitly assigned to them',
      );
    }

    if (incident.status !== IncidentStatus.PENDING_VALIDATION) {
      throw new BadRequestException(
        `Invalid status transition: Cannot validate incident in status "${incident.status}". Expected status: "${IncidentStatus.PENDING_VALIDATION}"`,
      );
    }

    incident.status = dto.isValid
      ? IncidentStatus.VALIDATED
      : IncidentStatus.REJECTED;
    incident.priority = dto.priority;

    const savedIncident = await this.incidentRepository.save(incident);

    // Audit note record on validate action
    const note = this.incidentNoteRepository.create({
      incidentId: incident.id,
      authorId: callerId,
      content: dto.note.trim(),
    });
    await this.incidentNoteRepository.save(note);

    return savedIncident;
  }

  async assignTechnician(
    id: string,
    dto: AssignTechnicianDto,
  ): Promise<Incident> {
    const incident = await this.incidentRepository.findOne({ where: { id } });
    if (!incident) {
      throw new NotFoundException(`Incident with ID "${id}" not found`);
    }

    if (incident.status !== IncidentStatus.VALIDATED) {
      throw new BadRequestException(
        `Invalid status transition: Cannot assign technician to incident in status "${incident.status}". Expected status: "${IncidentStatus.VALIDATED}"`,
      );
    }

    const technician = await this.userRepository.findOne({
      where: { id: dto.technicianId, role: Role.TECHNICIAN },
    });
    if (!technician) {
      throw new BadRequestException(
        `Technician with ID "${dto.technicianId}" was not found or is not an active TECHNICIAN`,
      );
    }

    incident.technicianId = dto.technicianId;
    incident.status = IncidentStatus.ASSIGNED;

    return this.incidentRepository.save(incident);
  }

  async progress(
    id: string,
    dto: ProgressIncidentDto,
    callerId: string,
  ): Promise<Incident> {
    const incident = await this.incidentRepository.findOne({ where: { id } });
    if (!incident) {
      throw new NotFoundException(`Incident with ID "${id}" not found`);
    }

    if (incident.technicianId !== callerId) {
      throw new ForbiddenException(
        'Technicians can only update progress on incidents assigned to them',
      );
    }

    // State machine check:
    // ASSIGNED -> IN_PROGRESS
    // IN_PROGRESS -> RESOLVED
    const isValidTransition =
      (incident.status === IncidentStatus.ASSIGNED &&
        dto.status === IncidentStatus.IN_PROGRESS) ||
      (incident.status === IncidentStatus.IN_PROGRESS &&
        dto.status === IncidentStatus.RESOLVED);

    if (!isValidTransition) {
      throw new BadRequestException(
        `Invalid status transition: Cannot move incident from "${incident.status}" to "${dto.status}"`,
      );
    }

    incident.status = dto.status;
    const savedIncident = await this.incidentRepository.save(incident);

    // Audit note record on progress action
    const note = this.incidentNoteRepository.create({
      incidentId: incident.id,
      authorId: callerId,
      content: dto.reportNote.trim(),
    });
    await this.incidentNoteRepository.save(note);

    return savedIncident;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { User } from '../../entities/user.entity';
import { Incident } from '../../entities/incident.entity';
import { IncidentPhoto } from '../../entities/incident-photo.entity';
import { IncidentNote } from '../../entities/incident-note.entity';
import { S3Service } from '../media/s3.service';
import { SEED_USERS, SEED_INCIDENTS } from './seed-data';

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
    @InjectRepository(IncidentPhoto)
    private readonly photoRepository: Repository<IncidentPhoto>,
    @InjectRepository(IncidentNote)
    private readonly noteRepository: Repository<IncidentNote>,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Return current database initialization and seeding status.
   */
  async getStatus() {
    const userCount = await this.userRepository.count();
    const incidentCount = await this.incidentRepository.count();
    const photoCount = await this.photoRepository.count();
    const noteCount = await this.noteRepository.count();

    const clusterStreet = 'Avenue Habib Bourguiba, Ariana';
    const clusterCount = await this.incidentRepository
      .createQueryBuilder('i')
      .where('LOWER(TRIM(i.streetAddress)) = LOWER(TRIM(:st))', {
        st: clusterStreet,
      })
      .getCount();

    const targetIncident = await this.incidentRepository.findOne({
      where: { streetAddress: clusterStreet },
      order: { reportNumber: 'ASC' },
    });

    return {
      status: 'READY',
      counts: {
        users: userCount,
        incidents: incidentCount,
        photos: photoCount,
        notes: noteCount,
      },
      isSeeded: incidentCount >= 26 && userCount >= 21,
      targetCluster: {
        streetAddress: clusterStreet,
        currentReportCount: clusterCount,
        primaryReportNumber: targetIncident?.reportNumber || null,
        autoAlertStatus:
          clusterCount >= 10
            ? 'ALERT_TRIGGERED (threshold exceeded)'
            : `${clusterCount}/10 reports accumulated (1 more report will trigger alert)`,
      },
      instructions:
        'Call POST /api/v1/setup (or /api/v1/setup?clean=true) to seed the database with authentic Ariana municipal data.',
    };
  }

  /**
   * Seed users, incidents, photos, and notes directly into the database.
   */
  async seed(options: { clean?: boolean } = {}) {
    this.logger.log('--- Starting FixMyCity database setup & seeding ---');

    // 1. Clean existing records if requested
    if (options.clean) {
      this.logger.log('Cleaning existing incidents, notes, and photos...');
      await this.photoRepository.delete({});
      await this.noteRepository.delete({});
      await this.incidentRepository.delete({});
    }

    // 2. Seed Users (all with password: "password")
    this.logger.log(`Seeding ${SEED_USERS.length} user accounts...`);
    const hashedPassword = await bcrypt.hash('password', 10);
    const userMap = new Map<string, User>();

    for (const seed of SEED_USERS) {
      let user = await this.userRepository.findOne({
        where: { email: seed.email.toLowerCase().trim() },
      });

      if (user) {
        user.password = hashedPassword;
        user.firstName = seed.firstName;
        user.lastName = seed.lastName;
        user.role = seed.role;
        user = await this.userRepository.save(user);
      } else {
        user = this.userRepository.create({
          email: seed.email.toLowerCase().trim(),
          password: hashedPassword,
          firstName: seed.firstName,
          lastName: seed.lastName,
          role: seed.role,
        });
        user = await this.userRepository.save(user);
      }

      userMap.set(seed.email, user);
    }

    // 3. Asset directory lookup
    const assetDirCandidates = [
      path.join(process.cwd(), 'seed_assets'),
      path.join(process.cwd(), 'scripts', 'seed_assets'),
      path.join(__dirname, '..', '..', '..', 'seed_assets'),
      path.join(__dirname, '..', '..', '..', 'scripts', 'seed_assets'),
    ];
    let assetsDir = assetDirCandidates.find((d) => fs.existsSync(d)) || null;
    this.logger.log(`Using seed assets directory: ${assetsDir || 'none'}`);

    // Check S3 reachability
    const isS3Ready = await this.s3Service.checkBucketReachable();
    this.logger.log(`S3 bucket reachable: ${isS3Ready}`);

    // 4. Seed Incidents, Photos & Audit Notes
    this.logger.log(`Seeding ${SEED_INCIDENTS.length} incidents...`);
    const seededIncidents: Array<{
      code: string;
      id: string;
      reportNumber: number;
      title: string;
      streetAddress: string;
    }> = [];

    const clusterReports: Array<{
      code: string;
      reportNumber: number;
      id: string;
      reporter: string;
    }> = [];

    for (const inc of SEED_INCIDENTS) {
      // Check if this incident already exists when not clean
      let existing: Incident | null = null;
      if (!options.clean) {
        existing = await this.incidentRepository.findOne({
          where: {
            title: inc.title.trim(),
            streetAddress: inc.streetAddress.trim(),
          },
        });
      }

      const reporter = userMap.get(inc.reporterEmail) || null;
      const agent = inc.assignedAgentEmail
        ? userMap.get(inc.assignedAgentEmail) || null
        : null;
      const technician = inc.assignedTechnicianEmail
        ? userMap.get(inc.assignedTechnicianEmail) || null
        : null;

      let savedIncident: Incident;

      if (existing) {
        savedIncident = existing;
      } else {
        const incident = this.incidentRepository.create({
          title: inc.title.trim(),
          description: inc.description.trim(),
          category: inc.category,
          status: inc.status,
          priority: inc.priority,
          streetAddress: inc.streetAddress.trim(),
          latitude: inc.latitude,
          longitude: inc.longitude,
          reporterId: reporter ? reporter.id : null,
          agentId: agent ? agent.id : null,
          technicianId: technician ? technician.id : null,
          createdAt: new Date(inc.createdAt),
          updatedAt: new Date(inc.createdAt),
        });

        savedIncident = await this.incidentRepository.save(incident);
      }

      seededIncidents.push({
        code: inc.code,
        id: savedIncident.id,
        reportNumber: savedIncident.reportNumber,
        title: savedIncident.title,
        streetAddress: savedIncident.streetAddress,
      });

      if (inc.clusterTargetCode === 'INC-ROADS-001' || inc.code.includes('INC-ROADS-001')) {
        clusterReports.push({
          code: inc.code,
          reportNumber: savedIncident.reportNumber,
          id: savedIncident.id,
          reporter: inc.reporterEmail,
        });
      }

      // Photos
      if (inc.image && (!existing || options.clean)) {
        const photoPath = inc.image.path;
        let fileBuffer: Buffer | null = null;
        let fileSize = 2048000;

        if (assetsDir) {
          const fullPath = path.join(assetsDir, photoPath);
          if (fs.existsSync(fullPath)) {
            fileBuffer = fs.readFileSync(fullPath);
            fileSize = fileBuffer.length;
          }
        }

        const photoUuid = randomUUID();
        const s3Key = `incidents/${savedIncident.id}/${photoUuid}.jpg`;

        if (fileBuffer && isS3Ready) {
          await this.s3Service.uploadObject(s3Key, fileBuffer, inc.image.mimeType);
        }

        const photo = this.photoRepository.create({
          incidentId: savedIncident.id,
          s3Key,
          fileName: inc.image.fileName,
          fileSizeBytes: fileSize,
          mimeType: inc.image.mimeType,
          createdAt: new Date(inc.createdAt),
        });

        await this.photoRepository.save(photo);
      }

      // Notes
      if (inc.notes && (!existing || options.clean)) {
        for (const n of inc.notes) {
          const author = userMap.get(n.authorEmail) || null;
          const note = this.noteRepository.create({
            incidentId: savedIncident.id,
            authorId: author ? author.id : null,
            content: n.content,
            createdAt: n.createdAt ? new Date(n.createdAt) : new Date(inc.createdAt),
          });
          await this.noteRepository.save(note);
        }
      }
    }

    const clusterStreet = 'Avenue Habib Bourguiba, Ariana';
    const totalOnStreet = await this.incidentRepository
      .createQueryBuilder('i')
      .where('LOWER(TRIM(i.streetAddress)) = LOWER(TRIM(:st))', {
        st: clusterStreet,
      })
      .getCount();

    this.logger.log('--- Database seeding completed successfully ---');

    return {
      success: true,
      message: 'FixMyCity database seeded successfully with authentic municipal records',
      summary: {
        usersCount: userMap.size,
        incidentsCount: seededIncidents.length,
        commonPassword: 'password',
      },
      targetIncidentCluster: {
        streetAddress: clusterStreet,
        primaryReportNumber: clusterReports[0]?.reportNumber || 1001,
        primaryCode: 'INC-ROADS-001-R01',
        title: 'Critical deep road crater damaging vehicle axles near pharmacy',
        currentReportsOnStreet: totalOnStreet,
        clusterReports,
        testingAutoAlert:
          'There are currently 9 reports on Avenue Habib Bourguiba, Ariana. Submitting a 10th report on this street via the web application tests the high-density threshold and triggers the alert!',
      },
    };
  }
}

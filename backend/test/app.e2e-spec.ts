import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { S3Service } from '../src/modules/media/s3.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

describe('FixMyCity Comprehensive E2E Workflow', () => {
  let app: INestApplication;
  let citizenToken: string;
  let citizenUserId: string;
  let adminToken: string;
  let agentToken: string;
  let agentId: string;
  let technicianToken: string;
  let technicianId: string;
  let createdIncidentId: string;
  let uploadedS3Key: string;

  const testEmail = `citizen_e2e_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NotificationsService)
      .useValue({
        checkAndAlertStreetIncidents: jest.fn().mockResolvedValue(undefined),
      })
      .overrideProvider(S3Service)
      .useValue({
        getSignedUploadUrl: jest
          .fn()
          .mockResolvedValue('https://mock-s3.us-east-1.amazonaws.com/presigned-put'),
        getSignedDownloadUrl: jest
          .fn()
          .mockResolvedValue('https://mock-s3.us-east-1.amazonaws.com/presigned-get'),
        checkBucketReachable: jest.fn().mockResolvedValue(true),
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Mirror bootstrap configuration
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ──────────────────────────────────────────────
  // Phase 1: Authentication & Incident Creation
  // ──────────────────────────────────────────────

  it('Step 1: POST /api/v1/auth/register should register a new citizen account', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'Citizen',
        role: 'CITIZEN',
      })
      .expect(201);

    expect(response.body).toHaveProperty(
      'message',
      'User registered successfully',
    );
    expect(response.body).toHaveProperty('userId');
    citizenUserId = response.body.userId;
  });

  it('Step 2: POST /api/v1/auth/login should authenticate citizen and return JWT', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(testEmail.toLowerCase());
    expect(response.body.user.role).toBe('CITIZEN');
    expect(response.body.user.id).toBe(citizenUserId);
    expect(response.body.user.password).toBeUndefined();

    citizenToken = response.body.accessToken;
  });

  it('Step 3: POST /api/v1/incidents should submit a new incident with status RECEIVED', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'E2E Severe Road Obstruction on Avenue Habib Bourguiba',
        description: 'Large pothole and debris observed during E2E verification run.',
        category: 'ROADS',
        streetAddress: 'Avenue Habib Bourguiba, Tunis',
        latitude: 36.8008,
        longitude: 10.18,
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('reportNumber');
    expect(response.body.status).toBe('RECEIVED');
    expect(response.body.priority).toBe('MEDIUM');
    expect(response.body.category).toBe('ROADS');

    createdIncidentId = response.body.id;
  });

  it('Step 4: GET /api/v1/incidents/my should list the created incident for the citizen', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/incidents/my')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const incident = response.body.find((inc: any) => inc.id === createdIncidentId);
    expect(incident).toBeDefined();
    expect(incident.reporterId).toBe(citizenUserId);
  });

  // ──────────────────────────────────────────────
  // Phase 2: Media Pre-signed Upload and Confirmation
  // ──────────────────────────────────────────────

  it('Step 5: POST /api/v1/media/presigned-upload-url should generate upload URL and key', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/media/presigned-upload-url')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        incidentId: createdIncidentId,
        fileName: 'pothole_evidence.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    expect(response.body).toHaveProperty('uploadUrl');
    expect(response.body).toHaveProperty('s3Key');
    expect(response.body.s3Key).toContain(`incidents/${createdIncidentId}/`);
    uploadedS3Key = response.body.s3Key;
  });

  it('Step 6: POST /api/v1/media/confirm-upload should persist photo metadata', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/media/confirm-upload')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        incidentId: createdIncidentId,
        s3Key: uploadedS3Key,
        fileName: 'pothole_evidence.jpg',
        fileSizeBytes: 204800,
        mimeType: 'image/jpeg',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.incidentId).toBe(createdIncidentId);
    expect(response.body.s3Key).toBe(uploadedS3Key);
  });

  it('Step 7: GET /api/v1/incidents/:id should include pre-signed download URL in photos', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/incidents/${createdIncidentId}`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(response.body.id).toBe(createdIncidentId);
    expect(Array.isArray(response.body.photos)).toBe(true);
    expect(response.body.photos.length).toBeGreaterThanOrEqual(1);
    expect(response.body.photos[0]).toHaveProperty('url');
    expect(response.body.photos[0].url).toContain('https://mock-s3.us-east-1.amazonaws.com');
  });

  // ──────────────────────────────────────────────
  // Phase 3: Staff Login & Agent Assignment / Validation
  // ──────────────────────────────────────────────

  it('Step 8: POST /api/v1/auth/login should authenticate ADMIN account', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@fixmycity.local',
        password: process.env.SEED_ADMIN_PASSWORD || 'admin',
      })
      .expect(200);

    expect(response.body.user.role).toBe('ADMIN');
    adminToken = response.body.accessToken;
  });

  it('Step 9: GET /api/v1/users?role=AGENT should retrieve staff agents', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users?role=AGENT')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    const agent = response.body.find((u: any) => u.email === 'agent@fixmycity.local');
    expect(agent).toBeDefined();
    agentId = agent.id;
  });

  it('Step 10: PATCH /api/v1/incidents/:id/assign-agent should transition to PENDING_VALIDATION', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${createdIncidentId}/assign-agent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agentId })
      .expect(200);

    expect(response.body.status).toBe('PENDING_VALIDATION');
    expect(response.body.agentId).toBe(agentId);
  });

  it('Step 11: Attempting to assign technician before validation should fail (HTTP 400)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${createdIncidentId}/assign-technician`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ technicianId: agentId })
      .expect(400);
  });

  it('Step 12: POST /api/v1/auth/login should authenticate AGENT account', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'agent@fixmycity.local',
        password: process.env.SEED_AGENT_PASSWORD || 'agent',
      })
      .expect(200);

    expect(response.body.user.role).toBe('AGENT');
    agentToken = response.body.accessToken;
  });

  it('Step 13: GET /api/v1/incidents/assigned should list assigned incident for agent', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/incidents/assigned')
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const incident = response.body.find((inc: any) => inc.id === createdIncidentId);
    expect(incident).toBeDefined();
  });

  it('Step 14: PATCH /api/v1/incidents/:id/validate should validate incident and create IncidentNote', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${createdIncidentId}/validate`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        isValid: true,
        priority: 'HIGH',
        note: 'E2E Inspection: Pothole verified, depth 15cm, high priority repair required.',
      })
      .expect(200);

    expect(response.body.status).toBe('VALIDATED');
    expect(response.body.priority).toBe('HIGH');
  });

  // ──────────────────────────────────────────────
  // Phase 4: Technician Assignment & Resolution Lifecycle
  // ──────────────────────────────────────────────

  it('Step 15: GET /api/v1/users?role=TECHNICIAN should retrieve technician staff', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users?role=TECHNICIAN')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const tech = response.body.find((u: any) => u.email === 'technician@fixmycity.local');
    expect(tech).toBeDefined();
    technicianId = tech.id;
  });

  it('Step 16: PATCH /api/v1/incidents/:id/assign-technician should transition to ASSIGNED', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${createdIncidentId}/assign-technician`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ technicianId })
      .expect(200);

    expect(response.body.status).toBe('ASSIGNED');
    expect(response.body.technicianId).toBe(technicianId);
  });

  it('Step 17: POST /api/v1/auth/login should authenticate TECHNICIAN account', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'technician@fixmycity.local',
        password: process.env.SEED_TECHNICIAN_PASSWORD || 'technician',
      })
      .expect(200);

    expect(response.body.user.role).toBe('TECHNICIAN');
    technicianToken = response.body.accessToken;
  });

  it('Step 18: Reject skipping transition (ASSIGNED -> RESOLVED directly without IN_PROGRESS)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${createdIncidentId}/progress`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        status: 'RESOLVED',
        reportNote: 'Attempting to skip IN_PROGRESS state',
      })
      .expect(400);
  });

  it('Step 19: PATCH /api/v1/incidents/:id/progress should update status to IN_PROGRESS', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${createdIncidentId}/progress`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        status: 'IN_PROGRESS',
        reportNote: 'E2E Repair crew deployed on site, asphalt prep underway.',
      })
      .expect(200);

    expect(response.body.status).toBe('IN_PROGRESS');
  });

  it('Step 20: PATCH /api/v1/incidents/:id/progress should complete repair to RESOLVED', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${createdIncidentId}/progress`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        status: 'RESOLVED',
        reportNote: 'E2E Repair completed: asphalt poured and compacted, road reopened.',
      })
      .expect(200);

    expect(response.body.status).toBe('RESOLVED');
  });

  // ──────────────────────────────────────────────
  // Phase 5: Verification & Audit Trails
  // ──────────────────────────────────────────────

  it('Step 21: GET /api/v1/incidents/public/resolved should include the resolved incident', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/incidents/public/resolved')
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    const resolved = response.body.data.find((inc: any) => inc.id === createdIncidentId);
    expect(resolved).toBeDefined();
    expect(resolved.status).toBe('RESOLVED');
  });

  it('Step 22: GET /api/v1/incidents/:id should include both validate and progress IncidentNotes', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/incidents/${createdIncidentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.status).toBe('RESOLVED');
    expect(Array.isArray(response.body.notes)).toBe(true);
    expect(response.body.notes.length).toBeGreaterThanOrEqual(3); // validate note + in_progress note + resolved note
  });

  // ──────────────────────────────────────────────
  // Phase 6: System Health & Simulated Failure Mode
  // ──────────────────────────────────────────────

  it('Step 23: GET /api/v1/health should return 200 UP', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body.status).toBe('UP');
    expect(typeof response.body.uptimeSeconds).toBe('number');
  });

  it('Step 24: GET /api/v1/health/deep should return 200 UP with DB and S3 reachable', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/deep')
      .expect(200);

    expect(response.body.status).toBe('UP');
    expect(response.body.database).toBe('CONNECTED');
    expect(response.body.storage).toBe('REACHABLE');
  });

  it('Step 25: POST /api/v1/health/simulate-fail requires ADMIN role (rejects unauthenticated/citizen)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/health/simulate-fail')
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/health/simulate-fail')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(403);
  });

  it('Step 26: POST /api/v1/health/simulate-fail toggles fault simulation', async () => {
    // Toggle on
    const toggleOn = await request(app.getHttpServer())
      .post('/api/v1/health/simulate-fail')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(toggleOn.body.simulatedFailureActive).toBe(true);

    // /health should now return 500
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(500);

    // Toggle off
    const toggleOff = await request(app.getHttpServer())
      .post('/api/v1/health/simulate-fail')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(toggleOff.body.simulatedFailureActive).toBe(false);

    // /health should now be healthy again
    const healthyAgain = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(healthyAgain.body.status).toBe('UP');
  });
});

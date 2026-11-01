import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('FixMyCity E2E Workflow (Register -> Login -> Create Incident)', () => {
  let app: INestApplication;
  let accessToken: string;
  let citizenUserId: string;
  let createdIncidentId: string;

  const testEmail = `citizen_e2e_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    expect(typeof response.body.userId).toBe('string');
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

    accessToken = response.body.accessToken;
  });

  it('Step 3: POST /api/v1/incidents should submit a new incident with auth token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'E2E Severe Pothole on Avenue Habib Bourguiba',
        description: 'Deep pothole verified via automated e2e integration test suite.',
        category: 'ROADS',
        streetAddress: 'Avenue Habib Bourguiba, Tunis',
        latitude: 36.8008,
        longitude: 10.18,
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('reportNumber');
    expect(typeof response.body.reportNumber).toBe('number');
    expect(response.body.status).toBe('RECEIVED');
    expect(response.body.priority).toBe('MEDIUM');
    expect(response.body.category).toBe('ROADS');

    createdIncidentId = response.body.id;
  });

  it('Step 4: GET /api/v1/incidents/my should list the created incident for the caller', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/incidents/my')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const created = response.body.find((inc: any) => inc.id === createdIncidentId);
    expect(created).toBeDefined();
    expect(created.title).toBe('E2E Severe Pothole on Avenue Habib Bourguiba');
    expect(created.reporterId).toBe(citizenUserId);
  });
});

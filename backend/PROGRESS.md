# FixMyCity Backend — Progress Tracker

## Completed Steps

### Step 1: Scaffold ✅
- NestJS project initialised in `/backend`
- `main.ts`: global prefix `/api/v1`, `ValidationPipe` (whitelist + forbidNonWhitelisted), CORS, `helmet`, conditional Swagger at `/api/docs`
- `ConfigModule` loaded globally from `.env`
- Centralized `HttpExceptionFilter` registered via `APP_FILTER`
- Enums created: `Role`, `IncidentStatus`, `IncidentCategory`, `IncidentPriority`
- Common infrastructure: `@Roles` decorator, `@CurrentUser` decorator, `JwtAuthGuard`, `RolesGuard`
- `.env.example` with placeholders only
- `.gitignore`, `.dockerignore`
- e2e test config (`test/jest-e2e.json`)

#### Decisions
- Swagger served at `/api/docs` (not under `/api/v1`), disabled when `NODE_ENV=production`
- `HttpExceptionFilter` catches all exceptions (not just `HttpException`) — unexpected errors logged with stack trace, sanitised 500 returned to client
- `ValidationPipe` uses `transform: true` with implicit conversion for query params

### Step 2: Database ✅
- TypeORM MySQL config via env vars (`getDatabaseConfig` in `src/config/database.config.ts`)
- Configured with `DATABASE_SYNCHRONIZE=false`
- Entities created:
  - `User`: UUID PK, unique email, hidden password hash, names, role enum, relations
  - `Incident`: UUID PK, auto-increment unique `reportNumber`, title, description, category, status (default `RECEIVED`), priority (default `MEDIUM`), streetAddress, latitude/longitude with numeric decimal transformer, reporter/agent/technician FK relations
  - `IncidentPhoto`: UUID PK, incidentId FK (cascade delete), s3Key, fileName, fileSizeBytes, mimeType
  - `IncidentNote`: UUID PK, incidentId FK (cascade delete), authorId FK (set null), content, createdAt
- TypeORM CLI `DataSource` defined in `src/data-source.ts`
- Generated initial migration in `src/migrations/1793463634163-InitialMigration.ts`
- Verified `npm run typeorm:migration:run` executes successfully and verified table schema in MySQL
- Updated `src/app.module.ts` to register `TypeOrmModule.forRootAsync`

#### Decisions
- Stored latitude/longitude with `decimal(10, 7)` and custom transformer so TypeORM parses values as numbers rather than strings.
- Applied `@Column({ select: false })` on User password column for defense-in-depth against accidental data leakage.

### Step 3: Auth module ✅
- `POST /api/v1/auth/register`: Public endpoint restricted strictly to `CITIZEN` role; hashes password using bcrypt with 10 rounds; rejects duplicate email with 409 Conflict.
- `POST /api/v1/auth/login`: Validates credentials, issues signed JWT token containing `{ sub, email, role }`; returns token and user summary without password hash.
- `JwtStrategy`: Configured with `@nestjs/passport` and `passport-jwt` extraction from Bearer token.
- `@nestjs/throttler`: Configured rate limiting on auth endpoints and globally.
- `GET /api/v1/users?role=AGENT|TECHNICIAN`: Admin-only endpoint to list staff members without returning password hashes.
- `npm run seed`: Created `src/seed.ts` to provision initial ADMIN, AGENT, TECHNICIAN, and CITIZEN users with passwords read from environment variables (`SEED_*_PASSWORD`).
- Unit tests: Added unit tests for `AuthService` and `RolesGuard` (9 tests passing).

#### Decisions
- Public registration only permits `CITIZEN` role (defaulting to CITIZEN if omitted, and rejecting other roles with 400).
- Users endpoint filters specifically for staff roles (AGENT, TECHNICIAN) and requires ADMIN role.

### Step 4: Incidents module ✅
- `POST /api/v1/incidents`: Submits new incident report with status `RECEIVED`, priority `MEDIUM`, auto-increment `reportNumber`. Automatically checks street incident density (>10 incidents on same street) and triggers notifications service fail-safely.
- `GET /api/v1/incidents`: Filterable (status, category, streetAddress) and paginated query for ADMIN and AGENT.
- `GET /api/v1/incidents/my`: Returns incidents created by calling citizen.
- `GET /api/v1/incidents/assigned`: Returns incidents assigned to caller (agent or technician).
- `GET /api/v1/incidents/public/resolved`: Public paginated endpoint returning sanitized fields without reporter/user details.
- `GET /api/v1/incidents/:id`: Returns full details including notes and photos with pre-signed GET URLs. Enforces ownership: citizens can only read their own incidents, agents/technicians only assigned incidents, admins all.
- `PATCH /api/v1/incidents/:id/assign-agent` (ADMIN): Validates agent existence and transitions status `RECEIVED -> PENDING_VALIDATION`.
- `PATCH /api/v1/incidents/:id/validate` (AGENT): Validates status `PENDING_VALIDATION`, verifies caller assignment, updates status to `VALIDATED` or `REJECTED`, sets priority, and creates an audit `IncidentNote`.
- `PATCH /api/v1/incidents/:id/assign-technician` (ADMIN): Validates technician existence and transitions status `VALIDATED -> ASSIGNED`.
- `PATCH /api/v1/incidents/:id/progress` (TECHNICIAN): Enforces status transitions `ASSIGNED -> IN_PROGRESS -> RESOLVED`, verifies caller assignment, and creates an audit `IncidentNote`.
- Unit tests: Added 15 unit tests covering every status transition, invalid transition rejections (400), and RBAC ownership rejections (403). Total tests: 24 passed.

#### Decisions
- Non-matching status transitions throw `BadRequestException` with descriptive error messages.
- Audit `IncidentNote` records are automatically written whenever an incident is validated or progress is updated.

### Step 5: Media module ✅
- `POST /api/v1/media/presigned-upload-url`: Generates S3 pre-signed PUT upload URL with target key `incidents/${incidentId}/${uuid}.${ext}`. Validates content type (png, jpg, jpeg) and enforces incident existence and caller ownership.
- `POST /api/v1/media/confirm-upload`: Confirms direct upload completion and writes metadata (`IncidentPhoto`) to MySQL. Validates max file size limit (5 MB), mimeType, and namespace security check.
- `S3Service`: Implemented with AWS SDK v3 (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) supporting pre-signed upload URLs, pre-signed download URLs, and head-bucket reachability check.
- Unit tests: Added 5 unit tests for media generation, authorization checks, and validation (total 29 tests passing).

#### Decisions
- Maximum photo upload size enforced at 5 MB (5,242,880 bytes).
- Upload s3Key enforced to stay strictly within target incident namespace (`incidents/${incidentId}/`).

### Step 6: Notifications (SNS) ✅
- `NotificationsService`: Configured with AWS SDK v3 `@aws-sdk/client-sns`.
- Publishes SNS alert when incident density on the same street exceeds 10 incidents (`threshold: 10`).
- Skippable in local development when `AWS_SNS_TOPIC_ARN` is unset.
- Fully fail-safe: errors during SNS publishing are logged and never throw or interrupt incident creation.
- Unit tests: Added 5 unit tests in `src/modules/notifications/notifications.service.spec.ts` (total 34 tests passing).

#### Decisions
- Street matching normalizes case and trims whitespace.
- Alerts format message as structured JSON with event metadata.

### Step 7: Health module ✅
- `GET /api/v1/health`: Primary public ALB health check returning status UP, uptime in seconds, and timestamp. Returns HTTP 500 when simulated failure mode is active.
- `GET /api/v1/health/deep`: Verifies database connection (`SELECT 1`) and S3 storage accessibility (`HeadBucketCommand`). Returns 503 if database is disconnected.
- `POST /api/v1/health/simulate-fail`: Chaos engineering toggle endpoint protected with JWT authentication and `ADMIN` role.
- Unit tests: Added 5 unit tests for health endpoints and simulated failure scenarios (total 39 tests passing).

#### Decisions
- Simulated failure mode operates in-memory for testing resilience without modifying persistent database state.

## Pending Steps

- [ ] Step 8: Dockerfile + docker-compose
- [ ] Step 9: Tests

## Open Questions
_(none currently)_

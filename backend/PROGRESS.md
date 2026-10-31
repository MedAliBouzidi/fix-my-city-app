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

## Pending Steps

- [ ] Step 4: Incidents module
- [ ] Step 5: Media module
- [ ] Step 6: Notifications (SNS)
- [ ] Step 7: Health module
- [ ] Step 8: Dockerfile + docker-compose
- [ ] Step 9: Tests

## Open Questions
_(none currently)_

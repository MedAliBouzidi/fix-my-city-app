# FixMyCity Backend Verification Report

**Date:** November 1, 2026  
**Agent:** Agent 1 (Backend Verifier)  
**System:** FixMyCity Municipal Incident-Reporting Platform Backend API  
**Technology Stack:** NestJS 10, TypeORM, MySQL 8.0, TypeScript 5, AWS SDK v3 (S3 & SNS), Docker / Podman  

---

## 1. Executive Summary & Verification Status

The FixMyCity backend API was comprehensively audited, verified, and hardened against the system specifications defined in `backend/README.md` and the project requirements.

- **Build & Compilation:** Successful (`npm run build` exits 0 with zero errors).
- **Linting & Code Quality:** Resolved missing ESLint dependencies and configurations; `npm run lint` exits 0 with zero warnings/errors.
- **Database & Migrations:** Verified MySQL 8.0 container `app_mysql_1` (port 3306), database `fixmycity`, TypeORM migration status verified (up-to-date), and seed script operational.
- **Unit Tests:** 7 test suites, 42 tests passing 100% (`npm test`).
- **End-to-End Tests:** Expanded from 4 to 26 comprehensive integration steps covering the full lifecycle (Register -> Login -> Create Incident -> Upload Media -> Assign Agent -> Validate -> Assign Technician -> In Progress -> Resolved -> Public Resolved -> Health & Fault Simulation) with mocked AWS services.
- **Docker / Podman Image:** Multi-stage production container verified; successfully built `fixmycity-backend:test` via `podman build`.
- **API Contracts:** Fully audited against frontend expectations; verified role-based access control, ownership enforcement, error handling, and Swagger documentation.

---

## 2. Environment & Infrastructure Verification

### 2.1 Dependencies & Linting
- **Issue Discovered:** The `package.json` script defined `"lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"`, but `eslint` and `@typescript-eslint` plugins were missing from `devDependencies`, and no `.eslintrc.js` configuration file was present.
- **Fix Applied:** Installed `eslint@^8.57.0`, `@typescript-eslint/parser@^7.0.0`, and `@typescript-eslint/eslint-plugin@^7.0.0`, and authored `.eslintrc.js` conforming to NestJS TypeScript standards.
- **Unused Variables Fixed:**
  - `src/modules/auth/auth.service.spec.ts`: Removed unused `jwtService` assignment warning by asserting `expect(jwtService.signAsync).toHaveBeenCalled()`.
  - `src/modules/notifications/notifications.service.spec.ts`: Removed unused `configService` assignment.
- **Verification:** `npm run lint` runs cleanly with 0 errors and 0 warnings.

### 2.2 MySQL 8.0 Database
- **Container Status:** Verified `app_mysql_1` is running and healthy:
  ```text
  Image: docker.io/library/mysql:8.0
  Ports: 0.0.0.0:3306->3306/tcp
  Database: fixmycity
  User: appuser
  ```
- **Migrations:** Executed `npm run typeorm:migration:run` against `src/data-source.ts`. Output confirmed: `No migrations are pending`.
- **Seeding:** Executed `npm run seed`. Successfully populated / updated default administrative and operational personas:
  - `admin@fixmycity.local` (`ADMIN`)
  - `agent@fixmycity.local` (`AGENT`)
  - `technician@fixmycity.local` (`TECHNICIAN`)
  - `citizen@fixmycity.local` (`CITIZEN`)

### 2.3 Live Server & Health Endpoints
The backend HTTP server runs on port 4000:
- `GET /api/v1/health`: Returns HTTP 200 `{"status":"UP","uptimeSeconds":...,"timestamp":"..."}`
- `GET /api/v1/health/deep`: Queries MySQL `SELECT 1` and checks S3 bucket reachability. Returns HTTP 200 `{"status":"UP","database":"CONNECTED","storage":"..."}`.
- Swagger Docs: Verified accessible at `http://localhost:4000/api/docs/` with HTTP 200 OK when `NODE_ENV !== 'production'`.

---

## 3. Contract Audit & Endpoint Verification

| Endpoint | Method | RBAC Roles | Request Body / Query Params | Expected Response | Status |
|---|---|---|---|---|---|
| `/api/v1/health` | GET | Public | None | `{"status":"UP","uptimeSeconds":...,"timestamp":...}` | Verified |
| `/api/v1/health/deep` | GET | Public | None | `{"status":"UP","database":"CONNECTED","storage":...}` | Verified |
| `/api/v1/health/simulate-fail` | POST | ADMIN (JWT required) | None | `{"message":"...","simulatedFailureActive":boolean}` | Verified |
| `/api/v1/auth/register` | POST | Public | `RegisterDto` (`email`, `password`, `firstName`, `lastName`, `role?`) | `{"message":"User registered successfully","userId":"..."}` | Verified |
| `/api/v1/auth/login` | POST | Public | `LoginDto` (`email`, `password`) | `{"accessToken":"...","user":{id,email,role,firstName,lastName}}` | Verified |
| `/api/v1/users` | GET | ADMIN | `?role=AGENT\|TECHNICIAN` | `UserSummary[]` without password fields | Verified |
| `/api/v1/incidents` | POST | CITIZEN, ADMIN | `CreateIncidentDto` (`title`, `description`, `category`, `streetAddress`, `latitude`, `longitude`) | `{"id":"...","reportNumber":...,"status":"RECEIVED","priority":"MEDIUM",...}` | Verified |
| `/api/v1/incidents` | GET | ADMIN, AGENT | `QueryIncidentsDto` (`status`, `category`, `streetAddress`, `page`, `limit`) | `{"data":[...],"total":...,"page":...,"limit":...}` | Verified |
| `/api/v1/incidents/my` | GET | CITIZEN | None | `Incident[]` filtered by caller's `reporterId` | Verified |
| `/api/v1/incidents/assigned` | GET | AGENT, TECHNICIAN | None | `Incident[]` filtered by `agentId` or `technicianId` | Verified |
| `/api/v1/incidents/public/resolved`| GET | Public | `?page=&limit=` | `{"data":[...],"total":...,"page":...,"limit":...}` | Verified |
| `/api/v1/incidents/:id` | GET | Authenticated | Param: `id` (UUID) | Incident entity with `photos` (including pre-signed GET `url`) and `notes` | Verified |
| `/api/v1/incidents/:id/assign-agent` | PATCH | ADMIN | `AssignAgentDto` (`agentId`) | Updated incident with status `PENDING_VALIDATION` | Verified |
| `/api/v1/incidents/:id/validate` | PATCH | AGENT | `ValidateIncidentDto` (`isValid`, `priority`, `note`) | Status `VALIDATED` or `REJECTED`, creates `IncidentNote` | Verified |
| `/api/v1/incidents/:id/assign-technician` | PATCH | ADMIN | `AssignTechnicianDto` (`technicianId`) | Updated incident with status `ASSIGNED` | Verified |
| `/api/v1/incidents/:id/progress` | PATCH | TECHNICIAN | `ProgressIncidentDto` (`status`, `reportNote`) | Status `IN_PROGRESS` or `RESOLVED`, creates `IncidentNote` | Verified |
| `/api/v1/media/presigned-upload-url` | POST | Authenticated | `PresignedUploadDto` (`incidentId`, `fileName`, `contentType`) | `{"uploadUrl":"...","s3Key":"..."}` | Verified |
| `/api/v1/media/confirm-upload` | POST | Authenticated | `ConfirmUploadDto` (`incidentId`, `s3Key`, `fileName`, `fileSizeBytes`, `mimeType`) | `IncidentPhoto` entity | Verified |

---

## 4. Business Rules & Security Audit

1. **Status Transition State Machine:**
   - Sequence: `RECEIVED` -> `PENDING_VALIDATION` -> `VALIDATED` (or `REJECTED`) -> `ASSIGNED` -> `IN_PROGRESS` -> `RESOLVED`.
   - Any attempt to violate transition rules (e.g. assigning technician to a `RECEIVED` or `PENDING_VALIDATION` incident, or progressing directly from `ASSIGNED` to `RESOLVED`) strictly returns HTTP 400 Bad Request.
2. **Ownership & Access Control:**
   - **CITIZEN:** Restricted to reading only incidents where `reporterId === caller.id` (`GET /api/v1/incidents/:id` and `/api/v1/incidents/my`); attempting to access another user's incident returns HTTP 403 Forbidden. Restricted to uploading media only to own incidents.
   - **AGENT:** Can only validate incidents where `agentId === caller.id`; attempting validation on non-assigned incidents returns HTTP 403 Forbidden.
   - **TECHNICIAN:** Can only update progress on incidents where `technicianId === caller.id`; non-assigned incidents return HTTP 403 Forbidden.
3. **Public Registration Role Constraint:**
   - Enforced by both `RegisterDto` (`@IsIn([Role.CITIZEN])`) and `AuthService.register()` (`role: Role.CITIZEN`). Public registration cannot register staff or admin accounts.
4. **Password Hash Privacy:**
   - `User.password` has `select: false` in TypeORM entity definition.
   - `AuthService.login()` explicitly excludes the password from returned user object.
   - `UsersService.findStaffUsers()` selects only `id, firstName, lastName, email, role`.
5. **Rate Limiting:**
   - `@nestjs/throttler` configured in `AppModule` and guarded on `AuthController`:
     - `/auth/register`: 5 requests / 60s
     - `/auth/login`: 10 requests / 60s
6. **Street Density Fail-Safe SNS Alerts:**
   - In `IncidentsService.create()`, an incident count by street address is performed. If >10 incidents exist on that street, `NotificationsService.checkAndAlertStreetIncidents()` is invoked.
   - Wrapped in a `try...catch` block so failures (e.g., unset `AWS_SNS_TOPIC_ARN` or AWS network timeouts) will never disrupt incident submission.
7. **S3 Media Validation:**
   - Content types strictly validated against whitelist: `image/jpeg`, `image/jpg`, `image/png`.
   - File size limited to maximum 5MB (5,242,880 bytes) in `ConfirmUploadDto`.
   - Target S3 key verified to prevent directory traversal or namespace impersonation (`starts with incidents/:incidentId/`).
8. **Simulated Failure Endpoint:**
   - `POST /api/v1/health/simulate-fail` is protected by `JwtAuthGuard`, `RolesGuard`, and `@Roles(Role.ADMIN)`. Unauthenticated requests yield 401, non-admin requests yield 403.
9. **Environment & Secrets Hygiene:**
   - `.env` is listed in `.gitignore`.
   - `.env.example` contains only non-sensitive default placeholders.

---

## 5. Test Suite Expansion & Results

### 5.1 Unit Tests (`npm test`)
Added unit test suite `src/modules/users/users.service.spec.ts` to test staff filtering.
All 7 unit test suites pass:
```text
PASS src/common/guards/roles.guard.spec.ts
PASS src/modules/notifications/notifications.service.spec.ts
PASS src/modules/health/health.service.spec.ts
PASS src/modules/users/users.service.spec.ts
PASS src/modules/auth/auth.service.spec.ts
PASS src/modules/media/media.service.spec.ts
PASS src/modules/incidents/incidents.service.spec.ts

Test Suites: 7 passed, 7 total
Tests:       42 passed, 42 total
Snapshots:   0 total
```

### 5.2 End-to-End Tests (`npm run test:e2e`)
Expanded `backend/test/app.e2e-spec.ts` from 4 basic steps to 26 comprehensive end-to-end integration tests with AWS mocks (S3 and SNS):
- **Phase 1 (Auth & Creation):** Citizen registration, login, incident creation (RECEIVED), retrieval via `/incidents/my`.
- **Phase 2 (Media):** Pre-signed upload URL generation, metadata confirmation, verification of pre-signed GET download URL in incident details.
- **Phase 3 (Agent Assignment & Inspection):** Admin login, staff agent discovery (`GET /users?role=AGENT`), agent assignment (`PENDING_VALIDATION`), rejection of premature technician assignment (HTTP 400), agent login, `/incidents/assigned` inspection, on-site validation (`VALIDATED`), and `IncidentNote` generation.
- **Phase 4 (Technician Assignment & Repair):** Technician staff discovery (`GET /users?role=TECHNICIAN`), technician assignment (`ASSIGNED`), technician login, rejection of invalid transition skipping (`ASSIGNED` -> `RESOLVED` directly returns 400), progress to `IN_PROGRESS` with audit note, and completion to `RESOLVED` with audit note.
- **Phase 5 (Public & Audit):** Verification that the resolved incident is exposed via `GET /api/v1/incidents/public/resolved`, verification of multiple audit notes in `GET /api/v1/incidents/:id`.
- **Phase 6 (Observability & Chaos Testing):** `GET /health` (200 UP), `GET /health/deep` (200 UP, DB CONNECTED, S3 REACHABLE), RBAC validation for `/health/simulate-fail` (401 unauthenticated, 403 citizen), toggle simulated failure to trigger 500 on `/health`, and toggle off returning 200 UP.

```text
Test Suites: 1 passed, 1 total
Tests:       26 passed, 26 total
Snapshots:   0 total
Time:        10.537 s
```

---

## 6. Dockerfile & Container Verification

- **Inspection:** `backend/Dockerfile` verified:
  - Multi-stage build (`node:20-alpine AS builder`, `node:20-alpine AS runner`).
  - Production optimizations (`npm ci --only=production`, `npm cache clean --force`).
  - Least privilege: creates dedicated `nodejs:nestjs` system group/user (UID/GID 1001) and executes under `USER nestjs`.
  - Built-in `HEALTHCHECK`: `wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1`.
- **Podman Build Verification:**
  - Command: `podman build -t fixmycity-backend:test backend/`
  - Output: Successfully created and tagged image `localhost/fixmycity-backend:test` (271 MB).

---

## 7. Frontend Integration Contract Notes

For the frontend team and Agent 2, the following contract points are verified and active:
1. **API Base URL:** Default local API is served with `/api/v1` prefix: `http://localhost:4000/api/v1`.
2. **Staff Retrieval:** Use `GET /api/v1/users?role=AGENT` or `GET /api/v1/users?role=TECHNICIAN` (Admin bearer token required).
3. **Assigned Incidents:** Staff (Agent/Technician) should call `GET /api/v1/incidents/assigned` to fetch their active queue.
4. **Public Landing Feed:** Unauthenticated citizens view resolved reports via `GET /api/v1/incidents/public/resolved?page=1&limit=20`.
5. **Photo Rendering:** In incident detail response (`GET /api/v1/incidents/:id`), each photo object contains a populated temporary pre-signed `url` property for direct secure image rendering.
6. **Error Responses:** Validation errors from `ValidationPipe` return `{ statusCode: 400, message: string[], error: "Bad Request" }`. `apiFetch` in frontend correctly extracts these into `validationErrors`.

---

STATUS: DONE

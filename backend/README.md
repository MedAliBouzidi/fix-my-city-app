# FixMyCity Backend API (NestJS + TypeORM + MySQL)

---

## 1. Module Overview & Technical Architecture

The backend application is built using the **NestJS** framework, written in TypeScript, using **TypeORM** as its Object-Relational Mapper (ORM), and backed by **Amazon RDS MySQL 8.0**. In production, the application runs inside a Docker container on EC2 instances (t3.micro) across private subnets behind an Application Load Balancer (ALB).

To protect system resources on t3.micro instances, the API implements **S3 Pre-signed URLs** for media storage, ensuring binary file transfers bypass the API process and ALB entirely.

### Architectural Tenets

- **Statelessness:** No session state or file assets stored on local container disk.
- **Role-Based Access Control (RBAC):** JWT-driven guards managing `CITIZEN`, `ADMIN`, `AGENT`, and `TECHNICIAN` personas.
- **Observability:** Native health endpoints integrating with ALB target health checks and CloudWatch Metrics.
- **Fault Simulation:** Dedicated endpoints supporting chaos engineering and Week 13 exam demonstrations.

---

## 2. Directory Structure

```text
backend/
├── src/
│   ├── main.ts                       # Bootstrap, validation pipe, global prefix /api/v1, CORS
│   ├── app.module.ts                 # Root module loading TypeORM, Config, and domain modules
│   ├── common/                       # Guards, decorators, and interceptors
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts          # Roles decorator
│   │   │   └── current-user.decorator.ts   # CurrentUser extraction
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts           # Passport JWT validation
│   │   │   └── roles.guard.ts              # RBAC authorization enforcement
│   │   └── filters/
│   │       └── http-exception.filter.ts    # Centralized JSON error formatting
│   ├── config/
│   │   ├── database.config.ts        # TypeORM MySQL connection options
│   │   └── aws.config.ts             # S3 and SNS configuration via IAM LabRole
│   ├── entities/                     # TypeORM database entities
│   │   ├── user.entity.ts
│   │   ├── incident.entity.ts
│   │   ├── incident-photo.entity.ts
│   │   └── incident-note.entity.ts
│   └── modules/                      # Feature domain modules
│       ├── auth/                     # Registration, login, JWT strategy
│       ├── incidents/                # Incident management lifecycle
│       ├── media/                    # S3 pre-signed URL generation and confirmation
│       ├── notifications/            # Amazon SNS publish service
│       └── health/                   # /api/v1/health, /deep, and /simulate-fail
├── test/                             # Unit and E2E test suites
├── Dockerfile                        # Multi-stage production build (Node 20 Alpine)
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Project dependencies and migration scripts
└── .env.example                      # Environment variable definitions
```

---

## 3. Environment Variables Configuration

Create a `.env` file in the backend root directory based on this reference definition:

```env
# Server Runtime
PORT=4000
NODE_ENV=production

# Database (Amazon RDS MySQL)
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=appuser
DATABASE_PASSWORD=Password123
DATABASE_NAME=fixmycity
DATABASE_SYNCHRONIZE=false
DATABASE_LOGGING=false

# Authentication
JWT_SECRET="XKcxu/popChVPyYhZ2vYfwH43ppVQglyoUCyJuTQnT0="
JWT_EXPIRATION=86400s

# AWS Integration (Picked up via IAM LabRole in EC2)
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=fixmycity-media-storage-production
AWS_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:fixmycity-alerts
```

---

## 4. Local Installation & Development Workflow

Execute the following commands sequentially to spin up a local development environment:

```bash
# 1. Install dependencies
npm install

# 2. Start local MySQL database using Docker
docker run --name fixmycity-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=fixmycity \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=apppassword \
  -p 3306:3306 -d mysql:8.0

# 3. Run TypeORM database schema synchronization / migrations
npm run typeorm:migration:run

# 4. Start local development server with hot-reload
npm run start:dev

# 5. Access the API
curl localhost:4000/api/v1/health
```

---

## 5. Comprehensive API Specification (`/api/v1`)

### 5.1 System Health & Fault Testing

#### `GET /api/v1/health`

- **Description:** Primary ALB Target Group health check endpoint.
- **Access:** Public

**Success Response (200 OK):**

```json
{
  "status": "UP",
  "uptimeSeconds": 1420,
  "timestamp": "2026-10-19T01:00:00.000Z"
}
```

- **Error Response (500 Internal Server Error):** Returned when fault simulation is active.

#### `GET /api/v1/health/deep`

- **Description:** Active verification of database connectivity and S3 bucket accessibility.
- **Access:** Public

**Success Response (200 OK):**

```json
{
  "status": "UP",
  "database": "CONNECTED",
  "storage": "REACHABLE",
  "timestamp": "2026-10-19T01:00:00.000Z"
}
```

#### `POST /api/v1/health/simulate-fail`

- **Description:** Toggles in-memory failure mode to force `/health` to return HTTP 500 for grading chaos demonstrations.
- **Access:** Internal / Admin

**Success Response (200 OK):**

```json
{
  "message": "Simulated failure mode toggled",
  "simulatedFailureActive": true
}
```

---

### 5.2 Authentication & User Profiles

#### `POST /api/v1/auth/register`

- **Description:** Creates a new user account.
- **Access:** Public

**Request Body:**

```json
{
  "email": "citizen@example.com",
  "password": "SecurePassword123!",
  "firstName": "Mohamed",
  "lastName": "Ali",
  "role": "CITIZEN"
}
```

**Success Response (201 Created):**

```json
{
  "message": "User registered successfully",
  "userId": "b4a3a697-bca8-4e8c-8be9-e0e6c64ce1a1"
}
```

#### `POST /api/v1/auth/login`

- **Description:** Authenticates user credentials and issues a JWT token.
- **Access:** Public

**Request Body:**

```json
{
  "email": "citizen@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "b4a3a697-bca8-4e8c-8be9-e0e6c64ce1a1",
    "email": "citizen@example.com",
    "role": "CITIZEN",
    "firstName": "Mohamed",
    "lastName": "Ali"
  }
}
```

---

### 5.3 Incident Management Core

#### `POST /api/v1/incidents`

- **Description:** Submits a new incident report. Automatically checks if more than 10 reports exist on the same street to publish an SNS alert.
- **Access:** Authenticated (`CITIZEN`, `ADMIN`)

**Request Body:**

```json
{
  "title": "Severe Pothole on Avenue Habib Bourguiba",
  "description": "Deep hole in the middle lane causing vehicular damage.",
  "category": "ROADS",
  "streetAddress": "Avenue Habib Bourguiba, Tunis",
  "latitude": 36.8008,
  "longitude": 10.1800
}
```

**Success Response (201 Created):**

```json
{
  "id": "e672f0db-2b47-497d-bfa2-fcbbfa66782d",
  "reportNumber": 1042,
  "title": "Severe Pothole on Avenue Habib Bourguiba",
  "category": "ROADS",
  "status": "RECEIVED",
  "priority": "MEDIUM",
  "createdAt": "2026-10-19T01:05:00.000Z"
}
```

#### `GET /api/v1/incidents`

- **Description:** Filterable, paginated query of incidents.
- **Access:** Authenticated (`ADMIN`, `AGENT`)
- **Query Parameters:** `status`, `category`, `streetAddress`, `page`, `limit`

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": "e672f0db-2b47-497d-bfa2-fcbbfa66782d",
      "reportNumber": 1042,
      "title": "Severe Pothole",
      "category": "ROADS",
      "status": "RECEIVED",
      "priority": "MEDIUM",
      "streetAddress": "Avenue Habib Bourguiba, Tunis"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### `GET /api/v1/incidents/my`

- **Description:** Retrieves all incidents created by the calling citizen.
- **Access:** Authenticated (`CITIZEN`)
- **Success Response (200 OK):** List of user incidents.

#### `GET /api/v1/incidents/:id`

- **Description:** Detailed incident report including photos and audit notes.
- **Access:** Authenticated

**Success Response (200 OK):**

```json
{
  "id": "e672f0db-2b47-497d-bfa2-fcbbfa66782d",
  "reportNumber": 1042,
  "title": "Severe Pothole on Avenue Habib Bourguiba",
  "description": "Deep hole in the middle lane causing vehicular damage.",
  "category": "ROADS",
  "status": "RECEIVED",
  "priority": "MEDIUM",
  "streetAddress": "Avenue Habib Bourguiba, Tunis",
  "latitude": 36.8008,
  "longitude": 10.1800,
  "photos": [],
  "notes": [],
  "createdAt": "2026-10-19T01:05:00.000Z"
}
```

---

### 5.4 Administrative & Operational Workflow

#### `PATCH /api/v1/incidents/:id/assign-agent`

- **Description:** Assigns an on-site inspection agent to verify report validity.
- **Access:** `ADMIN`

**Request Body:**

```json
{
  "agentId": "6c4591a2-6eb6-4dae-a4b5-fcfbfadcb882"
}
```

- **Success Response (200 OK):** Incident status updated to `PENDING_VALIDATION`.

#### `PATCH /api/v1/incidents/:id/validate`

- **Description:** Field Agent submits inspection results, validating or rejecting the issue and assigning priority.
- **Access:** `AGENT`

**Request Body:**

```json
{
  "isValid": true,
  "priority": "HIGH",
  "note": "Pothole confirmed; 40cm wide and 15cm deep. High traffic hazard."
}
```

- **Success Response (200 OK):** Incident status updated to `VALIDATED` (or `REJECTED` if invalid).

#### `PATCH /api/v1/incidents/:id/assign-technician`

- **Description:** Assigns a repair technician to resolve a validated incident.
- **Access:** `ADMIN`

**Request Body:**

```json
{
  "technicianId": "8f9024f1-3ec7-46ea-9a80-e8f0003bfa59"
}
```

- **Success Response (200 OK):** Incident status updated to `ASSIGNED`.

#### `PATCH /api/v1/incidents/:id/progress`

- **Description:** Technician updates status to `IN_PROGRESS` or `RESOLVED` with completion details.
- **Access:** `TECHNICIAN`

**Request Body:**

```json
{
  "status": "RESOLVED",
  "reportNote": "Pothole filled with cold mix asphalt and asphalt compacted."
}
```

- **Success Response (200 OK):** Incident status updated to `RESOLVED`.

---

### 5.5 Media Upload Workflow (S3 Pre-signed URLs)

#### `POST /api/v1/media/presigned-upload-url`

- **Description:** Generates a temporary pre-signed PUT URL for direct client-to-S3 upload.
- **Access:** Authenticated

**Request Body:**

```json
{
  "incidentId": "e672f0db-2b47-497d-bfa2-fcbbfa66782d",
  "fileName": "pothole_evidence.jpg",
  "contentType": "image/jpeg"
}
```

**Success Response (200 OK):**

```json
{
  "uploadUrl": "presigned_s3_put_url_string",
  "s3Key": "incidents/e672f0db-2b47-497d-bfa2-fcbbfa66782d/928c038f-a9ce-4458-94ef-650a8037f374.jpg"
}
```

#### `POST /api/v1/media/confirm-upload`

- **Description:** Confirms direct upload completion and writes metadata to MySQL.
- **Access:** Authenticated

**Request Body:**

```json
{
  "incidentId": "e672f0db-2b47-497d-bfa2-fcbbfa66782d",
  "s3Key": "incidents/e672f0db-2b47-497d-bfa2-fcbbfa66782d/928c038f-a9ce-4458-94ef-650a8037f374.jpg",
  "fileName": "pothole_evidence.jpg",
  "fileSizeBytes": 1450280,
  "mimeType": "image/jpeg"
}
```

- **Success Response (201 Created):** Returns confirmed `IncidentPhoto` entity.

---

## 6. Role-Based Access Control Summary

| Endpoint | HTTP Method | Allowed Roles | Description |
|---|---|---|---|
| `/api/v1/health` | GET | Public | Primary ALB Target Group health check |
| `/api/v1/health/deep` | GET | Public | DB and S3 availability check |
| `/api/v1/health/simulate-fail` | POST | Internal / Admin | Chaos mode toggle |
| `/api/v1/auth/register` | POST | Public | Account creation |
| `/api/v1/auth/login` | POST | Public | Credential validation & token issue |
| `/api/v1/incidents` | POST | CITIZEN, ADMIN | Submit incident report |
| `/api/v1/incidents` | GET | ADMIN, AGENT | List & filter incident reports |
| `/api/v1/incidents/my` | GET | CITIZEN | List user's submitted incidents |
| `/api/v1/incidents/:id` | GET | Authenticated | Retrieve incident details |
| `/api/v1/incidents/:id/assign-agent` | PATCH | ADMIN | Assign agent to report |
| `/api/v1/incidents/:id/validate` | PATCH | AGENT | Validate or reject report |
| `/api/v1/incidents/:id/assign-technician` | PATCH | ADMIN | Assign technician for repair |
| `/api/v1/incidents/:id/progress` | PATCH | TECHNICIAN | Update repair progress |
| `/api/v1/media/presigned-upload-url` | POST | Authenticated | Request direct S3 upload URL |
| `/api/v1/media/confirm-upload` | POST | Authenticated | Finalize upload & persist metadata |

---

## 7. Docker Containerization & Cloud Deployment

### Production Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

### Build & Run Commands

```bash
# Build production Docker image
docker build -t fixmycity-backend:latest .

# Run container exposing port 4000 with environment configuration
docker run -d --name backend-api -p 4000:4000 --env-file .env fixmycity-backend:latest
```
# FixMyCity Frontend Application

Production-grade documentation for the Next.js and Tailwind CSS frontend application layer.

---

## 1. Application Overview & Architecture

The frontend for FixMyCity is built using **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**. It acts as the single presentation interface for Citizens, Municipal Administrators, Field Agents, and Repair Technicians.

In production, the application is compiled into a standalone Node.js server running inside Docker on port `3000`, alongside the NestJS backend container on private EC2 instances.

### Key Functional Portals

- **Citizen Portal:** Public landing page, report submission form with GPS coordinates, camera/photo upload via S3 Pre-signed URLs, and personal incident tracker.
- **Municipal Admin Portal:** Centralized incident dashboard, filtering by street/category/status, field agent dispatching for isolated reports, and technician repair assignments.
- **Field Agent Portal:** Mobile-optimized inspection view allowing on-site agents to validate/reject reported issues, verify GPS positioning, and designate repair urgency.
- **Technician Work Portal:** Field repair checklist where technicians mark issues as in-progress or resolved with completion notes.

---

## 2. Directory Structure

```text
frontend/
├── src/
│   ├── app/                      # Next.js App Router root
│   │   ├── layout.tsx            # Global root layout, navbar, and providers
│   │   ├── page.tsx              # Landing page with incident map/feed
│   │   ├── login/
│   │   │   └── page.tsx          # Authentication (Citizen & Staff login)
│   │   ├── register/
│   │   │   └── page.tsx          # Citizen registration
│   │   ├── report/
│   │   │   └── page.tsx          # Incident submission form with photo upload
│   │   ├── my-reports/
│   │   │   └── page.tsx          # Citizen personal incident tracking
│   │   ├── admin/
│   │   │   └── page.tsx          # Administrative incident management dashboard
│   │   └── field/
│   │       └── page.tsx          # Agent validation & Technician maintenance interface
│   ├── components/               # Reusable UI components
│   │   ├── Navbar.tsx            # Role-aware responsive navigation bar
│   │   ├── IncidentCard.tsx      # Card view displaying category, status badge, and photo
│   │   ├── StatusBadge.tsx       # Colored status chips (RECEIVED, VALIDATED, RESOLVED)
│   │   ├── PriorityBadge.tsx     # Priority badges (LOW, MEDIUM, HIGH, CRITICAL)
│   │   ├── PhotoUploader.tsx     # Direct S3 binary PUT uploader using Pre-signed URLs
│   │   └── LocationPicker.tsx    # Geolocation picker capturing latitude and longitude
│   ├── lib/                      # Core utilities and client libraries
│   │   ├── api.ts                # Typed Axios/Fetch HTTP client configured with JWT interceptors
│   │   ├── auth.ts               # Local storage token extraction and session decoder
│   │   └── constants.ts          # Enums for categories, statuses, and API route paths
│   └── types/                    # TypeScript contract interfaces matching backend entities
│       ├── incident.ts
│       ├── user.ts
│       └── media.ts
├── public/                       # Static visual assets, icons, and logos
├── Dockerfile                    # Next.js multi-stage standalone runner
├── tailwind.config.ts            # Tailwind utility configurations
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and build scripts
└── .env.local.example            # Local environment variable template
```

---

## 3. Environment Variables Configuration

Create a `.env.local` file in the project root directory:

```env
# URL of the backend API (NestJS)
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# Frontend Port
PORT=3000
```

---

## 4. Local Installation & Development Workflow

Execute the following commands sequentially in your terminal:

```bash
# 1. Install dependencies
npm install

# 2. Run local development server with hot-reload
npm run dev

# 3. Access frontend application
# Open your browser at localhost:3000

# 4. Production build check
npm run build
npm run start
```

---

## 5. UI Views & Component Specifications

### 5.1 Landing Page & Citizen Incident Feed (`/`)

- **Purpose:** Public view allowing visitors to see recently resolved incidents and community reports across the city.
- **Actions:**
  - Submit a new incident (redirects to `/report`).
  - Track an existing incident by report number.
  - Access Login / Register views.

### 5.2 Citizen Report Submission Form (`/report`)

- **Purpose:** Primary intake interface for public degradation reports.
- **Fields:**
  - **Title:** Text input (e.g., *Broken streetlight on Rue de Paris*).
  - **Category:** Dropdown selector (`ROADS`, `LIGHTING`, `WASTE`, `INFRASTRUCTURE`).
  - **Street Address:** Text input with auto-complete capabilities.
  - **GPS Coordinates:** Detect location button capturing `navigator.geolocation`.
  - **Photo Attachment:** File selector supporting PNG, JPG, and JPEG up to 10MB.
- **Direct S3 Upload Lifecycle:**
  1. User selects an image file inside the `PhotoUploader` component.
  2. Component requests a pre-signed URL from the backend via `POST /api/v1/media/presigned-upload-url`.
  3. Frontend performs a direct binary HTTP `PUT` request to `uploadUrl` with `image/jpeg` content type.
  4. Upon `200 OK` from S3, the frontend calls `POST /api/v1/media/confirm-upload` to associate the S3 key with the report.

### 5.3 Citizen My Reports (`/my-reports`)

- **Purpose:** Logged-in citizen view displaying submitted issues and live statuses.
- **Features:**
  - Tabbed filtering: Active, In Progress, Resolved.
  - Visual timeline indicating inspection status, validation, and technician assignment.

### 5.4 Municipal Admin Dashboard (`/admin`)

- **Purpose:** Operations center for municipal supervisors.
- **Key Capabilities:**
  - **Incident queue:** Tabular view with search, street filter, and category filter.
  - **High-Density Street Alerts:** Visual warning banner when more than 10 incidents exist on the same street.
  - **Action Panel:**
    - **Assign Agent:** Modal selector listing available agents to inspect unconfirmed reports.
    - **Assign Technician:** Selector designating a repair crew once an incident is marked `VALIDATED`.

### 5.5 Field Agent & Technician Portal (`/field`)

- **Purpose:** Fast mobile-first layout designed for workers on smartphones or tablets in the field.
- **Agent Role Tab:**
  - Lists assigned incidents requiring validation.
  - **Inspection Actions:** Validate Issue button, Reject Issue button, Priority radio buttons (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and field notes input.
- **Technician Role Tab:**
  - Lists assigned repairs.
  - **Repair Actions:** Start Work (sets status to `IN_PROGRESS`), Mark Complete (sets status to `RESOLVED` and uploads repair photo evidence).

---

## 6. Docker Containerization & Cloud Deployment

### Production Dockerfile (Next.js Standalone Build)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### Build & Run Commands

```bash
# Build production image
docker build -t fixmycity-frontend:latest .

# Run container exposing port 3000
docker run -d --name frontend-app -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=localhost:4000/api/v1 \
  fixmycity-frontend:latest
```
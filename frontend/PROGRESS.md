# FixMyCity Frontend — Progress Tracker

## Completed Steps

### Step 1: Scaffold ✅
- Next.js 14 (App Router) initialized with TypeScript strict mode, Tailwind CSS, ESLint, and `src/` directory.
- `next.config.mjs` configured with `output: 'standalone'` and remote image patterns.
- Tailwind CSS design tokens added for all incident statuses (RECEIVED, PENDING_VALIDATION, VALIDATED, REJECTED, ASSIGNED, IN_PROGRESS, RESOLVED) and priorities (LOW, MEDIUM, HIGH, CRITICAL).
- Environment configurations: `.env.example` created with `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` and `.env*` added to `.gitignore`.
- Created `.dockerignore` and `.eslintrc.json`.

#### Decisions
- Used Tailwind extended colors for status and priority semantic tokens (`bg`, `text`, `border`) to ensure consistent badges and accessible contrast throughout all portals.
- Configured Next.js standalone output to allow minimal Docker production images.

### Step 2: Types, API client, and Validations ✅
- Created TypeScript interfaces matching backend models and DTOs: `user.ts`, `media.ts`, `incident.ts`, and index exports.
- Created `constants.ts` for routes, roles, statuses, categories, priorities, badges, and user-facing labels.
- Implemented `auth.ts` helper for SSR-safe token storage and JWT payload decoding with expiration checking.
- Implemented `api.ts` with centralized `ApiError` normalization, JWT header injection, automatic 401 token clearing & redirect, binary direct S3 PUT with progress reporting, and full endpoint methods.
- Implemented comprehensive `validations.ts` using Zod for login, register, incident creation, validation, assignment, and progress reporting.

#### Decisions
- Capped photo uploads at 5MB in validation to match backend S3 max limit.
- Provided fallback URL `http://localhost:4000/api/v1` when `NEXT_PUBLIC_API_URL` is omitted.

### Step 3: Auth and Layout ✅
- Implemented `AuthProvider` context in `src/context/AuthContext.tsx` with `user`, `token`, `loading`, `login`, `register`, `logout`, and role-based redirect resolution.
- Created `RouteGuard` client component in `src/components/RouteGuard.tsx` ensuring unauthenticated requests redirect to `/login` and users accessing prohibited views redirect to their authorized portal.
- Implemented responsive, role-aware `Navbar` in `src/components/Navbar.tsx` featuring dynamic links based on user role (Citizen, Admin, Agent, Technician), mobile navigation drawer, and user session badge with logout.
- Configured root layout in `src/app/layout.tsx` wrapping the application with `AuthProvider` and standard header/footer.
- Created citizen and staff `/login` page with Zod validation, credential error handling, expired session alerts, and auto-redirect.
- Created `/register` page strictly creating CITIZEN accounts with real-time password complexity checklist and conflict resolution.

#### Decisions
- Automatically logged user in upon citizen registration to streamline onboarding straight to `/my-reports`.
- Staff accounts are restricted from public registration, reinforced by descriptive UI notes and backend RBAC.

### Step 4: Shared Components ✅
- Implemented accessible, semantic badge components: `StatusBadge.tsx` (using status classes and labels) and `PriorityBadge.tsx` (with priority icons and styling).
- Implemented `IncidentCard.tsx` with photo preview, report number tag, responsive layout, and action slot.
- Implemented reusable feedback components: `Spinner.tsx` (custom sizes), `EmptyState.tsx` (with icon and action trigger), `ErrorState.tsx` (with retry handler), `Modal.tsx` (accessible dialog with escape/backdrop dismiss and body scroll prevention), and `Toast.tsx` (with auto-dismissing toast notifications and `useToast` hook).
- Integrated `ToastProvider` into root layout.

#### Decisions
- Maintained plain text rendering for all incident text to protect against injection/XSS.
- Wrapped modals with accessible `aria-modal="true"` dialog semantics and backdrop dismiss for smooth UX.

### Step 5: Landing Page (/) ✅
- Built public landing page in `src/app/page.tsx` featuring hero section, civic action CTAs, and a report number tracking lookup.
- Implemented public feed fetching from `GET /incidents/public/resolved` with pagination / load-more handling, loading spinner, and empty/error states.
- Implemented `IncidentMap.tsx` using `react-leaflet` with OpenStreetMap tiles, custom Leaflet SVG pin markers color-coded by category, popups, and auto-centering. Dynamically imported with `ssr: false` to ensure zero hydration issues.
- Integrated quick incident detail modal for public inspections and tracking.

#### Decisions
- Used Leaflet `L.divIcon` with custom Tailwind HTML markup instead of default image assets to prevent broken Leaflet icon URLs and improve visual style.
- Included both Feed List and City Map toggles so users can choose between card view and spatial map view.

### Step 6: Citizen Report Flow (/report) ✅
- Implemented `LocationPicker.tsx` capturing GPS coordinates through browser `navigator.geolocation` with handling for permission denials, sensor unavailability, and manual fallback inputs.
- Implemented `PhotoUploader.tsx` supporting PNG/JPG/JPEG file format validation, 5MB size limit checks, live preview, multi-phase S3 binary upload progress reporting, and error retry state.
- Created `/report` incident submission page in `src/app/report/page.tsx` protected by `RouteGuard` for CITIZEN and ADMIN.
- Executed two-phase submission lifecycle: incident creation first, followed by pre-signed S3 URL generation, direct binary upload, and backend metadata confirmation.
- Implemented resilient error handling: photo upload failure keeps the created incident intact and provides an in-place retry without discarding form inputs.
- Implemented success view displaying the assigned report reference number (`#1042`) and quick navigation to `/my-reports`.

#### Decisions
- Aligned photo upload payload strictly with backend DTOs (`PresignedUploadDto` and `ConfirmUploadDto`).
- Separated incident creation from photo attachment so that network timeouts to S3 never lose an already-registered municipal incident.

### Step 7: Citizen My Reports (/my-reports) ✅
- Implemented `/my-reports` personal tracker in `src/app/my-reports/page.tsx` protected by `RouteGuard` for CITIZEN.
- Implemented tabbed views: Active Reports, Repairs In Progress, Resolved & Closed, and All Reports with dynamic counter chips.
- Implemented `IncidentTimeline.tsx` visualizing the sequential status transitions (`RECEIVED` -> `PENDING_VALIDATION` -> `VALIDATED`/`REJECTED` -> `ASSIGNED` -> `IN_PROGRESS` -> `RESOLVED`).
- Implemented comprehensive incident detail view with pre-signed photo viewer gallery, description, GPS location, inspection/repair notes log, and live refresh.

#### Decisions
- Displayed visual status progression directly on report inspection modals, showing clear rejection states or certified completion milestones.

### Step 8: Admin Dashboard (/admin) ✅
- Implemented `/admin` operations dashboard in `src/app/admin/page.tsx` protected by `RouteGuard` for ADMIN.
- Integrated query parameter URL state synchronization for `status`, `category`, `streetAddress`, and `page`.
- Added high-density street warning banner detecting streets with >10 incident reports to highlight municipal clusters.
- Implemented operational dispatch modals: "Assign Agent" (for `RECEIVED` incidents, populating AGENT staff) and "Assign Technician" (for `VALIDATED` incidents, populating TECHNICIAN staff).
- Guarded dispatch buttons by status and provided detailed inspection modal with photographic records, coordinates, and notes log.

#### Decisions
- Embedded `<Suspense>` wrapper around admin search query params to fulfill Next.js App Router static compilation guidelines.
- Filtered staff dropdowns dynamically by role (`AGENT` vs `TECHNICIAN`) using `usersApi.getStaff()`.

### Step 9: Field Portal (/field) ✅
- Built mobile-optimized field portal in `src/app/field/page.tsx` protected by `RouteGuard` for AGENT, TECHNICIAN, and ADMIN.
- Mobile-first layout with high-contrast touch targets, external GPS navigation shortcuts, and citizen photo evidence inspection.
- Agent Role Actions: inspection review, priority assignment (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), inspection notes log, and decision buttons calling `PATCH /incidents/:id/validate` with `isValid: true` (validated) or `isValid: false` (rejected).
- Technician Role Actions: "Start Repair Work" transition to `IN_PROGRESS`, and "Certify Repairs Complete" transition to `RESOLVED` with mandatory progress notes and optional completion photo attachment via S3 pre-signed upload.
- Admin view mode toggle allowing supervisors to test and inspect both Agent and Technician field interfaces.

#### Decisions
- Added Google Maps one-tap navigation links using latitude and longitude coordinates for field workers on smartphones.
- Permitted technicians to optionally attach a repair completion photo when transitioning an incident to `RESOLVED`.

### Step 10: Docker ✅
- Built multi-stage production `Dockerfile` in `frontend/Dockerfile` leveraging `deps`, `builder`, and `runner` stages with Alpine Linux 20.
- Implemented build argument `NEXT_PUBLIC_API_URL` allowing dynamic API URL injection during container builds.
- Hardened runner container with non-root system user and group (`nextjs:nodejs`, UID/GID 1001), copying standalone output and static assets.
- Integrated standard healthcheck probing `http://localhost:3000` via `wget`.
- Created `docker-compose.yml` defining the frontend service.
- Successfully built and validated the container image using Podman (`localhost/fixmycity-frontend:test`).

#### Decisions
- Employed Next.js `standalone` build output for minimal image footprint.
- Ensured non-root execution for container security hardening.

### Step 11: Tests ✅
- Configured Vitest test runner with `jsdom` environment, `@vitejs/plugin-react`, and `@testing-library/jest-dom` in `vitest.config.ts`.
- Implemented unit tests for UI components:
  - `StatusBadge.test.tsx`: validated all 7 incident status chips, custom labels, and size variants.
  - `PriorityBadge.test.tsx`: tested priority chips (CRITICAL, HIGH, MEDIUM, LOW) and icon visibility options.
  - `IncidentCard.test.tsx`: verified rendering of report ID, category, location, and click triggers.
  - `PhotoUploader.test.tsx`: verified PNG/JPG format filtering, 5MB size limit rejection, progress bar rendering, and error retry handlers.
- Implemented unit tests for API and authorization infrastructure:
  - `api.test.ts`: verified base URL configuration, JWT header injection, 401 token clearing & redirect, error normalization, and network error handling.
  - `RouteGuard.test.tsx`: verified session loading indicators, unauthenticated redirects to `/login`, unauthorized role dispatching, and authorized view rendering.
- All 6 test suites with 29 passing unit tests (100% pass rate).

## Pending Steps
_(All MVP frontend steps successfully completed!)_

## Backend Gaps
_(None identified. The backend API contract perfectly satisfied all requirements for auth, incidents, RBAC, media pre-signed URLs, staff queries, and resolved feeds.)_

## Open Questions
_(None currently)_

## Backend Gaps
_(None identified so far)_

## Open Questions
_(None currently)_

# FixMyCity Frontend — Progress Tracker

## Completed Steps

### Step 1: Scaffold ✅
- Next.js 14 (App Router) initialized with TypeScript strict mode, Tailwind CSS, ESLint, and `src/` directory.
- `next.config.mjs` configured with `output: 'standalone'` and remote image patterns.
- Tailwind CSS design tokens added for all incident statuses (RECEIVED, PENDING_VALIDATION, VALIDATED, REJECTED, ASSIGNED, IN_PROGRESS, RESOLVED) and priorities (LOW, MEDIUM, HIGH, CRITICAL).
- Environment configurations: `.env.local.example` created with `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` and `.env*` added to `.gitignore`.
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

## Pending Steps
- [ ] Step 6: Citizen report flow (/report)
- [ ] Step 7: Citizen My Reports (/my-reports)
- [ ] Step 8: Admin dashboard (/admin)
- [ ] Step 9: Field portal (/field)
- [ ] Step 10: Docker
- [ ] Step 11: Tests
- [ ] Step 4: Shared components
- [ ] Step 5: Landing page (/)
- [ ] Step 6: Citizen report flow (/report)
- [ ] Step 7: Citizen My Reports (/my-reports)
- [ ] Step 8: Admin dashboard (/admin)
- [ ] Step 9: Field portal (/field)
- [ ] Step 10: Docker
- [ ] Step 11: Tests

## Backend Gaps
_(None identified so far)_

## Open Questions
_(None currently)_

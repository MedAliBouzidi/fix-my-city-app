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

## Pending Steps
- [ ] Step 4: Shared components
- [ ] Step 5: Landing page (/)
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

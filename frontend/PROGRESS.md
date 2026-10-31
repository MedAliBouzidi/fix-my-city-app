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

## Pending Steps
- [ ] Step 2: Types and API client
- [ ] Step 3: Auth and layout
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

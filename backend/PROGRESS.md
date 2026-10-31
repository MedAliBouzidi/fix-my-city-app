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

## Pending Steps

- [ ] Step 2: Database (TypeORM + entities + migration)
- [ ] Step 3: Auth module
- [ ] Step 4: Incidents module
- [ ] Step 5: Media module
- [ ] Step 6: Notifications (SNS)
- [ ] Step 7: Health module
- [ ] Step 8: Dockerfile + docker-compose
- [ ] Step 9: Tests

## Open Questions
_(none currently)_

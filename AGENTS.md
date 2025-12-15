# Repository Guidelines

## Project Structure & Module Organization
- Root workspace with npm workspaces. Key directories:
  - `apps/backend`: NestJS API (source in `src`, tests in `test`, build to `dist`).
  - `apps/frontend`: Next.js app (source in `src`, static in `public`, build outputs in `.next`).
  - `packages/shared`: Shared TypeScript utilities/types (source in `src`, build to `dist`).
- Infrastructure and ops: `docker-compose.yml`, `k8s/`, `monitoring/`, `config/`, `scripts/`.
- Migrations placeholder: `apps/backend/src/database/migrations/`.

## Build, Test, and Development Commands
- Install deps (root): `npm ci` (builds shared on install if postinstall is enabled).
- Run backend dev: `npm run dev:backend` (hot reload).
- Run frontend dev: `npm run dev:frontend`.
- Start backend prod: `npm run start:backend` (uses built `dist`).
- Build all: `npm run build` (shared → backend → frontend).
- Tests: `npm run test:backend`, `npm run test:frontend`, `npm run test:e2e` (frontend E2E).
- Lint/type-check: `npm run lint`, `npm run type-check`.
- DB tooling: `npm run db:migrate`, `npm run db:reset`.

## Coding Style & Naming Conventions
- TypeScript across services. Default ESLint + Prettier formatting; run `npm run lint` before commits.
- Use descriptive PascalCase for classes, camelCase for variables/functions, SCREAMING_SNAKE_CASE for constants/env keys.
- Nest modules/controllers/services follow `*.module.ts`, `*.controller.ts`, `*.service.ts`.
- Components/pages in Next.js live under `apps/frontend/src`; prefer functional components and hooks.

## Testing Guidelines
- Backend: Jest (unit/integration); E2E config in `apps/backend/test`.
- Frontend: Jest + Testing Library; Playwright for E2E (`npm run test:e2e`).
- Name tests with `.spec.ts`/`.test.tsx`. Keep tests colocated in `__tests__` or alongside code.
- Aim to cover critical auth, API contracts, and data transforms; add fixtures/mocks in the relevant `test` directories.

## Commit & Pull Request Guidelines
- Commits: imperative mood, concise scope (e.g., “Add health check endpoint”). Group related changes; avoid noisy format-only commits.
- PRs should include: summary of changes, testing performed (`npm run test` / manual notes), linked issue/ticket, and screenshots for UI tweaks.
- Keep diffs focused; note any follow-up tasks or known limitations in the PR description.

## Security & Configuration Tips
- Never commit secrets. Rely on env vars (`.env.example` lists required keys). Backend requires `JWT_SECRET`, database URL/creds, and storage credentials.
- Bind servers to `process.env.PORT`; set `NODE_ENV=production` for deployments to disable Swagger and enable hardened config.
- For file storage in prod, configure S3/MinIO credentials; local storage is dev-only. Set `NEXT_PUBLIC_API_URL` for frontend builds.

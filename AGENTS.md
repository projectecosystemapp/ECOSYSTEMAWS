# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, routes, and layouts.
- `components/`: Reusable UI and feature components (files in kebab-case).
- `lib/`: Shared utilities, API clients, types (e.g., `logger.ts`, `types.ts`).
- `public/`: Static assets.
- `amplify/`, `.amplify/`: AWS Amplify backend and local config.
- `scripts/`: Tooling (e.g., `deploy-to-vercel.sh`, `security-validation.sh`).
- `tests/e2e/`: Playwright end-to-end tests; `test/setup.ts` configures unit tests.
- Import aliases: `@`, `@/lib`, `@/components`, `@/app` (example: `import { log } from '@/lib/logger'`).

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js locally on `http://localhost:3000`.
- `npm run build` / `npm start`: Build and run production server.
- `npm run lint`: ESLint using project rules and TypeScript type-aware checks.
- `npm test`: Run unit tests with Vitest (`--watch`, `--coverage` variants available).
- `npm run test:e2e`: Run Playwright tests (example: `PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 npm run test:e2e`).

## Coding Style & Naming Conventions
- Language: TypeScript (strict). No `any`; explicit return types required for functions.
- Formatting: Prettier (2-space indent, single quotes, semicolons, 100-char width).
- Linting: ESLint with import ordering, React hooks rules, and security checks; no `console` except `warn`/`error`.
- Files: kebab-case (e.g., `client-layout.tsx`); React components export PascalCase symbols.

## Testing Guidelines
- Unit: Vitest + Testing Library; DOM via `happy-dom` (`test/setup.ts`).
- E2E: Playwright in `tests/e2e` with HTML/JSON/JUnit reporters to `test-results/`.
- Naming: `*.test.ts(x)` or `*.spec.ts(x)` colocated or in `tests/`.
- Coverage: `npm run test:coverage` (V8). No hard threshold; aim for meaningful coverage on critical paths.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits style (e.g., `feat:`, `fix:`, `ci:`, scopes allowed: `fix(admin): ...`, `fix(types): ...`).
- PRs: Include a clear description, linked issues, screenshots for UI changes, and test notes. Ensure `npm run lint` and all tests pass locally.
- Node: Use versions from `.nvmrc`/`engines` (Node >= 20.19). Do not commit secrets; use `.env.local`.

## Security & Configuration Tips
- Keep secrets in `.env.local`; never commit. Review `security-validation.sh` before releases.
- Amplify/SSR: Changes under `amplify/` may impact deployment; validate with `npm run build` and Playwright smoke tests.

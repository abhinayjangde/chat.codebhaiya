# Repository Guidelines

## Project Structure & Module Organization
This repository has two TypeScript apps:
- `frontend/`: Next.js 16 UI (`src/app` for routes/layout, `src/lib` for shared utilities, `public/` for static assets).
- `server/`: Express API (`src/routes`, `src/services`, `src/models`, `src/middleware`, `src/lib`).

Runtime/build output is generated in `frontend/.next` and `server/dist`; do not edit generated files directly.

## Build, Test, and Development Commands
Run commands from each app directory:
- `cd frontend && pnpm dev`: start Next.js dev server.
- `cd frontend && pnpm build`: production build.
- `cd frontend && pnpm start`: run production build locally.
- `cd frontend && pnpm lint`: run ESLint (Next core-web-vitals + TypeScript rules).
- `cd server && pnpm dev`: compile/watch TypeScript and restart API on changes.
- `cd server && pnpm build`: compile server to `dist/`.
- `cd server && pnpm start`: run compiled API from `dist/index.js`.
- `docker compose up -d mongodb`: start local MongoDB dependency.

## Coding Style & Naming Conventions
- Language: TypeScript in both apps with `strict` enabled.
- Use 2-space indentation for new code and keep formatting consistent with surrounding files.
- Frontend components/pages use PascalCase for component names; route files follow Next defaults (`page.tsx`, `layout.tsx`).
- Backend files use role-based suffixes: `*.route.ts`, `*.service.ts`, `*.model.ts`, `*.middleware.ts`.
- In `server/`, keep ESM imports with `.js` extensions for local modules (for NodeNext output).
- Prefer `@/*` alias imports inside `frontend/` (configured in `frontend/tsconfig.json`).

## Testing Guidelines
No automated test runner is configured yet. For every change:
- Run `pnpm lint` in `frontend/`.
- Run `pnpm build` in both `frontend/` and `server/`.
- Include manual verification steps in PRs (API endpoint checks, UI flows, auth/chat scenarios).

When adding tests, use `*.test.ts` / `*.test.tsx` naming and keep them near the related module or in a nearby `__tests__` folder.

## Commit & Pull Request Guidelines
Current history uses short, lowercase, imperative-style commits (for example: `move docker file`). Follow that style and keep each commit focused.

PRs should include:
- Clear summary of what changed and why.
- Linked issue/ticket (if available).
- Verification steps and command output summary.
- Screenshots/GIFs for UI changes.
- API contract updates in `server/API.md` when endpoints or payloads change.

## Security & Configuration Tips
- Never commit secrets from `server/.env`.
- Treat credentials in `docker-compose.yml` as local/dev only; override for shared environments.

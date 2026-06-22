# ADR 0004: Client-Rendered SPA on Vite + React + TypeScript

**Date:** 2026-06-22 (retrospective)
**Status:** Accepted

## Decision

Build the app as a fully client-rendered single-page application using Vite, React 19, and TypeScript. No server runtime, no SSR, no backend.

## Rationale

The app is a single-user, local-first logbook. All data lives in the browser (localStorage) and in user-owned JSON files. There is no account, no shared state, and nothing to render on a server.

- **Vite**: fast dev server and build, minimal config, first-class TS and React 19 support.
- **No backend**: removes hosting, auth, and database concerns entirely. The app can be served as static files from any CDN or opened locally.

Path aliases use the Node `imports` field (`#*` to `./src/*`) so internal modules import as `#domain/...`, `#store/...` without relative-path churn.

## Alternatives Considered

- **Next.js / SSR framework** — Rejected. SSR, server components, and API routes solve problems this app does not have (SEO, data fetching, auth). Adds a server runtime and deploy surface for zero benefit in a local-first tool.
- **Create React App** — Rejected. Effectively unmaintained; slower DX than Vite.

## Consequences

- Deployment is static hosting; no server to operate or scale.
- All logic — including persistence and "save" — runs in the browser, which shapes the storage strategy (see [ADR 0008](0008-local-first-file-persistence.md)).
- No SEO/SSR; acceptable for a private productivity tool.

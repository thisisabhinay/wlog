# ADR 0005: TanStack Router for Client-Side Routing

**Date:** 2026-06-22 (retrospective)
**Status:** Accepted

## Decision

Use TanStack Router for client-side routing. Routes are defined imperatively in `src/router.ts` as a code-based route tree: an `index` (overview), `s/$sheetId` (sheet view), and `settings`.

## Rationale

- **Type-safe routes and params**: `$sheetId` params and navigation are typed end-to-end via the `Register` module augmentation in `router.ts`.
- **Code-based route tree**: routes are plain objects assembled explicitly, which keeps the small route set readable without a file-system-routing build step.
- No data-loading or auth requirements, so the router is used purely for view switching.

## Alternatives Considered

- **React Router** — Rejected. Weaker type inference for params and search state; TanStack Router's typed params fit a TS-first codebase better.
- **Next.js App Router** — Rejected. Out of scope; the app is a client-only SPA (see [ADR 0004](0004-client-rendered-spa-on-vite.md)).
- **No router / conditional rendering** — Rejected. Sheet deep-links (`/s/:id`) and back/forward navigation need real URLs.

## Consequences

- New top-level views are added as `createRoute` entries in `router.ts`.
- The active **workspace** is intentionally *not* in the URL (see [ADR 0002](0002-multi-workspace-support.md)); only the active sheet and settings are routed.

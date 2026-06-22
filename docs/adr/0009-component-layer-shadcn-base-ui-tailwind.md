# ADR 0009: Component Layer — shadcn/ui on Base UI + Tailwind v4

**Date:** 2026-06-22 (retrospective)
**Status:** Accepted

## Decision

Build the UI from shadcn/ui primitives (`src/components/ui/*`) — copy-in components owned in-repo — composed over Base UI behavioral primitives and styled with Tailwind CSS v4. Variant styling uses `class-variance-authority`; class merging uses `clsx` + `tailwind-merge`. Toasts use `sonner`, the command palette uses `cmdk`, icons are `lucide-react`, and theming (light/dark) uses `next-themes`.

## Rationale

- **Own the components**: shadcn/ui vendors source into `components/ui` rather than shipping a versioned dependency, so primitives can be edited to fit the app instead of fighting a library's API.
- **Accessible behavior for free**: Base UI handles focus management, portals, and ARIA for dialogs, popovers, selects, etc.
- **Tailwind v4**: token-driven styling with the Vite plugin; no separate CSS pipeline.
- **Data-grid needs**: `@tanstack/react-table` + `@tanstack/react-virtual` back the record table for sorting and virtualized rows — chosen alongside, not part of, the visual layer.

## Alternatives Considered

- **MUI / Chakra / Ant Design** — Rejected. Heavy runtime, opinionated theming, and harder to restyle to a custom look; we want to own the markup.
- **Headless UI** — Rejected. Narrower primitive set than Base UI for the dialogs/menus/selects this app uses.
- **Unstyled hand-rolled components** — Rejected. Re-implementing accessible popovers/selects/dialogs correctly is costly; Base UI already solves it.

## Consequences

- Primitives live in-repo under `components/ui` and are maintained as source, not upgraded via a package bump.
- New shared UI is added by composing existing primitives; reach for shadcn's generator before hand-rolling.
- Consistent `cva` + `tailwind-merge` styling convention is expected across components.

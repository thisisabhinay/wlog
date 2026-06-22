# ADR 0006: Zustand Store with localStorage Persistence

**Date:** 2026-06-22 (retrospective)
**Status:** Accepted

## Decision

Hold all application state in a single Zustand store (`src/store/use-doc.ts`) wrapped in the `persist` middleware. The store autosaves to localStorage under the key `work-logbook`. Only the `doc` is persisted (`partialize`); undo stacks and the dirty flag are session-only.

## Rationale

- **Single source of truth**: one `doc` tree drives every view. Selectors (`useDoc`) subscribe to slices.
- **Zero-config durability**: `persist` gives crash/refresh recovery for free — the user never loses work between sessions even without explicitly saving a file.
- **Session-scoped history**: undo/redo (see [ADR 0007](0007-command-pattern-undo-redo.md)) should not survive a reload, so undo stacks are excluded from `partialize`.

The store's `persist` `migrate` runs the v0→v1 (schema v1→v2) workspace-wrapping migration on hydration, mirroring the file-open migration in `envelope.ts` (see [ADR 0002](0002-multi-workspace-support.md)).

## Alternatives Considered

- **Redux Toolkit** — Rejected. Boilerplate-heavy for a single-document model; no need for middleware ecosystem or devtools-driven workflows.
- **React Context + useReducer** — Rejected. Re-render granularity is poor; would need manual selector memoization that Zustand provides natively.
- **IndexedDB for the autosave layer** — Rejected for now. The document is small enough for localStorage; IndexedDB adds async complexity. File-based storage covers large/portable needs (see [ADR 0008](0008-local-first-file-persistence.md)).

## Consequences

- localStorage is the always-on autosave; explicit file save/open is a separate, deliberate action.
- `isDirty` tracks unsaved-to-file changes and drives the `beforeunload` guard, independent of localStorage autosave.
- localStorage size limits (~5 MB) bound document growth; revisit with IndexedDB if hit.

# ADR 0007: Command Pattern for Undo/Redo

**Date:** 2026-06-22 (retrospective)
**Status:** Accepted

## Decision

Model every undoable mutation as a `Command` with a `label`, a `do(ws)`, and an `undo(ws)` — both pure functions from `Workspace` to `Workspace` (`src/domain/commands.ts`). The store's `run(cmd)` applies `do` and pushes onto a per-workspace `past` stack; `undo`/`redo` move commands between `past` and `future`.

## Rationale

- **Explicit, reversible mutations**: each command carries its own inverse, so undo is exact (e.g. `deleteRow` restores the row at its original index) rather than relying on whole-document snapshots.
- **Pure functions over immutable workspaces**: `do`/`undo` return new `Workspace` objects, which composes cleanly with Zustand's immutable updates.
- **Human-readable labels**: the `label` field powers undo toasts (`undo-toaster.tsx`) without extra wiring.

## Scope

Undoable via commands: row add/edit/delete, cell edits, schema changes, log events. **Not** undoable (direct store mutations with confirmation): workspace create/rename/delete and column-width changes — see [ADR 0002](0002-multi-workspace-support.md).

## Alternatives Considered

- **Snapshot-based undo** (store full doc copies) — Rejected. Higher memory cost and loses the semantic `label`; positional restores (delete-at-index) are harder to get right.
- **Immer patches / inverse patches** — Rejected. Adds a dependency and indirection; hand-written inverses are small and explicit for this command set.

## Consequences

- Adding an undoable operation means adding a `Command` factory in `commands.ts`, not touching the store.
- Undo stacks are **per workspace** and **session-only** — switching workspaces preserves each one's history; a reload clears them (see [ADR 0006](0006-zustand-store-with-localstorage-persistence.md)).

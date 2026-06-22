# ADR 0010: Auto-Save to the Linked File

**Date:** 2026-06-22
**Status:** Accepted
**Builds on:** [ADR 0008](0008-local-first-file-persistence.md), [ADR 0006](0006-zustand-store-with-localstorage-persistence.md)

## Decision

Once a document is linked to a real file, persist changes to that file automatically in the background — the user no longer has to press Save. Mechanics:

- `PersistencePort` gains `canAutoSave(): boolean`. The File System Access adapter returns `true` only when it holds a file handle; the download adapter always returns `false` (every "save" prompts a download, so silent writes are impossible).
- A `useAutoSave()` hook, mounted once at the app root, debounces (`1200 ms`) and writes the current `doc` to the open file whenever `isDirty && adapter.canAutoSave()`.
- The store holds a `saveStatus` state machine (`idle | saving | saved | error`). The header renders a single status pill from it. When changes exist but no file is linked yet (`isDirty && !autoSaveReady`), the pill becomes a one-time "Save to enable auto-save" prompt.
- Continuous edits (cell/field typing) are marked `silent` on their `Command` so they don't fire a per-keystroke undo toast — the save-status pill reflects them instead.

## Rationale

Manual save is friction and a data-loss risk for a logbook the user edits continuously. The File System Access handle (see [ADR 0008](0008-local-first-file-persistence.md)) already lets us write back to the same file without prompting, so auto-save is a natural extension. Debouncing coalesces bursts of typing into one write.

Auto-save is gated on `canAutoSave()` rather than assumed, so the download-fallback path degrades cleanly: no file handle means no silent writes, and the UI nudges the user to do the one-time save that links a file.

`saveStatus` lives in the store (not local component state) because both the auto-save hook (writer) and the header (reader) need it, and they don't share a component subtree.

## Alternatives Considered

- **Save on every change (no debounce)** — Rejected. Writes the whole file per keystroke; wasteful and janky.
- **Interval-based autosave (e.g. every 30 s)** — Rejected. Either too laggy (data loss window) or redundant; debounce-on-change is both prompt and cheap.
- **Keep manual-save only** — Rejected. The handle makes silent saves possible; not using it leaves an avoidable data-loss gap.
- **localStorage as the durable layer, file as occasional export** — Rejected as the primary model. localStorage autosave (see [ADR 0006](0006-zustand-store-with-localstorage-persistence.md)) remains the crash-recovery backstop, but the user-owned file is the source of truth and should stay current.

## Consequences

- The file stays current without user action — but only after the user links a file once (FS Access browsers). Download-fallback users still save manually.
- `isDirty` now usually clears on its own shortly after edits; the `beforeunload` guard still covers the pre-link window and in-flight debounce.
- New continuous-edit commands should set `silent: true`; discrete actions (add/delete/log) stay loud so their undo toast still appears.
- A failed write surfaces as `saveStatus === 'error'` with a click-to-retry pill rather than a silent failure.

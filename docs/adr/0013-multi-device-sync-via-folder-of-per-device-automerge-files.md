# ADR 0013: Multi-Device Sync via a Folder of Per-Device Automerge Files

**Date:** 2026-06-23
**Status:** Accepted
**Supersedes:** the single-shared-file assumption of [ADR 0008](0008-local-first-file-persistence.md) and the whole-blob write of [ADR 0010](0010-auto-save-to-linked-file.md)
**Builds on:** [ADR 0008](0008-local-first-file-persistence.md), [ADR 0010](0010-auto-save-to-linked-file.md)

## Context

The app is local-first: state is a single `Doc` serialized as one JSON file the user owns ([ADR 0008](0008-local-first-file-persistence.md)), auto-saved in full on every change ([ADR 0010](0010-auto-save-to-linked-file.md)). The intended workflow is "edit on any device, sync the file through iCloud Drive (or Dropbox/Drive)."

That workflow silently loses data. iCloud is a **last-write-wins byte replicator**, not a sync engine — it replicates whole files and resolves contention by mtime, with no knowledge of the JSON inside. Two devices writing the same file is a guaranteed lost-update:

1. Device A edits, writes the file, lets iCloud upload it.
2. Device B opens the file *before* iCloud has downloaded A's version, so B reads stale bytes.
3. B edits and writes; B's newer mtime wins; A's changes are gone.

The loss is unavoidable under this design because the transport discards one writer's bytes before either device ever observes the other's. Read-before-write does not help (B's read is stale), and save-timing tweaks (debounce/interval) are irrelevant. This is the central flaw, and the workflow it breaks is the one the app exists for.

## Decision

Replace the single shared file with a **synced folder containing one Automerge change file per device**, merged on read. No two devices ever write the same file, so the transport never has a contended file to resolve; divergent copies are merged losslessly by Automerge.

- **Storage target is a directory, not a file.** The File System Access adapter uses `showDirectoryPicker()` and holds a `FileSystemDirectoryHandle`. The user points it at a folder inside iCloud Drive.
- **One writer per file.** Each device owns exactly one file, `device-<deviceId>.wlg` (the app's own extension; Automerge binary under the hood), and only ever writes its own. `deviceId` is a stable per-install id persisted in `localStorage`.
- **Document is an Automerge CRDT.** The `Doc` is represented as an Automerge document. Edits are applied as Automerge changes; auto-save writes the device's own Automerge binary.
- **Merge on read.** On open, the adapter reads every `*.wlg` file in the folder and folds them with `Automerge.merge`. Concurrent edits to the same field resolve deterministically inside Automerge; inserts/deletes union by id. No bytes are discarded, so both sides survive.
- **`PersistencePort` gains a directory mode.** `canAutoSave()` stays true once a directory handle is held; `save()` writes only this device's file; `open()` returns the merged doc. The download/upload fallback adapter (non-FS-Access browsers) keeps single-file behavior and remains single-writer.
- **Migration.** An existing single `work-logbook.json` is imported once into the folder as this device's Automerge file; the JSON envelope ([envelope.ts](../../src/domain/envelope.ts)) remains the import/export and crash-recovery format.

## Rationale

The bug is architectural: iCloud LWW + one contended mutable file = lost updates that no save-timing change can fix. The only robust fix removes contention at the transport (one writer per file) and makes divergent state mergeable (a CRDT). The folder-of-per-device-files pattern is the canonical local-first answer and keeps the no-server, user-owns-the-data ethos of [ADR 0008](0008-local-first-file-persistence.md).

Automerge over a hand-rolled HLC/LWW merge: lossless merge of a JSON-shaped document across devices synced by a dumb file transport is exactly Automerge's purpose. Hand-rolling per-field clocks and merge reduction is the kind of code that is subtly wrong forever; correctness here is the entire point of the change.

## Alternatives Considered

- **Keep the single file; tune save timing / debounce** — Rejected. Does not touch the root cause.
- **Single file + version token, refuse/keep-both on mismatch** — Rejected as the primary fix. Detects rather than merges, and the stale-read latency means B can still miss A's version and overwrite it. Acceptable only as a stopgap, not a solution.
- **Hand-rolled HLC + per-field LWW over JSON** — Rejected. Keeps files human-readable but reintroduces the risk of a subtly incorrect merge; Automerge solves merge by construction.
- **A real sync backend (ElectricSQL, PowerSync, Liveblocks, Supabase)** — Rejected. Correct, but contradicts the local-first, server-free decision in [ADR 0008](0008-local-first-file-persistence.md). The folder approach gives lossless merge without giving that up.

## Consequences

- The iCloud lost-update workflow is fixed: edit anywhere, sync the folder, never silently lose changes.
- On-disk format changes from one readable JSON file to a folder of Automerge binaries. JSON stays as the explicit import/export and crash-recovery format; the folder is the live store.
- Adds the `@automerge/automerge` dependency (ships WASM; Vite must serve the `.wasm` asset).
- The store now applies edits as Automerge changes; `saveStatus` ([ADR 0010](0010-auto-save-to-linked-file.md)) still drives the header pill, but "saved" now means "this device's change file is written," not "the shared file is current."
- Non-FS-Access browsers (download/upload fallback) remain single-file, single-writer and do not get cross-device merge — an accepted degradation, same posture as [ADR 0010](0010-auto-save-to-linked-file.md).
- A device that has never synced sees only its own file until the transport delivers the others; the merge is eventually consistent, not instantaneous.

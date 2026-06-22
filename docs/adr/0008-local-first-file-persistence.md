# ADR 0008: Local-First File Persistence via Port + Adapters

**Date:** 2026-06-22 (retrospective)
**Status:** Accepted

## Decision

Persist documents to user-owned JSON files through a `PersistencePort` interface (`save`, `saveAs`, `open`) with two interchangeable adapters, selected at runtime by capability detection:

- **`FileSystemAccessAdapter`** — uses the File System Access API (`showSaveFilePicker` / `showOpenFilePicker`), retaining a file handle so `save` writes back to the same file without re-prompting.
- **`DownloadUploadAdapter`** — fallback for browsers without the API: `save`/`saveAs` trigger a download, `open` uses a file input.

`usePersistence` wires the chosen adapter to the store and installs a `beforeunload` guard when `isDirty`.

## Rationale

- **Local-first / user-owned data**: there is no backend (see [ADR 0004](0004-client-rendered-spa-on-vite.md)); the file *is* the durable artifact the user controls, backs up, and moves between machines.
- **Port + adapter** isolates the storage mechanism from the app. Components and the store depend only on `PersistencePort`, so the File System Access vs download difference never leaks into UI.
- **Graceful degradation**: Firefox/Safari (no FS Access API) still get full save/open via download/upload.

All reads go through `openEnvelope` and writes through `serialize` (`envelope.ts`), so format validation, the `_fmt` identifier, and schema migration are enforced regardless of adapter.

## Alternatives Considered

- **localStorage as the only store** — Rejected as the primary durable store. It is the autosave layer (see [ADR 0006](0006-zustand-store-with-localstorage-persistence.md)) but is not portable, shareable, or backup-friendly, and is size-limited.
- **Cloud sync / backend storage** — Rejected. Reintroduces accounts, auth, and hosting that [ADR 0004](0004-client-rendered-spa-on-vite.md) deliberately avoids.
- **File System Access API only** — Rejected. Not supported in Firefox/Safari; would break save/open for a large share of users.

## Consequences

- Two code paths to keep behaviorally equivalent behind one interface; both must round-trip through the envelope layer.
- The retained file handle (FS Access path) makes repeat saves seamless; the download path always produces a new file, so "overwrite" semantics differ by adapter — acceptable given the fallback nature.
- Adding a future backend means adding a new adapter, not changing callers.

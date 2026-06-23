# ADR 0014: Persisted Folder Handle and Per-Folder Device Identity

**Date:** 2026-06-23
**Status:** Accepted
**Amends:** [ADR 0013](0013-multi-device-sync-via-folder-of-per-device-automerge-files.md)

## Context

[ADR 0013](0013-multi-device-sync-via-folder-of-per-device-automerge-files.md) established the sync model — a synced folder with one Automerge file per device, merged on read — and stated two details that did not survive implementation:

- The per-device file was `device-<deviceId>.wlg`, with `deviceId` a "stable per-install id persisted in `localStorage`."
- Merge-on-read was described as happening "on open."

Two problems surfaced building it:

1. **`localStorage` is the wrong home for device identity.** It is per-origin but not folder-scoped, and (depending on profile/backup tooling) can be copied between installs. Two devices ending up with the same id means two writers to the same file — the exact contended-file clobber [ADR 0013](0013-multi-device-sync-via-folder-of-per-device-automerge-files.md) exists to prevent.
2. **The folder handle didn't survive a reload.** Re-picking the folder on every refresh is unacceptable UX, and browsers downgrade a `FileSystemDirectoryHandle` permission grant to `prompt` across reloads, so the handle can't be silently reused even if kept in memory.

## Decision

Refine [ADR 0013](0013-multi-device-sync-via-folder-of-per-device-automerge-files.md)'s identity and lifecycle as follows:

- **Device file name is a UUID, minted once and stored per-folder in IndexedDB.** The name is `device-<uuid>.wlg`, where `uuid` comes from `crypto.randomUUID()` (122 bits — collision is not a practical concern). It is persisted alongside the folder handle in IndexedDB (`src/persistence/sync/device-id.ts`, `handle-store.ts`), **not** in `localStorage` or any cloud-synced location, so two devices can never share an id.
- **The folder handle is persisted in IndexedDB and re-attached on startup.** A `FileSystemDirectoryHandle` is structured-cloneable, so the `{ handle, fileName }` pair is stored under one key in an IndexedDB store (`wlog-sync`) and restored on load.
- **Reconnect, don't re-pick.** Because the browser downgrades the grant to `prompt` on reload, restore surfaces a one-click "Reconnect sync" affordance that re-grants access to the remembered folder and reloads the merged contents. The user never re-picks the folder.
- **Merge-on-read runs on every restore/reconnect, not only on first open.** Each time access is (re-)granted, the adapter re-reads every `*.wlg` file and folds them with `Automerge.merge`, so a reconnected device picks up whatever other devices wrote while it was away.

## Rationale

Identity and the contention guarantee are the same concern: the whole no-clobber property of [ADR 0013](0013-multi-device-sync-via-folder-of-per-device-automerge-files.md) rests on each device owning a distinct file. Storing the name in cloud-synced or copyable storage undermines that, so it lives in IndexedDB — per-browser-profile, not synced — which is also where the handle naturally belongs. Co-locating `{ handle, fileName }` means a device's identity is scoped to the folder it actually syncs.

Persisting the handle removes the re-pick friction; the reconnect prompt is the minimum the browser permission model allows and keeps it to a single click. Re-merging on every reconnect (not just first open) is what makes "edit anywhere, come back later" actually converge.

## Alternatives Considered

- **Keep `deviceId` in `localStorage`** — Rejected. Not folder-scoped and copyable between installs; risks two devices sharing an id and reintroducing the contended-file clobber.
- **Derive the file name from a fingerprint (user agent, timestamp, etc.)** — Rejected. Fingerprints collide and aren't stable; a minted UUID persisted once is both unique and durable.
- **Hold the folder handle only in memory** — Rejected. Lost on reload, forcing a re-pick every refresh.
- **Auto-reconnect silently on load** — Not possible. Browsers require a user gesture to re-grant a downgraded file-system permission; hence the explicit one-click reconnect.

## Consequences

- A device's identity is tied to the IndexedDB record for its linked folder. Clearing site data / IndexedDB forgets both the folder link and this device's file name; re-linking mints a **new** UUID, leaving the old `device-<uuid>.wlg` as an orphan in the folder (still merged on read, just no longer written to).
- After a reload the app shows "Reconnect sync" until the user grants access once; until then this device is read-stale (it can't see others' latest writes) — the eventual-consistency posture of [ADR 0013](0013-multi-device-sync-via-folder-of-per-device-automerge-files.md), now with an explicit reconnect step.
- `clearLinkedFolder()` is the single un-link path (drops handle + file name together).
- The download/upload fallback adapter is unaffected — it has no directory handle and remains single-file, single-writer ([ADR 0013](0013-multi-device-sync-via-folder-of-per-device-automerge-files.md)).

# ADR 0015: Shared Deterministic Genesis for Cross-Device Merge

**Date:** 2026-06-23
**Status:** Accepted
**Amends:** [ADR 0013](0013-multi-device-sync-via-folder-of-per-device-automerge-files.md)

## Context

[ADR 0013](0013-multi-device-sync-via-folder-of-per-device-automerge-files.md) seeds each device's Automerge document with `Automerge.from(plainDoc)`. Two devices that each call `from()` independently produce documents with **disjoint histories and no common ancestor**. `Automerge.merge` of such documents does not field-merge: for each root key (`workspaces`, `meta`, `activeWorkspaceId`) it sees two concurrent assignments and picks one side's whole value as the winner, discarding the other.

The observed symptom: each device shows only its own data. Device A's logbook never appears on Device B and vice versa — because whenever a merge does run, one side's entire subtree wins (and when the other device's file isn't yet readable, the device simply keeps its own).

0013 tried to avoid this by requiring every device except the first to `loadAndMerge` the folder before writing, so it would branch from the existing file. That requirement is fragile: under iCloud sync lag a second device routinely links the folder *before* the first device's file has arrived, seeds independently, and diverges permanently.

Confirmed empirically: independent `from()` on `{workspaces:[wsA]}` and `{workspaces:[wsB]}` merges to `[wsB]` (one wins); branching both from a shared genesis merges to `[wsA, wsB]` (union).

## Decision

Every device branches its document from a single, fixed, content-free **genesis change** that is byte-identical everywhere:

- `genesisDoc()` = `Automerge.init({ actor })` with a constant `GENESIS_ACTOR`, followed by one `Automerge.change` with `time: 0` that creates the empty doc shell (`meta`, `activeWorkspaceId: ''`, `workspaces: []`). Constant actor + constant time + constant ops ⇒ identical change hash on every device and every app version.
- `fromPlain(plain)` clones the genesis with a **unique per-device actor id** (`crypto.randomUUID()` hex) and applies the device's data as the first real change.

Because all devices share the genesis ancestor, `Automerge.merge` reconciles per-key and per-list-item (unioning inserts by id via the existing reconcile, last-writer-wins per field) instead of picking a whole-subtree winner. Devices may now seed **independently** — the "open before first write" requirement from 0013 is dropped — and still converge.

The genesis constants are **immutable**: changing the actor, time, or shell shape would change the genesis hash and split lineage between app versions.

## Alternatives Considered

- **Keep 0013's "load before first write" rule** — Rejected. Fragile under sync lag; the failure is silent and permanent.
- **One device creates the base, others must import it first** — Rejected. Same bootstrapping fragility, and worse UX (a device can't start offline).
- **Reconcile two independent docs field-by-field ourselves after load** — Rejected. Re-implements CRDT merge on top of Automerge; deterministic genesis makes Automerge's own merge correct.

## Consequences

- Cross-device edits union/merge correctly and devices converge regardless of which linked the folder first or in what order files arrive.
- **Pre-0015 files do not share this genesis** and will not merge with new files (mixing them re-triggers the one-wins behavior). Migrating an existing folder requires a one-time reset: forget the folder and delete the old `*.wlg` files, then re-seed from the canonical device and `Open` it on the others.
- Two devices that each seed from *different* starter data will union into multiple workspaces (no loss, but possible duplicates) — expected for genuinely independent starts; adopting one device as the source on first link avoids it.
- Genesis constants are now load-bearing and must never change.

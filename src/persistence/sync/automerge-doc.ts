import * as Automerge from '@automerge/automerge';
import { Doc } from '#domain/schema';
import type { Result } from '#domain/result';
import { reconcile } from './reconcile';

/** The Automerge-managed shape mirrors the plain `Doc`. */
export type SyncDoc = Automerge.Doc<Doc>;

/**
 * A fixed, content-free genesis change that EVERY device shares. Because the
 * actor, timestamp, and ops are constant, every device produces the identical
 * genesis change (same hash), so all device docs descend from a common
 * ancestor. Without this, two devices each calling `Automerge.from()` would
 * have disjoint histories and `merge` would pick one side's whole subtree as
 * the winner — silently discarding the other device's data (the "each device
 * only sees its own data" bug). See ADR 0014.
 *
 * IMMUTABLE: these values must never change, or devices on different app
 * versions would compute different genesis hashes and stop sharing lineage.
 */
const GENESIS_ACTOR = '00000000000000000000000000000001';

function genesisDoc(): SyncDoc {
  let doc = Automerge.init<Doc>({ actor: GENESIS_ACTOR });
  doc = Automerge.change(doc, { time: 0, message: 'genesis' }, (d) => {
    const draft = d as Record<string, unknown>;
    draft.meta = { schemaVersion: 0, appVersion: 'genesis' };
    draft.activeWorkspaceId = '';
    draft.workspaces = [];
  });
  return doc;
}

/**
 * Seed this device's Automerge doc from a plain `Doc`, branching from the shared
 * genesis so it merges losslessly with every other device. The branch gets a
 * unique actor id for this device's ongoing changes. See ADR 0014.
 */
export function fromPlain(plain: Doc): SyncDoc {
  const actor = crypto.randomUUID().replace(/-/g, '');
  const base = Automerge.clone(genesisDoc(), { actor });
  return applyPlain(base, plain);
}

/**
 * Load and merge every device file into one document. `failed` counts files
 * that couldn't be parsed (corrupt/partial) so the caller can warn rather than
 * silently merge incomplete data. `doc` is null when nothing loaded.
 */
export function loadAndMerge(files: Uint8Array[]): { doc: SyncDoc | null; failed: number } {
  let merged: SyncDoc | null = null;
  let failed = 0;
  for (const bytes of files) {
    let loaded: SyncDoc;
    try {
      loaded = Automerge.load<Doc>(bytes);
    } catch {
      failed++;
      continue;
    }
    merged = merged === null ? loaded : Automerge.merge(merged, loaded);
  }
  return { doc: merged, failed };
}

/** Fold this device's current plain state into the Automerge doc as one change. */
export function applyPlain(doc: SyncDoc, plain: Doc): SyncDoc {
  return Automerge.change(doc, (draft) => {
    reconcile(draft, plain);
  });
}

/** Serialize for writing to this device's file. */
export function toBytes(doc: SyncDoc): Uint8Array {
  return Automerge.save(doc);
}

/**
 * Convert an Automerge doc back to a validated, branded plain `Doc`. Returns an
 * error Result if the merged content doesn't satisfy the schema (e.g. a future
 * version wrote fields this build can't model).
 */
export function toValidatedPlain(doc: SyncDoc): Result<Doc> {
  const raw = Automerge.toJS(doc);
  const parsed = Doc.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: 'CORRUPT', detail: parsed.error.message } };
  }
  return { ok: true, data: parsed.data };
}

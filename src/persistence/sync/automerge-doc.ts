import * as Automerge from '@automerge/automerge';
import { Doc } from '#domain/schema';
import type { Result } from '#domain/result';
import { reconcile } from './reconcile';

/** The Automerge-managed shape mirrors the plain `Doc`. */
export type SyncDoc = Automerge.Doc<Doc>;

/**
 * Create the shared base document from a plain `Doc`. Only the FIRST device to
 * use a folder should call this; every other device must `loadAndMerge` the
 * folder's existing files so their history branches from the same root (two
 * independent `from()` calls on the same content would not share lineage and
 * could duplicate top-level items on merge). See ADR 0013.
 */
export function fromPlain(plain: Doc): SyncDoc {
  return Automerge.from(plain as Doc);
}

/** Load and merge every device file into one document. Returns null if empty. */
export function loadAndMerge(files: Uint8Array[]): SyncDoc | null {
  let merged: SyncDoc | null = null;
  for (const bytes of files) {
    let loaded: SyncDoc;
    try {
      loaded = Automerge.load<Doc>(bytes);
    } catch {
      continue; // skip a corrupt/partial file rather than failing the whole open
    }
    merged = merged === null ? loaded : Automerge.merge(merged, loaded);
  }
  return merged;
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

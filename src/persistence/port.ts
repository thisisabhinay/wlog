import type { Doc } from '#domain/schema';
import type { Result } from '#domain/result';
import type { OpenResult } from '#domain/envelope';

/** Outcome of trying to re-attach a previously-linked sync folder on startup. */
export type RestoreResult =
  | { status: 'none' } // nothing was linked before
  | { status: 'ready'; doc?: Doc } // re-attached and permitted; `doc` set if the folder had data
  | { status: 'needs-permission' } // re-attached but needs a user gesture to re-grant access
  | { status: 'error'; detail: string };

export interface PersistencePort {
  save(doc: Doc): Promise<Result<void>>;
  saveAs(doc: Doc): Promise<Result<void>>;
  open(): Promise<OpenResult>;
  /** True when the adapter can persist silently to a known target (no user prompt). */
  canAutoSave(): boolean;
  /** Re-attach a folder linked in a previous session (no-op for adapters that can't). */
  restore(): Promise<RestoreResult>;
  /** Re-grant access to the restored folder via a user gesture, then load it. */
  reconnect(): Promise<RestoreResult>;
  /** Forget the linked folder so the next save/open starts a fresh link. */
  forget(): Promise<void>;
  /** Device files that couldn't be read on the last load (placeholders/corrupt). */
  lastUnreadableCount(): number;
}

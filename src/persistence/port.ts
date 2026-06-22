import type { Doc } from '#domain/schema';
import type { Result } from '#domain/result';
import type { OpenResult } from '#domain/envelope';

export interface PersistencePort {
  save(doc: Doc): Promise<Result<void>>;
  saveAs(doc: Doc): Promise<Result<void>>;
  open(): Promise<OpenResult>;
  /** True when the adapter can persist silently to a known target (no user prompt). */
  canAutoSave(): boolean;
}

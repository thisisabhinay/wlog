import type { Doc } from '#domain/schema';
import type { Result } from '#domain/result';
import type { OpenResult } from '#domain/envelope';

export interface PersistencePort {
  save(doc: Doc): Promise<Result<void>>;
  saveAs(doc: Doc): Promise<Result<void>>;
  open(): Promise<OpenResult>;
}

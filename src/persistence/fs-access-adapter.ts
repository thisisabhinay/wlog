import type { Doc } from '#domain/schema';
import type { Result } from '#domain/result';
import { serialize, openEnvelope, type OpenResult } from '#domain/envelope';
import type { PersistencePort } from './port';

const FILE_OPTS = {
  types: [{ description: 'Work Logbook', accept: { 'application/json': ['.json'] as `.${string}`[] } }],
};

export class FileSystemAccessAdapter implements PersistencePort {
  private handle: FileSystemFileHandle | null = null;

  async save(doc: Doc): Promise<Result<void>> {
    if (!this.handle) return this.saveAs(doc);
    try {
      const writable = await this.handle.createWritable();
      await writable.write(serialize(doc));
      await writable.close();
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: { code: 'SAVE_FAILED', detail: String(e) } };
    }
  }

  async saveAs(doc: Doc): Promise<Result<void>> {
    try {
      this.handle = await window.showSaveFilePicker({
        suggestedName: 'work-logbook.json',
        ...FILE_OPTS,
      });
      return this.save(doc);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { ok: false, error: { code: 'CANCELLED', detail: 'Save cancelled' } };
      }
      return { ok: false, error: { code: 'SAVE_FAILED', detail: String(e) } };
    }
  }

  async open(): Promise<OpenResult> {
    try {
      const [handle] = await window.showOpenFilePicker(FILE_OPTS);
      const file = await handle.getFile();
      const text = await file.text();
      const json = JSON.parse(text);
      const result = openEnvelope(json);
      if (result.ok) this.handle = handle;
      return result;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { ok: false, error: { code: 'NOT_OURS', detail: 'Open cancelled' } };
      }
      return { ok: false, error: { code: 'CORRUPT', detail: String(e) } };
    }
  }
}

export function supportsFileSystemAccess(): boolean {
  return 'showSaveFilePicker' in window;
}

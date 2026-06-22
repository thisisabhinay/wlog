import type { Doc } from '#domain/schema';
import type { Result } from '#domain/result';
import { serialize, openEnvelope, type OpenResult } from '#domain/envelope';
import type { PersistencePort } from './port';

export class DownloadUploadAdapter implements PersistencePort {
  // Each save triggers a browser download prompt, so silent auto-save isn't possible.
  canAutoSave(): boolean {
    return false;
  }

  async save(doc: Doc): Promise<Result<void>> {
    return this.saveAs(doc);
  }

  async saveAs(doc: Doc): Promise<Result<void>> {
    const blob = new Blob([serialize(doc)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'work-logbook.json';
    a.click();
    URL.revokeObjectURL(url);
    return { ok: true, data: undefined };
  }

  open(): Promise<OpenResult> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve({ ok: false, error: { code: 'NOT_OURS', detail: 'No file selected' } });
          return;
        }
        try {
          const text = await file.text();
          const json = JSON.parse(text);
          resolve(openEnvelope(json));
        } catch (e) {
          resolve({ ok: false, error: { code: 'CORRUPT', detail: String(e) } });
        }
      };
      input.click();
    });
  }
}

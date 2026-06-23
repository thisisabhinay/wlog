import type { Doc } from '#domain/schema';
import type { Result } from '#domain/result';
import type { OpenResult } from '#domain/envelope';
import type { PersistencePort } from './port';
import { getDeviceId, deviceFileName, isDeviceFile } from './sync/device-id';
import {
  fromPlain,
  loadAndMerge,
  applyPlain,
  toBytes,
  toValidatedPlain,
  type SyncDoc,
} from './sync/automerge-doc';

/**
 * Multi-device persistence adapter (ADR 0013). The user links a *folder* (in
 * iCloud Drive / Dropbox / Drive). Each device owns exactly one file inside it,
 * `device-<id>.automerge`, and only ever writes its own — so the sync transport
 * never has a contended file to resolve. `open()` merges every device file
 * losslessly via Automerge; `save()` folds this device's edits into its own file.
 */
export class DirectoryAdapter implements PersistencePort {
  private dir: FileSystemDirectoryHandle | null = null;
  private deviceId = getDeviceId();
  /** This device's Automerge doc — the merged baseline plus our local edits. */
  private syncDoc: SyncDoc | null = null;

  canAutoSave(): boolean {
    return this.dir !== null;
  }

  /** Link an existing folder and load+merge every device file into one doc. */
  async open(): Promise<OpenResult> {
    let dir: FileSystemDirectoryHandle;
    try {
      dir = await pickDirectory();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { ok: false, error: { code: 'NOT_OURS', detail: 'Open cancelled' } };
      }
      return { ok: false, error: { code: 'CORRUPT', detail: String(e) } };
    }

    const files = await readDeviceFiles(dir);
    const merged = loadAndMerge(files);
    if (merged === null) {
      // Empty folder: nothing to load yet. Caller keeps its current doc and a
      // subsequent save will seed this folder with our file.
      this.dir = dir;
      this.syncDoc = null;
      return { ok: false, error: { code: 'NOT_OURS', detail: 'No logbook files in this folder yet.' } };
    }

    const result = toValidatedPlain(merged);
    if (!result.ok) return { ok: false, error: { code: 'CORRUPT', detail: result.error.detail } };

    this.dir = dir;
    this.syncDoc = merged;
    return { ok: true, doc: result.data };
  }

  /** Link a folder and write this device's file (used to seed a new folder). */
  async saveAs(doc: Doc): Promise<Result<void>> {
    let dir: FileSystemDirectoryHandle;
    try {
      dir = await pickDirectory();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { ok: false, error: { code: 'CANCELLED', detail: 'Save cancelled' } };
      }
      return { ok: false, error: { code: 'SAVE_FAILED', detail: String(e) } };
    }

    // Linking a folder that already holds data: merge it in so neither the
    // on-disk history nor our in-memory edits are lost.
    const existing = loadAndMerge(await readDeviceFiles(dir));
    this.syncDoc = existing ?? null;
    this.dir = dir;
    return this.save(doc);
  }

  /** Fold the current plain doc into this device's file. Silent (auto-save). */
  async save(doc: Doc): Promise<Result<void>> {
    if (!this.dir) return this.saveAs(doc);
    try {
      this.syncDoc = this.syncDoc === null ? fromPlain(doc) : applyPlain(this.syncDoc, doc);
      const bytes = toBytes(this.syncDoc);
      const fileHandle = await this.dir.getFileHandle(deviceFileName(this.deviceId), { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(bytes as unknown as BufferSource);
      await writable.close();
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: { code: 'SAVE_FAILED', detail: String(e) } };
    }
  }
}

async function readDeviceFiles(dir: FileSystemDirectoryHandle): Promise<Uint8Array[]> {
  const out: Uint8Array[] = [];
  for await (const entry of dir.values()) {
    if (entry.kind === 'file' && isDeviceFile(entry.name)) {
      const file = await (entry as FileSystemFileHandle).getFile();
      out.push(new Uint8Array(await file.arrayBuffer()));
    }
  }
  return out;
}

function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  // showDirectoryPicker isn't yet in lib.dom's types.
  return (window as unknown as {
    showDirectoryPicker: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }).showDirectoryPicker({ mode: 'readwrite' });
}

export function supportsDirectoryAccess(): boolean {
  return 'showDirectoryPicker' in window;
}

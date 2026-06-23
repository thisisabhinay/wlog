import type { Doc } from '#domain/schema';
import type { Result } from '#domain/result';
import type { OpenResult } from '#domain/envelope';
import type { PersistencePort, RestoreResult } from './port';
import { newDeviceFileName, isDeviceFile, isDeviceFilePlaceholder } from './sync/device-id';
import { getLinkedFolder, setLinkedFolder, clearLinkedFolder } from './sync/handle-store';
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
 * `device-<uuid>.wlg`, and only ever writes its own — so the sync transport
 * never has a contended file to resolve. `open()` merges every device file
 * losslessly via Automerge; `save()` folds this device's edits into its own file.
 *
 * The directory handle and this device's file name are persisted in IndexedDB
 * ([[handle-store]]) so a reload re-attaches the folder instead of re-prompting.
 */
export class DirectoryAdapter implements PersistencePort {
  private dir: FileSystemDirectoryHandle | null = null;
  private fileName: string | null = null;
  /** This device's Automerge doc — the merged baseline plus our local edits. */
  private syncDoc: SyncDoc | null = null;
  /** Device files that couldn't be read on the last load (placeholders/corrupt). */
  private lastUnreadable = 0;

  canAutoSave(): boolean {
    return this.dir !== null && this.fileName !== null;
  }

  lastUnreadableCount(): number {
    return this.lastUnreadable;
  }

  /** Re-attach the folder linked in a previous session, if any. */
  async restore(): Promise<RestoreResult> {
    let record;
    try {
      record = await getLinkedFolder();
    } catch (e) {
      return { status: 'error', detail: String(e) };
    }
    if (!record) return { status: 'none' };

    this.dir = record.handle;
    this.fileName = record.fileName;
    // After a reload the grant is usually downgraded to "prompt"; a one-click
    // reconnect re-grants it without re-opening the OS folder picker.
    if ((await queryPermission(record.handle)) !== 'granted') {
      return { status: 'needs-permission' };
    }
    return this.loadCurrent();
  }

  /** Re-grant access to the restored folder via a user gesture, then load it. */
  async reconnect(): Promise<RestoreResult> {
    if (!this.dir) return { status: 'none' };
    if ((await requestPermission(this.dir)) !== 'granted') {
      return { status: 'needs-permission' };
    }
    return this.loadCurrent();
  }

  /**
   * Re-read and merge the folder for an already-linked device (no picker, no
   * prompt) so an open tab pulls in other devices' latest writes. Signals
   * needs-permission if the grant lapsed.
   */
  async refresh(): Promise<RestoreResult> {
    if (!this.dir) return { status: 'none' };
    if ((await queryPermission(this.dir)) !== 'granted') {
      return { status: 'needs-permission' };
    }
    return this.loadCurrent();
  }

  /** Forget the linked folder. The folder's files are left untouched on disk. */
  async forget(): Promise<void> {
    this.dir = null;
    this.fileName = null;
    this.syncDoc = null;
    await clearLinkedFolder().catch(() => {});
  }

  /** Link an existing folder and load+merge every device file into one doc. */
  async open(): Promise<OpenResult> {
    let dir: FileSystemDirectoryHandle;
    try {
      dir = await pickDirectory();
    } catch (e) {
      if (isAbort(e)) return { ok: false, error: { code: 'NOT_OURS', detail: 'Open cancelled' } };
      return { ok: false, error: { code: 'CORRUPT', detail: String(e) } };
    }

    await this.adoptDir(dir);
    const result = await this.loadCurrent();
    if (result.status === 'ready') {
      if (result.doc) return { ok: true, doc: result.doc };
      // Empty folder: keep the caller's current doc; a save will seed it.
      return { ok: false, error: { code: 'NOT_OURS', detail: 'No logbook files in this folder yet.' } };
    }
    return { ok: false, error: { code: 'CORRUPT', detail: result.status === 'error' ? result.detail : 'Could not read folder' } };
  }

  /** Link a folder and write this device's file (used to seed a new folder). */
  async saveAs(doc: Doc): Promise<Result<void>> {
    let dir: FileSystemDirectoryHandle;
    try {
      dir = await pickDirectory();
    } catch (e) {
      if (isAbort(e)) return { ok: false, error: { code: 'CANCELLED', detail: 'Save cancelled' } };
      return { ok: false, error: { code: 'SAVE_FAILED', detail: String(e) } };
    }

    // Linking a folder that already holds data: merge it in so neither the
    // on-disk history nor our in-memory edits are lost.
    const { bytes } = await readDeviceFiles(dir);
    this.syncDoc = loadAndMerge(bytes).doc;
    await this.adoptDir(dir);
    return this.save(doc);
  }

  /** Fold the current plain doc into this device's file. Silent (auto-save). */
  async save(doc: Doc): Promise<Result<void>> {
    if (!this.dir || !this.fileName) return this.saveAs(doc);
    try {
      this.syncDoc = this.syncDoc === null ? fromPlain(doc) : applyPlain(this.syncDoc, doc);
      const bytes = toBytes(this.syncDoc);
      const fileHandle = await this.dir.getFileHandle(this.fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(bytes as unknown as BufferSource);
      await writable.close();
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: { code: 'SAVE_FAILED', detail: String(e) } };
    }
  }

  /** Read+merge all device files in the current dir into `syncDoc`. */
  private async loadCurrent(): Promise<RestoreResult> {
    if (!this.dir) return { status: 'none' };
    const { bytes, unreadable } = await readDeviceFiles(this.dir);
    const { doc: merged, failed } = loadAndMerge(bytes);
    this.lastUnreadable = unreadable + failed;
    if (merged === null) {
      this.syncDoc = null;
      return { status: 'ready' }; // empty folder — caller keeps its current doc
    }
    const result = toValidatedPlain(merged);
    if (!result.ok) return { status: 'error', detail: result.error.detail };
    this.syncDoc = merged;
    return { status: 'ready', doc: result.data };
  }

  /**
   * Adopt a freshly-picked dir as the linked folder, deciding this device's file
   * name: reuse the remembered one only if it's the *same* folder, otherwise
   * mint a fresh unique name. Persist the choice so reloads re-attach silently.
   */
  private async adoptDir(dir: FileSystemDirectoryHandle): Promise<void> {
    let fileName: string | null = null;
    const record = await getLinkedFolder().catch(() => null);
    if (record && (await isSameEntry(record.handle, dir))) {
      fileName = record.fileName;
    }
    if (!fileName) fileName = await mintUniqueFileName(dir);

    this.dir = dir;
    this.fileName = fileName;
    await setLinkedFolder({ handle: dir, fileName }).catch(() => {});
  }
}

async function mintUniqueFileName(dir: FileSystemDirectoryHandle): Promise<string> {
  // crypto.randomUUID collisions are vanishingly unlikely, but cheaply confirm
  // the name isn't already taken in this folder before claiming it.
  for (let i = 0; i < 5; i++) {
    const name = newDeviceFileName();
    if (!(await fileExists(dir, name))) return name;
  }
  return newDeviceFileName();
}

async function fileExists(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}

async function readDeviceFiles(
  dir: FileSystemDirectoryHandle,
): Promise<{ bytes: Uint8Array[]; unreadable: number }> {
  const bytes: Uint8Array[] = [];
  let unreadable = 0;
  for await (const entry of dir.values()) {
    if (entry.kind !== 'file') continue;
    if (isDeviceFilePlaceholder(entry.name)) {
      unreadable++; // an evicted iCloud file that hasn't downloaded yet
      continue;
    }
    if (!isDeviceFile(entry.name)) continue;
    try {
      const file = await (entry as FileSystemFileHandle).getFile();
      bytes.push(new Uint8Array(await file.arrayBuffer()));
    } catch {
      unreadable++;
    }
  }
  return { bytes, unreadable };
}

async function isSameEntry(a: FileSystemDirectoryHandle, b: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return await a.isSameEntry(b);
  } catch {
    return false;
  }
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

// The File System Access permission methods aren't yet in lib.dom's types.
type PermissionedHandle = {
  queryPermission(d: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(d: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
};

function queryPermission(h: FileSystemDirectoryHandle): Promise<PermissionState> {
  return (h as unknown as PermissionedHandle).queryPermission({ mode: 'readwrite' });
}

function requestPermission(h: FileSystemDirectoryHandle): Promise<PermissionState> {
  return (h as unknown as PermissionedHandle).requestPermission({ mode: 'readwrite' });
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

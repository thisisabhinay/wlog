const FILE_PREFIX = 'device-';
const FILE_SUFFIX = '.wlg';

/**
 * Mint a fresh, unique file name for this device: `device-<uuid>.wlg` (a Work
 * Logbook file — Automerge binary under the hood). Uses `crypto.randomUUID()`
 * (122 bits) so two devices never collide, and the name is persisted per-folder
 * in IndexedDB ([[handle-store]]) rather than re-derived, so each device keeps
 * writing its own file. See ADR 0013.
 */
export function newDeviceFileName(): string {
  return `${FILE_PREFIX}${crypto.randomUUID()}${FILE_SUFFIX}`;
}

export function isDeviceFile(name: string): boolean {
  return name.startsWith(FILE_PREFIX) && name.endsWith(FILE_SUFFIX);
}

/**
 * True for a not-yet-downloaded iCloud placeholder of a device file. macOS
 * represents an evicted file `device-<id>.wlg` as a hidden `.device-<id>.wlg.icloud`
 * stub, which can't be read — we count these so the UI can warn instead of
 * silently merging incomplete data. See ADR 0015.
 */
export function isDeviceFilePlaceholder(name: string): boolean {
  return name.endsWith('.icloud') && name.includes(FILE_PREFIX) && name.includes(FILE_SUFFIX);
}

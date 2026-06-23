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

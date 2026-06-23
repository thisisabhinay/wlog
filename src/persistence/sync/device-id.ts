import { nanoid } from 'nanoid';

const STORAGE_KEY = 'wlog:device-id';

/**
 * A stable id for this browser install, persisted in localStorage. Each device
 * owns exactly one change file named `device-<id>.wlg` (a Work Logbook file —
 * Automerge binary under the hood), so no two devices ever write the same file
 * and the sync transport (iCloud/Dropbox) never has a contended file to
 * resolve. See ADR 0013.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = nanoid(10);
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

const FILE_PREFIX = 'device-';
const FILE_SUFFIX = '.wlg';

export function deviceFileName(deviceId: string): string {
  return `${FILE_PREFIX}${deviceId}${FILE_SUFFIX}`;
}

export function isDeviceFile(name: string): boolean {
  return name.startsWith(FILE_PREFIX) && name.endsWith(FILE_SUFFIX);
}

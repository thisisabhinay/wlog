import { useCallback, useEffect, useMemo } from 'react';
import { useDocStore } from '#store/use-doc';
import { DirectoryAdapter, supportsDirectoryAccess } from './directory-adapter';
import { DownloadUploadAdapter } from './download-adapter';
import type { PersistencePort } from './port';

// Multi-device sync via a linked folder of per-device Automerge files (ADR 0013).
// Browsers without the File System Access directory picker fall back to the
// single-file download/upload flow (no cross-device merge — accepted degradation).
const adapter: PersistencePort = supportsDirectoryAccess()
  ? new DirectoryAdapter()
  : new DownloadUploadAdapter();

export function usePersistence() {
  const doc = useDocStore((s) => s.doc);
  const isDirty = useDocStore((s) => s.isDirty);
  const setDoc = useDocStore((s) => s.setDoc);
  const markClean = useDocStore((s) => s.markClean);
  const needsReconnect = useDocStore((s) => s.needsReconnect);
  const setNeedsReconnect = useDocStore((s) => s.setNeedsReconnect);
  const setSaveStatus = useDocStore((s) => s.setSaveStatus);

  const save = useCallback(async () => {
    const result = await adapter.save(doc);
    if (result.ok) markClean();
    return result;
  }, [doc, markClean]);

  const saveAs = useCallback(async () => {
    const result = await adapter.saveAs(doc);
    if (result.ok) {
      markClean();
      setNeedsReconnect(false);
    }
    return result;
  }, [doc, markClean, setNeedsReconnect]);

  const open = useCallback(async () => {
    const result = await adapter.open();
    if (result.ok) setDoc(result.doc);
    setNeedsReconnect(false);
    return result;
  }, [setDoc, setNeedsReconnect]);

  // Re-grant access to a folder linked in a previous session (one user gesture,
  // no folder re-pick), then pull in everything that changed while we were away.
  const reconnect = useCallback(async () => {
    const result = await adapter.reconnect();
    if (result.status === 'ready') {
      setNeedsReconnect(false);
      if (result.doc) setDoc(result.doc);
    }
    return result;
  }, [setDoc, setNeedsReconnect]);

  // Forget the linked folder. Your data stays in the store (and the folder's
  // files stay on disk); the next save/open starts a fresh link.
  const forget = useCallback(async () => {
    await adapter.forget();
    setNeedsReconnect(false);
    setSaveStatus('idle'); // also nudges a re-render so autoSaveReady recomputes
  }, [setNeedsReconnect, setSaveStatus]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return useMemo(
    () => ({
      save, saveAs, open, reconnect, forget, isDirty, needsReconnect,
      hasFolderSync: supportsDirectoryAccess(),
      // Whether silent auto-save has a file target yet. Recomputed each render;
      // the transitions that flip it (open/save) all trigger a re-render.
      autoSaveReady: adapter.canAutoSave(),
    }),
    [save, saveAs, open, reconnect, forget, isDirty, needsReconnect]
  );
}

const AUTOSAVE_DEBOUNCE_MS = 1200;

/**
 * Debounced background save to the currently-open file. Mounted once at the
 * app root. No-op until a file has been opened/saved (so the adapter has a
 * target to write to without prompting). Drives the header save-status pill.
 */
export function useAutoSave() {
  const doc = useDocStore((s) => s.doc);
  const isDirty = useDocStore((s) => s.isDirty);
  const markClean = useDocStore((s) => s.markClean);
  const setSaveStatus = useDocStore((s) => s.setSaveStatus);
  const setDoc = useDocStore((s) => s.setDoc);
  const setNeedsReconnect = useDocStore((s) => s.setNeedsReconnect);

  // On startup, re-attach the folder linked in a previous session so the user
  // doesn't re-pick it every reload, and pull in changes from other devices.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await adapter.restore();
      if (cancelled) return;
      if (result.status === 'ready') {
        if (result.doc) setDoc(result.doc);
      } else if (result.status === 'needs-permission') {
        setNeedsReconnect(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setDoc, setNeedsReconnect]);

  useEffect(() => {
    if (!isDirty || !adapter.canAutoSave()) return;
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      const result = await adapter.save(doc);
      if (result.ok) {
        markClean();
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [doc, isDirty, markClean, setSaveStatus]);
}

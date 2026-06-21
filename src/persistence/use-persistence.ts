import { useCallback, useEffect, useMemo } from 'react';
import { useDocStore } from '#store/use-doc';
import { FileSystemAccessAdapter, supportsFileSystemAccess } from './fs-access-adapter';
import { DownloadUploadAdapter } from './download-adapter';
import type { PersistencePort } from './port';

const adapter: PersistencePort = supportsFileSystemAccess()
  ? new FileSystemAccessAdapter()
  : new DownloadUploadAdapter();

export function usePersistence() {
  const doc = useDocStore((s) => s.doc);
  const isDirty = useDocStore((s) => s.isDirty);
  const setDoc = useDocStore((s) => s.setDoc);
  const markClean = useDocStore((s) => s.markClean);

  const save = useCallback(async () => {
    const result = await adapter.save(doc);
    if (result.ok) markClean();
    return result;
  }, [doc, markClean]);

  const saveAs = useCallback(async () => {
    const result = await adapter.saveAs(doc);
    if (result.ok) markClean();
    return result;
  }, [doc, markClean]);

  const open = useCallback(async () => {
    const result = await adapter.open();
    if (result.ok) setDoc(result.doc);
    return result;
  }, [setDoc]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return useMemo(
    () => ({ save, saveAs, open, isDirty, hasFileSystemAccess: supportsFileSystemAccess() }),
    [save, saveAs, open, isDirty]
  );
}

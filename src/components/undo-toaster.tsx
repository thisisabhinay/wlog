import { useEffect, useRef } from 'react';
import { useDocStore } from '#store/use-doc';
import { toast } from 'sonner';

function getActiveUndoPast(state: ReturnType<typeof useDocStore.getState>) {
  const wsId = state.doc.activeWorkspaceId;
  return state.undoStates[wsId]?.past ?? [];
}

export function UndoListener() {
  const undo = useDocStore((s) => s.undo);
  const prevLen = useRef(getActiveUndoPast(useDocStore.getState()).length);

  useEffect(() => {
    const unsub = useDocStore.subscribe((state) => {
      const past = getActiveUndoPast(state);
      const len = past.length;
      if (len > prevLen.current) {
        const cmd = past[len - 1];
        toast.success(cmd.label, {
          action: { label: 'Undo', onClick: () => undo() },
          duration: 4000,
        });
      }
      prevLen.current = len;
    });
    return unsub;
  }, [undo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useDocStore.getState().undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        useDocStore.getState().redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return null;
}

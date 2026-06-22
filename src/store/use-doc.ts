import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Doc, WorkspaceId, WorkspaceTemplate } from '#domain/schema';
import type { Command } from '#domain/commands';
import { createStarter, createWorkspaceFromTemplate } from '#domain/starter';
import { workspaceId as genWsId } from '#domain/id';

interface UndoState {
  past: Command[];
  future: Command[];
}

interface DocState {
  doc: Doc;
  undoStates: Record<string, UndoState>;
  isDirty: boolean;

  run: (cmd: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setActiveWorkspace: (id: WorkspaceId) => void;
  createWorkspace: (name: string, template: WorkspaceTemplate) => WorkspaceId;
  renameWorkspace: (id: WorkspaceId, name: string) => void;
  deleteWorkspace: (id: WorkspaceId) => boolean;
  setColumnWidth: (key: string, width: number) => void;

  setDoc: (doc: Doc) => void;
  markClean: () => void;
  resetToStarter: () => void;
}

function getActiveIndex(doc: Doc): number {
  return doc.workspaces.findIndex((w) => w.id === doc.activeWorkspaceId);
}

function getUndoState(undoStates: Record<string, UndoState>, wsId: string): UndoState {
  return undoStates[wsId] ?? { past: [], future: [] };
}

export const useDocStore = create<DocState>()(
  persist(
    (set, get) => ({
      doc: createStarter(),
      undoStates: {},
      isDirty: false,

      run: (cmd: Command) => {
        set((state) => {
          const wsId = state.doc.activeWorkspaceId;
          const idx = getActiveIndex(state.doc);
          if (idx === -1) return state;
          const ws = state.doc.workspaces[idx];
          const newWs = cmd.do(ws);
          const newWorkspaces = [...state.doc.workspaces];
          newWorkspaces[idx] = newWs;

          const us = getUndoState(state.undoStates, wsId);
          return {
            doc: { ...state.doc, workspaces: newWorkspaces },
            undoStates: {
              ...state.undoStates,
              [wsId]: { past: [...us.past, cmd], future: [] },
            },
            isDirty: true,
          };
        });
      },

      undo: () => {
        const state = get();
        const wsId = state.doc.activeWorkspaceId;
        const us = getUndoState(state.undoStates, wsId);
        if (us.past.length === 0) return;

        const idx = getActiveIndex(state.doc);
        if (idx === -1) return;

        const cmd = us.past[us.past.length - 1];
        const ws = state.doc.workspaces[idx];
        const newWs = cmd.undo(ws);
        const newWorkspaces = [...state.doc.workspaces];
        newWorkspaces[idx] = newWs;

        set({
          doc: { ...state.doc, workspaces: newWorkspaces },
          undoStates: {
            ...state.undoStates,
            [wsId]: {
              past: us.past.slice(0, -1),
              future: [cmd, ...us.future],
            },
          },
          isDirty: true,
        });
      },

      redo: () => {
        const state = get();
        const wsId = state.doc.activeWorkspaceId;
        const us = getUndoState(state.undoStates, wsId);
        if (us.future.length === 0) return;

        const idx = getActiveIndex(state.doc);
        if (idx === -1) return;

        const cmd = us.future[0];
        const ws = state.doc.workspaces[idx];
        const newWs = cmd.do(ws);
        const newWorkspaces = [...state.doc.workspaces];
        newWorkspaces[idx] = newWs;

        set({
          doc: { ...state.doc, workspaces: newWorkspaces },
          undoStates: {
            ...state.undoStates,
            [wsId]: {
              past: [...us.past, cmd],
              future: us.future.slice(1),
            },
          },
          isDirty: true,
        });
      },

      canUndo: () => {
        const s = get();
        return getUndoState(s.undoStates, s.doc.activeWorkspaceId).past.length > 0;
      },
      canRedo: () => {
        const s = get();
        return getUndoState(s.undoStates, s.doc.activeWorkspaceId).future.length > 0;
      },

      setActiveWorkspace: (id: WorkspaceId) => {
        set((state) => ({
          doc: { ...state.doc, activeWorkspaceId: id },
        }));
      },

      createWorkspace: (name: string, template: WorkspaceTemplate) => {
        const ws = createWorkspaceFromTemplate(name, template);
        set((state) => ({
          doc: {
            ...state.doc,
            activeWorkspaceId: ws.id,
            workspaces: [...state.doc.workspaces, ws],
          },
          isDirty: true,
        }));
        return ws.id;
      },

      renameWorkspace: (id: WorkspaceId, name: string) => {
        set((state) => ({
          doc: {
            ...state.doc,
            workspaces: state.doc.workspaces.map((w) =>
              w.id === id ? { ...w, name } : w
            ),
          },
          isDirty: true,
        }));
      },

      setColumnWidth: (key: string, width: number) => {
        set((state) => {
          const idx = getActiveIndex(state.doc);
          if (idx === -1) return state;
          const ws = state.doc.workspaces[idx];
          const newWs = { ...ws, columnWidths: { ...ws.columnWidths, [key]: width } };
          const newWorkspaces = [...state.doc.workspaces];
          newWorkspaces[idx] = newWs;
          return { doc: { ...state.doc, workspaces: newWorkspaces } };
        });
      },

      deleteWorkspace: (id: WorkspaceId) => {
        const state = get();
        if (state.doc.workspaces.length <= 1) return false;

        const remaining = state.doc.workspaces.filter((w) => w.id !== id);
        const newActiveId = state.doc.activeWorkspaceId === id
          ? remaining[0].id
          : state.doc.activeWorkspaceId;

        const { [id]: _, ...restUndo } = state.undoStates;
        set({
          doc: {
            ...state.doc,
            activeWorkspaceId: newActiveId,
            workspaces: remaining,
          },
          undoStates: restUndo,
          isDirty: true,
        });
        return true;
      },

      setDoc: (doc: Doc) => set({ doc, undoStates: {}, isDirty: false }),
      markClean: () => set({ isDirty: false }),
      resetToStarter: () => set({ doc: createStarter(), undoStates: {}, isDirty: true }),
    }),
    {
      name: 'work-logbook',
      partialize: (state) => ({ doc: state.doc }),
      version: 1,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version === 0 && state?.doc) {
          const doc = state.doc as Record<string, unknown>;
          if ((doc.meta as Record<string, unknown>)?.schemaVersion === 1) {
            const wsId = genWsId();
            return {
              doc: {
                meta: { schemaVersion: 2, appVersion: '0.2.0' },
                activeWorkspaceId: wsId,
                workspaces: [{
                  id: wsId,
                  name: 'My Logbook',
                  createdAt: new Date().toISOString(),
                  template: 'full' as const,
                  config: doc.config,
                  sheets: doc.sheets,
                  metrics: doc.metrics,
                  rowsBySheet: doc.rowsBySheet,
                  log: doc.log,
                }],
              },
            };
          }
        }
        return persisted;
      },
    }
  )
);

export function useDoc() {
  const doc = useDocStore((s) => s.doc);
  const workspace = useDocStore((s) => {
    const idx = s.doc.workspaces.findIndex((w) => w.id === s.doc.activeWorkspaceId);
    return s.doc.workspaces[idx];
  });
  const run = useDocStore((s) => s.run);
  const undo = useDocStore((s) => s.undo);
  const redo = useDocStore((s) => s.redo);
  const us = useDocStore((s) => s.undoStates[s.doc.activeWorkspaceId]);
  const canUndo = (us?.past.length ?? 0) > 0;
  const canRedo = (us?.future.length ?? 0) > 0;
  return { doc, workspace, run, undo, redo, canUndo, canRedo };
}

import { useEffect, useState } from 'react';
import {
  RotateCcw, Archive, Eye, Pencil, Trash2, Check, X,
  FolderSync, LayoutGrid, CalendarRange, AlertTriangle, Unlink, RefreshCw,
} from 'lucide-react';
import { useDoc, useDocStore } from '#store/use-doc';
import { usePersistence } from '#persistence/use-persistence';
import { commands } from '#domain/commands';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import { Label } from '#components/ui/label';
import type { MetricId, WorkspaceId } from '#domain/schema';

const SECTIONS = [
  { id: 'sync', label: 'Sync', icon: FolderSync },
  { id: 'workspaces', label: 'Workspaces', icon: LayoutGrid },
  { id: 'window', label: 'Window', icon: CalendarRange },
  { id: 'archived', label: 'Archived', icon: Archive },
  { id: 'danger', label: 'Danger zone', icon: AlertTriangle },
] as const;

const SECTION_IDS = SECTIONS.map((s) => s.id);

export function SettingsPage() {
  const activeId = useActiveSection(SECTION_IDS);

  return (
    <div className="flex gap-10 px-6 py-8 lg:px-10">
      <div className="min-w-0 flex-1 max-w-2xl space-y-12">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage sync, workspaces, and your logbook window.
          </p>
        </header>

        <SyncSection />
        <WorkspaceSection />
        <WindowSection />
        <ArchivedSection />
        <DangerSection />
      </div>

      <SectionNav activeId={activeId} />
    </div>
  );
}

/** Sticky right-side navigation with scrollspy highlighting. */
function SectionNav({ activeId }: { activeId: string }) {
  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <nav className="hidden lg:block w-48 shrink-0">
      <div className="sticky top-8 space-y-1">
        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          On this page
        </p>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = activeId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => go(s.id)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-70" />
              {s.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Section({
  id, title, description, children,
}: {
  id: string; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function SyncSection() {
  const doc = useDocStore((s) => s.doc);
  const { save, saveAs, open, reconnect, forget, isDirty, needsReconnect, hasFolderSync, autoSaveReady } = usePersistence();

  const handleForget = async () => {
    if (confirm('Forget the linked sync folder?\n\nYour data stays in this browser and the folder’s files are left untouched on disk. You’ll need to link a folder again to resume syncing.')) {
      await forget();
    }
  };

  return (
    <Section
      id="sync"
      title="Sync"
      description={
        hasFolderSync
          ? 'Link a folder (e.g. inside iCloud Drive). Each device writes its own file there, and Open merges changes from every device without losing any.'
          : 'This browser can’t link a folder — using the download/upload fallback (no cross-device merge).'
      }
    >
      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className={`inline-block h-2 w-2 rounded-full ${autoSaveReady ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
          <span className="font-medium">
            {autoSaveReady ? 'Folder linked' : 'No folder linked'}
          </span>
          <span className="text-muted-foreground">
            {autoSaveReady
              ? '— changes save automatically'
              : '— link a folder to enable auto-save and sync'}
          </span>
        </div>

        {needsReconnect && (
          <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            <span>A previously-linked folder needs you to re-grant access.</span>
            <Button size="sm" variant="outline" onClick={() => reconnect()}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reconnect
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => save()}>Save now</Button>
          <Button variant="outline" onClick={() => saveAs()}>
            {hasFolderSync ? 'Link folder…' : 'Save as…'}
          </Button>
          <Button variant="outline" onClick={() => open()}>Open…</Button>
        </div>

        {isDirty && <p className="text-xs text-amber-600">You have unsaved changes.</p>}
      </div>

      {hasFolderSync && autoSaveReady && (
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="text-sm">
            <p className="font-medium">Forget sync folder</p>
            <p className="text-muted-foreground">
              Unlink this device. Data and on-disk files are kept; re-link to resume syncing.
            </p>
          </div>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleForget}>
            <Unlink className="mr-1 h-4 w-4" /> Forget
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Tip: workspace “{doc.workspaces.find((w) => w.id === doc.activeWorkspaceId)?.name}” and all others sync together in one folder.
      </p>
    </Section>
  );
}

function WindowSection() {
  const { workspace, run } = useDoc();

  const handleStartMonthChange = (val: string) => {
    if (!val) return;
    run(commands.setConfig(workspace.config, { ...workspace.config, startMonth: val }));
  };

  const handleHorizonChange = (val: string) => {
    const n = parseInt(val, 10);
    if (!n || n < 1 || n > 36) return;
    run(commands.setConfig(workspace.config, { ...workspace.config, horizonMonths: n }));
  };

  return (
    <Section id="window" title="Window" description="The time range this workspace tracks.">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start month</Label>
          <Input
            type="month"
            value={workspace.config.startMonth}
            onChange={(e) => handleStartMonthChange(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Horizon (months)</Label>
          <Input
            type="number"
            min={1}
            max={36}
            value={workspace.config.horizonMonths}
            onChange={(e) => handleHorizonChange(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
    </Section>
  );
}

function ArchivedSection() {
  const { workspace, run } = useDoc();
  const [showArchived, setShowArchived] = useState(false);
  const archivedMetrics = workspace.metrics.filter((m) => m.archived);

  return (
    <Section id="archived" title="Archived" description="Restore metrics you’ve archived.">
      <Button variant="ghost" size="sm" onClick={() => setShowArchived(!showArchived)}>
        <Eye className="mr-1 h-4 w-4" />
        {showArchived ? 'Hide archived' : 'Show archived'}
      </Button>
      {showArchived && (
        <div className="space-y-2">
          {archivedMetrics.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing archived.</p>
          )}
          {archivedMetrics.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded border border-border p-2">
              <span className="text-sm">
                <Archive className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
                {m.label} (metric)
              </span>
              <Button size="sm" variant="ghost" onClick={() => run(commands.restoreMetric(m.id as MetricId))}>
                Restore
              </Button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function DangerSection() {
  const resetToStarter = useDocStore((s) => s.resetToStarter);
  return (
    <Section id="danger" title="Danger zone">
      <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
        <div className="text-sm">
          <p className="font-medium">Reset to starter</p>
          <p className="text-muted-foreground">Replace all data with the starter template.</p>
        </div>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm('Reset all data to the starter template? This cannot be undone.')) {
              resetToStarter();
            }
          }}
        >
          <RotateCcw className="mr-1 h-4 w-4" /> Reset
        </Button>
      </div>
    </Section>
  );
}

function WorkspaceSection() {
  const workspaces = useDocStore((s) => s.doc.workspaces);
  const renameWorkspace = useDocStore((s) => s.renameWorkspace);
  const deleteWorkspace = useDocStore((s) => s.deleteWorkspace);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameWorkspace(editingId as WorkspaceId, editName.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete workspace "${name}"? This cannot be undone.`)) {
      deleteWorkspace(id as WorkspaceId);
    }
  };

  return (
    <Section id="workspaces" title="Workspaces" description="Rename or remove your workspaces.">
      <div className="space-y-2">
        {workspaces.map((ws) => (
          <div key={ws.id} className="flex items-center gap-2 rounded border border-border p-2">
            {editingId === ws.id ? (
              <>
                <input
                  autoFocus
                  className="flex-1 text-sm bg-transparent border-b border-ring outline-none px-1"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={commitRename}
                  maxLength={60}
                />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={commitRename}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm truncate">{ws.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{ws.template}</span>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startRename(ws.id, ws.name)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  disabled={workspaces.length <= 1}
                  onClick={() => handleDelete(ws.id, ws.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

/** Tracks which section is in view for the right-side nav. */
function useActiveSection(ids: readonly string[]): string {
  const [activeId, setActiveId] = useState<string>(ids[0] ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      // Trigger when a section's top reaches the upper third of the viewport.
      { rootMargin: '0px 0px -65% 0px', threshold: 0 }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}

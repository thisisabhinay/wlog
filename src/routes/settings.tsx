import { useState } from 'react';
import { RotateCcw, Archive, Eye, Pencil, Trash2, Check, X } from 'lucide-react';
import { useDoc, useDocStore } from '#store/use-doc';
import { usePersistence } from '#persistence/use-persistence';
import { commands } from '#domain/commands';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import { Label } from '#components/ui/label';
import { Separator } from '#components/ui/separator';
import type { MetricId, WorkspaceId } from '#domain/schema';

export function SettingsPage() {
  const { workspace, run } = useDoc();
  const resetToStarter = useDocStore((s) => s.resetToStarter);
  const { save, saveAs, open, isDirty, hasFileSystemAccess } = usePersistence();
  const [showArchived, setShowArchived] = useState(false);

  const archivedSheets = workspace.sheets.filter((s) => !s.archived);
  const archivedMetrics = workspace.metrics.filter((m) => m.archived);

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
    <div className="p-6 max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <WorkspaceSection />

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Window</h2>
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
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">File</h2>
        <p className="text-sm text-muted-foreground">
          {hasFileSystemAccess
            ? 'File System Access API available — save directly to a file.'
            : 'Using download/upload fallback.'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save()}>Save</Button>
          <Button variant="outline" onClick={() => saveAs()}>Save as...</Button>
          <Button variant="outline" onClick={() => open()}>Open...</Button>
        </div>
        {isDirty && <p className="text-xs text-amber-600">You have unsaved changes.</p>}
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Archived</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {showArchived ? 'Hide' : 'Show archived'}
          </Button>
        </div>
        {showArchived && (
          <div className="space-y-2">
            {archivedSheets.length === 0 && archivedMetrics.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing archived.</p>
            )}
            {archivedMetrics.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded border border-border p-2">
                <span className="text-sm">
                  <Archive className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
                  {m.label} (metric)
                </span>
                <Button size="sm" variant="ghost" onClick={() => run(commands.restoreMetric(m.id as MetricId))}>
                  Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Danger zone</h2>
        <Button variant="destructive" onClick={() => {
          if (confirm('Reset all data to the starter template? This cannot be undone.')) {
            resetToStarter();
          }
        }}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reset to starter
        </Button>
      </section>
    </div>
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
    <section className="space-y-4">
      <h2 className="text-lg font-medium">Workspaces</h2>
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
    </section>
  );
}

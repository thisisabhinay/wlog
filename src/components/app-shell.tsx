import { Link, useMatchRoute } from '@tanstack/react-router';
import {
  CalendarCheck, Trophy, HeartPulse, BarChart3, Medal, Users, ClipboardCheck,
  BookOpen, Save, FolderOpen, Undo2, Redo2,
} from 'lucide-react';
import { useDoc, useDocStore } from '#store/use-doc';
import { usePersistence, useAutoSave } from '#persistence/use-persistence';
import { Button } from '#components/ui/button';
import { Separator } from '#components/ui/separator';
import { WorkspaceSwitcher } from '#components/workspace-switcher';
import { slugify } from '#lib/slugify';
import type { ReactNode } from 'react';

const SHEET_ICONS: Record<string, typeof CalendarCheck> = {
  'calendar-check': CalendarCheck,
  'trophy': Trophy,
  'heart-pulse': HeartPulse,
  'bar-chart-3': BarChart3,
  'medal': Medal,
  'users': Users,
  'clipboard-check': ClipboardCheck,
};

export function AppShell({ children }: { children: ReactNode }) {
  const { workspace, undo, redo, canUndo, canRedo } = useDoc();
  const { save, open, isDirty, autoSaveReady } = usePersistence();
  const saveStatus = useDocStore((s) => s.saveStatus);
  const matchRoute = useMatchRoute();
  const activeSheets = workspace.sheets.filter((s) => !s.archived);

  useAutoSave();

  // When changes exist but no file is linked yet, auto-save can't run — prompt
  // the one-time save that turns it on.
  const needsFirstSave = isDirty && !autoSaveReady && saveStatus !== 'saving';

  const indicator =
    saveStatus === 'saving'
      ? { text: 'Saving…', dot: 'bg-amber-500 animate-pulse', fg: 'text-amber-600', title: 'Auto-saving to your file…' }
      : saveStatus === 'error'
        ? { text: 'Save failed', dot: 'bg-red-500', fg: 'text-red-600', title: 'Could not write to the file. Click to retry.' }
        : needsFirstSave
          ? { text: 'Save to enable auto-save', dot: 'bg-amber-500', fg: 'text-amber-600', title: 'Pick a file once — after that, changes save automatically.' }
          : isDirty
            ? { text: 'Unsaved', dot: 'bg-amber-500', fg: 'text-amber-600', title: 'Unsaved changes' }
            : { text: 'Saved', dot: 'bg-emerald-500', fg: 'text-muted-foreground', title: autoSaveReady ? 'All changes saved automatically' : 'Saved' };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="px-4 pt-4 pb-2 flex flex-col items-start gap-0.5">
          <h1 className="text-base font-semibold text-sidebar-foreground tracking-tight">
            Work Log
          </h1>
          <button
            type="button"
            onClick={() => { void save(); }}
            title={indicator.title}
            className={`inline-flex items-center gap-1 text-xs ${indicator.fg} ${needsFirstSave || saveStatus === 'error' ? 'cursor-pointer hover:underline' : 'cursor-default'}`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${indicator.dot} shrink-0`} />
            {indicator.text}
          </button>
        </div>

        <div className="px-2 pb-1">
          <WorkspaceSwitcher />
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1">
          <NavItem to="/" label="Logs" icon={BookOpen} active={!!matchRoute({ to: '/' })} />
          <Separator className="my-2" />
          <p className="px-3 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Sheets
          </p>
          {activeSheets.map((sheet) => {
            const Icon = SHEET_ICONS[sheet.icon ?? ''] ?? BookOpen;
            const slug = slugify(sheet.name);
            const rowCount = sheet.kind === 'record'
              ? (workspace.rowsBySheet[sheet.id] ?? []).length
              : sheet.kind === 'matrix'
                ? sheet.metricIds.length
                : 0;
            return (
              <NavItem
                key={sheet.id}
                to={`/s/${slug}`}
                label={sheet.name}
                icon={Icon}
                badge={rowCount > 0 ? rowCount : undefined}
                active={!!matchRoute({ to: '/s/$sheetId', params: { sheetId: slug } })}
              />
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo} title="Undo">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo} title="Redo">
              <Redo2 className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => open()} title="Open file">
              <FolderOpen className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => save()} title="Save">
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

function NavItem({
  to, label, icon: Icon, badge, active,
}: {
  to: string; label: string; icon: typeof BookOpen; badge?: number; active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-60" />
      <span className="truncate">{label}</span>
      {badge != null && (
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{badge}</span>
      )}
    </Link>
  );
}

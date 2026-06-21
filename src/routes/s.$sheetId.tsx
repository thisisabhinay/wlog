import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Plus, Columns, Archive, Pencil, MoreHorizontal, Search } from 'lucide-react';
import { useDoc } from '#store/use-doc';
import { RecordTable } from '#components/sheet-view/record-table';
import { MatrixView } from '#components/derived/matrix-view';
import { FormView } from '#components/sheet-view/form-view';
import { MetricEditor } from '#components/schema-editor/metric-editor';
import { ColumnEditor } from '#components/schema-editor/column-editor';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '#components/ui/dropdown-menu';
import { commands } from '#domain/commands';
import { rowId } from '#domain/id';
import { slugify } from '#lib/slugify';
import type { SheetId } from '#domain/schema';

const SHEET_DESCRIPTIONS: Record<string, string> = {
  sh_commit: "Track promises you've made, their deadlines, and delivery status to demonstrate reliability.",
  sh_impact: 'Document your initiatives, their scope, and measurable outcomes for performance reviews.',
  sh_fehlth: 'Monitor core web vitals and engineering health metrics over time.',
  sh_headln: 'Track your engineering output — PRs, docs, mentoring, and cross-team contributions.',
  sh_stand: 'Compare your output against team benchmarks to understand where you rank.',
  sh_advoc: 'Build and maintain relationships with people who can vouch for your work.',
  sh_qrev: 'Self-assess against staff engineering competencies each quarter.',
};

export function SheetPage() {
  const { sheetId } = useParams({ strict: false }) as { sheetId: string };
  const { workspace, run } = useDoc();
  const sheet = workspace.sheets.find((s) => slugify(s.name) === sheetId) ??
    workspace.sheets.find((s) => s.id === sheetId);
  const [metricEditorOpen, setMetricEditorOpen] = useState(false);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');

  if (!sheet) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Sheet not found.</p>
      </div>
    );
  }

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== sheet.name) {
      run(commands.renameSheet(sheet.id as SheetId, sheet.name, newName.trim()));
    }
    setRenaming(false);
  };

  const handleArchive = () => {
    run(commands.archiveSheet(sheet.id as SheetId));
  };

  const handleAddRow = () => {
    if (sheet.kind !== 'record') return;
    const activeCols = sheet.columns.filter((c) => !c.archived);
    const newRow = {
      id: rowId(),
      cells: Object.fromEntries(activeCols.map((c) => [c.id, c.type === 'number' ? null : ''])),
    };
    run(commands.addRow(sheet.id as SheetId, newRow));
  };

  const handleNewReview = () => {
    if (sheet.kind !== 'form') return;
    const newRow = {
      id: rowId(),
      cells: Object.fromEntries(sheet.fields.map((f) => [f.id, f.type === 'number' ? null : ''])),
    };
    run(commands.addRow(sheet.id as SheetId, newRow));
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          {renaming ? (
            <input
              autoFocus
              className="text-2xl font-semibold tracking-tight bg-transparent border-b border-ring outline-none flex-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
              onBlur={handleRename}
            />
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight flex-1">{sheet.name}</h1>
          )}

        {sheet.kind === 'record' && (
          <>
            <div className="relative shrink-0">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-[200px]"
              />
            </div>
            <Button onClick={handleAddRow}>
              <Plus className="h-4 w-4 mr-1" /> Add row
            </Button>
            <Button variant="outline" onClick={() => setColumnEditorOpen(true)}>
              <Columns className="h-4 w-4 mr-1" /> Add column
            </Button>
          </>
        )}

        {sheet.kind === 'matrix' && (
          <Button variant="outline" onClick={() => setMetricEditorOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add metric
          </Button>
        )}

        {sheet.kind === 'form' && (
          <Button onClick={handleNewReview}>
            <Plus className="h-4 w-4 mr-1" /> New review
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="icon" variant="ghost" className="h-8 w-8" />}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setNewName(sheet.name); setRenaming(true); }}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleArchive}>
              <Archive className="h-4 w-4 mr-2" /> Archive sheet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
        {SHEET_DESCRIPTIONS[sheet.id] && (
          <p className="text-sm text-muted-foreground">{SHEET_DESCRIPTIONS[sheet.id]}</p>
        )}
      </div>

      {sheet.kind === 'record' && <RecordTable sheet={sheet} search={search} onAddRow={handleAddRow} />}
      {sheet.kind === 'matrix' && <MatrixView sheet={sheet} />}
      {sheet.kind === 'form' && <FormView sheet={sheet} onNew={handleNewReview} />}

      {metricEditorOpen && (
        <MetricEditor open onClose={() => setMetricEditorOpen(false)} />
      )}
      {columnEditorOpen && sheet.kind === 'record' && (
        <ColumnEditor open onClose={() => setColumnEditorOpen(false)} sheetId={sheet.id as SheetId} />
      )}
    </div>
  );
}

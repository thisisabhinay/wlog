import { useState, useCallback } from 'react';
import { Trash2, ClipboardList, Plus } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '#components/ui/table';
import { Button } from '#components/ui/button';
import { useDoc, useDocStore } from '#store/use-doc';
import { commands } from '#domain/commands';
import { cellRegistry } from '#components/cells';
import { KpiCards } from '#components/kpi-cards';
import { EmptyState } from '#components/empty-state';
import { ColumnHeaderWithTooltip, type SortState } from '#components/column-header-tooltip';
import { getSheetKpis } from '#domain/selectors';
import type { SheetDef, ColumnDef, ColumnId, SheetId } from '#domain/schema';

const DEFAULT_COL_WIDTH = 150;

export function RecordTable({
  sheet,
  search,
  onAddRow,
}: {
  sheet: Extract<SheetDef, { kind: 'record' }>;
  search: string;
  onAddRow: () => void;
}) {
  const { workspace, run } = useDoc();
  const setColumnWidth = useDocStore((s) => s.setColumnWidth);
  const columnWidths = workspace.columnWidths ?? {};
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortState | null>(null);

  const activeCols = sheet.columns.filter((c) => !c.archived);
  const allRows = workspace.rowsBySheet[sheet.id] ?? [];
  const filtered = search
    ? allRows.filter((r) =>
        activeCols.some((c) => String(r.cells[c.id] ?? '').toLowerCase().includes(search.toLowerCase()))
      )
    : allRows;

  const rows = sort
    ? [...filtered].sort((a, b) => {
        const dir = sort.dir === 'asc' ? 1 : -1;
        const col = activeCols.find((c) => c.id === sort.key);
        if (!col) return 0;
        const va = a.cells[col.id];
        const vb = b.cells[col.id];
        if (va == null && vb == null) return 0;
        if (va == null) return dir;
        if (vb == null) return -dir;
        if (col.type === 'number') return dir * (Number(va) - Number(vb));
        return dir * String(va).localeCompare(String(vb));
      })
    : filtered;

  const kpis = getSheetKpis(workspace, sheet);

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const getWidth = (colId: string) =>
    columnWidths[`${sheet.id}:${colId}`] ?? DEFAULT_COL_WIDTH;

  const handleResizeStart = useCallback((colId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[`${sheet.id}:${colId}`] ?? DEFAULT_COL_WIDTH;
    const onMove = (ev: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + ev.clientX - startX);
      setColumnWidth(`${sheet.id}:${colId}`, newWidth);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sheet.id, columnWidths, setColumnWidth]);

  const handleEditCell = (rId: string, col: ColumnDef, oldValue: unknown, newValue: unknown) => {
    if (oldValue === newValue) return;
    run(commands.editCell(sheet.id as SheetId, rId as any, col.id as ColumnId, oldValue, newValue));
  };

  const handleDeleteSelected = () => {
    const toDelete = [...selected];
    toDelete.forEach((id) => {
      const idx = allRows.findIndex((r) => r.id === id);
      const row = allRows.find((r) => r.id === id);
      if (row && idx >= 0) run(commands.deleteRow(sheet.id as SheetId, row, idx));
    });
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  return (
    <div className="flex flex-col gap-4">
      <KpiCards kpis={kpis} />

      <div className="rounded-lg border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                  className="rounded"
                />
              </TableHead>
              {activeCols.map((col) => (
                <TableHead
                  key={col.id}
                  className="text-xs font-medium uppercase tracking-wider relative"
                  style={{ width: getWidth(col.id), minWidth: 50 }}
                >
                  <ColumnHeaderWithTooltip
                    columnId={col.id}
                    label={col.label}
                    sort={sort ?? undefined}
                    onSort={toggleSort}
                    resizable
                    onResizeStart={(e) => handleResizeStart(col.id, e)}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeCols.length + 1} className="p-0 border-0">
                  <EmptyState
                    icon={ClipboardList}
                    title="No entries yet"
                    description="Add your first row to start tracking."
                    action={{ label: 'Add row', onClick: onAddRow, icon: <Plus className="h-4 w-4 mr-1" /> }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className={selected.has(row.id) ? 'bg-accent/50' : ''}>
                  <TableCell className="w-10">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      className="rounded"
                    />
                  </TableCell>
                  {activeCols.map((col) => {
                    const Cell = cellRegistry[col.type];
                    return (
                      <TableCell
                        key={col.id}
                        className="p-0"
                        style={{ width: getWidth(col.id), maxWidth: getWidth(col.id) }}
                      >
                        <Cell
                          value={row.cells[col.id] as any}
                          onCommit={(v) => handleEditCell(row.id, col, row.cells[col.id], v)}
                          onCancel={() => {}}
                          options={col.options}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 shadow-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}

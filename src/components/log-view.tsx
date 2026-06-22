import { useState, useRef } from 'react';
import { Trash2, CalendarPlus, Plus, ChevronDown, Search } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '#components/ui/table';
import { Button } from '#components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '#components/ui/popover';
import { useDoc } from '#store/use-doc';
import { commands } from '#domain/commands';
import { EmptyState } from '#components/empty-state';
import { ColumnHeaderWithTooltip } from '#components/column-header-tooltip';
import type { MetricId, EventId } from '#domain/schema';

const LOG_COLUMNS = [
  { id: 'log_date', label: 'Date', width: '15%' },
  { id: 'log_metric', label: 'Metric', width: '35%' },
  { id: 'log_value', label: 'Value', width: '15%' },
  { id: 'log_note', label: 'Note', width: '30%' },
] as const;

export function LogView({ search, onAdd }: { search: string; onAdd: () => void }) {
  const { workspace, run } = useDoc();
  const activeMetrics = workspace.metrics.filter((m) => !m.archived);

  const entries = [...workspace.log];

  const getMetric = (id: MetricId) => workspace.metrics.find((m) => m.id === id);

  const filtered = search
    ? entries.filter((e) => {
        const metric = getMetric(e.metric);
        return (
          metric?.label.toLowerCase().includes(search.toLowerCase()) ||
          String(e.value).includes(search) ||
          e.note?.toLowerCase().includes(search.toLowerCase()) ||
          e.date.includes(search)
        );
      })
    : entries;

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  const handleEditField = (
    eId: EventId,
    field: string,
    oldEvent: (typeof workspace.log)[0],
    newValue: unknown,
  ) => {
    const newEvent = { ...oldEvent, [field]: newValue };
    run(commands.editEvent(eId, oldEvent, newEvent));
  };

  const handleDelete = (event: (typeof workspace.log)[0]) => {
    const idx = workspace.log.findIndex((e) => e.id === event.id);
    run(commands.deleteEvent(event, idx));
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-muted/50">
            {LOG_COLUMNS.map((col) => (
              <TableHead
                key={col.id}
                className="text-xs font-medium uppercase tracking-wider"
                style={{ width: col.width }}
              >
                <ColumnHeaderWithTooltip columnId={col.id} label={col.label} />
              </TableHead>
            ))}
            <TableHead style={{ width: '5%' }} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={LOG_COLUMNS.length + 1} className="p-0 border-0">
                <EmptyState
                  icon={CalendarPlus}
                  title="No log entries yet"
                  description="Log your first event to start building your dashboards."
                  action={{ label: 'Log event', onClick: onAdd, icon: <Plus className="h-4 w-4 mr-1" /> }}
                />
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="p-0">
                    <input
                      type="date"
                      className="w-full px-2 py-1.5 text-sm bg-transparent outline-none"
                      value={event.date}
                      onChange={(e) =>
                        handleEditField(event.id as EventId, 'date', event, e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell className="p-0">
                    <MetricPicker
                      value={event.metric}
                      metrics={activeMetrics}
                      onChange={(v) => handleEditField(event.id as EventId, 'metric', event, v)}
                    />
                  </TableCell>
                  <TableCell className="p-0">
                    <input
                      type="number"
                      step="any"
                      className="w-full px-2 py-1.5 text-sm bg-transparent outline-none tabular-nums"
                      value={event.value}
                      onChange={(e) =>
                        handleEditField(event.id as EventId, 'value', event, parseFloat(e.target.value) || 0)
                      }
                    />
                  </TableCell>
                  <TableCell className="p-0">
                    <input
                      className="w-full px-2 py-1.5 text-sm bg-transparent outline-none"
                      value={event.note ?? ''}
                      placeholder="Add note..."
                      onChange={(e) =>
                        handleEditField(event.id as EventId, 'note', event, e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(event)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function MetricPicker({
  value,
  metrics,
  onChange,
}: {
  value: MetricId;
  metrics: { id: MetricId; label: string; sheetId: string; agg: string }[];
  onChange: (id: MetricId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const { workspace } = useDoc();
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = metrics.find((m) => m.id === value);
  const selectedSheet = selected ? workspace.sheets.find((s) => s.id === selected.sheetId) : null;

  const filtered = filter
    ? metrics.filter((m) => m.label.toLowerCase().includes(filter.toLowerCase()))
    : metrics;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setFilter(''); }}>
      <PopoverTrigger
        className="w-full px-2 py-1 text-sm text-left flex items-center gap-1 cursor-pointer hover:bg-accent/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <span className="block truncate">{selected?.label ?? String(value)}</span>
          {selectedSheet && (
            <span className="block text-[11px] text-muted-foreground truncate leading-tight">
              {selectedSheet.name} → {selected?.agg === 'avg' ? 'monthly average' : 'monthly total'}
            </span>
          )}
        </div>
        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 gap-0" align="start">
        <div className="p-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              className="w-full pl-7 pr-2 py-1 text-sm border border-input rounded-md bg-transparent outline-none placeholder:text-muted-foreground focus:border-ring"
              placeholder="Search metrics..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1 pt-0">
          {filtered.map((m) => {
            const sheet = workspace.sheets.find((s) => s.id === m.sheetId);
            return (
              <button
                key={m.id}
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors ${m.id === value ? 'bg-accent' : ''}`}
                onClick={() => { onChange(m.id); setOpen(false); setFilter(''); }}
              >
                <span className="block truncate">{m.label}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {sheet?.name} → {m.agg === 'avg' ? 'monthly average' : 'monthly total'}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-3 text-center text-xs text-muted-foreground">No metrics found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

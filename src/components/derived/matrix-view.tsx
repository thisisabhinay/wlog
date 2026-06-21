import { useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '#components/ui/table';
import { useDoc } from '#store/use-doc';
import { buildMatrixView, formatMonthLabel } from '#domain/selectors';
import { KpiCards } from '#components/kpi-cards';
import { getSheetKpis } from '#domain/selectors';
import { ColumnHeaderWithTooltip, type SortState } from '#components/column-header-tooltip';
import { MetricDetailPanel } from '#components/metric-detail-panel';
import { TruncatedText } from '#components/truncated-text';
import { Sparkline } from './sparkline';
import { TrendBadge } from './trend-badge';
import type { SheetDef, MetricId } from '#domain/schema';

export function MatrixView({ sheet }: { sheet: Extract<SheetDef, { kind: 'matrix' }> }) {
  const { workspace } = useDoc();
  const view = buildMatrixView(workspace, sheet);
  const kpis = getSheetKpis(workspace, sheet);
  const [selectedMetric, setSelectedMetric] = useState<MetricId | null>(null);
  const [sort, setSort] = useState<SortState | null>(null);

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const sortedRows = sort
    ? [...view.rows].sort((a, b) => {
        const dir = sort.dir === 'asc' ? 1 : -1;
        switch (sort.key) {
          case 'metric': return dir * a.metric.label.localeCompare(b.metric.label);
          case 'better': return dir * (a.metric.direction ?? '').localeCompare(b.metric.direction ?? '');
          case 'target': return dir * ((a.metric.target ?? 0) - (b.metric.target ?? 0));
          case 'latest': return dir * ((a.latest ?? 0) - (b.latest ?? 0));
          case 'on_target': {
            const va = a.onTarget === true ? 1 : a.onTarget === false ? -1 : 0;
            const vb = b.onTarget === true ? 1 : b.onTarget === false ? -1 : 0;
            return dir * (va - vb);
          }
          case 'avg': {
            const parseNum = (s: string | number | null) => typeof s === 'number' ? s : parseFloat(String(s ?? '0')) || 0;
            return dir * (parseNum(a.avg) - parseNum(b.avg));
          }
          default: return 0;
        }
      })
    : view.rows;

  return (
    <div className="flex flex-col gap-4">
      <KpiCards kpis={kpis} />

      <p className="text-xs text-muted-foreground">
        Values are computed from the Log. To add data, log events on the Overview page or use ⌘K.
      </p>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-medium uppercase tracking-wider sticky left-0 bg-muted/50 min-w-[180px]">
                <ColumnHeaderWithTooltip columnId="metric" label="Metric" sort={sort ?? undefined} onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-center w-16">
                <ColumnHeaderWithTooltip columnId="better" label="Better" sort={sort ?? undefined} onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-center w-16">
                <ColumnHeaderWithTooltip columnId="target" label="Target" sort={sort ?? undefined} onSort={toggleSort} />
              </TableHead>
              {view.months.map((m) => (
                <TableHead key={m} className="text-xs font-medium uppercase tracking-wider text-center min-w-[70px]">
                  {formatMonthLabel(m)}
                </TableHead>
              ))}
              <TableHead className="text-xs font-medium uppercase tracking-wider text-center w-16">
                <ColumnHeaderWithTooltip columnId="latest" label="Latest" sort={sort ?? undefined} onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-center w-20">
                <ColumnHeaderWithTooltip columnId="on_target" label="On target?" sort={sort ?? undefined} onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-center w-16">
                <ColumnHeaderWithTooltip columnId="avg" label="Avg" sort={sort ?? undefined} onSort={toggleSort} />
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-center w-16">
                <ColumnHeaderWithTooltip columnId="trend" label="Trend" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row) => (
              <TableRow key={row.metric.id}>
                <TableCell className="font-medium text-sm sticky left-0 bg-background">
                  <button
                    className="text-left hover:underline underline-offset-2 cursor-pointer"
                    onClick={() => setSelectedMetric(row.metric.id)}
                  >
                    <TruncatedText>{row.metric.label}</TruncatedText>
                  </button>
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground capitalize">
                  {row.metric.direction ?? '—'}
                </TableCell>
                <TableCell className="text-center text-sm tabular-nums">
                  {row.metric.target != null ? row.metric.target : '—'}
                </TableCell>
                {row.values.map((v, i) => (
                  <TableCell key={view.months[i]} className="text-center text-sm tabular-nums">
                    {v != null ? (Number.isInteger(v) ? v : v.toFixed(1)) : '—'}
                  </TableCell>
                ))}
                <TableCell className="text-center text-sm font-medium tabular-nums">
                  {row.latest != null ? (Number.isInteger(row.latest) ? row.latest : row.latest.toFixed(1)) : '—'}
                </TableCell>
                <TableCell className="text-center">
                  {row.onTarget === true ? (
                    <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                  ) : row.onTarget === false ? (
                    <X className="h-4 w-4 text-red-500 mx-auto" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm tabular-nums">
                  {row.avg != null ? row.avg : '—'}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Sparkline values={row.values} direction={row.metric.direction} />
                    <TrendBadge trend={row.trend} direction={row.metric.direction} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedMetric && (
        <MetricDetailPanel
          metricId={selectedMetric}
          onClose={() => setSelectedMetric(null)}
        />
      )}
    </div>
  );
}

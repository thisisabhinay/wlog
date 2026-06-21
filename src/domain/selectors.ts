import type { Workspace, MetricId, SheetDef, MetricDef, LogEvent } from './schema';

export type MonthKey = string; // "2026-06"

export function formatMonthLabel(key: MonthKey): string {
  const [y, m] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]}'${y.slice(2)}`;
}

export function getMonthKey(dateStr: string): MonthKey {
  return dateStr.slice(0, 7);
}

export function generateMonthRange(startMonth: string, count: number): MonthKey[] {
  const [sy, sm] = startMonth.split('-').map(Number);
  const months: MonthKey[] = [];
  for (let i = 0; i < count; i++) {
    const m = ((sm - 1 + i) % 12) + 1;
    const y = sy + Math.floor((sm - 1 + i) / 12);
    months.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return months;
}

const AGG: Record<string, (vals: number[]) => number | null> = {
  avg: (v) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null,
  sum: (v) => v.length ? v.reduce((a, b) => a + b, 0) : null,
  latest: (v) => v.length ? v[v.length - 1] : null,
  min: (v) => v.length ? Math.min(...v) : null,
  max: (v) => v.length ? Math.max(...v) : null,
};

function bucketByMonth(log: LogEvent[], metricId: MetricId): Map<MonthKey, number[]> {
  const buckets = new Map<MonthKey, number[]>();
  for (const e of log) {
    if (e.metric !== metricId) continue;
    const key = getMonthKey(e.date);
    const arr = buckets.get(key);
    if (arr) arr.push(e.value);
    else buckets.set(key, [e.value]);
  }
  return buckets;
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'none';

function computeTrend(values: (number | null)[]): TrendDirection {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return 'none';
  const last = nums[nums.length - 1];
  const prev = nums[nums.length - 2];
  const diff = last - prev;
  if (Math.abs(diff) < 0.001) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

export interface MatrixRow {
  metric: MetricDef;
  values: (number | null)[];
  latest: number | null;
  avg: number | null;
  onTarget: boolean | null;
  trend: TrendDirection;
}

export interface MatrixView {
  kind: 'matrix';
  months: MonthKey[];
  rows: MatrixRow[];
  kpis: { onTarget: number; total: number; readingsLogged: number; totalActivity: number };
}

export function buildMatrixView(ws: Workspace, sheet: Extract<SheetDef, { kind: 'matrix' }>): MatrixView {
  const months = generateMonthRange(ws.config.startMonth, ws.config.horizonMonths);
  const rows: MatrixRow[] = [];
  let onTarget = 0;
  let total = 0;
  let readingsLogged = 0;
  let totalActivity = 0;

  for (const mId of sheet.metricIds) {
    const metric = ws.metrics.find((m) => m.id === mId);
    if (!metric || metric.archived) continue;
    total++;

    const buckets = bucketByMonth(ws.log, mId);
    const agg = AGG[metric.agg];

    const values = months.map((mo) => {
      const vals = buckets.get(mo);
      return vals ? agg(vals) : null;
    });

    const allVals = ws.log.filter((e) => e.metric === mId);
    readingsLogged += allVals.length;
    const allNums = allVals.map((e) => e.value);
    const totalAgg = agg(allNums);
    totalActivity += totalAgg ?? 0;

    const latest = [...values].reverse().find((v) => v !== null) ?? null;
    const avg = allNums.length ? allNums.reduce((a, b) => a + b, 0) / allNums.length : null;

    let isOnTarget: boolean | null = null;
    if (metric.target != null && latest != null) {
      isOnTarget = metric.direction === 'lower' ? latest <= metric.target : latest >= metric.target;
      if (isOnTarget) onTarget++;
    }

    rows.push({
      metric,
      values,
      latest,
      avg: avg != null ? Math.round(avg * 100) / 100 : null,
      onTarget: isOnTarget,
      trend: computeTrend(values),
    });
  }

  return { kind: 'matrix', months, rows, kpis: { onTarget, total, readingsLogged, totalActivity } };
}

export interface RecordKpis {
  [key: string]: string | number;
}

export function buildCommitmentKpis(ws: Workspace, sheetId: string): RecordKpis {
  const rows = ws.rowsBySheet[sheetId] ?? [];
  const done = rows.filter((r) => String(r.cells.c_status).startsWith('Done'));
  const onTime = rows.filter((r) => r.cells.c_status === 'Done on time');
  const inProgress = rows.filter((r) => r.cells.c_status === 'In progress');
  const slipped = rows.filter((r) => r.cells.c_status === 'Slipped');
  return {
    'On-time rate': done.length ? `${Math.round((onTime.length / done.length) * 100)}%` : '—',
    'Done': done.length,
    'In progress / Slipped': `${inProgress.length} / ${slipped.length}`,
  };
}

export function buildImpactKpis(ws: Workspace, sheetId: string): RecordKpis {
  const rows = ws.rowsBySheet[sheetId] ?? [];
  const multiTeam = rows.filter((r) => r.cells.i_scope === 'Multi-team' || r.cells.i_scope === 'Org-wide');
  const competencies = new Set(rows.map((r) => r.cells.i_comp).filter(Boolean));
  const hiAmb = rows.filter((r) => r.cells.i_ambig === 'High');
  return {
    'Initiatives': rows.length,
    'Multi-team+': multiTeam.length,
    'Competencies w/ evidence': `${competencies.size} / 6`,
    'High ambiguity': hiAmb.length,
  };
}

export function buildAdvocateKpis(ws: Workspace, sheetId: string): RecordKpis {
  const rows = ws.rowsBySheet[sheetId] ?? [];
  const will = rows.filter((r) => r.cells.a_adv === 'Yes');
  const warming = rows.filter((r) => r.cells.a_adv === 'Not yet' || r.cells.a_adv === 'Cooling');
  return {
    'Tracked': rows.length,
    'Will advocate': will.length,
    'Need warming': warming.length,
  };
}

export function getSheetKpis(ws: Workspace, sheet: SheetDef): RecordKpis {
  if (sheet.kind === 'matrix') {
    const view = buildMatrixView(ws, sheet);
    if (sheet.name === 'Frontend Health') {
      return {
        'On target': `${view.kpis.onTarget} / ${view.kpis.total}`,
        'Readings logged': view.kpis.readingsLogged,
      };
    }
    return {
      'Total activity': view.kpis.totalActivity,
      'Metrics tracked': view.kpis.total,
    };
  }

  switch (sheet.id) {
    case 'sh_commit': return buildCommitmentKpis(ws, sheet.id);
    case 'sh_impact': return buildImpactKpis(ws, sheet.id);
    case 'sh_advoc': return buildAdvocateKpis(ws, sheet.id);
    default: {
      const rows = ws.rowsBySheet[sheet.id] ?? [];
      return { 'Entries': rows.length };
    }
  }
}

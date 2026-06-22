import type { Doc, Workspace, SheetId, MetricId, ColumnId, ColumnDef, WorkspaceTemplate } from './schema';
import { APP_VERSION, CURRENT_SCHEMA_VERSION } from './envelope';
import { workspaceId } from './id';

function sid(s: string): SheetId { return s as SheetId; }
function mid(s: string): MetricId { return s as MetricId; }
function cid(s: string): ColumnId { return s as ColumnId; }

const S = {
  commitments: sid('sh_commit'),
  impact: sid('sh_impact'),
  feHealth: sid('sh_fehlth'),
  headlines: sid('sh_headln'),
  standing: sid('sh_stand'),
  advocates: sid('sh_advoc'),
  quarterly: sid('sh_qrev'),
} as const;

const M = {
  lcp: mid('m_lcp'), inp: mid('m_inp'), cls: mid('m_cls'),
  jsBundle: mid('m_jsbndl'), crashFree: mid('m_crash'),
  jsError: mid('m_jserr'), a11y: mid('m_a11y'),
  testCov: mid('m_testcv'), ciBuild: mid('m_cibld'),
  prLatency: mid('m_prlat'),
  prsReviewed: mid('m_prrev'), prsMerged: mid('m_prmrg'),
  rfcs: mid('m_rfcs'), incidents: mid('m_incid'),
  mentored: mid('m_mentr'), talks: mid('m_talks'),
  interviews: mid('m_intrv'), crossTeam: mid('m_xteam'),
} as const;

function col(id: string, label: string, type: ColumnDef['type'], opts?: Partial<ColumnDef>): ColumnDef {
  return { id: cid(id), label, type, required: false, archived: false, ...opts };
}

/**
 * Canonical, human-readable unit + plain-English description for each starter
 * metric, keyed by metric id. Sourced here so both the starter templates and
 * the persistence migration stay in sync. Units are spelled out (e.g.
 * "seconds" not "s") so they read clearly in the standalone Unit column.
 */
export const METRIC_META: Record<string, { unit: string; description: string }> = {
  m_lcp: { unit: 'seconds', description: 'Largest Contentful Paint — time until the main content is visible. Lower is faster.' },
  m_inp: { unit: 'milliseconds', description: 'Interaction to Next Paint — how quickly the UI responds to input. Lower is snappier.' },
  m_cls: { unit: 'score (0–1)', description: 'Cumulative Layout Shift — how much the page visually jumps while loading. 0 is rock-steady.' },
  m_jsbndl: { unit: 'KB (gzipped)', description: 'Size of the JavaScript bundle shipped to the browser, gzipped.' },
  m_crash: { unit: 'percent', description: 'Share of user sessions that finished without a crash.' },
  m_jserr: { unit: 'percent', description: 'Share of sessions that hit an uncaught JavaScript error.' },
  m_a11y: { unit: 'score (0–100)', description: 'Accessibility audit score, e.g. Lighthouse. Higher is more accessible.' },
  m_testcv: { unit: 'percent', description: 'Percentage of code exercised by automated tests.' },
  m_cibld: { unit: 'minutes', description: 'Wall-clock time for the CI pipeline to finish a build.' },
  m_prlat: { unit: 'hours', description: 'Median time from a pull request opening to its first review.' },
  m_prrev: { unit: 'PRs / month', description: 'Pull requests you reviewed this month.' },
  m_prmrg: { unit: 'PRs / month', description: 'Your pull requests merged or shipped this month.' },
  m_rfcs: { unit: 'docs / month', description: 'Design docs or RFCs you authored this month.' },
  m_incid: { unit: 'count / month', description: 'Incidents or on-call pages you handled this month.' },
  m_mentr: { unit: 'people / month', description: 'People you mentored or onboarded this month.' },
  m_talks: { unit: 'talks / month', description: 'Talks, demos, or brown-bag sessions you gave this month.' },
  m_intrv: { unit: 'count / month', description: 'Interviews you conducted this month.' },
  m_xteam: { unit: 'projects / month', description: 'Cross-team projects you shipped this month.' },
};

/** Backfill readable unit + description onto a metric from METRIC_META by id. */
export function applyMetricMeta<T extends { id: string }>(metric: T): T {
  const meta = METRIC_META[metric.id];
  return meta ? { ...metric, unit: meta.unit, description: meta.description } : metric;
}

const UNIT_ALIASES: Record<string, string> = {
  s: 'seconds', sec: 'seconds', ms: 'milliseconds',
  h: 'hours', hr: 'hours', hrs: 'hours', min: 'minutes', m: 'minutes',
  d: 'days', '%': 'percent', pct: 'percent', kb: 'KB', mb: 'MB',
};

/** Expand a cryptic unit abbreviation into a readable word for display. */
export function formatUnit(unit?: string): string {
  if (!unit) return '—';
  return UNIT_ALIASES[unit.trim().toLowerCase()] ?? unit;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fullTemplate(): Pick<Workspace, 'sheets' | 'metrics' | 'rowsBySheet' | 'log'> {
  return {
    sheets: [
      {
        id: S.commitments, kind: 'record', name: 'Commitments', icon: 'calendar-check',
        archived: false,
        columns: [
          col('c_date', 'Date made', 'date'),
          col('c_what', 'Commitment', 'text'),
          col('c_to', 'Promised to', 'text'),
          col('c_due', 'Due', 'date'),
          col('c_status', 'Status', 'select', { options: ['Done on time', 'Done late', 'In progress', 'Slipped', 'Dropped'] }),
          col('c_done', 'Done date', 'date'),
          col('c_notes', 'Notes', 'text'),
        ],
      },
      {
        id: S.impact, kind: 'record', name: 'Impact & Evidence', icon: 'trophy',
        archived: false,
        columns: [
          col('i_qtr', 'Quarter', 'text'),
          col('i_what', 'Initiative / what you did', 'text'),
          col('i_comp', 'Staff competency', 'select', {
            options: ['Technical Direction', 'Force Multiplication', 'Execution at Scope', 'Frontend Quality', 'Influence & Alignment', 'Product / Business Impact'],
          }),
          col('i_scope', 'Scope', 'select', { options: ['Team', 'Multi-team', 'Org-wide'] }),
          col('i_ambig', 'Ambiguity', 'select', { options: ['Low', 'Medium', 'High'] }),
          col('i_out', 'Outcome (quantified)', 'text'),
          col('i_link', 'Evidence link', 'link'),
          col('i_vouch', 'Who can vouch', 'text'),
        ],
      },
      {
        id: S.feHealth, kind: 'matrix', name: 'Frontend Health', icon: 'heart-pulse',
        archived: false, source: 'log',
        metricIds: [M.lcp, M.inp, M.cls, M.jsBundle, M.crashFree, M.jsError, M.a11y, M.testCov, M.ciBuild, M.prLatency],
      },
      {
        id: S.headlines, kind: 'matrix', name: 'Headline Metrics', icon: 'bar-chart-3',
        archived: false, source: 'log',
        metricIds: [M.prsReviewed, M.prsMerged, M.rfcs, M.incidents, M.mentored, M.talks, M.interviews, M.crossTeam],
      },
      {
        id: S.standing, kind: 'record', name: 'Standing', icon: 'medal',
        archived: false,
        columns: [
          col('st_month', 'Month', 'text'),
          col('st_mine', 'My count', 'number'),
          col('st_best', 'Team best', 'number'),
          col('st_rank', 'My rank', 'number'),
        ],
      },
      {
        id: S.advocates, kind: 'record', name: 'Advocates', icon: 'users',
        archived: false,
        columns: [
          col('a_name', 'Name', 'text'),
          col('a_team', 'Team / role', 'text'),
          col('a_help', "How you've helped them", 'text'),
          col('a_adv', 'Would advocate?', 'select', { options: ['Yes', 'Not yet', 'Cooling'] }),
          col('a_last', 'Last interaction', 'date'),
          col('a_next', 'Next touch', 'text'),
        ],
      },
      {
        id: S.quarterly, kind: 'form', name: 'Quarterly Review', icon: 'clipboard-check',
        archived: false,
        fields: [
          col('q_qtr', 'Quarter', 'text'),
          col('q_date', 'Date reviewed', 'date'),
          col('q_td_r', 'Technical Direction — rating (1-5)', 'number'),
          col('q_td_e', 'Technical Direction — evidence', 'text'),
          col('q_td_g', 'Technical Direction — gap', 'text'),
          col('q_td_a', 'Technical Direction — action', 'text'),
          col('q_fm_r', 'Force Multiplication — rating (1-5)', 'number'),
          col('q_fm_e', 'Force Multiplication — evidence', 'text'),
          col('q_fm_g', 'Force Multiplication — gap', 'text'),
          col('q_fm_a', 'Force Multiplication — action', 'text'),
          col('q_es_r', 'Execution at Scope — rating (1-5)', 'number'),
          col('q_es_e', 'Execution at Scope — evidence', 'text'),
          col('q_es_g', 'Execution at Scope — gap', 'text'),
          col('q_es_a', 'Execution at Scope — action', 'text'),
          col('q_fq_r', 'Frontend Quality — rating (1-5)', 'number'),
          col('q_fq_e', 'Frontend Quality — evidence', 'text'),
          col('q_fq_g', 'Frontend Quality — gap', 'text'),
          col('q_fq_a', 'Frontend Quality — action', 'text'),
          col('q_ia_r', 'Influence & Alignment — rating (1-5)', 'number'),
          col('q_ia_e', 'Influence & Alignment — evidence', 'text'),
          col('q_ia_g', 'Influence & Alignment — gap', 'text'),
          col('q_ia_a', 'Influence & Alignment — action', 'text'),
          col('q_pb_r', 'Product / Business Impact — rating (1-5)', 'number'),
          col('q_pb_e', 'Product / Business Impact — evidence', 'text'),
          col('q_pb_g', 'Product / Business Impact — gap', 'text'),
          col('q_pb_a', 'Product / Business Impact — action', 'text'),
        ],
      },
    ],
    metrics: ([
      { id: M.lcp, label: 'LCP (s)', sheetId: S.feHealth, agg: 'avg', direction: 'lower', target: 2.5, unit: 's', archived: false },
      { id: M.inp, label: 'INP (ms)', sheetId: S.feHealth, agg: 'avg', direction: 'lower', target: 200, unit: 'ms', archived: false },
      { id: M.cls, label: 'CLS', sheetId: S.feHealth, agg: 'avg', direction: 'lower', target: 0.1, archived: false },
      { id: M.jsBundle, label: 'JS bundle (KB gz)', sheetId: S.feHealth, agg: 'avg', direction: 'lower', unit: 'KB', archived: false },
      { id: M.crashFree, label: 'Crash-free sessions (%)', sheetId: S.feHealth, agg: 'avg', direction: 'higher', target: 99.5, unit: '%', archived: false },
      { id: M.jsError, label: 'JS error rate', sheetId: S.feHealth, agg: 'avg', direction: 'lower', archived: false },
      { id: M.a11y, label: 'a11y score', sheetId: S.feHealth, agg: 'avg', direction: 'higher', target: 95, archived: false },
      { id: M.testCov, label: 'Test coverage (%)', sheetId: S.feHealth, agg: 'avg', direction: 'higher', unit: '%', archived: false },
      { id: M.ciBuild, label: 'CI build time (min)', sheetId: S.feHealth, agg: 'avg', direction: 'lower', unit: 'min', archived: false },
      { id: M.prLatency, label: 'PR review latency (h)', sheetId: S.feHealth, agg: 'avg', direction: 'lower', target: 4, unit: 'h', archived: false },
      { id: M.prsReviewed, label: 'PRs reviewed', sheetId: S.headlines, agg: 'sum', archived: false },
      { id: M.prsMerged, label: 'PRs merged / shipped', sheetId: S.headlines, agg: 'sum', archived: false },
      { id: M.rfcs, label: 'Design docs / RFCs authored', sheetId: S.headlines, agg: 'sum', archived: false },
      { id: M.incidents, label: 'Incidents / on-call handled', sheetId: S.headlines, agg: 'sum', archived: false },
      { id: M.mentored, label: 'People mentored / onboarded', sheetId: S.headlines, agg: 'sum', archived: false },
      { id: M.talks, label: 'Talks / demos / brown-bags', sheetId: S.headlines, agg: 'sum', archived: false },
      { id: M.interviews, label: 'Interviews conducted', sheetId: S.headlines, agg: 'sum', archived: false },
      { id: M.crossTeam, label: 'Cross-team projects shipped', sheetId: S.headlines, agg: 'sum', archived: false },
    ] as Workspace['metrics']).map(applyMetricMeta),
    rowsBySheet: {
      [S.commitments]: [
        {
          id: 'r_c1' as any,
          cells: {
            c_date: '2026-06-10', c_what: 'Ship a11y fixes for checkout before release cut',
            c_to: 'Priya (PM)', c_due: '2026-06-18', c_status: 'Done on time',
            c_done: '2026-06-17', c_notes: '',
          },
        },
      ],
      [S.impact]: [
        {
          id: 'r_i1' as any,
          cells: {
            i_qtr: "Q2'26", i_what: 'Led design-system token migration; drove the RFC and onboarded 3 teams',
            i_comp: 'Force Multiplication', i_scope: 'Multi-team', i_ambig: 'High',
            i_out: 'Cut UI bug rate ~30%; unblocked 3 squads',
            i_link: '', i_vouch: 'Priya, Marco',
          },
        },
      ],
      [S.standing]: [],
      [S.advocates]: [
        {
          id: 'r_a1' as any,
          cells: {
            a_name: 'Marco', a_team: 'Platform / Staff Eng',
            a_help: 'Co-designed the token migration; reviews my RFCs',
            a_adv: 'Yes', a_last: '2026-06-12', a_next: 'Coffee in July',
          },
        },
      ],
      [S.quarterly]: [],
    },
    log: [
      { id: 'e1' as any, date: '2026-06-05', metric: M.prLatency, value: 3.5, note: '' },
      { id: 'e2' as any, date: '2026-06-09', metric: M.prLatency, value: 2, note: '' },
      { id: 'e3' as any, date: '2026-06-14', metric: M.prLatency, value: 5, note: '' },
      { id: 'e4' as any, date: '2026-06-05', metric: M.prsReviewed, value: 1, note: '' },
      { id: 'e5' as any, date: '2026-06-09', metric: M.prsReviewed, value: 1, note: '' },
      { id: 'e6' as any, date: '2026-06-14', metric: M.prsReviewed, value: 1, note: '' },
      { id: 'e7' as any, date: '2026-06-18', metric: M.prsReviewed, value: 1, note: '' },
      { id: 'e8' as any, date: '2026-06-12', metric: M.lcp, value: 2.3, note: '' },
      { id: 'e9' as any, date: '2026-06-26', metric: M.lcp, value: 2.1, note: '' },
      { id: 'e10' as any, date: '2026-06-15', metric: M.rfcs, value: 1, note: '' },
    ],
  };
}

function liteTemplate(): Pick<Workspace, 'sheets' | 'metrics' | 'rowsBySheet' | 'log'> {
  return {
    sheets: [
      {
        id: S.commitments, kind: 'record', name: 'Commitments', icon: 'calendar-check',
        archived: false,
        columns: [
          col('c_date', 'Date made', 'date'),
          col('c_what', 'Commitment', 'text'),
          col('c_to', 'Promised to', 'text'),
          col('c_due', 'Due', 'date'),
          col('c_status', 'Status', 'select', { options: ['Done on time', 'Done late', 'In progress', 'Slipped', 'Dropped'] }),
          col('c_done', 'Done date', 'date'),
          col('c_notes', 'Notes', 'text'),
        ],
      },
      {
        id: S.impact, kind: 'record', name: 'Impact & Evidence', icon: 'trophy',
        archived: false,
        columns: [
          col('i_qtr', 'Quarter', 'text'),
          col('i_what', 'Initiative / what you did', 'text'),
          col('i_out', 'Outcome (quantified)', 'text'),
          col('i_link', 'Evidence link', 'link'),
        ],
      },
      {
        id: S.headlines, kind: 'matrix', name: 'Headline Metrics', icon: 'bar-chart-3',
        archived: false, source: 'log',
        metricIds: [M.prsReviewed, M.prsMerged, M.rfcs, M.mentored, M.crossTeam],
      },
    ],
    metrics: ([
      { id: M.prsReviewed, label: 'PRs reviewed', sheetId: S.headlines, agg: 'sum', archived: false },
      { id: M.prsMerged, label: 'PRs merged / shipped', sheetId: S.headlines, agg: 'sum', archived: false },
      { id: M.rfcs, label: 'Design docs / RFCs authored', sheetId: S.headlines, agg: 'sum', archived: false },
      { id: M.mentored, label: 'People mentored / onboarded', sheetId: S.headlines, agg: 'sum', archived: false },
      { id: M.crossTeam, label: 'Cross-team projects shipped', sheetId: S.headlines, agg: 'sum', archived: false },
    ] as Workspace['metrics']).map(applyMetricMeta),
    rowsBySheet: {
      [S.commitments]: [],
      [S.impact]: [],
    },
    log: [],
  };
}

function blankTemplate(): Pick<Workspace, 'sheets' | 'metrics' | 'rowsBySheet' | 'log'> {
  return { sheets: [], metrics: [], rowsBySheet: {}, log: [] };
}

export function createWorkspaceFromTemplate(name: string, template: WorkspaceTemplate): Workspace {
  const data = template === 'full' ? fullTemplate()
    : template === 'lite' ? liteTemplate()
    : blankTemplate();

  return {
    id: workspaceId(),
    name,
    createdAt: new Date().toISOString(),
    template,
    config: { startMonth: currentMonth(), horizonMonths: 12 },
    ...data,
  };
}

export function createStarter(): Doc {
  const ws = createWorkspaceFromTemplate('My Logbook', 'full');
  return {
    meta: { schemaVersion: CURRENT_SCHEMA_VERSION, appVersion: APP_VERSION },
    activeWorkspaceId: ws.id,
    workspaces: [ws],
  };
}

export const COMPETENCIES = [
  'Technical Direction',
  'Force Multiplication',
  'Execution at Scope',
  'Frontend Quality',
  'Influence & Alignment',
  'Product / Business Impact',
] as const;

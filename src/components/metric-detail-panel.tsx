import { X, TrendingUp, TrendingDown, Target, Activity, BarChart3 } from 'lucide-react';
import { Button } from '#components/ui/button';
import { Badge } from '#components/ui/badge';
import { Separator } from '#components/ui/separator';
import { useDoc } from '#store/use-doc';
import { getMonthKey, formatMonthLabel } from '#domain/selectors';
import type { MetricId } from '#domain/schema';

const METRIC_DETAILS: Record<string, { description: string; examples: string[]; tip: string }> = {
  m_lcp: {
    description: 'Largest Contentful Paint measures how quickly the main content of a page becomes visible. It\'s a Core Web Vital that directly impacts user experience and SEO.',
    examples: ['Time from navigation start until the largest image or text block is rendered', 'Measured via Lighthouse, CrUX, or RUM tools'],
    tip: 'Focus on optimizing images, reducing server response time, and eliminating render-blocking resources.',
  },
  m_inp: {
    description: 'Interaction to Next Paint measures responsiveness — the delay between a user interaction (click, tap, key press) and the next frame rendered by the browser.',
    examples: ['Click a button → how long until the UI visually responds', 'Replaced FID as a Core Web Vital in March 2024'],
    tip: 'Break up long tasks, defer non-critical work, and optimize event handlers.',
  },
  m_cls: {
    description: 'Cumulative Layout Shift measures visual stability — how much the page content shifts unexpectedly during loading.',
    examples: ['An ad loads and pushes content down', 'A web font swaps and changes text size'],
    tip: 'Always set explicit dimensions on images/ads and use font-display: optional.',
  },
  m_jsbndl: {
    description: 'The total size of JavaScript sent to the browser, measured after gzip compression. Directly affects time-to-interactive.',
    examples: ['Main bundle + vendor chunks + lazy-loaded routes', 'Measured via webpack-bundle-analyzer or similar'],
    tip: 'Code-split aggressively, tree-shake dependencies, and audit large packages.',
  },
  m_crash: {
    description: 'Percentage of user sessions that complete without a JavaScript crash or unhandled exception.',
    examples: ['99.5% means 5 in 1,000 sessions hit a crash', 'Tracked via Sentry, Datadog, or similar APM'],
    tip: 'Add error boundaries, handle async failures gracefully, and triage crash reports weekly.',
  },
  m_jserr: {
    description: 'Rate of JavaScript errors per session or page view. Tracks overall code quality and runtime health.',
    examples: ['Unhandled promise rejections', 'TypeError from null references', 'Network request failures'],
    tip: 'Set up error monitoring alerts and fix top errors by volume weekly.',
  },
  m_a11y: {
    description: 'Lighthouse accessibility audit score (0–100). Measures conformance to WCAG guidelines for users with disabilities.',
    examples: ['Color contrast ratios', 'ARIA labels on interactive elements', 'Keyboard navigation support'],
    tip: 'Run axe-core in CI and fix violations before they ship.',
  },
  m_testcv: {
    description: 'Percentage of code covered by automated tests. Indicates confidence in making changes without breaking things.',
    examples: ['Line coverage from Jest/Vitest', 'Branch coverage for conditional logic'],
    tip: 'Focus coverage on critical paths rather than chasing 100%.',
  },
  m_cibld: {
    description: 'How long it takes from pushing code to getting CI results. Long builds slow down feedback loops and merges.',
    examples: ['Install + lint + type-check + test + build', 'Measured end-to-end from CI trigger to green/red'],
    tip: 'Parallelize test suites, cache dependencies, and skip unchanged packages.',
  },
  m_prlat: {
    description: 'Average time between opening a PR and receiving the first substantive code review. A key bottleneck in shipping velocity.',
    examples: ['PR opened Monday 2pm, first review Tuesday 10am = 20h', 'Excludes bot reviews and auto-approvals'],
    tip: 'Set team SLAs (e.g. review within 4h) and rotate review duties.',
  },
  m_prrev: {
    description: 'Number of pull requests you reviewed. Demonstrates force multiplication — helping the team ship faster.',
    examples: ['Thorough code reviews with actionable feedback', 'Design reviews on architecture PRs'],
    tip: 'Quality over quantity — a deep review of a complex PR counts more than rubber-stamping.',
  },
  m_prmrg: {
    description: 'Pull requests you authored that shipped to production. Measures direct engineering output.',
    examples: ['Feature PRs, bug fixes, refactors, infrastructure changes'],
    tip: 'Keep PRs small and focused for faster review cycles.',
  },
  m_rfcs: {
    description: 'Design documents, RFCs, or technical proposals you authored. Key evidence of technical direction at staff+ level.',
    examples: ['Architecture decision records', 'Migration proposals', 'API design docs'],
    tip: 'Write RFCs for any decision that affects multiple teams or is hard to reverse.',
  },
  m_incid: {
    description: 'Incidents you triaged, mitigated, or ran postmortems for. Shows operational ownership and crisis leadership.',
    examples: ['On-call pages responded to', 'Postmortems authored', 'Runbooks created or improved'],
    tip: 'After each incident, write a blameless postmortem with concrete action items.',
  },
  m_mentr: {
    description: 'People you mentored or helped onboard. Demonstrates investment in growing the team\'s capabilities.',
    examples: ['Onboarding new hires', 'Pairing sessions with junior engineers', 'Career guidance conversations'],
    tip: 'Track specific growth outcomes — "they shipped their first PR in week 2" > "I mentored them."',
  },
  m_talks: {
    description: 'Presentations, demos, or knowledge-sharing sessions you led. Amplifies your impact beyond your immediate team.',
    examples: ['Brown-bag talks on new technology', 'Sprint demos', 'Conference presentations'],
    tip: 'Record talks when possible for async viewing and broader reach.',
  },
  m_intrv: {
    description: 'Hiring interviews you conducted. Contributing to hiring quality is high-leverage work for the organization.',
    examples: ['Technical phone screens', 'On-site coding interviews', 'System design rounds'],
    tip: 'Calibrate regularly with other interviewers to maintain consistent standards.',
  },
  m_xteam: {
    description: 'Projects that required coordination across multiple teams to ship. Demonstrates execution at scope beyond your team.',
    examples: ['Platform migrations', 'Shared component libraries', 'Cross-team API integrations'],
    tip: 'Document cross-team dependencies and your role in unblocking others.',
  },
};

export function MetricDetailPanel({
  metricId,
  onClose,
}: {
  metricId: MetricId;
  onClose: () => void;
}) {
  const { workspace } = useDoc();
  const metric = workspace.metrics.find((m) => m.id === metricId);
  if (!metric) return null;

  const details = METRIC_DETAILS[metricId];
  const events = workspace.log
    .filter((e) => e.metric === metricId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const values = events.map((e) => e.value);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const latest = values.length ? values[0] : null;

  const isOnTarget = metric.target != null && latest != null
    ? metric.direction === 'lower' ? latest <= metric.target : latest >= metric.target
    : null;

  const byMonth = new Map<string, number[]>();
  for (const e of events) {
    const key = getMonthKey(e.date);
    const arr = byMonth.get(key);
    if (arr) arr.push(e.value);
    else byMonth.set(key, [e.value]);
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-[420px] max-w-full bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
      <div className="flex items-start justify-between p-5 pb-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{metric.label}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            {metric.unit && (
              <Badge variant="secondary" className="text-xs font-normal">{metric.unit}</Badge>
            )}
            <Badge variant="secondary" className="text-xs font-normal capitalize">
              {metric.agg}
            </Badge>
            {metric.direction && (
              <Badge variant="secondary" className="text-xs font-normal">
                {metric.direction === 'lower' ? (
                  <TrendingDown className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingUp className="h-3 w-3 mr-1" />
                )}
                {metric.direction} is better
              </Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 -mt-1 -mr-1" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {details && (
          <p className="text-sm text-muted-foreground leading-relaxed">{details.description}</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Latest"
            value={latest != null ? formatValue(latest) : '—'}
          />
          <StatCard
            icon={<Target className="h-3.5 w-3.5" />}
            label="Target"
            value={metric.target != null ? formatValue(metric.target) : '—'}
            status={isOnTarget === true ? 'good' : isOnTarget === false ? 'bad' : undefined}
          />
          <StatCard
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label="Average"
            value={avg != null ? formatValue(avg) : '—'}
          />
        </div>

        {details && details.examples.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">What this measures</h3>
              <ul className="space-y-1.5">
                {details.examples.map((ex, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-muted-foreground shrink-0 mt-0.5">•</span>
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {details?.tip && (
          <div className="rounded-lg bg-muted/50 border border-border px-3 py-2.5">
            <p className="text-xs font-medium text-muted-foreground mb-1">Improvement tip</p>
            <p className="text-sm">{details.tip}</p>
          </div>
        )}

        {events.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Recent readings ({events.length})
              </h3>
              <div className="space-y-1">
                {events.slice(0, 20).map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-muted-foreground tabular-nums">{formatDate(e.date)}</span>
                    <span className="font-medium tabular-nums">
                      {formatValue(e.value)}
                      {metric.unit ? ` ${metric.unit}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  status?: 'good' | 'bad';
}) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-base font-semibold tabular-nums ${
        status === 'good' ? 'text-emerald-600' : status === 'bad' ? 'text-red-500' : ''
      }`}>
        {value}
      </p>
    </div>
  );
}

function formatValue(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

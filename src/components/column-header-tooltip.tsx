import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '#components/ui/tooltip';

const COLUMN_DESCRIPTIONS: Record<string, string> = {
  c_date: 'When the commitment was made.',
  c_what: 'A clear, specific description of what you promised to deliver.',
  c_to: 'The person or team you committed to.',
  c_due: 'The agreed-upon deadline.',
  c_status: 'Current delivery status — tracks whether you hit your deadlines.',
  c_done: 'The actual completion date.',
  c_notes: 'Additional context, blockers, or follow-ups.',

  i_qtr: 'The quarter this work took place in (e.g. Q2\'26).',
  i_what: 'What you did and its significance. Be specific and action-oriented.',
  i_comp: 'Which staff-level competency this work demonstrates.',
  i_scope: 'How broadly this work impacted the organization.',
  i_ambig: 'How much ambiguity you navigated — higher means more impressive.',
  i_out: 'Measurable results. Use numbers: percentages, time saved, teams unblocked.',
  i_link: 'Link to the PR, doc, or artifact as evidence.',
  i_vouch: 'People who can confirm your contribution.',

  st_month: 'The month this snapshot covers.',
  st_mine: 'Your personal count for this metric.',
  st_best: 'The highest count on your team for comparison.',
  st_rank: 'Where you fall relative to your teammates.',

  a_name: 'The person you are building a relationship with.',
  a_team: 'Their team and role — helps you map your influence network.',
  a_help: "What you've done for them — the basis for reciprocal advocacy.",
  a_adv: 'Whether they would currently advocate for your promotion.',
  a_last: 'When you last had a meaningful interaction.',
  a_next: 'Your planned next touchpoint to keep the relationship warm.',

  metric: 'The performance indicator being tracked over time.',
  better: 'Whether this metric improves when the value goes higher or lower.',
  target: 'The goal value you are trying to achieve.',
  latest: 'The most recent recorded value across all periods.',
  on_target: 'Whether the latest value meets or exceeds the target.',
  avg: 'The average across all recorded values.',
  trend: 'Direction of recent change — shows momentum at a glance.',

  log_date: 'When this event occurred.',
  log_metric: 'Which metric this reading applies to.',
  log_sheet: 'The sheet this metric feeds into.',
  log_value: 'The numeric reading for this event.',
  log_unit: 'The unit of measurement for this metric.',
  log_agg: 'How values are combined each month.',
  log_note: 'Optional context about this specific data point.',
};

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

export function ColumnHeaderWithTooltip({
  columnId,
  label,
  sort,
  onSort,
  resizable,
  onResizeStart,
}: {
  columnId: string;
  label: string;
  sort?: SortState;
  onSort?: (key: string) => void;
  resizable?: boolean;
  onResizeStart?: (e: React.MouseEvent) => void;
}) {
  const description = COLUMN_DESCRIPTIONS[columnId];
  const isActive = sort?.key === columnId;
  const SortIcon = isActive
    ? sort.dir === 'asc' ? ArrowUp : ArrowDown
    : ArrowUpDown;

  const sortableClasses = `flex items-center gap-1 cursor-pointer select-none ${
    description ? 'underline decoration-dotted decoration-muted-foreground/40 underline-offset-4' : ''
  }`;

  const sortIcon = onSort ? (
    <SortIcon className={`h-3 w-3 shrink-0 ${isActive ? 'text-foreground' : 'text-muted-foreground/50'}`} />
  ) : null;

  const header = description ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<span />}
          className={sortableClasses}
          onClick={onSort ? () => onSort(columnId) : undefined}
        >
          {label}
          {sortIcon}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-left font-normal normal-case tracking-normal">
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <span
      role="button"
      tabIndex={0}
      onClick={onSort ? () => onSort(columnId) : undefined}
      onKeyDown={onSort ? (e) => { if (e.key === 'Enter') onSort(columnId); } : undefined}
      className={sortableClasses}
    >
      {label}
      {sortIcon}
    </span>
  );

  if (!resizable) return header;

  return (
    <div className="relative flex items-center w-full">
      {header}
      <div
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50"
        onMouseDown={onResizeStart}
      />
    </div>
  );
}

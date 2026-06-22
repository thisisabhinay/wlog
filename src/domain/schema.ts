import { z } from 'zod/v4';

export const SheetId = z.string().brand('SheetId');
export const MetricId = z.string().brand('MetricId');
export const ColumnId = z.string().brand('ColumnId');
export const RowId = z.string().brand('RowId');
export const EventId = z.string().brand('EventId');

export type SheetId = z.infer<typeof SheetId>;
export type MetricId = z.infer<typeof MetricId>;
export type ColumnId = z.infer<typeof ColumnId>;
export type RowId = z.infer<typeof RowId>;
export type EventId = z.infer<typeof EventId>;

export const AggType = z.enum(['avg', 'sum', 'latest', 'min', 'max']);
export type AggType = z.infer<typeof AggType>;

export const ColumnType = z.enum(['text', 'number', 'date', 'select', 'link']);
export type ColumnType = z.infer<typeof ColumnType>;

export const Direction = z.enum(['higher', 'lower']);
export type Direction = z.infer<typeof Direction>;

export const ColumnDef = z.object({
  id: ColumnId,
  label: z.string().min(1).max(60),
  type: ColumnType,
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  archived: z.boolean().default(false),
});
export type ColumnDef = z.infer<typeof ColumnDef>;

export const MetricDef = z.object({
  id: MetricId,
  label: z.string().min(1).max(60),
  sheetId: SheetId,
  agg: AggType,
  direction: Direction.optional(),
  target: z.number().optional(),
  unit: z.string().max(20).optional(),
  description: z.string().max(200).optional(),
  archived: z.boolean().default(false),
});
export type MetricDef = z.infer<typeof MetricDef>;

export const RecordSheetDef = z.object({
  id: SheetId,
  kind: z.literal('record'),
  name: z.string().min(1).max(60),
  icon: z.string().optional(),
  archived: z.boolean().default(false),
  columns: z.array(ColumnDef),
});

export const MatrixSheetDef = z.object({
  id: SheetId,
  kind: z.literal('matrix'),
  name: z.string().min(1).max(60),
  icon: z.string().optional(),
  archived: z.boolean().default(false),
  source: z.literal('log'),
  metricIds: z.array(MetricId),
});

export const FormSheetDef = z.object({
  id: SheetId,
  kind: z.literal('form'),
  name: z.string().min(1).max(60),
  icon: z.string().optional(),
  archived: z.boolean().default(false),
  fields: z.array(ColumnDef),
});

export const SheetDef = z.discriminatedUnion('kind', [
  RecordSheetDef,
  MatrixSheetDef,
  FormSheetDef,
]);
export type SheetDef = z.infer<typeof SheetDef>;

export const Row = z.object({
  id: RowId,
  cells: z.record(z.string(), z.unknown()),
});
export type Row = z.infer<typeof Row>;

export const LogEvent = z.object({
  id: EventId,
  date: z.string(),
  // Empty string = not yet assigned to a metric (freshly added, blank row).
  metric: MetricId,
  // null = value not yet filled in (freshly added, blank row).
  value: z.number().nullable(),
  note: z.string().optional(),
});
export type LogEvent = z.infer<typeof LogEvent>;

export const WorkspaceId = z.string().brand('WorkspaceId');
export type WorkspaceId = z.infer<typeof WorkspaceId>;

export const WorkspaceTemplate = z.enum(['full', 'lite', 'blank']);
export type WorkspaceTemplate = z.infer<typeof WorkspaceTemplate>;

export const Workspace = z.object({
  id: WorkspaceId,
  name: z.string().min(1).max(60),
  createdAt: z.string(),
  template: WorkspaceTemplate,
  config: z.object({
    startMonth: z.string(),
    horizonMonths: z.number().int().min(1).max(36),
  }),
  sheets: z.array(SheetDef),
  metrics: z.array(MetricDef),
  rowsBySheet: z.record(z.string(), z.array(Row)),
  log: z.array(LogEvent),
  columnWidths: z.record(z.string(), z.number()).optional(),
});
export type Workspace = z.infer<typeof Workspace>;

export const Doc = z.object({
  meta: z.object({
    schemaVersion: z.number().int(),
    appVersion: z.string(),
  }),
  activeWorkspaceId: WorkspaceId,
  workspaces: z.array(Workspace),
});
export type Doc = z.infer<typeof Doc>;

import { nanoid } from 'nanoid';
import type { SheetId, MetricId, ColumnId, RowId, EventId, WorkspaceId } from './schema';

export const sheetId = () => nanoid(10) as SheetId;
export const metricId = () => nanoid(10) as MetricId;
export const columnId = () => nanoid(10) as ColumnId;
export const rowId = () => nanoid(10) as RowId;
export const eventId = () => nanoid(10) as EventId;
export const workspaceId = () => nanoid(10) as WorkspaceId;

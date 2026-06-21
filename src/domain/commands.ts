import type { Workspace, SheetDef, MetricDef, ColumnDef, Row, LogEvent, SheetId, MetricId, ColumnId, RowId, EventId } from './schema';

export interface Command {
  readonly label: string;
  do(ws: Workspace): Workspace;
  undo(ws: Workspace): Workspace;
}

export const commands = {
  addRow(sheetId: SheetId, row: Row): Command {
    return {
      label: 'Add row',
      do: (ws) => ({
        ...ws,
        rowsBySheet: {
          ...ws.rowsBySheet,
          [sheetId]: [...(ws.rowsBySheet[sheetId] ?? []), row],
        },
      }),
      undo: (ws) => ({
        ...ws,
        rowsBySheet: {
          ...ws.rowsBySheet,
          [sheetId]: (ws.rowsBySheet[sheetId] ?? []).filter((r) => r.id !== row.id),
        },
      }),
    };
  },

  editCell(sheetId: SheetId, rowId: RowId, columnId: ColumnId, oldValue: unknown, newValue: unknown): Command {
    const apply = (ws: Workspace, val: unknown): Workspace => ({
      ...ws,
      rowsBySheet: {
        ...ws.rowsBySheet,
        [sheetId]: (ws.rowsBySheet[sheetId] ?? []).map((r) =>
          r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: val } } : r
        ),
      },
    });
    return {
      label: 'Edit cell',
      do: (ws) => apply(ws, newValue),
      undo: (ws) => apply(ws, oldValue),
    };
  },

  deleteRow(sheetId: SheetId, row: Row, index: number): Command {
    return {
      label: 'Delete row',
      do: (ws) => ({
        ...ws,
        rowsBySheet: {
          ...ws.rowsBySheet,
          [sheetId]: (ws.rowsBySheet[sheetId] ?? []).filter((r) => r.id !== row.id),
        },
      }),
      undo: (ws) => {
        const rows = [...(ws.rowsBySheet[sheetId] ?? [])];
        rows.splice(index, 0, row);
        return { ...ws, rowsBySheet: { ...ws.rowsBySheet, [sheetId]: rows } };
      },
    };
  },

  logEvent(event: LogEvent): Command {
    return {
      label: `Log ${event.value}`,
      do: (ws) => ({ ...ws, log: [...ws.log, event] }),
      undo: (ws) => ({ ...ws, log: ws.log.filter((e) => e.id !== event.id) }),
    };
  },

  editEvent(eventId: EventId, oldEvent: LogEvent, newEvent: LogEvent): Command {
    return {
      label: 'Edit log entry',
      do: (ws) => ({ ...ws, log: ws.log.map((e) => (e.id === eventId ? newEvent : e)) }),
      undo: (ws) => ({ ...ws, log: ws.log.map((e) => (e.id === eventId ? oldEvent : e)) }),
    };
  },

  deleteEvent(event: LogEvent, index: number): Command {
    return {
      label: 'Delete log entry',
      do: (ws) => ({ ...ws, log: ws.log.filter((e) => e.id !== event.id) }),
      undo: (ws) => {
        const log = [...ws.log];
        log.splice(index, 0, event);
        return { ...ws, log };
      },
    };
  },

  addMetric(metric: MetricDef): Command {
    return {
      label: `Add metric "${metric.label}"`,
      do: (ws) => {
        const sheet = ws.sheets.find((s) => s.id === metric.sheetId);
        let sheets = ws.sheets;
        if (sheet?.kind === 'matrix') {
          sheets = ws.sheets.map((s) =>
            s.id === metric.sheetId && s.kind === 'matrix'
              ? { ...s, metricIds: [...s.metricIds, metric.id] }
              : s
          );
        }
        return { ...ws, metrics: [...ws.metrics, metric], sheets };
      },
      undo: (ws) => {
        const sheets = ws.sheets.map((s) =>
          s.kind === 'matrix' ? { ...s, metricIds: s.metricIds.filter((id) => id !== metric.id) } : s
        );
        return { ...ws, metrics: ws.metrics.filter((m) => m.id !== metric.id), sheets };
      },
    };
  },

  editMetric(metricId: MetricId, oldMetric: MetricDef, newMetric: MetricDef): Command {
    return {
      label: `Edit metric "${newMetric.label}"`,
      do: (ws) => ({ ...ws, metrics: ws.metrics.map((m) => (m.id === metricId ? newMetric : m)) }),
      undo: (ws) => ({ ...ws, metrics: ws.metrics.map((m) => (m.id === metricId ? oldMetric : m)) }),
    };
  },

  archiveMetric(metricId: MetricId): Command {
    return {
      label: 'Archive metric',
      do: (ws) => ({
        ...ws,
        metrics: ws.metrics.map((m) => (m.id === metricId ? { ...m, archived: true } : m)),
      }),
      undo: (ws) => ({
        ...ws,
        metrics: ws.metrics.map((m) => (m.id === metricId ? { ...m, archived: false } : m)),
      }),
    };
  },

  restoreMetric(metricId: MetricId): Command {
    return {
      label: 'Restore metric',
      do: (ws) => ({
        ...ws,
        metrics: ws.metrics.map((m) => (m.id === metricId ? { ...m, archived: false } : m)),
      }),
      undo: (ws) => ({
        ...ws,
        metrics: ws.metrics.map((m) => (m.id === metricId ? { ...m, archived: true } : m)),
      }),
    };
  },

  addSheet(sheet: SheetDef): Command {
    return {
      label: `Add sheet "${sheet.name}"`,
      do: (ws) => ({
        ...ws,
        sheets: [...ws.sheets, sheet],
        rowsBySheet: { ...ws.rowsBySheet, [sheet.id]: [] },
      }),
      undo: (ws) => {
        const { [sheet.id]: _, ...rest } = ws.rowsBySheet;
        return { ...ws, sheets: ws.sheets.filter((s) => s.id !== sheet.id), rowsBySheet: rest };
      },
    };
  },

  renameSheet(sheetId: SheetId, oldName: string, newName: string): Command {
    const rename = (ws: Workspace, name: string): Workspace => ({
      ...ws,
      sheets: ws.sheets.map((s) => (s.id === sheetId ? { ...s, name } : s)),
    });
    return {
      label: `Rename sheet to "${newName}"`,
      do: (ws) => rename(ws, newName),
      undo: (ws) => rename(ws, oldName),
    };
  },

  archiveSheet(sheetId: SheetId): Command {
    return {
      label: 'Archive sheet',
      do: (ws) => ({
        ...ws,
        sheets: ws.sheets.map((s) => (s.id === sheetId ? { ...s, archived: true } : s)),
      }),
      undo: (ws) => ({
        ...ws,
        sheets: ws.sheets.map((s) => (s.id === sheetId ? { ...s, archived: false } : s)),
      }),
    };
  },

  addColumn(sheetId: SheetId, column: ColumnDef): Command {
    return {
      label: `Add column "${column.label}"`,
      do: (ws) => ({
        ...ws,
        sheets: ws.sheets.map((s) =>
          s.id === sheetId && s.kind === 'record'
            ? { ...s, columns: [...s.columns, column] }
            : s.id === sheetId && s.kind === 'form'
              ? { ...s, fields: [...s.fields, column] }
              : s
        ),
      }),
      undo: (ws) => ({
        ...ws,
        sheets: ws.sheets.map((s) =>
          s.id === sheetId && s.kind === 'record'
            ? { ...s, columns: s.columns.filter((c) => c.id !== column.id) }
            : s.id === sheetId && s.kind === 'form'
              ? { ...s, fields: s.fields.filter((c) => c.id !== column.id) }
              : s
        ),
      }),
    };
  },

  editColumn(sheetId: SheetId, columnId: ColumnId, oldCol: ColumnDef, newCol: ColumnDef): Command {
    const apply = (ws: Workspace, col: ColumnDef): Workspace => ({
      ...ws,
      sheets: ws.sheets.map((s) =>
        s.id === sheetId && s.kind === 'record'
          ? { ...s, columns: s.columns.map((c) => (c.id === columnId ? col : c)) }
          : s.id === sheetId && s.kind === 'form'
            ? { ...s, fields: s.fields.map((c) => (c.id === columnId ? col : c)) }
            : s
      ),
    });
    return {
      label: `Edit column "${newCol.label}"`,
      do: (ws) => apply(ws, newCol),
      undo: (ws) => apply(ws, oldCol),
    };
  },

  archiveColumn(sheetId: SheetId, columnId: ColumnId): Command {
    return {
      label: 'Archive column',
      do: (ws) => ({
        ...ws,
        sheets: ws.sheets.map((s) =>
          s.id === sheetId && s.kind === 'record'
            ? { ...s, columns: s.columns.map((c) => (c.id === columnId ? { ...c, archived: true } : c)) }
            : s
        ),
      }),
      undo: (ws) => ({
        ...ws,
        sheets: ws.sheets.map((s) =>
          s.id === sheetId && s.kind === 'record'
            ? { ...s, columns: s.columns.map((c) => (c.id === columnId ? { ...c, archived: false } : c)) }
            : s
        ),
      }),
    };
  },

  setConfig(oldConfig: Workspace['config'], newConfig: Workspace['config']): Command {
    return {
      label: 'Update config',
      do: (ws) => ({ ...ws, config: newConfig }),
      undo: (ws) => ({ ...ws, config: oldConfig }),
    };
  },
};

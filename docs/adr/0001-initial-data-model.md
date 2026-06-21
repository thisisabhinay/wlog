# ADR 0001: Initial Data Model

**Date:** 2026-06-15 (retrospective)
**Status:** Superseded by [ADR 0002](0002-multi-workspace-support.md)

## Decision

The app uses a single `Doc` object as its root data structure containing `meta`, `config`, `sheets`, `metrics`, `rowsBySheet`, and `log`. All data lives in one flat document — no concept of workspaces or tenancy.

## Schema

```
Doc {
  meta: { schemaVersion: 1, appVersion }
  config: { startMonth, horizonMonths }
  sheets: SheetDef[]
  metrics: MetricDef[]
  rowsBySheet: Record<SheetId, Row[]>
  log: LogEvent[]
}
```

Persisted as JSON envelope with `_fmt: "staff-fe-logbook"`, `schemaVersion: 1`.

## Rationale

Simplest model for a single-purpose career tracking tool. No multi-context needs at launch.

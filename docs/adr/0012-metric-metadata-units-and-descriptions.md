# ADR 0012: Metric Units & Descriptions with Canonical Metadata

**Date:** 2026-06-22
**Status:** Accepted
**Touches:** [ADR 0002](0002-multi-workspace-support.md) (schema), [ADR 0006](0006-zustand-store-with-localstorage-persistence.md) (persist migration)

## Decision

Metrics carry human-readable units and a plain-English description, surfaced wherever a metric is shown (log unit column, metric picker, tooltips):

- `MetricDef` gains `description?: string` (max 200) and widens `unit` from max 12 to max 20, so units can be spelled out ("seconds", not "s").
- Starter metric metadata lives in one place: `METRIC_META` in `starter.ts`, keyed by metric id. `applyMetricMeta()` backfills unit + description onto a metric. Both the starter templates and the migration call it, so they can't drift.
- `formatUnit()` expands cryptic abbreviations (`s`, `ms`, `%`, …) to readable words at display time via a `UNIT_ALIASES` map, and renders missing units as `—`. User-entered units that aren't aliased pass through unchanged.
- Existing users are upgraded by a localStorage persist migration: the store's `persist` version bumps `1 → 2`, and `migrate` maps `applyMetricMeta` over every workspace's metrics.

## Rationale

A bare number ("2.5", "200") is meaningless without a unit, and metric labels alone don't explain how a metric is counted. Spelled-out units read clearly in the standalone Unit column; descriptions give the "what/how" without cluttering the label.

Centralizing the metadata in `METRIC_META` keyed by id is the key decision: the same backfill function feeds both new workspaces (starter) and existing ones (migration), so the two paths stay in sync by construction instead of by copy-paste.

`formatUnit` aliases at the display layer rather than rewriting stored values, so user-typed units are preserved verbatim and only normalized for presentation.

## Alternatives Considered

- **Free-text unit only, no description** — Rejected. Doesn't explain how a metric is measured; tooltips/descriptions add real clarity for non-obvious metrics (CLS, INP, coverage).
- **Hard-coded unit/description inline on each starter metric** — Rejected. Duplicates the data between the starter and the migration; they would drift. A single keyed source avoids that.
- **Normalize units to canonical words at write time** — Rejected. Lossy for user-entered units and irreversible; display-time aliasing keeps stored data faithful.
- **Migrate via the file envelope only** — Rejected. Returning users hydrate from localStorage; the persist-layer migration (see [ADR 0006](0006-zustand-store-with-localstorage-persistence.md)) is the path that actually runs for them. The file `openEnvelope` path remains the other entry point.

## Consequences

- Two migration entry points now backfill metric metadata: the zustand `persist` migration (localStorage hydration) and, for opened files, the envelope layer. Both route through `applyMetricMeta`.
- Adding or changing a starter metric's unit/description means editing `METRIC_META`, not the template literals.
- Custom (non-starter) metrics get no auto-backfill — their unit/description come from what the user enters in the metric editor, which now includes a description field.

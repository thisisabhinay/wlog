# ADR 0011: Blank-by-Default Records and Null Value Semantics

**Date:** 2026-06-22
**Status:** Accepted
**Touches:** [ADR 0002](0002-multi-workspace-support.md) (schema)

## Decision

A newly added row or log entry starts **empty**, representing "not yet filled in" rather than seeded with fake data:

- `LogEvent.value` is now `number | null` (was `number`); a fresh log entry has `value: null` and `metric: ''` (no metric assigned yet).
- New sheet rows fill only sensible defaults via `defaultCellValue(type)`: **date** columns pre-fill today (the common case when logging), **number** columns are `null`, everything else is `''`.
- Aggregations and KPIs treat `null` as absent: `bucketByMonth` and the matrix view skip entries where `value == null`, so empty rows never distort averages, totals, or counts.

## Rationale

The previous behavior seeded new entries with `value: 0` and the first metric in the list. That `0` is indistinguishable from a real measurement and silently skews averages and totals; the auto-picked metric is often wrong. Starting blank makes a new record obviously a placeholder to complete, and keeps derived numbers honest until the user actually enters data.

A pre-filled **date** is the deliberate exception: when logging activity, "today" is almost always correct, so pre-filling removes a step without inventing a measurement.

## Alternatives Considered

- **Keep `value: 0` / first-metric defaults** — Rejected. `0` corrupts aggregations and reads as real data; the wrong default metric is a silent error.
- **Make `value` optional (omit the key) instead of nullable** — Rejected. An explicit `null` is clearer for a "blank but present" row, round-trips through JSON unambiguously, and is simpler to reason about in the editor (`value ?? ''`).
- **Block adding a row until all fields are valid** — Rejected. The app's flow is add-then-fill inline; a blank editable row is the point.

## Consequences

- Any code reading `LogEvent.value` must handle `null` — selectors filter it out before numeric work (`e.value as number` only after a `!= null` guard).
- The log view renders `null` as a `—` placeholder and writes `null` back when the field is cleared, never coercing empty input to `0`.
- Empty/partial rows are valid persisted state; importers and future validation must accept them.

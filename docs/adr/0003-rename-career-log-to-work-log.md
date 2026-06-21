# ADR 0003: Rename Career Log to Work Log

**Date:** 2026-06-21
**Status:** Accepted

## Decision

Rename the app from "Career Log" / "Career Logbook" to "Work Log" across all user-facing surfaces and internal identifiers.

## Rationale

With multi-workspace support, the app serves broader purposes (freelance, side projects, learning) beyond career tracking at a single company. "Work Log" better reflects this expanded scope.

## Changes

- HTML title, package name, UI header
- File format identifier: `staff-fe-logbook` to `work-logbook`
- localStorage key: `career-logbook` to `work-logbook`
- Suggested filenames: `career-logbook.json` to `work-logbook.json`

## Backward Compatibility

- `openEnvelope` accepts both `staff-fe-logbook` and `work-logbook` as valid `_fmt` values
- localStorage migration runs once on startup: copies `career-logbook` to `work-logbook`, removes old key
- New files are always written with `work-logbook` identifiers

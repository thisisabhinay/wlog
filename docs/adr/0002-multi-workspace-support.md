# ADR 0002: Multi-Workspace Support

**Date:** 2026-06-21
**Status:** Accepted
**Supersedes:** [ADR 0001](0001-initial-data-model.md)

## Decision

Introduce workspaces as isolated silos within a single file. Each workspace contains its own `config`, `sheets`, `metrics`, `rowsBySheet`, and `log`. The root `Doc` becomes a container for multiple workspaces.

## Schema (v2)

```
Doc {
  meta: { schemaVersion: 2, appVersion }
  activeWorkspaceId: WorkspaceId
  workspaces: Workspace[]
}

Workspace {
  id, name, createdAt, template
  config, sheets, metrics, rowsBySheet, log
}
```

## Key Decisions

- **Single file**: All workspaces in one JSON file. Simpler persistence, no index management.
- **Isolated silos**: No cross-workspace views or shared data. Can add later without schema change.
- **Per-workspace undo**: Undo stacks are scoped to each workspace. Switching workspaces preserves history.
- **Workspace CRUD is not undoable**: Create/rename/delete are direct mutations with confirmation dialogs.
- **Templates**: New workspaces can start from Full (7 sheets), Lite (3 sheets), or Blank.
- **No workspace in URL**: Active workspace is stored in the document, not the route. Single-user app, no deep-linking need.

## Migration (v1 to v2)

Existing v1 data wraps into a single workspace named "My Logbook" with template "full". The `migrate()` function in `envelope.ts` handles this automatically on file open and localStorage hydration.

# Architecture Decision Records

Immutable, additive log of significant decisions. Once accepted, an ADR is never
edited — when a decision changes, a new ADR supersedes it and this index is updated
to reflect current status.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-initial-data-model.md) | Initial data model | Accepted |
| [0002](0002-multi-workspace-support.md) | Multi-workspace support | Accepted |
| [0003](0003-rename-career-log-to-work-log.md) | Rename career-log to work-log | Accepted |
| [0004](0004-client-rendered-spa-on-vite.md) | Client-rendered SPA on Vite | Accepted |
| [0005](0005-tanstack-router.md) | TanStack Router | Accepted |
| [0006](0006-zustand-store-with-localstorage-persistence.md) | Zustand store with localStorage persistence | Accepted |
| [0007](0007-command-pattern-undo-redo.md) | Command pattern for undo/redo | Accepted |
| [0008](0008-local-first-file-persistence.md) | Local-first file persistence via port + adapters | Accepted — single-file assumption superseded by 0013 |
| [0009](0009-component-layer-shadcn-base-ui-tailwind.md) | Component layer: shadcn + Base UI + Tailwind | Accepted |
| [0010](0010-auto-save-to-linked-file.md) | Auto-save to the linked file | Accepted — whole-blob write superseded by 0013 |
| [0011](0011-blank-by-default-records-and-null-values.md) | Blank-by-default records and null values | Accepted |
| [0012](0012-metric-metadata-units-and-descriptions.md) | Metric metadata: units and descriptions | Accepted |
| [0013](0013-multi-device-sync-via-folder-of-per-device-automerge-files.md) | Multi-device sync via a folder of per-device Automerge files | Accepted — identity & handle details amended by 0014 |
| [0014](0014-persisted-folder-handle-and-per-folder-device-identity.md) | Persisted folder handle and per-folder device identity | Accepted |

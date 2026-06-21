import { z } from 'zod/v4';
import { Doc } from './schema';
import { workspaceId } from './id';

const CURRENT_SCHEMA_VERSION = 2;
const APP_VERSION = '0.2.0';

export const Envelope = z.object({
  _fmt: z.enum(['staff-fe-logbook', 'work-logbook']),
  schemaVersion: z.number().int(),
  exportedAt: z.string(),
  doc: z.unknown(),
});

export type OpenResult =
  | { ok: true; doc: Doc; migratedFrom?: number }
  | { ok: false; error: { code: 'NOT_OURS' | 'CORRUPT' | 'UNMIGRATABLE'; detail: string } };

function migrate(raw: unknown, fromVersion: number): unknown {
  let doc = raw;
  let v = fromVersion;
  while (v < CURRENT_SCHEMA_VERSION) {
    switch (v) {
      case 1: {
        const v1 = doc as Record<string, unknown>;
        const wsId = workspaceId();
        doc = {
          meta: { schemaVersion: 2, appVersion: APP_VERSION },
          activeWorkspaceId: wsId,
          workspaces: [{
            id: wsId,
            name: 'My Logbook',
            createdAt: new Date().toISOString(),
            template: 'full',
            config: v1.config,
            sheets: v1.sheets,
            metrics: v1.metrics,
            rowsBySheet: v1.rowsBySheet,
            log: v1.log,
          }],
        };
        v = 2;
        break;
      }
      default:
        return doc;
    }
  }
  return doc;
}

export function openEnvelope(json: unknown): OpenResult {
  const envResult = Envelope.safeParse(json);
  if (!envResult.success) {
    return { ok: false, error: { code: 'NOT_OURS', detail: 'Not a valid logbook file.' } };
  }

  const env = envResult.data;
  const migrated = migrate(env.doc, env.schemaVersion);
  const docResult = Doc.safeParse(migrated);

  if (!docResult.success) {
    return {
      ok: false,
      error: { code: 'CORRUPT', detail: `Invalid document structure: ${docResult.error.message}` },
    };
  }

  return {
    ok: true,
    doc: docResult.data,
    migratedFrom: env.schemaVersion < CURRENT_SCHEMA_VERSION ? env.schemaVersion : undefined,
  };
}

export function serialize(doc: Doc): string {
  const envelope = {
    _fmt: 'work-logbook' as const,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    doc,
  };
  return JSON.stringify(envelope, null, 2);
}

export { CURRENT_SCHEMA_VERSION, APP_VERSION };

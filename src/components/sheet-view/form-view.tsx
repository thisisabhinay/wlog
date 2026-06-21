import { useDoc } from '#store/use-doc';
import { commands } from '#domain/commands';
import { ClipboardCheck, Plus } from 'lucide-react';
import { EmptyState } from '#components/empty-state';
import type { SheetDef, SheetId } from '#domain/schema';
import { COMPETENCIES } from '#domain/starter';

const FIELD_PLACEHOLDERS: Record<string, string> = {
  _r: '1–5',
  _e: 'What did you do that demonstrates this competency?',
  _g: 'Where are you falling short?',
  _a: 'What will you do next quarter to close the gap?',
};

function getPlaceholder(fieldId: string): string {
  for (const [suffix, ph] of Object.entries(FIELD_PLACEHOLDERS)) {
    if (fieldId.endsWith(suffix)) return ph;
  }
  return '';
}

export function FormView({ sheet, onNew }: { sheet: Extract<SheetDef, { kind: 'form' }>; onNew: () => void }) {
  const { workspace, run } = useDoc();
  const rows = workspace.rowsBySheet[sheet.id] ?? [];
  const currentRow = rows[rows.length - 1];

  const handleEdit = (fieldId: string, newValue: unknown) => {
    if (!currentRow) return;
    const oldValue = currentRow.cells[fieldId];
    if (oldValue === newValue) return;
    run(commands.editCell(sheet.id as SheetId, currentRow.id, fieldId as any, oldValue, newValue));
  };

  if (!currentRow) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No quarterly review yet"
        description="Start your first self-assessment to track growth against staff-level competencies."
        action={{ label: 'Start quarterly review', onClick: onNew, icon: <Plus className="h-4 w-4 mr-1" /> }}
      />
    );
  }

  const competencyGroups = COMPETENCIES.map((comp) => {
    const prefix = {
      'Technical Direction': 'q_td',
      'Force Multiplication': 'q_fm',
      'Execution at Scope': 'q_es',
      'Frontend Quality': 'q_fq',
      'Influence & Alignment': 'q_ia',
      'Product / Business Impact': 'q_pb',
    }[comp]!;
    return {
      name: comp,
      ratingId: `${prefix}_r`,
      evidenceId: `${prefix}_e`,
      gapId: `${prefix}_g`,
      actionId: `${prefix}_a`,
    };
  });

  const inputClass = 'w-full h-8 px-2.5 text-sm border border-border rounded-md bg-transparent outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring/50';
  const textareaClass = 'w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-transparent outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring/50 resize-none';

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Quarter</label>
          <input
            className={`mt-1 ${inputClass}`}
            value={String(currentRow.cells['q_qtr'] ?? '')}
            onChange={(e) => handleEdit('q_qtr', e.target.value)}
            placeholder="e.g. Q2'26"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Date reviewed</label>
          <input
            type="date"
            className={`mt-1 ${inputClass}`}
            value={String(currentRow.cells['q_date'] ?? '')}
            onChange={(e) => handleEdit('q_date', e.target.value)}
          />
        </div>
      </div>

      {competencyGroups.map((group) => {
        const rating = currentRow.cells[group.ratingId];
        return (
          <div key={group.name} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">{group.name}</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Rating</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="w-16 h-7 px-2 text-sm text-center border border-border rounded-md bg-transparent outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring/50 tabular-nums"
                  value={rating != null ? String(rating) : ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? null : parseInt(e.target.value);
                    handleEdit(group.ratingId, v);
                  }}
                  placeholder="1–5"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Evidence</label>
                <textarea
                  className={`mt-1 ${textareaClass}`}
                  rows={2}
                  value={String(currentRow.cells[group.evidenceId] ?? '')}
                  onChange={(e) => handleEdit(group.evidenceId, e.target.value)}
                  placeholder={getPlaceholder(group.evidenceId)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Gap</label>
                <textarea
                  className={`mt-1 ${textareaClass}`}
                  rows={2}
                  value={String(currentRow.cells[group.gapId] ?? '')}
                  onChange={(e) => handleEdit(group.gapId, e.target.value)}
                  placeholder={getPlaceholder(group.gapId)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Action</label>
                <textarea
                  className={`mt-1 ${textareaClass}`}
                  rows={2}
                  value={String(currentRow.cells[group.actionId] ?? '')}
                  onChange={(e) => handleEdit(group.actionId, e.target.value)}
                  placeholder={getPlaceholder(group.actionId)}
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className="rounded-lg border border-border p-4 bg-muted/30">
        <h3 className="text-sm font-semibold mb-2">Reflection</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Did the scope / ambiguity of what I'm trusted with grow vs last quarter?</li>
          <li>Estimate calibration: how close did my 'done by X' actually land?</li>
          <li>What did I do that made other people measurably faster?</li>
          <li>Whose advocacy did I earn — or let go cold — this quarter?</li>
          <li>If the committee met today, what's the one thing they'd say is missing?</li>
        </ul>
      </div>
    </div>
  );
}

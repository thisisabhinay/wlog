import { useState, useRef, useEffect } from 'react';
import { TruncatedText } from '#components/truncated-text';
import type { CellProps } from './cell-types';

export function DateCell({ value, onCommit, onCancel }: CellProps<string>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const display = value ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }) : '';

  if (!editing) {
    return (
      <div
        className="cursor-text px-2 py-1 min-h-[32px] flex items-center w-full"
        onDoubleClick={() => { setDraft(String(value ?? '')); setEditing(true); }}
      >
        <TruncatedText className="text-sm">{display}</TruncatedText>
      </div>
    );
  }

  return (
    <div className="p-0.5">
      <input
        ref={inputRef}
        type="date"
        className="w-full px-2 py-1 text-sm ring-1 ring-ring rounded-sm bg-background outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onCommit(draft); setEditing(false); }
          if (e.key === 'Escape') { onCancel(); setEditing(false); }
        }}
        onBlur={() => { onCommit(draft); setEditing(false); }}
      />
    </div>
  );
}

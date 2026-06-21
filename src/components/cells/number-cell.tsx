import { useState, useRef, useEffect } from 'react';
import { TruncatedText } from '#components/truncated-text';
import type { CellProps } from './cell-types';

export function NumberCell({ value, onCommit, onCancel }: CellProps<number | null>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <div
        className="cursor-text px-2 py-1 min-h-[32px] flex items-center w-full"
        onDoubleClick={() => { setDraft(String(value ?? '')); setEditing(true); }}
      >
        <TruncatedText className="text-sm tabular-nums">{value != null ? String(value) : ''}</TruncatedText>
      </div>
    );
  }

  const commit = () => {
    const num = draft === '' ? null : parseFloat(draft);
    if (draft !== '' && isNaN(num!)) { onCancel(); }
    else { onCommit(num); }
    setEditing(false);
  };

  return (
    <div className="p-0.5">
      <input
        ref={inputRef}
        type="number"
        step="any"
        className="w-full px-2 py-1 text-sm ring-1 ring-ring rounded-sm bg-background outline-none tabular-nums"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { onCancel(); setEditing(false); }
        }}
        onBlur={commit}
      />
    </div>
  );
}

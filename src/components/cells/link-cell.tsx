import { useState, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import type { CellProps } from './cell-types';

export function LinkCell({ value, onCommit, onCancel }: CellProps<string>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const url = String(value ?? '');

  if (!editing) {
    return (
      <div
        className="cursor-text px-2 py-1 min-h-[32px] flex items-center gap-1 w-full"
        onDoubleClick={() => { setDraft(url); setEditing(true); }}
      >
        {url ? (
          <>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {url}
            </a>
            <ExternalLink className="h-3 w-3 shrink-0 text-blue-500" />
          </>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
    );
  }

  return (
    <div className="p-0.5">
      <input
        ref={inputRef}
        type="url"
        className="w-full px-2 py-1 text-sm ring-1 ring-ring rounded-sm bg-background outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="https://..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onCommit(draft); setEditing(false); }
          if (e.key === 'Escape') { onCancel(); setEditing(false); }
        }}
        onBlur={() => { onCommit(draft); setEditing(false); }}
      />
    </div>
  );
}

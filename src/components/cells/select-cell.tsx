import { useState } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '#components/ui/select';
import { Badge } from '#components/ui/badge';
import type { CellProps } from './cell-types';

const STATUS_COLORS: Record<string, string> = {
  'Done on time': 'bg-emerald-100 text-emerald-800',
  'Done late': 'bg-amber-100 text-amber-800',
  'In progress': 'bg-blue-100 text-blue-800',
  'Slipped': 'bg-orange-100 text-orange-800',
  'Dropped': 'bg-red-100 text-red-800',
  'Yes': 'bg-emerald-100 text-emerald-800',
  'Not yet': 'bg-amber-100 text-amber-800',
  'Cooling': 'bg-red-100 text-red-800',
  'High': 'bg-rose-100 text-rose-800',
  'Medium': 'bg-amber-100 text-amber-800',
  'Low': 'bg-blue-100 text-blue-800',
  'Team': 'bg-slate-100 text-slate-800',
  'Multi-team': 'bg-violet-100 text-violet-800',
  'Org-wide': 'bg-purple-100 text-purple-800',
};

export function SelectCell({ value, onCommit, options = [] }: CellProps<string>) {
  const [open, setOpen] = useState(false);
  const current = String(value ?? '');
  const colorClass = STATUS_COLORS[current];

  if (!open && current) {
    return (
      <div
        className="cursor-pointer px-2 py-1 min-h-[32px] flex items-center"
        onDoubleClick={() => setOpen(true)}
      >
        <Badge variant="secondary" className={`text-xs font-normal ${colorClass ?? ''}`}>
          {current}
        </Badge>
      </div>
    );
  }

  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      value={current}
      onValueChange={(v: string | null) => { if (v) { onCommit(v); setOpen(false); } }}
    >
      <SelectTrigger
        className="h-8 text-sm border-ring"
        onClick={() => setOpen(true)}
      >
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

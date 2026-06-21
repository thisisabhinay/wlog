import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '#components/ui/dialog';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import { Label } from '#components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '#components/ui/select';
import { useDoc } from '#store/use-doc';
import { commands } from '#domain/commands';
import { columnId } from '#domain/id';
import type { ColumnDef, ColumnType, SheetId } from '#domain/schema';

interface Props {
  open: boolean;
  onClose: () => void;
  sheetId: SheetId;
  existing?: ColumnDef;
}

export function ColumnEditor({ open, onClose, sheetId: sId, existing }: Props) {
  const { run } = useDoc();
  const [label, setLabel] = useState(existing?.label ?? '');
  const [type, setType] = useState<ColumnType>(existing?.type ?? 'text');
  const [optionsStr, setOptionsStr] = useState(existing?.options?.join(', ') ?? '');

  const handleSave = () => {
    if (!label.trim()) return;
    const col: ColumnDef = {
      id: existing?.id ?? columnId(),
      label: label.trim(),
      type,
      options: type === 'select' ? optionsStr.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      required: false,
      archived: false,
    };

    if (existing) {
      run(commands.editColumn(sId, existing.id, existing, col));
    } else {
      run(commands.addColumn(sId, col));
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit column' : 'Add column'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v: string | null) => { if (v) setType(v as ColumnType); }}>
              <SelectTrigger className="mt-1">
                <span className="flex flex-1 text-left truncate">{type}</span>
              </SelectTrigger>
              <SelectContent>
                {['text', 'number', 'date', 'select', 'link'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === 'select' && (
            <div>
              <Label>Options (comma-separated)</Label>
              <Input
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                className="mt-1"
                placeholder="Option 1, Option 2, Option 3"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!label.trim()}>
            {existing ? 'Save' : 'Add column'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { sheetId } from '#domain/id';
import type { SheetDef } from '#domain/schema';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SheetEditor({ open, onClose }: Props) {
  const { run } = useDoc();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'record' | 'matrix'>('record');

  const handleCreate = () => {
    if (!name.trim()) return;
    const id = sheetId();
    let sheet: SheetDef;
    if (kind === 'record') {
      sheet = { id, kind: 'record', name: name.trim(), archived: false, columns: [] };
    } else {
      sheet = { id, kind: 'matrix', name: name.trim(), archived: false, source: 'log', metricIds: [] };
    }
    run(commands.addSheet(sheet));
    onClose();
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add sheet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label>Sheet name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Side Projects" className="mt-1" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v: string | null) => { if (v) setKind(v as 'record' | 'matrix'); }}>
              <SelectTrigger className="mt-1">
                <span className="flex flex-1 text-left truncate">
                  {kind === 'record' ? 'Record (custom columns, manual entry)' : 'Matrix (auto-computed from Log)'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="record">Record (custom columns, manual entry)</SelectItem>
                <SelectItem value="matrix">Matrix (auto-computed from Log)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>Create sheet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

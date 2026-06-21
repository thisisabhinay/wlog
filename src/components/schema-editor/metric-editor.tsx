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
import { metricId } from '#domain/id';
import type { MetricDef, SheetId, AggType, Direction } from '#domain/schema';

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: MetricDef;
}

export function MetricEditor({ open, onClose, existing }: Props) {
  const { workspace, run } = useDoc();
  const matrixSheets = workspace.sheets.filter((s) => s.kind === 'matrix' && !s.archived);

  const [label, setLabel] = useState(existing?.label ?? '');
  const [sheetId, setSheetId] = useState<string>(existing?.sheetId ?? matrixSheets[0]?.id ?? '');
  const [agg, setAgg] = useState<AggType>(existing?.agg ?? 'avg');
  const [direction, setDirection] = useState<Direction | ''>(existing?.direction ?? '');
  const [target, setTarget] = useState(existing?.target != null ? String(existing.target) : '');
  const [unit, setUnit] = useState(existing?.unit ?? '');

  const handleSave = () => {
    if (!label.trim() || !sheetId) return;
    const metric: MetricDef = {
      id: existing?.id ?? metricId(),
      label: label.trim(),
      sheetId: sheetId as SheetId,
      agg,
      direction: direction || undefined,
      target: target ? parseFloat(target) : undefined,
      unit: unit || undefined,
      archived: false,
    };

    if (existing) {
      run(commands.editMetric(existing.id, existing, metric));
    } else {
      run(commands.addMetric(metric));
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit metric' : 'Add metric'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. LCP (s)" className="mt-1" />
          </div>
          <div>
            <Label>Dashboard</Label>
            <Select value={sheetId} onValueChange={(v: string | null) => { if (v) setSheetId(v); }}>
              <SelectTrigger className="mt-1">
                <span className="flex flex-1 text-left truncate">
                  {matrixSheets.find((s) => s.id === sheetId)?.name ?? sheetId}
                </span>
              </SelectTrigger>
              <SelectContent>
                {matrixSheets.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Aggregation</Label>
              <Select value={agg} onValueChange={(v: string | null) => { if (v) setAgg(v as AggType); }}>
                <SelectTrigger className="mt-1">
                  <span className="flex flex-1 text-left truncate">{agg}</span>
                </SelectTrigger>
                <SelectContent>
                  {['avg', 'sum', 'latest', 'min', 'max'].map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v: string | null) => { if (v) setDirection(v as Direction); }}>
                <SelectTrigger className="mt-1">
                  <span className="flex flex-1 text-left truncate">
                    {direction === 'lower' ? 'Lower is better' : direction === 'higher' ? 'Higher is better' : 'Optional'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lower">Lower is better</SelectItem>
                  <SelectItem value="higher">Higher is better</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Target</Label>
              <Input type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1" placeholder="Optional" />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1" placeholder="e.g. ms, %, h" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!label.trim()}>
            {existing ? 'Save' : 'Add metric'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

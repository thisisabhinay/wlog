import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '#components/ui/dialog';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import { Label } from '#components/ui/label';
import { useDocStore } from '#store/use-doc';
import type { WorkspaceTemplate } from '#domain/schema';

const TEMPLATES: { value: WorkspaceTemplate; label: string; description: string }[] = [
  { value: 'full', label: 'Full', description: '7 sheets, 18 metrics, sample data' },
  { value: 'lite', label: 'Lite', description: '3 sheets, 5 metrics, no sample data' },
  { value: 'blank', label: 'Blank', description: 'Empty workspace, start from scratch' },
];

export function CreateWorkspaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [template, setTemplate] = useState<WorkspaceTemplate>('blank');
  const createWorkspace = useDocStore((s) => s.createWorkspace);
  const navigate = useNavigate();

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createWorkspace(trimmed, template);
    navigate({ to: '/' });
    setName('');
    setTemplate('blank');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>
            Each workspace has its own sheets, metrics, and log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              autoFocus
              placeholder="e.g. Freelance, Side Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              className="mt-1"
              maxLength={60}
            />
          </div>

          <div>
            <Label>Template</Label>
            <div className="mt-1.5 grid gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTemplate(t.value)}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left text-sm transition-colors ${
                    template === t.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <span className="font-medium">{t.label}</span>
                  <span className="text-xs text-muted-foreground">{t.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

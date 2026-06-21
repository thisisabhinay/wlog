import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '#components/ui/command';
import { useDoc } from '#store/use-doc';
import { commands } from '#domain/commands';
import { eventId } from '#domain/id';
import type { MetricId } from '#domain/schema';

type Mode = 'navigate' | 'log-metric' | 'log-value';

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('navigate');
  const [selectedMetric, setSelectedMetric] = useState<MetricId | null>(null);
  const [value, setValue] = useState('');
  const { workspace, run } = useDoc();
  const navigate = useNavigate();
  const activeMetrics = workspace.metrics.filter((m) => !m.archived);
  const activeSheets = workspace.sheets.filter((s) => !s.archived);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setMode('navigate');
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const reset = () => {
    setMode('navigate');
    setSelectedMetric(null);
    setValue('');
    setOpen(false);
  };

  const handleLogMetric = (metricId: MetricId) => {
    setSelectedMetric(metricId);
    setMode('log-value');
  };

  const handleLogValue = () => {
    if (!selectedMetric || !value) return;
    const event = {
      id: eventId(),
      date: new Date().toISOString().slice(0, 10),
      metric: selectedMetric,
      value: parseFloat(value) || 0,
      note: '',
    };
    run(commands.logEvent(event));
    reset();
  };

  const metricLabel = selectedMetric
    ? workspace.metrics.find((m) => m.id === selectedMetric)?.label
    : '';

  return (
    <CommandDialog open={open} onOpenChange={(o) => { if (!o) reset(); else setOpen(true); }}>
      {mode === 'log-value' ? (
        <>
          <CommandInput placeholder={`Value for ${metricLabel}...`} value={value} onValueChange={setValue} />
          <CommandList>
            <CommandGroup heading="Press Enter to log">
              <CommandItem onSelect={handleLogValue} disabled={!value}>
                Log {value || '...'} for {metricLabel}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </>
      ) : (
        <>
          <CommandInput placeholder="Quick capture or navigate... (⌘K)" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Log a metric">
              {activeMetrics.map((m) => {
                const sheet = workspace.sheets.find((s) => s.id === m.sheetId);
                return (
                  <CommandItem key={m.id} onSelect={() => handleLogMetric(m.id)}>
                    <span className="flex-1">{m.label}</span>
                    <span className="text-xs text-muted-foreground">{sheet?.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => { navigate({ to: '/' }); reset(); }}>
                Overview
              </CommandItem>
              {activeSheets.map((s) => (
                <CommandItem
                  key={s.id}
                  onSelect={() => { navigate({ to: '/s/$sheetId', params: { sheetId: s.id } }); reset(); }}
                >
                  {s.name}
                </CommandItem>
              ))}
              <CommandItem onSelect={() => { navigate({ to: '/settings' }); reset(); }}>
                Settings
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </>
      )}
    </CommandDialog>
  );
}

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { LogView } from '#components/log-view';
import { useDoc } from '#store/use-doc';
import { KpiCards } from '#components/kpi-cards';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import { commands } from '#domain/commands';
import { eventId } from '#domain/id';

export function OverviewPage() {
  const { workspace, run } = useDoc();
  const [search, setSearch] = useState('');
  const logCount = workspace.log.length;
  const sheetCount = workspace.sheets.filter((s) => !s.archived).length;
  const metricCount = workspace.metrics.filter((m) => !m.archived).length;
  const activeMetrics = workspace.metrics.filter((m) => !m.archived);

  const handleAdd = () => {
    if (activeMetrics.length === 0) return;
    const event = {
      id: eventId(),
      date: new Date().toISOString().slice(0, 10),
      metric: activeMetrics[0].id,
      value: 0,
      note: '',
    };
    run(commands.logEvent(event));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight flex-1">Logs</h1>
          <div className="relative shrink-0">
            <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-[200px]"
            />
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> Log event
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Log raw events here. Dashboards compute themselves. Press ⌘K for quick capture.
        </p>
      </div>

      <KpiCards
        kpis={{
          'Log entries': logCount,
          'Active sheets': sheetCount,
          'Metrics tracked': metricCount,
        }}
      />

      <LogView search={search} onAdd={handleAdd} />
    </div>
  );
}

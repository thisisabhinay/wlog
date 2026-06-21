import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Check, ChevronsUpDown, Plus, Settings } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '#components/ui/dropdown-menu';
import { useDocStore } from '#store/use-doc';
import { CreateWorkspaceDialog } from './create-workspace-dialog';

export function WorkspaceSwitcher() {
  const workspaces = useDocStore((s) => s.doc.workspaces);
  const activeId = useDocStore((s) => s.doc.activeWorkspaceId);
  const setActive = useDocStore((s) => s.setActiveWorkspace);
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const active = workspaces.find((w) => w.id === activeId);

  const handleSwitch = (id: string) => {
    if (id === activeId) return;
    setActive(id as typeof activeId);
    navigate({ to: '/' });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-sidebar-accent/40 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
        >
          <span className="flex-1 truncate text-left font-medium">{active?.name ?? 'Workspace'}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          {workspaces.map((ws) => (
            <DropdownMenuItem key={ws.id} onClick={() => handleSwitch(ws.id)}>
              <span className="flex-1 truncate">{ws.name}</span>
              {ws.id === activeId && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New workspace...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate({ to: '/settings' })}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

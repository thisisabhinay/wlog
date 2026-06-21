import { Outlet } from '@tanstack/react-router';
import { TooltipProvider } from '#components/ui/tooltip';
import { Toaster } from '#components/ui/sonner';
import { AppShell } from '#components/app-shell';
import { QuickCapture } from '#components/quick-capture';
import { UndoListener } from '#components/undo-toaster';

export function RootLayout() {
  return (
    <TooltipProvider>
      <AppShell>
        <Outlet />
      </AppShell>
      <QuickCapture />
      <UndoListener />
      <Toaster />
    </TooltipProvider>
  );
}

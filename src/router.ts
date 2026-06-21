import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router';

import { RootLayout } from './routes/__root';
import { OverviewPage } from './routes/index';
import { SheetPage } from './routes/s.$sheetId';
import { SettingsPage } from './routes/settings';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: OverviewPage,
});

const sheetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/$sheetId',
  component: SheetPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([indexRoute, sheetRoute, settingsRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

import { lazy } from 'react';

/* Module entry points. Each module's index.tsx default-exports a component that owns every route under
   its base path (nested <Routes> with relative paths). Routes: information-architecture.md § 2. */
export const MODULE_ROUTES = [
  { path: '/lepide-ai/*', Page: lazy(() => import('./lepide-ai')) },
  { path: '/shield/*', Page: lazy(() => import('./shield')) },
  { path: '/auditor/*', Page: lazy(() => import('./auditor')) },
  { path: '/trust/*', Page: lazy(() => import('./trust')) },
  { path: '/identify/*', Page: lazy(() => import('./identify')) },
  { path: '/detect/*', Page: lazy(() => import('./detect')) },
  { path: '/protect/*', Page: lazy(() => import('./protect')) },
  { path: '/my-lepide/*', Page: lazy(() => import('./my-lepide')) },
  { path: '/dashboards/*', Page: lazy(() => import('./dashboards')) },
];

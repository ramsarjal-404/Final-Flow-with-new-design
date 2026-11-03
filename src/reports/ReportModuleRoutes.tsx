import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useToast } from '../ui';
import { ReportModuleContext } from './context';
import { setExportToaster } from './exportJobs';
import HubPage from './HubPage';
import ViewPage from './ViewPage';
import BuilderPage from './BuilderPage';
import { REPORT_MODULE_BASES } from './seed';
import type { ModuleKey, ReportModule, RenderCellArgs } from './types';
import './styles.css';

/** Build a module config from the seeded base (`key`) plus what the module plugs in. */
export function defineReportModule(key: ModuleKey, extra: Pick<ReportModule, 'loadViews'> & Partial<Omit<ReportModule, 'key'>>): ReportModule {
  return { ...REPORT_MODULE_BASES[key], ...extra };
}

function KeyedView() {
  const loc = useLocation();
  return <ViewPage key={loc.key} />;
}

/**
 * Every route under a report module's base path (mount it from the module's `index.tsx`, the app
 * registers `/<module>/*`): index → hub, `reports/new` → builder, the module's dedicated routes, then
 * `reports/:slug` → generic view; anything else → the hub.
 *
 *   <ReportModuleRoutes module={TRUST_MODULE}
 *     dedicated={{ 'reports/permissions-by-user': <PermissionsByUserPage /> }} />
 */
export function ReportModuleRoutes({ module, dedicated = {}, renderCell, children }: {
  module: ReportModule;
  /** Relative path (e.g. `reports/data-accessed-by-copilot`) → page element. Declared before `reports/:slug`. */
  dedicated?: Record<string, ReactNode>;
  /** Custom cell renderer for the generic view (overrides `module.renderCell`). */
  renderCell?: (cell: RenderCellArgs) => ReactNode | undefined;
  /** Extra `<Route>` elements (relative paths), declared before `reports/:slug`. */
  children?: ReactNode;
}) {
  const m = useMemo(() => (renderCell ? { ...module, renderCell } : module), [module, renderCell]);
  const [focusFolderId, setFocusFolderId] = useState<string | null>(null);
  const toast = useToast();
  useEffect(() => setExportToaster(toast), [toast]);
  const ctx = useMemo(() => ({ module: m, focusFolderId, setFocusFolderId }), [m, focusFolderId]);
  return (
    <ReportModuleContext.Provider value={ctx}>
      <Routes>
        <Route index element={<HubPage />} />
        <Route path="reports/new" element={<BuilderPage />} />
        {Object.entries(dedicated).map(([path, el]) => <Route key={path} path={path} element={el} />)}
        {children}
        <Route path="reports/:slug" element={<KeyedView />} />
        <Route path="*" element={<Navigate to={m.basePath} replace />} />
      </Routes>
    </ReportModuleContext.Provider>
  );
}

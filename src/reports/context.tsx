import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../ui';
import { REPORT_MODULE_BASES } from './seed';
import type { ModuleKey, ReportModule, ReportModuleBase, ReportViewData } from './types';

/* Module route context: the current ReportModule plus the hub's one-shot focus folder. */

type Ctx = { module: ReportModule; focusFolderId: string | null; setFocusFolderId: (id: string | null) => void };
export const ReportModuleContext = createContext<Ctx | null>(null);

/** The current report module (throws outside `ReportModuleRoutes`). */
export function useReportModule(): Ctx {
  const c = useContext(ReportModuleContext);
  if (!c) throw new Error('useReportModule must be used inside <ReportModuleRoutes>');
  return c;
}
/** The current report module, or null outside a module route. */
export const useOptionalReportModule = () => useContext(ReportModuleContext);

/* ---------------- view data (lazy, cached per module) ---------------- */

const cache = new Map<string, Record<string, ReportViewData>>();
const pending = new Map<string, Promise<Record<string, ReportViewData>>>();

/** `module.loadViews()` once per module; `views` is null until resolved. */
export function useReportViews(module: ReportModule) {
  const [views, setViews] = useState(() => cache.get(module.key) ?? null);
  useEffect(() => {
    if (cache.has(module.key)) { setViews(cache.get(module.key)!); return; }
    let live = true;
    let p = pending.get(module.key);
    if (!p) { p = module.loadViews().catch(() => ({})); pending.set(module.key, p); }
    p.then((v) => { cache.set(module.key, v); if (live) setViews(v); });
    return () => { live = false; };
  }, [module]);
  return views;
}

/* ---------------- open-report rule (FLW-RLIB-02) ---------------- */

/**
 * `openReport(module, slug, rowId, name)`: dedicated path → navigate with `{ rowId }`; dedicated null →
 * info toast; otherwise `<basePath>/reports/<slug>` with `{ rowId }`. Usable on any route (My Lepide).
 */
export function useOpenReport() {
  const nav = useNavigate();
  const toast = useToast();
  return useCallback((module: ModuleKey | ReportModuleBase, slug: string, rowId: string, name: string) => {
    const m = typeof module === 'string' ? REPORT_MODULE_BASES[module] : module;
    if (Object.prototype.hasOwnProperty.call(m.dedicated, slug)) {
      const path = m.dedicated[slug];
      if (path) nav(path, { state: { rowId } });
      else toast({ variant: 'info', title: name, message: `${name} has its own page in the product, which isn't part of this prototype yet.` });
      return;
    }
    nav(`${m.basePath}/reports/${slug}`, { state: { rowId } });
  }, [nav, toast]);
}

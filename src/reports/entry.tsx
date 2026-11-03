import { Link, useLocation } from 'react-router-dom';
import { useReportModule } from './context';
import { isDirectLoad } from '../app/bootKey';
import { displayTitle, useReportSlice } from './store';
import type { ReportRow } from './types';

/* Report resolution, redirect test and breadcrumb for report pages (SCR-RLIB-02, dedicated pages). */

export type ReportEntryState = { rowId?: string; generated?: boolean } | null;

/**
 * Resolves the report for `slug`: the row with `state.rowId`, else the Predefined row with that slug.
 * `redirect` is true for a refresh / pasted link (`location.key === 'default'`), an unresolved or disabled
 * row, or (generic view only) a dedicated slug.
 */
export function useReportEntry(slug: string, opts: { dedicatedPage?: boolean } = {}) {
  const { module } = useReportModule();
  const { rows, folders } = useReportSlice(module.key);
  const loc = useLocation();
  const state = (loc.state ?? null) as ReportEntryState;
  const row: ReportRow | undefined = (state?.rowId ? rows.find((r) => r.id === state.rowId) : undefined)
    ?? rows.find((r) => r.slug === slug && r.type === 'Predefined');
  const isPinned = !!module.pinned && row?.id === module.pinned.id;
  const title = row ? (row.type === 'Custom' || isPinned ? row.name : displayTitle(row)) : '';
  const folder = row && !isPinned ? folders.find((f) => f.id === row.folderId) : undefined;
  const redirect = isDirectLoad(loc.key) || !row || row.disabled
    || (!opts.dedicatedPage && Object.prototype.hasOwnProperty.call(module.dedicated, slug));
  return { module, row, title, folder, isPinned, redirect, generated: !!state?.generated };
}

/** Breadcrumb: Home › tileName › Reports › folder › title (truncated to 31 characters + "…", full title as tooltip). */
export function ReportCrumbs({ title, folder }: { title: string; folder?: { id: string; name: string } }) {
  const { module } = useReportModule();
  const short = title.length > 31 ? title.slice(0, 31) + '…' : title;
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <Link to="/">Home</Link><span aria-hidden="true">&rsaquo;</span>
      <Link to={module.basePath}>{module.tileName}</Link><span aria-hidden="true">&rsaquo;</span>
      <Link to={module.basePath}>Reports</Link><span aria-hidden="true">&rsaquo;</span>
      {folder && <><Link to={module.basePath} state={{ folderId: folder.id }}>{folder.name}</Link><span aria-hidden="true">&rsaquo;</span></>}
      <b aria-current="page" title={title} data-tip={short !== title ? title : undefined}>{short}</b>
    </nav>
  );
}

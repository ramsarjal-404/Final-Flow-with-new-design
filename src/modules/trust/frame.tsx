import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Icon, Menu, PageHeader, useToast } from '../../ui';
import {
  DateRangeMenu, FilterBar, ModifyFiltersDrawer, ReportCrumbs, applyFiltersBy, csvBlob, filterLine, queueReportExport,
  reportFileName, reportPdf, splitFilterLine, useReportEntry, type AppliedFilter, type DateState,
} from '../../reports';
import { META, type DeepSlug } from './data';
import type { Status } from './DeepTable';

/* SCR-TRU-03 · Deep-report frame (Lepide Design System 04 § 6): header (eyebrow "Report Name" + title, description),
   actions (page extra → date pill → Modify filters → Export → Generate Report), the filter chip bar
   (D-08, the "Filters :" line), the Modify Filters drawer (DLG-TRU-02, non-modal so the main column
   stays usable), the Export menu (DLG-TRU-01) and the generation cycle idle → loading → ready.
   Guards (INT-TRU-009) come from useReportEntry: reload / pasted link → /trust; row by `state.rowId`,
   else the first Predefined row with the slug, else /trust. */

export type ExportTable = { columns: string[]; rows: string[][] };

/** ENT-TRU-DeepReportState (frame part) for one page visit. */
export function useDeepReport(slug: DeepSlug) {
  const entry = useReportEntry(slug, { dedicatedPage: true });
  const meta = META[slug];
  const [status, setStatus] = useState<Status>('idle');
  const [gen, setGen] = useState(0);
  const [applied, setApplied] = useState<AppliedFilter[]>([]);
  const [panel, setPanel] = useState(false);
  const [date, setDate] = useState<DateState | null>(meta.dateRange ? { preset: 'Custom Range', text: meta.dateRange } : null);
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);

  /** [Prototype-only] generation: `ready` after 900 ms. */
  const generate = useCallback(() => {
    setStatus('loading'); setGen((g) => g + 1);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('ready'), 900);
  }, []);
  /** Back to `idle` (Stale Data view switch). */
  const reset = useCallback(() => { clearTimeout(timer.current); setStatus('idle'); setGen((g) => g + 1); }, []);

  /** Rows of `rows` that pass every applied filter whose field `get` maps (unmapped fields change nothing). */
  const filterRows = useCallback(<T,>(rows: T[], get: (r: T, field: string) => string | undefined) => applyFiltersBy(rows, applied, get), [applied]);

  return { slug, entry, meta, status, gen, applied, setApplied, panel, setPanel, date, setDate, generate, reset, filterRows };
}
export type DeepReport = ReturnType<typeof useDeepReport>;

export function DeepFrame({ rep, exportTable, extraActions, children, onApplied, onGenerate }: {
  rep: DeepReport;
  /** The page's generate hook (clears selections, …) — defaults to the frame cycle. */
  onGenerate?: () => void;
  /** ENT-TRU-ExportTable (null when the page is not exportable). */
  exportTable: ExportTable | null;
  extraActions?: ReactNode;
  children: ReactNode;
  /** Called after Apply (pages that react to a filter at once). */
  onApplied?: (filters: AppliedFilter[]) => void;
}) {
  const toast = useToast();
  const { entry, meta, status, applied, setApplied, panel, setPanel, date, setDate } = rep;
  const row = entry.row!;
  const title = entry.title;
  const line = filterLine(meta.filterLine, applied);
  const locked = splitFilterLine(meta.filterLine);
  const canExport = status === 'ready' && !!exportTable && exportTable.rows.length > 0;

  const applyList = (next: AppliedFilter[]) => {
    setApplied(next); setPanel(false); onApplied?.(next);
    toast({ variant: 'success', title: 'Modify filters', message: next.length ? `${next.length} filter(s) applied.` : 'Filters cleared.' });
  };
  const exportAs = (format: 'CSV' | 'PDF') => {
    if (!exportTable) return;
    const columns = [...exportTable.columns]; const rows = exportTable.rows.map((r) => [...r]);
    const n = rows.length; const duration = date?.text ?? null; const snapLine = line;
    queueReportExport({
      reportId: row.id, reportName: title, format, filtersApplied: applied.length > 0,
      fileName: reportFileName(title, format === 'CSV' ? 'csv' : 'pdf'),
      build: () => (format === 'CSV' ? csvBlob(columns, rows) : reportPdf({ title, filterLine: snapLine, duration, columns, rows })),
      done: { variant: 'success', title: 'Export report', message: `${format} with ${n} record(s) downloaded.` },
      failTitle: 'Export Report',
    });
    toast({ variant: 'info', title: 'Export queued', message: `${format} with ${n} record(s) is being prepared in Settings › Exported Files.` });
  };

  const dateMenu = (chip: boolean) => date && (
    <DateRangeMenu value={date} onApply={setDate} align="left"
      trigger={(p) => chip
        ? <button type="button" className="fchip fchip--date" aria-label={`Date range ${date.text}`} {...p}><Icon name="calendar" size={12} /><span>{date.text}</span><Icon name="chevron" size={11} /></button>
        : <Button variant="ghost" icon="calendar" iconEnd="chevron" aria-label={`Date range ${date.text}`} {...p}>{date.text}</Button>} />
  );

  return (
    <div className={'sub rlib tru' + (panel ? ' rlib--side rlib--side-md' : '')}>
      <ReportCrumbs title={title} folder={entry.folder} />
      <PageHeader eyebrow={<span aria-hidden="true">Report Name</span>} title={<><span className="sr-only">Report Name - </span>{title}</>}
        description={row.description}
        actions={<>
          {extraActions}
          {dateMenu(false)}
          <Button icon="filter" dot={applied.length > 0} aria-expanded={panel} aria-label="Modify filters"
            onClick={() => setPanel(!panel)}>Modify filters</Button>
          {meta.exportable && (
            <span data-tip={canExport ? 'Export Report' : 'Generate the report to export it'} style={{ display: 'inline-flex' }}>
              <Menu label="Export report" items={[{ label: 'CSV', icon: 'file', onSelect: () => exportAs('CSV') }, { label: 'PDF', icon: 'file', onSelect: () => exportAs('PDF') }]}
                trigger={(p) => <Button icon="download" disabled={!canExport} aria-label="Export report" {...p}>Export</Button>} />
            </span>
          )}
          <Button variant="primary" icon="refresh" loading={status === 'loading'} onClick={onGenerate ?? rep.generate}>Generate report</Button>
        </>} />

      <FilterBar line={line} locked={locked} applied={applied}
        onRemove={(i) => applyList(applied.filter((_, j) => j !== i))} onClear={() => applyList([])}
        onAdd={() => setPanel(true)} dateChip={dateMenu(true)} fieldCount={meta.filterFields.length} />

      {children}

      <ModifyFiltersDrawer open={panel} onClose={() => setPanel(false)} subtitle={title} fields={meta.filterFields}
        applied={applied} onApply={applyList} locked={locked} dateText={date?.text} />
    </div>
  );
}

/** "yes" / "true" in any case, trimmed. */
export const isYes = (v: string | undefined) => !!v && /^(yes|true)$/i.test(v.trim());

/** A yes / no filter value → the flag value it asks for (null = not a yes / no answer: no narrowing). */
export function flagWanted(f: AppliedFilter | undefined): boolean | null {
  if (!f) return null;
  const v = f.value.trim().toLowerCase();
  const want = /^(yes|true|y)$/.test(v) ? true : /^(no|false|n)$/.test(v) ? false : null;
  if (want === null) return null;
  return f.op === 'Not Equals' || f.op === 'Not Contains' ? !want : want;
}

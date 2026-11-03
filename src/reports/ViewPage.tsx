import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Icon, Menu, PageHeader, useToast } from '../ui';
import { useReportModule, useReportViews } from './context';
import { ReportCrumbs, useReportEntry } from './entry';
import { DateRangeMenu, type DateState } from './DateRangeMenu';
import { FilterBar } from './FilterBar';
import { ModifyFiltersDrawer } from './ModifyFiltersDrawer';
import { RecordDrawer } from './RecordDrawer';
import { ReportTable, useTableModel, type RCol } from './ReportTable';
import { applyFilters, filterLine, splitFilterLine } from './filters';
import { cellClass, colWidth, formatCell } from './format';
import { csvBlob, reportFileName, reportPdf } from './files';
import { queueReportExport, setExportToaster } from './exportJobs';
import type { AppliedFilter, FixedFilterCard, ReportViewData } from './types';

/* SCR-RLIB-02 · Generic report view (Lepide Design System 04 § 4). */

type Rec = { k: string; cells: string[] };
const fixedPart = (c: FixedFilterCard) => `${c.field} : [Equals [${c.value}]]`;

export default function ViewPage() {
  const { slug = '' } = useParams();
  const entry = useReportEntry(slug);
  const { module } = useReportModule();
  const toast = useToast();
  useEffect(() => setExportToaster(toast), [toast]);
  const views = useReportViews(module);
  const view: ReportViewData | null = views ? views[slug] ?? null : null;
  const cfg = entry.row?.config;

  // Columns: the custom report's saved columns (GAP-RLIB-06), else the view's.
  const colIdx = useMemo(() => {
    if (!view) return [] as number[];
    const all = view.columns.map((_, i) => i);
    if (!cfg?.columns?.length) return all;
    const picked = cfg.columns.map((c) => view.columns.indexOf(c)).filter((i) => i >= 0);
    return picked.length ? picked : all;
  }, [view, cfg]);
  const columns = useMemo(() => colIdx.map((i) => view!.columns[i]), [colIdx, view]);
  const source = useMemo<Rec[]>(() => (view ? view.rows.map((r, n) => ({ k: String(n), cells: colIdx.map((i) => r[i] ?? '') })) : []), [view, colIdx]);

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>(entry.generated ? 'ready' : 'idle');
  const [gen, setGen] = useState(0);
  const [applied, setApplied] = useState<AppliedFilter[]>(cfg?.filters ?? []);
  const [fixed, setFixed] = useState<FixedFilterCard[]>(() => module.fixedFilters?.(slug) ?? []);
  const [panel, setPanel] = useState<'filters' | 'record' | null>(null);
  const [recIdx, setRecIdx] = useState(0);
  const [date, setDate] = useState<DateState | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (view?.dateRange && !date) setDate({ preset: 'Custom Range', text: cfg?.dateRange ?? view.dateRange }); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const rows = applyFilters(source.map((s) => s.cells), columns, applied);
    const set = new Set(rows);
    return source.filter((s) => set.has(s.cells));
  }, [source, columns, applied]);

  const renderCell = useCallback((column: string, value: string, cells: string[]) => {
    if (module.renderCell && entry.row) {
      const custom = module.renderCell({ slug, column, value, cells, columns, row: entry.row });
      if (custom !== undefined) return custom;
    }
    return formatCell(column, value);
  }, [module, slug, columns, entry.row]);

  const tcols = useMemo<RCol<Rec>[]>(() => columns.map((c, i) => ({
    key: 'c' + i, header: c, sortable: true, filterable: true, minWidth: colWidth(c), cls: cellClass(c, i === 0),
    value: (r) => r.cells[i], render: (r) => renderCell(c, r.cells[i], r.cells),
  })), [columns, renderCell]);
  const model = useTableModel({ rows: status === 'ready' ? filtered : [], columns: tcols, pageSizes: [5, 10, 20, 50, 100], defaultPageSize: 50, resetKey: `${gen}|${applied.length}|${JSON.stringify(applied)}` });

  if (entry.redirect || !entry.row) return <Navigate to={module.basePath} replace />;
  const row = entry.row;

  const defaultParts = splitFilterLine(view?.defaultFilter ?? '');
  const line = filterLine(view?.defaultFilter ?? '', applied, fixed.map(fixedPart));
  const hasRows = status === 'ready' && !!view && view.rows.length > 0;
  const fields = view ? (view.filterFields.length ? view.filterFields : view.columns).filter((f) => columns.includes(f) || !cfg) : [];

  const generate = () => {
    if (!views) return;
    setStatus('loading'); setPanel((p) => (p === 'record' ? null : p)); setGen((g) => g + 1);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('ready'), 900);
  };
  const applyFilterList = (next: AppliedFilter[]) => {
    setApplied(next); setPanel(null);
    toast({ variant: 'success', title: 'Modify filters', message: next.length ? `${next.length} filter(s) applied.` : 'Filters cleared.' });
  };
  const exportAs = (format: 'CSV' | 'PDF') => {
    const rows = model.processed.map((r) => r.cells);
    const n = rows.length;
    const snapshot = { title: entry.title, line, duration: date?.text ?? null, columns: [...columns] };
    queueReportExport({
      reportId: row.id, reportName: entry.title, format, filtersApplied: applied.length > 0 || model.anyFilter,
      fileName: reportFileName(entry.title, format === 'CSV' ? 'csv' : 'pdf'),
      build: () => (format === 'CSV' ? csvBlob(snapshot.columns, rows) : reportPdf({ title: snapshot.title, filterLine: snapshot.line, duration: snapshot.duration, columns: snapshot.columns, rows })),
      done: { variant: 'success', title: 'Export Report', message: `${format} with ${n} record(s) downloaded.` },
      failTitle: 'Export Report',
    });
    toast({ variant: 'info', title: 'Export queued', message: `${format} with ${n} record(s) is being prepared in Settings › Exported Files.` });
  };
  const openRecord = (i: number) => {
    if (panel === 'record' && recIdx === i) { setPanel(null); return; }
    setRecIdx(i); setPanel('record');
  };
  const stepRecord = (i: number) => { setRecIdx(i); model.setPage(Math.floor(i / model.size) + 1); };
  const rec = model.processed[recIdx];

  const dateMenu = (chip: boolean) => date && (
    <DateRangeMenu value={date} onApply={setDate} align="left"
      trigger={(p) => chip
        ? <button type="button" className="fchip fchip--date" aria-label={`Date range ${date.text}`} {...p}><Icon name="calendar" size={12} /><span>{date.text}</span><Icon name="chevron" size={11} /></button>
        : <Button variant="ghost" icon="calendar" iconEnd="chevron" aria-label={`Date range ${date.text}`} {...p}>{date.text}</Button>} />
  );

  return (
    <div className={'sub sub--fill rlib' + (panel ? ' rlib--side' + (panel === 'filters' ? ' rlib--side-md' : '') : '')}>
      <ReportCrumbs title={entry.title} folder={entry.folder} />
      <PageHeader eyebrow={<span aria-hidden="true">Report Name</span>} title={<><span className="sr-only">Report Name - </span>{entry.title}</>}
        description={row.description}
        actions={<>
          {dateMenu(false)}
          <Button icon="filter" dot={applied.length > 0} disabled={!view} aria-expanded={panel === 'filters'} aria-label="Modify filters"
            onClick={() => setPanel((p) => (p === 'filters' ? null : 'filters'))}>Modify filters</Button>
          <span data-tip={hasRows ? 'Export Report' : 'Generate the report to export it'} style={{ display: 'inline-flex' }}>
            <Menu label="Export Report" items={[{ label: 'CSV', icon: 'file', onSelect: () => exportAs('CSV') }, { label: 'PDF', icon: 'file', onSelect: () => exportAs('PDF') }]}
              trigger={(p) => <Button icon="download" disabled={!hasRows} aria-label="Export Report" {...p}>Export</Button>} />
          </span>
          <Button variant="primary" icon="refresh" loading={status === 'loading'} disabled={!views} onClick={generate}>Generate report</Button>
        </>} />

      <FilterBar line={line} locked={[...defaultParts, ...splitFilterLine(fixed.map(fixedPart).join(' AND '))]} applied={applied}
        onRemove={(i) => applyFilterList(applied.filter((_, j) => j !== i))} onClear={() => applyFilterList([])}
        onAdd={() => setPanel('filters')} addDisabled={!view} dateChip={dateMenu(true)} fieldCount={fields.length} />

      {status === 'idle' ? (
        <section className="lf-card tablecard" style={{ flex: 1 }}>
          <EmptyState icon="refresh" title={'Please click on the "Generate report" button to view the records for this report.'}
            action={<Button variant="primary" icon="refresh" disabled={!views} onClick={generate}>Generate report</Button>} />
        </section>
      ) : status === 'ready' && (!view || view.rows.length === 0) ? (
        <section className="lf-card tablecard" style={{ flex: 1 }}>
          <EmptyState icon="file-search" title="No records found." />
        </section>
      ) : (
        <ReportTable model={model} columns={tcols} rowKey={(r) => r.k} loading={status === 'loading'}
          title={status === 'loading' ? <span role="status">Generating report…</span> : 'Results'}
          count={status === 'loading' ? undefined : `${model.processed.length.toLocaleString()} record${model.processed.length === 1 ? '' : 's'}`}
          onRowOpen={(_, i) => openRecord(i)} selectedKey={panel === 'record' ? rec?.k : null}
          note={status === 'ready' && view && view.total > view.rows.length
            ? <p className="note">Showing the first {view.rows.length} of {view.total} records in this demo dataset.</p> : undefined} />
      )}

      <ModifyFiltersDrawer open={panel === 'filters'} onClose={() => setPanel(null)} subtitle={entry.title} fields={fields}
        applied={applied} onApply={applyFilterList} locked={defaultParts} dateText={date?.text}
        fixedCards={fixed} onFixedChange={setFixed} />
      {rec && (
        <RecordDrawer open={panel === 'record'} index={recIdx} total={model.processed.length} columns={columns} cells={rec.cells}
          subtitle={entry.title} onStep={stepRecord} onClose={() => setPanel(null)}
          renderValue={(c, v) => (module.renderCell ? module.renderCell({ slug, column: c, value: v, cells: rec.cells, columns, row }) : undefined)} />
      )}
    </div>
  );
}

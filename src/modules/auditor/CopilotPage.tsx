import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, EmptyState, Icon, Menu, PageHeader, initialsOf, useToast } from '../../ui';
import {
  DateRangeMenu, FilterBar, ModifyFiltersDrawer, ReportCrumbs, ReportTable, applyFiltersBy, filterLine, fmtSpan, queueReportExport,
  SidePanel, splitFilterLine, useReportEntry, useReportModule, useTableModel, type AppliedFilter, type DateState, type RCol,
} from '../../reports';
import copilotJson from '../../data/copilotReport.json';
import { COPILOT_REPORT_SLUG } from './config';
import { copilotCsv, copilotFileName, copilotPdf, type CopilotRow } from './copilotExport';

/* SCR-AUD-04 · Data Accessed by Copilot (Lepide Design System 04 § 6), with DLG-AUD-01 (conversation drawer),
   DLG-AUD-02 (download popover) and DLG-RLIB-07 (Modify Filters). GAP intended fixes built here:
   GAP-AUD-01 (filters line "Tenant Name : [Equals [All]]"; date chip and PDF duration cover the rows),
   GAP-AUD-06 (a custom row's name in the title), GAP-AUD-08 (date chip opens the presets),
   GAP-RLIB-05 (downloads go through an export job). */

const ROWS = (copilotJson.exports as unknown as { COPILOT_ROWS: CopilotRow[] }).COPILOT_ROWS;
type Rec = CopilotRow & { idx: number };
const SOURCE: Rec[] = ROWS.map((r, idx) => ({ ...r, idx }));

const COLS: { key: keyof CopilotRow; header: string; mono?: boolean; width: number }[] = [
  { key: 'user', header: 'User Name', width: 170 },
  { key: 'email', header: 'Email ID', mono: true, width: 260 },
  { key: 'file', header: 'File Name', width: 220 },
  { key: 'path', header: 'File Path', mono: true, width: 300 },
  { key: 'label', header: 'Sensitivity Label', width: 170 },
  { key: 'query', header: 'Search Query', width: 260 },
  { key: 'what', header: 'What', width: 260 },
  { key: 'when', header: 'When', width: 200 },
  { key: 'from', header: 'From', width: 110 },
  { key: 'tenant', header: 'Tenant Name', mono: true, width: 240 },
];
const FIELDS = ['User Name', 'Email ID', 'File Name', 'Sensitivity Label', 'Search Query', 'Tenant Name'];
const fieldKey = (f: string) => COLS.find((c) => c.header === f)?.key;
const DEFAULT_FILTER = 'Tenant Name : [Equals [All]]';

/** "12-11-2025 06:41:18 PM" → Date. */
const parseWhen = (s: string) => { const m = s.match(/^(\d{2})-(\d{2})-(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
const ROWS_SPAN = (() => {
  const ds = ROWS.map((r) => parseWhen(r.when)).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime());
  return ds.length ? fmtSpan(ds[0], ds[ds.length - 1]) : '';
})();

/** Copilot turn text keeps only <strong>/<em>; everything else is stripped. */
const safe = (s: string) => s.replace(/<(?!\/?(strong|em)>)[^>]*>/g, '');

export default function CopilotPage() {
  const entry = useReportEntry(COPILOT_REPORT_SLUG, { dedicatedPage: true });
  const { module } = useReportModule();
  const toast = useToast();
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [gen, setGen] = useState(0);
  const [applied, setApplied] = useState<AppliedFilter[]>([]);
  const [panel, setPanel] = useState<'chat' | 'filters' | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [date, setDate] = useState<DateState>({ preset: 'Custom Range', text: ROWS_SPAN });
  const [include, setInclude] = useState<'with-conversation' | 'data-only'>('with-conversation');
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const timer = useRef<number>();
  const chatTop = useRef<HTMLDivElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { chatTop.current?.closest('.drawer__body')?.scrollTo(0, 0); }, [selected]);

  const filtered = useMemo(() => applyFiltersBy(SOURCE, applied, (r, f) => { const k = fieldKey(f); return k ? String(r[k]) : undefined; }), [applied]);
  const columns = useMemo<RCol<Rec>[]>(() => COLS.map((c, i) => ({
    key: c.key, header: c.header, sortable: true, filterable: true, minWidth: c.width, value: (r) => String(r[c.key]),
    cls: i === 0 ? 'aud-first' : c.mono ? 'lf-mono' : c.key === 'when' ? 'lf-num' : undefined,
    render: c.key === 'label' ? (r) => (r.label === 'N/A' ? <span className="lf-na">N/A</span> : <span className="lf-chip lf-chip--brand">{r.label}</span>)
      : c.key === 'from' ? (r) => (r.from === 'N/A' ? <span className="lf-na">N/A</span> : r.from) : undefined,
  })), []);
  const model = useTableModel({ rows: status === 'ready' ? filtered : [], columns, pageSizes: [10, 20, 50, 100], defaultPageSize: 50, resetKey: `${gen}|${JSON.stringify(applied)}` });

  if (entry.redirect || !entry.row) return <Navigate to={module.basePath} replace />;
  // GAP-AUD-06 intended: a custom report based on this page keeps its own name.
  const title = entry.row.name;
  const line = filterLine(DEFAULT_FILTER, applied);
  const ready = status === 'ready';
  const sel = selected !== null ? ROWS[selected] : null;

  const generate = () => {
    setStatus('loading'); setGen((g) => g + 1); setSelected(null);
    setPanel((p) => (p === 'chat' ? null : p));
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('ready'), 700);
  };
  const applyFilterList = (next: AppliedFilter[]) => {
    setApplied(next); setPanel((p) => (p === 'filters' ? null : p));
    toast({ variant: 'success', title: 'Modify filters', message: next.length ? `${next.length} filter(s) applied.` : 'Filters cleared.' });
  };
  const closeChat = () => { setPanel(null); setSelected(null); };
  const openRow = (r: Rec) => {
    if (panel === 'chat' && selected === r.idx) { setPanel(null); setSelected(null); return; }
    setSelected(r.idx); setPanel('chat');
  };
  const download = (close: () => void) => {
    const rows: CopilotRow[] = model.processed.map(({ idx, ...r }) => r);
    const n = rows.length; const conv = include === 'with-conversation'; const fmt = format === 'pdf' ? 'PDF' : 'CSV';
    const duration = date.text;
    queueReportExport({
      reportId: entry.row!.id, reportName: title, format: fmt, filtersApplied: applied.length > 0 || model.anyFilter,
      fileName: copilotFileName(format),
      build: () => (format === 'pdf' ? copilotPdf(rows, conv, duration) : copilotCsv(rows, conv)),
      done: { variant: 'success', title: 'Download report', message: `${fmt} with ${n} record(s)${conv ? ' and Copilot conversations' : ''} downloaded.` },
      failTitle: 'Download report',
    });
    toast({ variant: 'info', title: 'Export queued', message: `${fmt} with ${n} record(s) is being prepared in Settings › Exported Files.` });
    close();
  };

  const dateMenu = (chip: boolean) => (
    <DateRangeMenu value={date} onApply={setDate} align="left"
      trigger={(p) => chip
        ? <button type="button" className="fchip fchip--date" aria-label={`Date range ${date.text}`} {...p}><Icon name="calendar" size={12} /><span>{date.text}</span><Icon name="chevron" size={11} /></button>
        : <Button variant="ghost" icon="calendar" iconEnd="chevron" aria-label={`Date range ${date.text}`} {...p}>{date.text}</Button>} />
  );

  return (
    <div className={'sub sub--fill rlib' + (panel ? ' rlib--side' + (panel === 'chat' ? ' rlib--side-chat' : ' rlib--side-md') : '')}>
      <ReportCrumbs title={title} />
      <PageHeader eyebrow={<span aria-hidden="true">Report Name</span>} title={<><span className="sr-only">Report Name - </span>{title}</>}
        description={entry.row.description}
        actions={<>
          {dateMenu(false)}
          <Button icon="filter" dot={applied.length > 0} aria-expanded={panel === 'filters'} aria-label="Modify filters"
            onClick={() => setPanel((p) => (p === 'filters' ? null : 'filters'))}>Modify filters</Button>
          <span data-tip={ready ? 'Download' : 'Generate the report to download it'} style={{ display: 'inline-flex' }}>
            <Menu label="Download report" width={300}
              trigger={(p) => <Button icon="download" disabled={!ready} aria-label="Download report" {...p}>Download</Button>}>
              {(close) => (
                <div className="pop--dl aud-dl" role="dialog" aria-label="Download report">
                  <h4 className="aud-dl__title">Download report</h4>
                  <h5 id="aud-inc">Include</h5>
                  <div className="opts" role="radiogroup" aria-labelledby="aud-inc">
                    <label><input type="radio" name="aud-inc" checked={include === 'data-only'} onChange={() => setInclude('data-only')} />Report data only</label>
                    <label><input type="radio" name="aud-inc" checked={include === 'with-conversation'} onChange={() => setInclude('with-conversation')} />Report data + Copilot conversation</label>
                  </div>
                  <h5 id="aud-fmt">Format</h5>
                  <div className="opts" role="radiogroup" aria-labelledby="aud-fmt">
                    <label><input type="radio" name="aud-fmt" checked={format === 'pdf'} onChange={() => setFormat('pdf')} />PDF</label>
                    <label><input type="radio" name="aud-fmt" checked={format === 'csv'} onChange={() => setFormat('csv')} />CSV</label>
                  </div>
                  <div className="aud-dl__foot">
                    <Button onClick={close}>Cancel</Button>
                    <Button variant="primary" icon="download" onClick={() => download(close)}>Download</Button>
                  </div>
                </div>
              )}
            </Menu>
          </span>
          <Button variant="primary" icon="refresh" loading={status === 'loading'} onClick={generate}>Generate report</Button>
        </>} />

      <FilterBar line={line} locked={splitFilterLine(DEFAULT_FILTER)} applied={applied}
        onRemove={(i) => applyFilterList(applied.filter((_, j) => j !== i))} onClear={() => applyFilterList([])}
        onAdd={() => setPanel('filters')} dateChip={dateMenu(true)} fieldCount={FIELDS.length} />

      {status === 'idle' ? (
        <section className="lf-card tablecard" style={{ flex: 1 }}>
          <EmptyState icon="refresh" title={'Please click on the "Generate report" button to view the records for this report.'}
            action={<Button variant="primary" icon="refresh" onClick={generate}>Generate report</Button>} />
        </section>
      ) : (
        <ReportTable model={model} columns={columns} rowKey={(r) => String(r.idx)} loading={status === 'loading'}
          title={status === 'loading' ? <span role="status">Generating report…</span> : 'Results'}
          count={status === 'loading' ? undefined : `${model.processed.length} record${model.processed.length === 1 ? '' : 's'}`}
          onRowOpen={openRow} selectedKey={panel === 'chat' && selected !== null ? String(selected) : null} rowTitle="Open the Copilot conversation" />
      )}

      <ModifyFiltersDrawer open={panel === 'filters'} onClose={() => setPanel(null)} subtitle={title} fields={FIELDS}
        applied={applied} onApply={applyFilterList} locked={splitFilterLine(DEFAULT_FILTER)} dateText={date.text} />

      <SidePanel open={panel === 'chat' && !!sel} onClose={closeChat} width="chat" label="Copilot Conversation"
        head={sel && (
          <div className="cv__who">
            <span className="cv__av" aria-hidden="true">{initialsOf(sel.user)}</span>
            <div>
              <p className="aud-cv__kicker"><Icon name="sparkles" size={13} />Copilot Conversation</p>
              <h3>User Name - <b>{sel.user}</b></h3>
              <small>{sel.email}</small>
            </div>
          </div>
        )}
        footerNote={sel ? `${sel.turns.length} turns · ${sel.tenant}` : undefined}>
        {sel && (
          <div ref={chatTop} className="aud-cv">
            <div className="cv__file aud-cv__file">
              <span className="cv-file__ic"><Icon name="file" size={15} /></span>
              <div className="cv-file__text"><b title={sel.file}>{sel.file}</b><small>Read by Copilot · {sel.when}</small></div>
              <span className={'lf-chip' + (sel.label === 'N/A' ? '' : ' lf-chip--brand')}>{sel.label}</span>
            </div>
            {sel.turns.map((t, k) => {
              const user = t.role === 'user';
              return (
                <div key={`${selected}-${k}`} className={'cv-msg' + (user ? ' cv-msg--user' : ' cv-msg--bot')} style={{ animationDelay: `${k * 50}ms` }}>
                  <span className="cv-msg__av" aria-hidden="true">{user ? initialsOf(sel.user) : <Icon name="sparkles" size={14} />}</span>
                  <div className="cv-msg__col">
                    <span className="cv-msg__who">{user ? sel.user : 'Copilot'}</span>
                    <div className="cv-msg__text">
                      <span dangerouslySetInnerHTML={{ __html: safe(t.text) }} />
                      {t.sectionTitle && <h5>{t.sectionTitle}</h5>}
                      {t.points && t.points.length > 0 && (
                        <ol className="aud-cv__points">{t.points.map((p, i) => <li key={i} dangerouslySetInnerHTML={{ __html: safe(p) }} />)}</ol>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SidePanel>
    </div>
  );
}

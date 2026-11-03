import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { isDirectLoad } from '../app/bootKey';
import { Button, ConfirmDialog, EmptyState, Icon, IconButton, Menu, PageHeader, Segmented, useToast } from '../ui';
import { useAuth } from '../app/auth';
import { useReportModule, useReportViews } from './context';
import { FilterCard } from './ModifyFiltersDrawer';
import { ReportTable, useTableModel, type RCol } from './ReportTable';
import { matches, splitFilterLine } from './filters';
import { cellClass, colWidth, formatCell } from './format';
import { reportActions, useReportSlice } from './store';
import type { AppliedFilter, ReportDraft } from './types';

/* SCR-RLIB-03 · Create Report builder (Lepide Design System 04 § 5). GAP-RLIB-06 intended: the columns, filter fields,
   default filter and date range come from the base report's view data, and Save stores the chosen
   columns, filter values and date range on the custom row. When the base slug has no view data the
   builder falls back to the prototype's 7-column sample (ENT-RLIB-BuilderPreviewRow). */

const SAMPLE_COLUMNS = ['Server Name', 'Group Path', 'Who Modified', 'When', 'Operation', 'What', 'Where'];
const SAMPLE_FIELDS = ['Server Name', 'Object Path', 'Object Class', 'Who Modified', 'Where', 'From', 'Operation'];
/** Sample filter field → preview column (Object Class and From filter nothing). */
const SAMPLE_MAP: Record<string, string | undefined> = { 'Server Name': 'Server Name', 'Object Path': 'Group Path', 'Who Modified': 'Who Modified', Where: 'Where', Operation: 'Operation' };
const SAMPLE_DATE = 'Dec 1,2024 - Dec 31,2024';

/** ENT-RLIB-BuilderPreviewRow [Prototype-only]: 24 generated rows. */
function sampleRows(): string[][] {
  const servers = ['QuantumPulse-01', 'QuantumPulse-02', 'LDSP-DC-01', 'LDSP-FS-01'];
  const ops = ['Copy', 'Read', 'Modify', 'Delete'];
  const depts = ['Finance', 'HR', 'Sales', 'IT'];
  const who = ['LPDE4\\Marty.Byrde', 'LPDE4\\Wendy.Byrde', 'LPDE4\\Ruth.Langmore', 'LPDE4\\Ash.Williams', 'LPDE4\\Pete.Mitchell', 'LPDE4\\Lee.Russell'];
  return Array.from({ length: 24 }, (_, i) => {
    const op = ops[i % 4], dept = depts[Math.floor(i / 4) % 4];
    const day = String(1 + ((i * 7) % 30)).padStart(2, '0');
    const hh = String(8 + (i % 10)).padStart(2, '0'), mm = String((i * 13) % 60).padStart(2, '0');
    return [servers[i % 4], `/Enterprise/Applications/${dept}`, who[i % who.length], `${day}-12-2024 ${hh}:${mm}`, op,
      `${op} on /Enterprise/Applications/${dept}/Budget_${2024 - (i % 3)}.xlsx`, `192.168.30.2${String(i).padStart(2, '0')}`];
  });
}

type Rec = { k: string; cells: string[] };

export default function BuilderPage() {
  const loc = useLocation();
  const draft = (loc.state as { draft?: ReportDraft } | null)?.draft;
  const { module, setFocusFolderId } = useReportModule();
  const { rows, folders } = useReportSlice(module.key);
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const views = useReportViews(module);

  const base = draft ? rows.find((r) => r.slug === draft.predefinedReportId && r.type === 'Predefined') : undefined;
  const folder = draft ? folders.find((f) => f.id === draft.folderId) : undefined;
  const view = draft && views ? views[draft.predefinedReportId] ?? null : null;
  const sample = !view;

  const allColumns = view ? view.columns : SAMPLE_COLUMNS;
  const fields = view ? (view.filterFields.length ? view.filterFields : view.columns) : SAMPLE_FIELDS;
  const fixedParts = view ? splitFilterLine(view.defaultFilter).filter((p) => p.op) : [{ field: 'Server Name', op: 'Equals', value: 'All', raw: '' }];
  const fixedFields = fixedParts.map((p) => p.field);
  const dateText = view ? view.dateRange : SAMPLE_DATE;

  const [tab, setTab] = useState<'columns' | 'filters'>('columns');
  const [cols, setCols] = useState<string[]>([]);
  const [cards, setCards] = useState<AppliedFilter[]>([]);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [state, setState] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [discard, setDiscard] = useState(false);
  const inited = useRef(false);
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);

  // Initialise once the base view has resolved.
  useEffect(() => {
    if (!draft || !views || inited.current) return;
    inited.current = true;
    setCols(allColumns);
    setCards(sample
      ? [{ field: 'Server Name', value: 'All', op: 'Equals' }, ...['Object Path', 'Object Class', 'Where', 'From'].map((f) => ({ field: f, value: '', op: 'Contains' as const }))]
      : fixedParts.map((p) => ({ field: p.field, value: p.value, op: (['Equals', 'Not Equals', 'Contains', 'Not Contains', 'Starts With', 'Ends With'].includes(p.op) ? p.op : 'Equals') as AppliedFilter['op'] })));
  }, [views]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo<Rec[]>(() => (view ? view.rows.slice(0, 24) : sampleRows()).map((r, i) => ({ k: String(i), cells: r })), [view]);
  const shownIdx = cols.map((c) => allColumns.indexOf(c)).filter((i) => i >= 0);
  const filtered = useMemo(() => preview.filter((r) => cards.every((c) => {
    const v = c.value.trim();
    if (!v || v.toLowerCase() === 'all') return true;
    const col = sample ? SAMPLE_MAP[c.field] : c.field;
    const i = col ? allColumns.indexOf(col) : -1;
    return i < 0 || matches(c.op, r.cells[i], v);
  })), [preview, cards, sample, allColumns]);
  const tcols = useMemo<RCol<Rec>[]>(() => shownIdx.map((ci, n) => ({
    key: 'c' + ci, header: allColumns[ci], sortable: true, filterable: true, minWidth: colWidth(allColumns[ci]), cls: cellClass(allColumns[ci], n === 0),
    value: (r) => r.cells[ci], render: (r) => formatCell(allColumns[ci], r.cells[ci]),
  })), [shownIdx.join(','), allColumns]); // eslint-disable-line react-hooks/exhaustive-deps
  const model = useTableModel({ rows: state === 'ready' ? filtered : [], columns: tcols, pageSizes: [1000], defaultPageSize: 1000 });

  if (!draft || isDirectLoad(loc.key)) return <Navigate to={module.basePath} replace />;

  const title = base ? `Report - ${base.name}${base.component ? ` (${base.component})` : ''}` : draft.name;
  const removed = allColumns.filter((c) => !cols.includes(c));
  const freeFields = fields.filter((f) => !cards.some((c) => c.field === f));

  const run = () => {
    setState('loading'); clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('ready'), 700);
  };
  const save = () => {
    const row = reportActions.addCustomReport(module.key, draft, user?.name ?? 'Console User', {
      columns: cols.length ? cols : allColumns,
      filters: cards.filter((c) => c.value.trim() && c.value.trim().toLowerCase() !== 'all').map((c) => ({ ...c, value: c.value.trim() })),
      dateRange: dateText,
    });
    setFocusFolderId(draft.folderId);
    toast({ variant: 'success', title: 'Report saved', message: `"${row.name}" was added to ${folder?.name ?? 'the folder'}.` });
    nav(module.basePath);
  };
  const reAdd = (c: string) => setCols((cur) => allColumns.filter((x) => cur.includes(x) || x === c));

  const collapseBtn = <IconButton icon={collapsed ? 'sliders' : 'chevron-left'} label={collapsed ? 'Show settings' : 'Hide settings'}
    aria-expanded={!collapsed} aria-controls="rlib-builder-settings" onClick={() => setCollapsed((c) => !c)} />;

  return (
    <div className="sub sub--fill rlib">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: module.tileName, to: module.basePath }, { label: 'Reports', to: module.basePath }, { label: 'Create report' }]}
        eyebrow="Step 2 of 2 · Report builder" title={title} description={`${draft.name} · ${folder?.name ?? ''}`}
        actions={<>
          <Button icon="trash" onClick={() => setDiscard(true)}>Discard</Button>
          <Button icon="refresh" loading={state === 'loading'} disabled={!views} onClick={run}>Run report</Button>
          <Button variant="primary" icon="check" onClick={save}>Save</Button>
        </>} />

      <div className={'builder' + (collapsed ? ' rlib-builder--collapsed' : '')}>
        {!collapsed && (
          <aside className="lf-card builder__side" id="rlib-builder-settings" aria-label="Report settings">
            <Segmented ariaLabel="Report settings" value={tab} onChange={(v) => setTab(v as 'columns' | 'filters')}
              items={[{ value: 'columns', label: 'Columns', count: cols.length }, { value: 'filters', label: 'Filters', count: cards.length }]} />
            {tab === 'columns' ? (
              <div className="builder__pane" role="tabpanel" aria-label="Columns">
                <h4 className="mf__h">Columns</h4>
                <ol className="collist">
                  {cols.map((c, i) => (
                    <li key={c} className="colrow">
                      <span className="colrow__n">{i + 1}</span>
                      <span className="colrow__grip" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
                      <span className="colrow__name">{c}</span>
                      <button type="button" className="colrow__x" aria-label={`Remove column ${c}`} disabled={cols.length <= 1}
                        onClick={() => setCols((xs) => xs.filter((x) => x !== c))}><Icon name="x" /></button>
                    </li>
                  ))}
                </ol>
                <Menu align="left" label="Select Columns" items={removed.map((c) => ({ label: c, icon: 'plus', onSelect: () => reAdd(c) }))}
                  trigger={(p) => <button type="button" className="addrow" disabled={!removed.length} aria-label={removed.length ? 'Select Columns' : 'All columns added'} {...p}>
                    <Icon name="plus" size={14} /><span>{removed.length ? 'Select Columns' : 'All columns added'}</span></button>} />
              </div>
            ) : (
              <div className="builder__pane" role="tabpanel" aria-label="Filters">
                <div className="frow frow--fixed">
                  <span className="frow__ic"><Icon name="calendar" size={14} /></span>
                  <div className="frow__main"><div className="frow__head"><b>When</b><span className="frow__cond">Fixed range</span></div><div className="frow__val">{dateText ?? '—'}</div></div>
                </div>
                <div className="fcards">
                  {cards.map((c, i) => (
                    <FilterCard key={c.field} filter={c} autoFocus={focusField === c.field} removable={!fixedFields.includes(c.field)}
                      onChange={(n) => setCards((cs) => cs.map((x, j) => (j === i ? n : x)))}
                      onRemove={() => setCards((cs) => cs.filter((_, j) => j !== i))} />
                  ))}
                </div>
                <Button block onClick={() => toast({ variant: 'info', title: 'Condition', message: "Condition groups aren't part of this prototype yet." })}>Condition</Button>
                <Menu align="left" label="Select Filters" items={freeFields.map((f) => ({ label: f, icon: 'plus', onSelect: () => { setCards((cs) => [...cs, { field: f, value: '', op: 'Contains' }]); setFocusField(f); } }))}
                  trigger={(p) => <button type="button" className="addrow" disabled={!freeFields.length} aria-label={freeFields.length ? 'Select Filters' : 'All filters added'} {...p}>
                    <Icon name="plus" size={14} /><span>{freeFields.length ? 'Select Filters' : 'All filters added'}</span></button>} />
              </div>
            )}
          </aside>
        )}

        {state === 'idle' ? (
          <section className="lf-card tablecard builder__main">
            <div className="toolbar">{collapseBtn}</div>
            <EmptyState icon="refresh" title="Click Run Report to preview the records for this report."
              action={<Button variant="primary" icon="refresh" disabled={!views} onClick={run}>Run report</Button>} />
          </section>
        ) : (
          <ReportTable className="builder__main" model={model} columns={tcols} rowKey={(r) => r.k} loading={state === 'loading'} noPager openArrow={false}
            toolbarStart={collapseBtn}
            title={state === 'loading' ? <span role="status">Running report…</span> : 'Preview'}
            count={state === 'loading' ? undefined : `${model.processed.length} record${model.processed.length === 1 ? '' : 's'}`}
            toolbarEnd={<span className="lf-chip lf-chip--brand">Sample data</span>} />
        )}
      </div>

      <ConfirmDialog open={discard} onClose={() => setDiscard(false)} title="Are you sure?" confirmLabel="Discard"
        message="Discard this report? The columns and filters you set will be lost." onConfirm={() => { setDiscard(false); nav(module.basePath); }} />
    </div>
  );
}

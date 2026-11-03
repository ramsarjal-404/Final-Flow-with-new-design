import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Button, Icon, IconButton, PageHeader, SearchField, Segmented } from '../../../ui';
import { ReportTable, useReportModule, useReportSlice, useTableModel, type RCol } from '../../../reports';
import { BOOT_KEY } from './boot';
import { CLASSIFIED_FILES_ROW_ID } from './config';
import { PATTERNS, contentFor, matchesOf, type Block, type Pattern, type Segment } from './fileView';
import type { ClassifiedFileState } from './PreviewCell';
import { CLASSIFIED_FILES, fileNameOf } from './views';

/* SCR-IDN-03 · Classifications (classified file view), FLW-IDN-02, INT-IDN-007 … 024.
   Lepide Design System 08 § 5: header with breadcrumbs, a file details card (.rd__list tiles), then a two-column grid —
   the pattern list (collapsible with the pin) and the content preview card (values panel + document / email
   frame). Matches render as tone tags; the active one is ink-filled (selected state, D-06). */

type Mode = 'document' | 'email';
const DETAIL_COLUMNS = ['Content Type(s)', 'Compliance', 'Count', 'Risk Level', 'Monetary Value', 'Classification Date Time'];
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function FileViewPage() {
  const loc = useLocation();
  const st = (loc.state ?? null) as Partial<ClassifiedFileState> | null;
  const { module } = useReportModule();
  const { rows, folders } = useReportSlice(module.key);

  const [selected, setSelected] = useState(PATTERNS[0].name);
  const [mode, setMode] = useState<Mode>('document');
  const [revealed, setRevealed] = useState(false);
  const [active, setActive] = useState(0);
  const [showList, setShowList] = useState(true);
  const [valueQuery, setValueQuery] = useState('');
  const textRef = useRef<HTMLDivElement>(null);

  const pattern = PATTERNS.find((p) => p.name === selected) ?? PATTERNS[0];
  const content = useMemo(() => contentFor(pattern), [pattern]);
  const matches = useMemo(() => matchesOf(content, mode), [content, mode]);
  const total = matches.length;

  // Pattern list (INT-IDN-008 … 012): the table model filters, then sorts; a row click maps to that row's pattern.
  const patCols = useMemo<RCol<Pattern>[]>(() => [
    {
      key: 'name', header: 'Pattern Lists', sortable: true, filterable: true, value: (p) => p.name,
      render: (p) => (p.name === selected
        ? <span className="idn-pat is-sel"><span className="idn-pat__tick" aria-hidden="true"><Icon name="check" size={11} /></span><span>{p.name}</span><span className="sr-only"> (selected)</span></span>
        : <span className="idn-pat">{p.name}</span>),
    },
    {
      key: 'count', header: 'Total Count', width: 120, sortable: true, filterable: true, value: (p) => p.count,
      render: (p) => <span className="idn-count">{p.count}</span>,
    },
  ], [selected]);
  const patModel = useTableModel({ rows: PATTERNS, columns: patCols, pageSizes: [PATTERNS.length], defaultPageSize: PATTERNS.length });

  // The active match scrolls to the centre of the text area whenever it changes.
  useEffect(() => {
    const box = textRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-match="${active}"]`);
    if (!box || !el) return;
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    box.scrollTo({ top: Math.max(0, top - box.clientHeight / 2 + el.offsetHeight / 2), behavior: reduceMotion() ? 'auto' : 'smooth' });
  }, [active, mode, selected, showList]);

  const redirect = !st?.cells || !st.columns || loc.key === 'default' || loc.key === BOOT_KEY;
  if (redirect) return <Navigate to={module.basePath} replace />;

  const cells = st.cells!;
  const columns = st.columns!;
  const cell = (c: string) => { const i = columns.indexOf(c); return i >= 0 ? cells[i] ?? '' : ''; };
  const server = cell('File Server');
  const path = cell('File Path');
  const name = fileNameOf(path) || 'Classified file';
  const icon = /\.docx$/i.test(name) ? '/blueprint/assets/identify/word.svg' : '/blueprint/assets/product/file.svg';

  const reportRow = rows.find((r) => r.id === CLASSIFIED_FILES_ROW_ID);
  const folder = reportRow ? folders.find((f) => f.id === reportRow.folderId) : undefined;

  const select = (p: Pattern) => { setSelected(p.name); setActive(0); };
  const switchMode = (m: string) => { setMode(m as Mode); setActive(0); };
  const step = (d: number) => total > 1 && setActive((a) => (a + d + total) % total);
  const masked = mode === 'email' && !revealed;
  const activeValue = matches[active];
  const vq = valueQuery.trim().toLowerCase();
  const shownValues = content.values.filter((v) => !vq || v.toLowerCase().includes(vq));

  /* Text rendering: a running counter numbers the matches in reading order. */
  let n = 0;
  const seg = (segs: Segment[]): ReactNode[] => segs.map((s, i) => {
    if (typeof s === 'string') return <span key={i}>{s}</span>;
    const k = n++;
    const tip = `${pattern.name} · match ${k + 1} of ${total}`;
    return (
      <button key={i} type="button" data-match={k} data-tip={tip}
        className={'fx-op fx-op--info idn-match' + (k === active ? ' is-active' : '') + (masked ? ' is-masked' : '')}
        aria-label={masked ? 'Hidden value' : `${s.match}, ${tip}`} aria-current={k === active ? 'true' : undefined}
        onClick={() => setActive(k)}>
        {s.match}
      </button>
    );
  });
  const blocks = (bs: Block[]) => bs.map((b, i) => ('heading' in b ? <h4 key={i}>{b.heading}</h4> : <p key={i}>{seg(b.text)}</p>));

  return (
    <div className="sub sub--fill idn-file">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link><span aria-hidden="true">&rsaquo;</span>
        <Link to={module.basePath}>{module.tileName}</Link><span aria-hidden="true">&rsaquo;</span>
        <Link to={module.basePath}>Reports</Link><span aria-hidden="true">&rsaquo;</span>
        {folder && <><Link to={module.basePath} state={{ folderId: folder.id }}>{folder.name}</Link><span aria-hidden="true">&rsaquo;</span></>}
        <Link to={`${module.basePath}/reports/${CLASSIFIED_FILES}`} state={{ rowId: CLASSIFIED_FILES_ROW_ID, generated: true }}>Classified Files</Link>
        <span aria-hidden="true">&rsaquo;</span>
        <b aria-current="page">Classifications</b>
      </nav>
      <PageHeader eyebrow="Classifications"
        title={<span className="idn-file__title"><img src={icon} alt="" width={34} height={34} /><span>{name}</span></span>}>
        <div className="idn-file__chips">
          <span className="lf-chip idn-chip"><b>Server -</b>&nbsp;{server || '—'}</span>
          <span className="lf-chip idn-chip idn-chip--path" data-tip={path} tabIndex={0} aria-label={`File Path - ${path}`}>
            <b>File Path -</b>&nbsp;<span>{path || '—'}</span>
          </span>
        </div>
      </PageHeader>

      <section className="lf-card idn-details" aria-label="File details">
        <dl className="rd__list idn-details__list">
          {DETAIL_COLUMNS.filter((c) => columns.includes(c)).map((c) => (
            <div key={c} className="rd__row"><dt>{c}</dt><dd>{cell(c) || <span className="lf-na">—</span>}</dd></div>
          ))}
        </dl>
      </section>

      <div className={'idn-file__body' + (showList ? '' : ' idn-file__body--nolist')}>
        {showList && (
          <div className="idn-patterns" role="region" aria-label="Pattern list">
            <ReportTable model={patModel} columns={patCols} rowKey={(p) => p.name} title="Patterns"
              count={`${patModel.processed.length} of ${PATTERNS.length}`} noPager openArrow={false}
              onRowOpen={(p) => select(p)} selectedKey={selected} noResults="No patterns match your search." />
          </div>
        )}

        <section className="lf-card idn-preview" aria-label="Content preview">
          <section className="idn-values" aria-label={`${pattern.name} values`}>
            <header className="idn-values__head">
              <h3>{pattern.name}</h3>
              <IconButton icon="list" label={showList ? 'Hide pattern list' : 'Show pattern list'} aria-pressed={showList}
                className={'idn-pin' + (showList ? ' is-on' : '')} onClick={() => setShowList((s) => !s)} />
            </header>
            <SearchField value={valueQuery} onChange={setValueQuery} placeholder="Search values" ariaLabel="Search values" className="idn-values__search" />
            <h4 className="idn-values__sub">Value</h4>
            <ul className="idn-values__list">
              {shownValues.map((v) => {
                const at = matches.indexOf(v);
                const tip = at >= 0 ? `Go to match ${at + 1}` : 'Not in this view';
                return (
                  <li key={v}>
                    <button type="button" className={'idn-value' + (v === activeValue ? ' is-active' : '') + (at < 0 ? ' is-out' : '')}
                      data-tip={tip} aria-label={`${v}, ${tip}`} aria-disabled={at < 0 || undefined} aria-current={v === activeValue ? 'true' : undefined}
                      onClick={() => at >= 0 && setActive(at)}>
                      <span>{v}</span>
                      {at >= 0 && <span className="idn-value__n" aria-hidden="true">{at + 1}</span>}
                    </button>
                  </li>
                );
              })}
              {shownValues.length === 0 && <li className="idn-values__empty">No values match your search.</li>}
            </ul>
          </section>

          <section className="idn-viewer" aria-label="File content">
            <div className="idn-viewer__bar">
              <Segmented ariaLabel="View as" value={mode} onChange={switchMode}
                items={[{ value: 'document', label: 'Document' }, { value: 'email', label: 'Email' }]} />
              <div className="idn-viewer__nav">
                <IconButton icon="chevron-left" label="Previous match" bordered disabled={total < 2} onClick={() => step(-1)} />
                <span className="idn-counter" aria-live="polite">{total ? active + 1 : 0} / {total}</span>
                <IconButton icon="chevron-right" label="Next match" bordered disabled={total < 2} onClick={() => step(1)} />
                <span data-tip={mode === 'email' ? undefined : 'Values are masked only in the Email view'} style={{ display: 'inline-flex' }}>
                  <Button size="sm" icon="eye" className="idn-reveal" aria-pressed={revealed} disabled={mode !== 'email'} onClick={() => setRevealed((r) => !r)}>
                    {revealed ? 'Hide' : 'Reveal'}
                  </Button>
                </span>
              </div>
            </div>
            <div className="idn-frame" ref={textRef}>
              {mode === 'document' ? (
                <article className="idn-doc">{blocks(content.document)}</article>
              ) : (
                <article className="idn-email">
                  <h3 className="idn-email__subject">{seg(content.email.subject)}</h3>
                  <dl className="idn-email__meta">
                    {content.email.meta.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                  </dl>
                  <ul className="idn-email__att" aria-label="Attachments">
                    {content.email.attachments.map(([f, c]) => (
                      <li key={f} className="lf-chip"><Icon name="file" size={12} />{f}<b>{c}</b></li>
                    ))}
                  </ul>
                  <div className="idn-email__body">{blocks(content.email.body)}</div>
                  <div className="idn-email__sig">{content.email.signature.map((l) => <p key={l}>{l}</p>)}</div>
                </article>
              )}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}

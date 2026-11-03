import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandMark, Button, ConfirmDialog, EmptyState, Icon, IconButton, KeyValues, PageHeader, Pager, useToast } from '../../ui';
import { ALERT_ENVIRONMENTS, STATUS_REPORT_KINDS, detectStore, emlName, removeStatusRow, sentOnTime, type StatusRow } from './model';
import { SidePanel } from './parts';

/* SCR-DET-03 · Alert Status — tree card + email table card + email preview detail panel (04 § 9, 08 § 6). */

type Leaf = { env: string; kind: 'delivered' | 'failed' };
type ColKey = 'from' | 'to' | 'subject' | 'sentOn';
const COLS: { key: ColKey; header: string; width?: number }[] = [
  { key: 'from', header: 'From' }, { key: 'to', header: 'To' }, { key: 'subject', header: 'Subject' }, { key: 'sentOn', header: 'Sent On', width: 210 },
];
const PAGE_SIZES = [10, 20, 50, 100];
const envLabel = (id: string) => ALERT_ENVIRONMENTS.find((e) => e.id === id)?.label ?? id;
const kindLabel = (k: string) => STATUS_REPORT_KINDS.find((x) => x.id === k)?.label ?? k;
const clip = (s: string) => (s.length > 24 ? s.slice(0, 24) + '…' : s);

/** Client-side .eml composition (FLW-DET-09; GAP-DET-10 intended copy "change(s)"). */
function saveEmail(r: StatusRow) {
  const name = emlName(r.sentOn);
  const body = [
    `From: ${r.from}`, `To: ${r.to}`, `Subject: ${r.subject}`, `Date: ${r.sentOn}`, 'Content-Type: text/plain; charset=utf-8', '',
    'Attention!', r.title, `You have received this alert because ${r.changes} change(s) have been made in your ${r.source}.`,
    'Now you can check the report directly on LDSP web - console.',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'message/rfc822' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

export default function AlertStatus() {
  const toast = useToast();
  const navigate = useNavigate();
  const rowsAll = detectStore.use((s) => s.statusRows);
  const [openEnv, setOpenEnv] = useState<string | null>(null);
  const [leaf, setLeaf] = useState<Leaf | null>(null);
  const [hidden, setHidden] = useState(false);
  const [filters, setFilters] = useState<Record<ColKey, string>>({ from: '', to: '', subject: '', sentOn: '' });
  const [sort, setSort] = useState<{ key: ColKey; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(50);
  const [preview, setPreview] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<StatusRow | null>(null);

  const pick = (l: Leaf) => {
    setLeaf(l); setPreview(null); setFilters({ from: '', to: '', subject: '', sentOn: '' }); setPage(1); // sort is kept
  };
  useEffect(() => { setPage(1); }, [filters, size]);

  const base = useMemo(() => (leaf ? rowsAll.filter((r) => (leaf.env === 'all' || r.environment === leaf.env) && r.delivered === (leaf.kind === 'delivered')) : []), [rowsAll, leaf]);
  const list = useMemo(() => {
    let out = base.filter((r) => (Object.keys(filters) as ColKey[]).every((k) => !filters[k].trim() || r[k].toLowerCase().includes(filters[k].trim().toLowerCase())));
    if (sort) {
      // GAP-DET-14 intended: "Sent On" sorts chronologically.
      const v = (r: StatusRow) => (sort.key === 'sentOn' ? sentOnTime(r.sentOn) : r[sort.key]);
      out = [...out].sort((a, b) => {
        const x = v(a), y = v(b);
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' });
        return sort.dir === 'asc' ? c : -c;
      });
    }
    return out;
  }, [base, filters, sort]);
  const pages = Math.max(1, Math.ceil(list.length / size));
  const cur = Math.min(page, pages);
  const slice = list.slice((cur - 1) * size, cur * size);
  const shown = rowsAll.find((r) => r.id === preview) ?? null;
  const closePreview = useCallback(() => setPreview(null), []);

  let emptyNode: React.ReactNode = null;
  if (!leaf) emptyNode = <EmptyState icon="mail" title="No data found" />;
  else if (!base.length) emptyNode = <EmptyState icon="mail" title={leaf.kind === 'failed' ? `No failed alert emails in ${envLabel(leaf.env)}.` : 'No Data Found'} />;

  return (
    <div className="sub sub--fill">
      <PageHeader title="Alert Status" />
      <div className={'reports detect-status' + (hidden ? ' reports--collapsed' : '')}>
        <aside className="lf-card folders" aria-label="Alert folders">
          <ul className="tree" role="tree" aria-label="Alert folders">
            {ALERT_ENVIRONMENTS.map((env) => {
              const isOpen = openEnv === env.id;
              const hasSel = leaf?.env === env.id;
              return (
                <li key={env.id} role="none">
                  <button type="button" role="treeitem" aria-expanded={isOpen} className={hasSel ? 'detect-tree-hit' : undefined}
                    onClick={() => setOpenEnv(isOpen ? null : env.id)}>
                    <Icon name="chevron-right" className="sign" />
                    <span>{env.label}</span>
                  </button>
                  {isOpen && (
                    <ul role="group">
                      {STATUS_REPORT_KINDS.map((k) => {
                        const sel = leaf?.env === env.id && leaf.kind === k.id;
                        return (
                          <li key={k.id} role="none">
                            <button type="button" role="treeitem" aria-current={sel ? 'true' : undefined} aria-selected={sel}
                              className={sel ? 'detect-leaf-on' : undefined} onClick={() => pick({ env: env.id, kind: k.id })}>
                              <Icon name={k.id === 'delivered' ? 'mail' : 'alert'} />
                              <span>{k.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="detect-status__wrap">
        <div className={shown ? 'with-detail detect-status__main' : 'detect-status__main'}>
          <section className="lf-card tablecard">
            <div className="toolbar">
              <h3 className="lf-card__title">
                <IconButton icon="collapse" label={hidden ? 'Show folders' : 'Hide folders'} aria-expanded={!hidden} onClick={() => setHidden((h) => !h)} />
                {leaf && <span className="detect-context">{envLabel(leaf.env)} <span aria-hidden="true">›</span> {kindLabel(leaf.kind)}</span>}
                {leaf && <small className="count-chip">{list.length} {list.length === 1 ? 'email' : 'emails'}</small>}
              </h3>
            </div>
            <div className="tbl-wrap">
              <table className="lf-table">
                <thead>
                  <tr>
                    {COLS.map((c) => {
                      const dir = sort?.key === c.key ? sort.dir : undefined;
                      return (
                        <th key={c.key} style={{ width: c.width }} aria-sort={dir ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                          <button type="button" className="th-sort" data-dir={dir} onClick={() => setSort(dir === 'asc' ? { key: c.key, dir: 'desc' } : { key: c.key, dir: 'asc' })}>
                            {c.header}<Icon name={dir === 'asc' ? 'up' : dir === 'desc' ? 'down' : 'sort'} size={12} />
                          </button>
                        </th>
                      );
                    })}
                    <th style={{ width: 104 }}>Action</th>
                  </tr>
                  {leaf && (
                    <tr className="filter-row">
                      {COLS.map((c) => (
                        <th key={c.key}>
                          <span className={'filter-input' + (filters[c.key] ? ' has-value' : '')}>
                            <Icon name="search" size={12} />
                            <input value={filters[c.key]} placeholder="Filter" aria-label={`Filter ${c.header}`} maxLength={200}
                              onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))} />
                          </span>
                        </th>
                      ))}
                      <th />
                    </tr>
                  )}
                </thead>
                <tbody className="rows-in">
                  {emptyNode ? (
                    <tr><td colSpan={5} style={{ padding: 0, height: 'auto', maxWidth: 'none', whiteSpace: 'normal' }}>{emptyNode}</td></tr>
                  ) : slice.length === 0 ? (
                    <tr><td colSpan={5} className="empty-cell">No results match your search or filters.</td></tr>
                  ) : slice.map((r) => (
                    <tr key={r.id} className={'lf-row' + (preview === r.id ? ' is-sel' : '')} tabIndex={0}
                      onClick={(e) => { if (!(e.target as Element).closest('button')) setPreview(r.id); }}
                      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); setPreview(r.id); } }}>
                      <td title={r.from}>{r.from}</td>
                      <td title={r.to}>{r.to}</td>
                      <td title={r.subject}>{clip(r.subject)}</td>
                      <td className="lf-mono" title={r.sentOn}>{r.sentOn}</td>
                      <td>
                        <span className="row" style={{ gap: 2 }}>
                          <IconButton icon="trash" danger label={`Delete alert sent on ${r.sentOn}`} data-tip="Delete" onClick={() => setDeleting(r)} />
                          <IconButton icon="download" label={`Save alert email sent on ${r.sentOn}`} data-tip="Save email"
                            onClick={() => { const n = saveEmail(r); toast({ variant: 'success', title: 'Email saved', message: `${n} downloaded.` }); }} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {leaf && list.length > 0 && (
              <Pager total={list.length} noun={['email', 'emails']} page={cur} pages={pages} size={size} sizes={PAGE_SIZES} onPage={setPage} onSize={setSize} />
            )}
          </section>

          {/* DLG-DET-18 · Email preview panel */}
          {shown && (
            <SidePanel label="Alert email preview" closeLabel="Close preview" onClose={closePreview}
              head={<div className="detect-brand"><BrandMark size={30} /><b>Lepide</b></div>}>
              <div className="stack">
                <article className="detect-mail">
                  <span className="detect-mail__ic" aria-hidden="true"><Icon name="alert" size={22} /></span>
                  <h4>Attention!</h4>
                  <p className="detect-mail__title">{shown.title}</p>
                  <p>You have received this alert because <b>{shown.changes} change(s)</b> have been made in your <b>{shown.source}</b></p>
                  <div><Button variant="primary" icon="external" onClick={() => navigate(shown.reportPath)}>View report</Button></div>
                  <p className="detect-hint">Now you can check the report directly on LDSP web - console</p>
                </article>
                <KeyValues items={[
                  { label: 'From', value: shown.from, wide: true }, { label: 'To', value: shown.to, wide: true },
                  { label: 'Subject', value: shown.subject, wide: true }, { label: 'Sent On', value: shown.sentOn, wide: true },
                ]} />
              </div>
            </SidePanel>
          )}
        </div>
        </div>
      </div>

      {/* DLG-DET-19 · Delete alert email confirm */}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete alert email" confirmLabel="Delete"
        message={deleting ? `Delete the alert email sent to ${deleting.to} on ${deleting.sentOn}? This can't be undone.` : undefined}
        onConfirm={() => {
          if (!deleting) return;
          removeStatusRow(deleting.id);
          if (preview === deleting.id) setPreview(null);
          // GAP-DET-10 intended title.
          toast({ variant: 'success', title: 'Alert email deleted', message: 'The alert email was removed from Alert Status.' });
          setDeleting(null);
        }} />
    </div>
  );
}

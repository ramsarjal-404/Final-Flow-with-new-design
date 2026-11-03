import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Checkbox, Icon, Segmented, useToast } from '../../../ui';
import type { IdfSource } from './store';

/* ---------- DDC console chrome (SCR-SDS-12 … SCR-SDS-20) ---------- */
const RAIL = [
  { value: '', label: 'Profile name' },
  { value: 'templates', label: 'Templates' },
  { value: 'tags', label: 'Tags' },
  { value: 'patterns', label: 'Pattern' },
  { value: 'agents', label: 'Agent' },
  { value: 'servers', label: 'Centralized server' },
];

export type Crumb = { label: string; to?: string; onClick?: () => void };

/** Local header of a DDC page: crumbs ("Data Discovery & Classification / …"), title row with the page
 *  actions, and the "Data discovery settings" rail (hidden on editor pages). */
export function Console({ source, title, subtitle, crumbs, actions, rail = true, logo, children }: {
  source: IdfSource; title: ReactNode; subtitle?: ReactNode; crumbs: Crumb[]; actions?: ReactNode; rail?: boolean; logo?: boolean; children: ReactNode;
}) {
  const nav = useNavigate();
  const loc = useLocation();
  const seg = loc.pathname.split('/')[4] ?? '';
  const current = RAIL.some((r) => r.value === seg) ? seg : '';
  const all: Crumb[] = [{ label: 'Data Discovery & Classification', to: '/settings/identify' }, ...crumbs];
  return (
    <div className="stack">
      <section className="lf-card identify-sub">
        <nav className="crumbs identify-crumbs" aria-label="Data discovery breadcrumb">
          {all.map((c, i) => {
            const last = i === all.length - 1;
            return (
              <span key={i} style={{ display: 'contents' }}>
                {i > 0 && <span aria-hidden="true">/</span>}
                {last ? <b aria-current="page">{c.label}</b>
                  : c.to ? <Link to={c.to}>{c.label}</Link>
                  : <button type="button" className="identify-crumb-btn" onClick={c.onClick}>{c.label}</button>}
              </span>
            );
          })}
        </nav>
        <div className="identify-head">
          {logo && <span className="identify-logo"><img src={source.logo} alt="" /></span>}
          <div className="identify-head__text"><h3>{title}</h3>{subtitle && <small>{subtitle}</small>}</div>
          {actions && <div className="row row--wrap">{actions}</div>}
        </div>
        {rail && (
          <div className="identify-rail">
            <Segmented ariaLabel="Data discovery settings" items={RAIL} value={current}
              onChange={(v) => nav(`/settings/identify/${source.id}${v ? '/' + v : ''}`)} />
          </div>
        )}
      </section>
      {children}
    </div>
  );
}

/** Pill search field with an explicit "Clear search" action. */
export function SearchBox({ value, onChange, ariaLabel, maxLength = 200, placeholder = 'Search' }: {
  value: string; onChange: (v: string) => void; ariaLabel: string; maxLength?: number; placeholder?: string;
}) {
  return (
    <label className="lf-field identify-search">
      <span className="lf-input lf-input--pill">
        <Icon name="search" />
        <input value={value} placeholder={placeholder} aria-label={ariaLabel} maxLength={maxLength} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.stopPropagation(); onChange(''); } }} />
        {value && <button type="button" className="identify-clear" aria-label="Clear search" onClick={() => onChange('')}><Icon name="x" size={14} /></button>}
      </span>
    </label>
  );
}

/** Wraps a control so its tooltip shows even while it is disabled. */
export function Tip({ tip, children }: { tip?: string; children: ReactNode }) {
  if (!tip) return <>{children}</>;
  return <span className="identify-tipwrap" data-tip={tip}>{children}</span>;
}

/* ---------- tree navigator (expandable groups, selectable leaves) ---------- */
export function TreeGroup({ label, open, onToggle, children, icon = 'server' }: {
  label: string; open: boolean; onToggle: () => void; children: ReactNode; icon?: 'server' | 'folder' | 'database';
}) {
  return (
    <li className="grp">
      <button type="button" aria-expanded={open} onClick={onToggle}>
        <Icon name="chevron-right" className="sign" /><Icon name={icon} /><span>{label}</span>
      </button>
      {open && <ul role="group">{children}</ul>}
    </li>
  );
}
export function TreeLeaf({ label, selected, onSelect, onDouble, icon = 'folder' }: {
  label: string; selected: boolean; onSelect: () => void; onDouble?: () => void; icon?: 'folder' | 'database' | 'server';
}) {
  return (
    <li>
      <button type="button" role="treeitem" aria-selected={selected} onClick={onSelect} onDoubleClick={onDouble}>
        <Icon name={icon} /><span>{label}</span>
      </button>
    </li>
  );
}

/* ---------- small checkable table used inside dialogs ---------- */
export type MiniCol<T> = { key: string; header: string; cell: (r: T) => ReactNode };
export function CheckTable<T>({ rows, cols, rowKey, checked, onChecked, empty, maxHeight = 280, rowToggle, label }: {
  rows: T[]; cols: MiniCol<T>[]; rowKey: (r: T) => string; checked?: string[]; onChecked?: (k: string[]) => void;
  empty: ReactNode; maxHeight?: number; rowToggle?: boolean; label?: string;
}) {
  const keys = rows.map(rowKey);
  const sel = checked ?? [];
  const all = keys.length > 0 && keys.every((k) => sel.includes(k));
  const some = keys.some((k) => sel.includes(k));
  const toggle = (k: string) => onChecked?.(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k]);
  return (
    <div className="tbl-wrap identify-mini" style={{ maxHeight }}>
      <table className="lf-table" aria-label={label}>
        <thead><tr>
          {onChecked && <th className="th-check"><Checkbox checked={all} indeterminate={some && !all} ariaLabel="Select all rows"
            onChange={() => onChecked(all ? sel.filter((k) => !keys.includes(k)) : Array.from(new Set([...sel, ...keys])))} /></th>}
          {cols.map((c) => <th key={c.key}>{c.header}</th>)}
        </tr></thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length + (onChecked ? 1 : 0)} className="tbl-empty" style={{ position: 'static' }}>{empty}</td></tr>
          ) : rows.map((r) => {
            const k = rowKey(r); const on = sel.includes(k);
            return (
              <tr key={k} className={'lf-row' + (on ? ' is-sel' : '')} style={rowToggle ? undefined : { cursor: 'default' }}
                onClick={(e) => { if (!rowToggle || (e.target as Element).closest('label,button,input')) return; toggle(k); }}>
                {onChecked && <td className="td-check"><Checkbox checked={on} ariaLabel="Select row" onChange={() => toggle(k)} /></td>}
                {cols.map((c) => <td key={c.key} className="td-wrap">{c.cell(r)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- pick-and-drop editor (templates, tags, profile templates step) ---------- */
export type PdCol<T> = { key: string; header: string; value: (r: T) => string };

export function PickDrop<T>({ rows, rowKey, rowName, left, right, chosen, onChosen, checked, onChecked, noun, container, dropText, leftTitle, rightTitle }: {
  rows: T[]; rowKey: (r: T) => string; rowName: (r: T) => string; left: PdCol<T>[]; right: PdCol<T>[];
  chosen: string[]; onChosen: (ids: string[]) => void; checked: string[]; onChecked: (ids: string[]) => void;
  noun: 'templates' | 'tags' | 'patterns'; container: 'profile' | 'template' | 'tag'; dropText: string; leftTitle: string; rightTitle: string;
}) {
  const toast = useToast();
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [over, setOver] = useState(false);

  const shown = useMemo(() => {
    let out = rows.filter((r) => left.every((c) => { const f = (filters[c.key] ?? '').trim().toLowerCase(); return !f || c.value(r).toLowerCase().includes(f); }));
    if (sort) {
      const c = left.find((x) => x.key === sort.key)!;
      out = [...out].sort((a, b) => c.value(a).localeCompare(c.value(b), undefined, { numeric: true, sensitivity: 'base' }) * (sort.dir === 'asc' ? 1 : -1));
    }
    return out;
  }, [rows, left, filters, sort]);
  const keys = shown.map(rowKey);
  const all = keys.length > 0 && keys.every((k) => checked.includes(k));
  const some = keys.some((k) => checked.includes(k));
  const toggle = (k: string) => onChecked(checked.includes(k) ? checked.filter((x) => x !== k) : [...checked, k]);

  const add = (extra?: string) => {
    const ids = extra && !checked.includes(extra) ? [extra, ...checked] : checked;
    if (ids.length === 0) { toast({ variant: 'info', title: 'Nothing checked', message: `Check ${noun} on the left first, then drag them here.` }); return; }
    const fresh = ids.filter((id) => !chosen.includes(id) && rows.some((r) => rowKey(r) === id));
    if (fresh.length === 0) { toast({ variant: 'info', title: 'Already added', message: `Those ${noun} are already in the ${container}.` }); onChecked([]); return; }
    onChosen([...chosen, ...fresh]);
    onChecked([]);
  };
  const chosenRows = chosen.map((id) => rows.find((r) => rowKey(r) === id)).filter(Boolean) as T[];
  const dropProps = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setOver(false); add(e.dataTransfer.getData('text/plain') || undefined); },
  };

  return (
    <div className="identify-pd">
      <section className="lf-card tablecard tablecard--flat identify-pd__side">
        <div className="toolbar"><h3 className="lf-card__title" style={{ margin: 0 }}>{leftTitle}<small className="count-chip">{shown.length}</small></h3></div>
        <div className="tbl-wrap" style={{ maxHeight: 420 }}>
          <table className="lf-table">
            <thead>
              <tr>
                <th className="th-check"><Checkbox checked={all} indeterminate={some && !all} ariaLabel="Select all rows"
                  onChange={() => onChecked(all ? checked.filter((k) => !keys.includes(k)) : Array.from(new Set([...checked, ...keys])))} /></th>
                {left.map((c) => {
                  const dir = sort?.key === c.key ? sort.dir : undefined;
                  return (
                    <th key={c.key} aria-sort={dir ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      <button type="button" className="th-sort" data-dir={dir} onClick={() => setSort(dir === 'asc' ? { key: c.key, dir: 'desc' } : { key: c.key, dir: 'asc' })}>
                        {c.header}<Icon name={dir === 'asc' ? 'up' : dir === 'desc' ? 'down' : 'sort'} size={12} />
                      </button>
                    </th>
                  );
                })}
              </tr>
              <tr className="filter-row">
                <th />
                {left.map((c) => (
                  <th key={c.key}>
                    <span className={'filter-input' + (filters[c.key] ? ' has-value' : '')}>
                      <Icon name="search" size={12} />
                      <input value={filters[c.key] ?? ''} placeholder="Filter" aria-label={`Filter ${c.header}`} maxLength={100}
                        onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={left.length + 1} className="empty-cell" style={{ maxWidth: 'none', position: 'static' }}>No records found.</td></tr>
              ) : shown.map((r) => {
                const k = rowKey(r); const on = checked.includes(k);
                return (
                  <tr key={k} className={'lf-row identify-drag' + (on ? ' is-sel' : '')} draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', k); e.dataTransfer.effectAllowed = 'copy'; if (!on) onChecked([...checked, k]); }}
                    onClick={(e) => { if ((e.target as Element).closest('label,button,input')) return; toggle(k); }}>
                    <td className="td-check"><Checkbox checked={on} ariaLabel={`Check ${rowName(r)}`} onChange={() => toggle(k)} /></td>
                    {left.map((c) => <td key={c.key} title={c.value(r)}>{c.value(r) || <span className="lf-na">—</span>}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className={'lf-card tablecard tablecard--flat identify-pd__side' + (over ? ' is-over' : '')} {...dropProps}>
        <div className="toolbar">
          <h3 className="lf-card__title" style={{ margin: 0 }}>{rightTitle}<small className="count-chip">{chosenRows.length}</small></h3>
          {chosenRows.length > 0 && <button type="button" className="lf-link identify-linkbtn" onClick={() => add()}>Add checked rows</button>}
        </div>
        {chosenRows.length === 0 ? (
          <div className="identify-drop-wrap">
            <button type="button" className={'identify-drop' + (over ? ' is-over' : '')} onClick={() => add()}>
              <Icon name="download" size={22} /><span>{dropText}</span>
            </button>
          </div>
        ) : (
          <div className="tbl-wrap" style={{ maxHeight: 420 }}>
            <table className="lf-table">
              <thead><tr>{right.map((c) => <th key={c.key}>{c.header}</th>)}<th style={{ width: 60 }}><span className="sr-only">Action</span></th></tr></thead>
              <tbody>
                {chosenRows.map((r) => (
                  <tr key={rowKey(r)} className="lf-row" style={{ cursor: 'default' }}>
                    {right.map((c) => <td key={c.key} title={c.value(r)}>{c.value(r) || <span className="lf-na">—</span>}</td>)}
                    <td className="lf-row__end" style={{ width: 60 }}>
                      <button type="button" className="lf-btn lf-btn--icon identify-danger-ic" aria-label={`Remove ${rowName(r)}`}
                        onClick={() => onChosen(chosen.filter((x) => x !== rowKey(r)))}><Icon name="trash" size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

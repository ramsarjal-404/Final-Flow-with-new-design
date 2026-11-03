/* Generic pieces the Protect screens need that the UI kit does not provide, built from Lepide Design System classes. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, IconButton, Menu, Pager, ToneTag, onMenuKeys, useDismiss, type IconName, type StatusTone } from '../../ui';

/* ------------------------------------------------------------------ menu rendered in a portal (row menus inside scrolling tables) */
export type RowMenuItem = { label: string; icon?: IconName; onSelect?: () => void; danger?: boolean; disabled?: boolean; submenu?: RowMenuItem[] };
export function PortalMenu({ label, items, trigger, heading }: {
  label: string; items: RowMenuItem[]; heading?: string;
  trigger: (p: { ref: (el: HTMLButtonElement | null) => void; onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<number | null>(null);
  const btn = useRef<HTMLButtonElement | null>(null);
  const pop = useRef<HTMLDivElement>(null);
  const subPop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [subPos, setSubPos] = useState<{ top: number; left: number } | null>(null);
  const close = () => { setOpen(false); setSub(null); };
  useDismiss(open, close, [pop as React.RefObject<HTMLElement>, subPop as React.RefObject<HTMLElement>, btn as React.RefObject<HTMLElement>]);
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect(); const w = pop.current?.offsetWidth ?? 220; const h = pop.current?.offsetHeight ?? 200;
      let left = r.left - w - 6; if (left < 8) left = Math.min(r.right - w, innerWidth - w - 8);
      let top = r.top; if (top + h > innerHeight - 8) top = Math.max(8, r.bottom - h);
      setPos({ top, left: Math.max(8, left) });
    };
    place();
    const h = (e: Event) => { if (pop.current?.contains(e.target as Node)) return; close(); };
    addEventListener('scroll', h, true); addEventListener('resize', close);
    requestAnimationFrame(() => { place(); pop.current?.querySelector<HTMLElement>('.pop__item:not(:disabled)')?.focus(); });
    return () => { removeEventListener('scroll', h, true); removeEventListener('resize', close); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (sub === null || !pop.current) { setSubPos(null); return; }
    const el = pop.current.querySelectorAll<HTMLElement>('.pop__item')[sub]; if (!el) return;
    const r = el.getBoundingClientRect(); const w = 200;
    let left = r.left - w - 6; if (left < 8) left = r.right + 6;
    setSubPos({ top: r.top - 6, left });
  }, [sub]);
  const subItems = sub !== null ? items[sub]?.submenu : undefined;
  const item = (it: RowMenuItem, i: number, inSub: boolean) => (
    <button key={i} type="button" role="menuitem" className={'pop__item' + (it.danger ? ' pop__item--danger' : '')} disabled={it.disabled}
      aria-haspopup={it.submenu ? 'menu' : undefined} aria-expanded={it.submenu ? sub === i : undefined}
      onMouseEnter={() => { if (!inSub) setSub(it.submenu ? i : null); }}
      onKeyDown={(e) => { if (it.submenu && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter')) { e.preventDefault(); setSub(i); requestAnimationFrame(() => subPop.current?.querySelector<HTMLElement>('.pop__item')?.focus()); } }}
      onClick={() => { if (it.submenu) { setSub(i); return; } close(); it.onSelect?.(); }}>
      {it.icon && <Icon name={it.icon} size={15} />}<span className="grow">{it.label}</span>{it.submenu && <Icon name="chevron-left" size={14} />}
    </button>
  );
  return (
    <>
      {trigger({ ref: (el) => { btn.current = el; }, onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {open && createPortal(
        <div ref={pop} className="pop lf protect-pop" role="menu" aria-label={label} style={{ position: 'fixed', top: pos?.top ?? -999, left: pos?.left ?? -999, right: 'auto' }} onKeyDown={onMenuKeys}>
          {heading && <div className="pop__head">{heading}</div>}
          {items.map((it, i) => item(it, i, false))}
        </div>, document.body)}
      {open && subItems && subPos && createPortal(
        <div ref={subPop} className="pop lf protect-pop" role="menu" aria-label={items[sub!].label} style={{ position: 'fixed', top: subPos.top, left: subPos.left, right: 'auto', minWidth: 200 }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const s = sub; setSub(null); requestAnimationFrame(() => pop.current?.querySelectorAll<HTMLElement>('.pop__item')[s!]?.focus()); return; }
            onMenuKeys(e);
          }}>
          {subItems.map((it, i) => item(it, i, true))}
        </div>, document.body)}
    </>
  );
}

/** Row action trigger: kebab icon button labelled "Actions for <name>". */
export function RowMenu({ name, items }: { name: string; items: RowMenuItem[] }) {
  return <PortalMenu label={`Actions for ${name}`} items={items}
    trigger={(p) => <IconButton icon="more" label={`Actions for ${name}`} ref={p.ref} onClick={p.onClick} aria-expanded={p['aria-expanded']} aria-haspopup="menu" />} />;
}

/* ------------------------------------------------------------------ status with progress */
function useCountTo(target: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(target); return; }
    let raf = 0; const t0 = performance.now();
    const f = (now: number) => { const p = Math.min(1, (now - t0) / 700); setN(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}
export function StatusCell({ label, pct, clock, tone }: { label: string; pct: number; clock?: boolean; tone: StatusTone }) {
  const n = useCountTo(clock ? 0 : pct);
  return (
    <span className="protect-status">
      <ToneTag tone={tone}>{label}</ToneTag>
      {clock ? <span className="protect-status__clock" aria-hidden="true"><Icon name="clock" size={14} /></span> : (
        <span className="protect-status__bar" role="progressbar" aria-label={`${label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <span className="progress__track"><span className="progress__fill" style={{ width: n + '%' }} /></span><b>{n}%</b>
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ chip input (recipients, exclusions) */
export function ChipInput({ label, values, onChange, placeholder, locked = [], validate, ariaLabel, disabled }: {
  label?: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; locked?: string[];
  validate?: (v: string, all: string[]) => string | null; ariaLabel?: string; disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const commit = () => {
    const parts = text.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) { setText(''); return; }
    let next = [...values]; let error: string | null = null;
    for (const p of parts) {
      const e = validate ? validate(p, [...locked, ...next]) : (next.some((x) => x.toLowerCase() === p.toLowerCase()) || locked.some((x) => x.toLowerCase() === p.toLowerCase()) ? '' : null);
      if (e !== null) { if (e) error = e; continue; }
      next = [...next, p];
    }
    setErr(error); onChange(next); setText(error ? parts.filter((p) => !next.includes(p)).join(', ') : '');
  };
  return (
    <div className={'fld' + (err ? ' is-bad' : '')}>
      {label && <span className="fld__lbl">{label}</span>}
      <div className={'protect-chipin' + (disabled ? ' is-disabled' : '')} onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}>
        {locked.map((v) => <span key={v} className="lf-chip lf-chip--flat"><Icon name="lock" size={12} />{v}</span>)}
        {values.map((v) => (
          <span key={v} className="lf-chip lf-chip--brand protect-chipin__chip">{v}
            <button type="button" aria-label={`Remove ${v}`} disabled={disabled} onClick={() => onChange(values.filter((x) => x !== v))}><Icon name="x" size={12} /></button>
          </span>
        ))}
        <input value={text} placeholder={placeholder} aria-label={ariaLabel ?? label ?? placeholder} disabled={disabled} aria-invalid={!!err || undefined}
          onChange={(e) => { setText(e.target.value); setErr(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || e.key === ';') { e.preventDefault(); commit(); }
            else if (e.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={commit} />
      </div>
      {err && <small className="fld__err" role="alert">{err}</small>}
    </div>
  );
}

/* ------------------------------------------------------------------ side panel with its own eyebrow and "Close panel" */
export function SidePanel({ open, onClose, eyebrow, title, subtitle, children, width = 1040 }: {
  open: boolean; onClose: () => void; eyebrow?: ReactNode; title: string; subtitle?: ReactNode; children: ReactNode; width?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-close]')?.focus(), 40);
    const key = (e: KeyboardEvent) => {
      const all = document.querySelectorAll('[data-overlay]'); if (all[all.length - 1] !== ref.current) return;
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Tab' && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { clearTimeout(t); document.removeEventListener('keydown', key); opener?.focus?.(); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  return createPortal(
    <div className="drawer lf">
      <div className="drawer__scrim" onClick={onClose} />
      <aside ref={ref} data-overlay className="drawer__panel" role="dialog" aria-modal="true" aria-label={title} style={{ width: `min(${width}px, calc(100% - 24px))` }}>
        <header className="drawer__head">
          <div>{eyebrow && <p className="protect-eyebrow">{eyebrow}</p>}<h3>{title}</h3>{subtitle && <small>{subtitle}</small>}</div>
          <button type="button" className="lf-btn lf-btn--icon" data-close aria-label="Close panel" onClick={onClose}><Icon name="x" /></button>
        </header>
        <div className="drawer__body">{children}</div>
      </aside>
    </div>, document.body);
}

/* ------------------------------------------------------------------ anchored popover (non-menu content) */
export function Popover({ open, onClose, anchor, children, label, width = 380, align = 'right' }: {
  open: boolean; onClose: () => void; anchor: React.RefObject<HTMLElement>; children: ReactNode; label: string; width?: number; align?: 'left' | 'right';
}) {
  const pop = useRef<HTMLDivElement>(null);
  useDismiss(open, onClose, [pop as React.RefObject<HTMLElement>, anchor]);
  if (!open) return null;
  return <div ref={pop} className={'pop protect-popover' + (align === 'left' ? ' pop--left' : '')} role="dialog" aria-label={label} style={{ width }}>{children}</div>;
}

/* ------------------------------------------------------------------ tree table (Team Management, permission members) */
export type TreeNode = { id: string; children?: TreeNode[]; [k: string]: unknown };
export type TreeCol<T> = { key: string; header: ReactNode; lead?: ReactNode; value?: (r: T) => string; render?: (r: T, ctx: { depth: number; flat: boolean }) => ReactNode; sortable?: boolean; filterable?: boolean; width?: number; align?: 'center' | 'left' };
export function TreeTable<T extends TreeNode>({ root, columns, expanded, onToggle, nameKey, rootRowClass, hideRootWhenFiltering = true, ariaLabel, defaultPageSize = 50, onVisibleChange }: {
  root: T[]; columns: TreeCol<T>[]; expanded: Set<string>; onToggle: (id: string) => void; nameKey: string; rootRowClass?: (r: T) => string | undefined;
  hideRootWhenFiltering?: boolean; ariaLabel: string; defaultPageSize?: number; onVisibleChange?: (rows: T[]) => void;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(defaultPageSize);
  const val = (c: TreeCol<T>, r: T) => (c.value ? c.value(r) : String(r[c.key] ?? ''));
  const filtering = Object.values(filters).some((f) => f.trim());
  const sortKids = (xs: T[]) => {
    if (!sort) return xs; const c = columns.find((x) => x.key === sort.key)!;
    return [...xs].sort((a, b) => val(c, a).localeCompare(val(c, b), undefined, { numeric: true, sensitivity: 'base' }) * (sort.dir === 'asc' ? 1 : -1));
  };
  const rows: { r: T; depth: number }[] = [];
  if (filtering) {
    const all: T[] = []; const walk = (n: T, d: number) => { if (!(hideRootWhenFiltering && d === 0 && root.length === 1)) all.push(n); (n.children as T[] | undefined)?.forEach((c) => walk(c, d + 1)); };
    root.forEach((n) => walk(n, 0));
    const hit = all.filter((r) => Object.entries(filters).every(([k, f]) => { const c = columns.find((x) => x.key === k); return !f.trim() || !c || val(c, r).toLowerCase().includes(f.trim().toLowerCase()); }));
    sortKids(hit).forEach((r) => rows.push({ r, depth: 0 }));
  } else {
    const walk = (n: T, d: number) => { rows.push({ r: n, depth: d }); if (n.children && expanded.has(n.id)) sortKids(n.children as T[]).forEach((c) => walk(c, d + 1)); };
    (root.length === 1 ? root : sortKids(root)).forEach((n) => walk(n, 0));
  }
  const pages = Math.max(1, Math.ceil(rows.length / size)); const cur = Math.min(page, pages);
  const slice = rows.slice((cur - 1) * size, cur * size);
  useEffect(() => { setPage(1); }, [filters, size]);
  const visKey = slice.map((x) => x.r.id).join('|');
  useEffect(() => { onVisibleChange?.(slice.map((x) => x.r)); }, [visKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="lf-card tablecard protect-tree">
      <div className="tbl-wrap">
        <table className="lf-table" aria-label={ariaLabel}>
          <thead>
            <tr>
              {columns.map((c) => {
                const dir = sort?.key === c.key ? sort.dir : undefined;
                return (
                  <th key={c.key} style={{ width: c.width, minWidth: c.width, textAlign: c.align }} aria-sort={dir ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.lead}{c.sortable ? <button type="button" className="th-sort" data-dir={dir} onClick={() => setSort(dir === 'asc' ? { key: c.key, dir: 'desc' } : { key: c.key, dir: 'asc' })}>
                      {c.header}<Icon name={dir === 'asc' ? 'up' : dir === 'desc' ? 'down' : 'sort'} size={12} /></button> : c.header}
                  </th>
                );
              })}
            </tr>
            <tr className="filter-row">
              {columns.map((c) => (
                <th key={c.key}>{c.filterable && (
                  <span className={'filter-input' + (filters[c.key] ? ' has-value' : '')}><Icon name="search" size={12} />
                    <input value={filters[c.key] ?? ''} placeholder="Filter" aria-label={`Filter ${typeof c.header === 'string' ? c.header : c.key}`} maxLength={200}
                      onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))} /></span>)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="rows-in">
            {slice.length === 0 ? (
              <tr><td colSpan={columns.length} className="empty-cell" style={{ maxWidth: 'none', position: 'static' }}>
                <div style={{ height: 160, display: 'grid', placeItems: 'center' }}>No results match your search or filters.</div></td></tr>
            ) : slice.map(({ r, depth }) => (
              <tr key={r.id} className={'lf-row' + (rootRowClass?.(r) ? ' ' + rootRowClass(r) : '')} style={{ cursor: 'default' }}>
                {columns.map((c, ci) => (
                  <td key={c.key} style={{ textAlign: c.align }}>
                    {ci === 0 ? (
                      <span className="tree-cell" style={{ paddingLeft: filtering ? 0 : depth * 22 }}>
                        {!filtering && r.children?.length ? (
                          <button type="button" className="tree-toggle" aria-expanded={expanded.has(r.id)}
                            aria-label={`${expanded.has(r.id) ? 'Collapse' : 'Expand'} ${String(r[nameKey])}`} onClick={() => onToggle(r.id)}><Icon name="chevron-right" /></button>
                        ) : <span className="tree-spacer" />}
                        {c.render ? c.render(r, { depth, flat: filtering }) : val(c, r)}
                      </span>
                    ) : c.render ? c.render(r, { depth, flat: filtering }) : val(c, r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager total={rows.length} noun={['row', 'rows']} page={cur} pages={pages} size={size} sizes={[10, 20, 50, 100]} onPage={setPage} onSize={setSize} />
    </section>
  );
}

/** Spinning refresh helper: returns [busy, run]. */
export function useBusy(ms: number) {
  const [busy, setBusy] = useState(false);
  const run = (after?: () => void) => { if (busy) return; setBusy(true); setTimeout(() => { setBusy(false); after?.(); }, ms); };
  return [busy, run] as const;
}

/** DLG-PRO-03: radio presets + card refresh. */
export function RangeMenu({ value, onPick, onRefresh, label = 'Select date range', options }: {
  value: number; onPick: (n: number) => void; onRefresh: () => void; label?: string; options: { n: number; label: string }[];
}) {
  return (
    <Menu label={label} width={210}
      trigger={(p) => <IconButton icon="calendar" label={label} {...p} />}>
      {() => (
        <div role="none">
          {options.map((o) => (
            <button key={o.n} type="button" role="menuitemradio" aria-checked={value === o.n} className="pop__item" aria-selected={value === o.n} onClick={() => onPick(o.n)}>
              <span className="grow">{o.label}</span>{value === o.n && <Icon name="check" size={14} />}
            </button>
          ))}
          <div className="pop__sep" />
          <button type="button" role="menuitem" className="pop__item" onClick={onRefresh}><Icon name="refresh" size={15} /><span>Refresh data</span></button>
        </div>
      )}
    </Menu>
  );
}

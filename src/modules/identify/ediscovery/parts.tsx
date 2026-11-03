import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon, IconButton, Modal, PageHeader, ProgressBar, Segmented, onMenuKeys, useDismiss, toneFor } from '../../../ui';
import type { IconName, MenuItem, StatusTone } from '../../../ui';
import { AGENT_STATUS_TONE } from './store';
import type { Operator } from './store';

export const BASE = '/identify/e-discovery';

/* ---------- page header: title, Cases | Settings tabs, settings section switcher ---------- */
export function EdHeader({ tab, section, actions }: { tab: 'cases' | 'settings'; section?: 'agents' | 'locations'; actions?: ReactNode }) {
  const nav = useNavigate();
  return (
    <>
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Identify', to: '/identify' }, { label: 'e-Discovery' }]}
        title="e-Discovery" actions={actions} />
      <div className="row row--wrap identify-tabs">
        <Segmented ariaLabel="e-Discovery" value={tab}
          items={[{ value: 'cases', label: 'Cases' }, { value: 'settings', label: 'Settings' }]}
          onChange={(v) => v !== tab && nav(v === 'cases' ? BASE : `${BASE}/settings/agents`)} />
        {tab === 'settings' && (
          <nav className="seg identify-sections" aria-label="e-Discovery settings">
            {([['agents', 'Agents', 'server'], ['locations', 'Indexed Locations', 'folder']] as const).map(([k, label, icon]) => (
              <button key={k} type="button" aria-current={section === k ? 'page' : undefined}
                onClick={() => section !== k && nav(`${BASE}/settings/${k}`)}>
                <Icon name={icon} size={15} />{label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}

/* ---------- status indicators ---------- */
export function StatusTag({ value, tone, live }: { value: string; tone: StatusTone; live?: boolean }) {
  return <span className={'fx-op fx-op--' + tone + (live ? ' identify-live' : '')}>{value}{live && <span className="sr-only"> (running)</span>}</span>;
}
const CASE_TONE: Record<string, StatusTone> = { Completed: 'good', 'In Progress': 'info', Pending: 'warn', 'On Hold': 'warn', 'Never Started': 'none', Cancelled: 'none' };
export const CaseStatus = ({ value }: { value: string }) =>
  <StatusTag value={value} tone={CASE_TONE[value] ?? toneFor(value)} live={value === 'In Progress'} />;
const AGENT_TONE: Record<string, StatusTone> = { success: 'good', warning: 'warn', neutral: 'none' };
export const AgentStatus = ({ value }: { value: string }) => <StatusTag value={value} tone={AGENT_TONE[AGENT_STATUS_TONE[value] ?? 'success']} />;
const LOC_TONE: Record<string, StatusTone> = { Starting: 'info', Indexing: 'info', Indexed: 'good', Scheduled: 'none', 'Not Indexed': 'none' };
export const LocationStatus = ({ value }: { value: string }) =>
  <StatusTag value={value} tone={LOC_TONE[value] ?? 'none'} live={value === 'Starting' || value === 'Indexing'} />;

/* ---------- row action menu: a portal popover so the table's clipped cells don't cut it off ---------- */
export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [pos, setPos] = useState<{ right: number; top?: number; bottom?: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const refs = useMemo(() => [btn, pop] as RefObject<HTMLElement>[], []);
  const close = useCallback(() => setPos(null), []);
  useDismiss(!!pos, close, refs);
  useEffect(() => {
    if (!pos) return;
    const h = (e: Event) => { if (e.type === 'scroll' && pop.current?.contains(e.target as Node)) return; close(); };
    addEventListener('scroll', h, true); addEventListener('resize', h);
    requestAnimationFrame(() => pop.current?.querySelector<HTMLElement>('.pop__item:not(:disabled)')?.focus());
    return () => { removeEventListener('scroll', h, true); removeEventListener('resize', h); };
  }, [pos, close]);
  const open = () => {
    if (pos) { close(); return; }
    const r = btn.current!.getBoundingClientRect();
    const h = items.length * 38 + 14;
    const up = r.bottom + h + 8 > innerHeight && r.top - h - 8 > 0;
    setPos({ right: innerWidth - r.right, ...(up ? { bottom: innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
  };
  return (
    <>
      <IconButton ref={btn} icon="more" label={label} aria-haspopup="menu" aria-expanded={!!pos} onClick={open} />
      {pos && createPortal(
        <div ref={pop} className="pop lf identify-rowmenu" role="menu" aria-label={label} onKeyDown={onMenuKeys}
          style={{ position: 'fixed', right: pos.right, top: pos.top ?? 'auto', bottom: pos.bottom ?? 'auto' }}>
          {items.map((it, i) => (
            <button key={i} type="button" role="menuitem" className={'pop__item' + (it.danger ? ' pop__item--danger' : '')}
              disabled={it.disabled} data-tip={it.disabled ? it.reason : undefined}
              onClick={() => { close(); btn.current?.focus(); it.onSelect?.(); }}>
              {it.icon && <Icon name={it.icon} size={15} />}<span>{it.label}</span>
            </button>
          ))}
        </div>, document.body)}
    </>
  );
}

/* ---------- modal whose overlay never closes it; Escape closes only when it is the top overlay ---------- */
export function EdModal({ open, onClose, title, label, children, ...rest }: Omit<Parameters<typeof Modal>[0], 'escapeCloses'> & { label?: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  const cb = useRef(onClose); cb.current = onClose;
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !marker.current) return;
      const all = document.querySelectorAll('[data-overlay]');
      if (all[all.length - 1]?.contains(marker.current)) { e.preventDefault(); cb.current(); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open]);
  useLayoutEffect(() => {
    if (open && label) marker.current?.closest('[role="dialog"]')?.setAttribute('aria-label', label);
  });
  return (
    <Modal open={open} onClose={onClose} title={title} escapeCloses={false} {...rest}>
      <span ref={marker} hidden />
      {children}
    </Modal>
  );
}

/* ---------- DLG-IDN-04 Export progress: blocking, no close control ---------- */
export function BlockingDialog({ text, icon = 'download' }: { text: string; icon?: IconName }) {
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    card.current?.focus();
    const trap = (e: KeyboardEvent) => { if (e.key === 'Tab') e.preventDefault(); };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); prev?.focus?.(); };
  }, []);
  return createPortal(
    <div className="modal lf">
      <div ref={card} data-overlay tabIndex={-1} className="modal__card modal__card--xs" role="dialog" aria-modal="true" aria-label={text}>
        <div className="mhead">
          <span className="mhead__ic"><Icon name={icon} size={18} /></span>
          <div className="mhead__text"><h3 role="status">{text}</h3></div>
        </div>
        <div className="modal__form"><ProgressBar indeterminate label={text} /></div>
      </div>
    </div>, document.body);
}

/* ---------- keyword chips with the operator (or "·") between them ---------- */
export function KeyChips({ label, keys, operator, onRemove }: { label?: string; keys: string[]; operator: Operator; onRemove: (k: string) => void }) {
  if (!keys.length) return null;
  return (
    <div className="filters identify-keys">
      {label && <span className="lbl">{label}</span>}
      {keys.map((k, i) => (
        <Fragment key={k}>
          {i > 0 && <span className="identify-op" aria-label={operator || 'no operator'}>{operator || '·'}</span>}
          <span className="fchip fchip--on"><span>{k}</span>
            <button type="button" className="fchip__x" aria-label={`Remove ${k}`} onClick={() => onRemove(k)}><Icon name="x" /></button>
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/* ---------- small bordered table used inside dialogs ---------- */
export function MiniTable({ label, head, rows, empty }: { label: string; head: ReactNode[]; rows: ReactNode[][]; empty: ReactNode }) {
  return (
    <div className="lf-card tablecard tablecard--flat identify-mini">
      <div className="tbl-wrap">
        <table className="lf-table lf-table--auto" aria-label={label}>
          <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length ? rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)
              : <tr><td colSpan={head.length} className="tbl-empty">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Product file-type art for a path (identify/word.svg for Word files, the generic file glyph otherwise). */
export const fileArt = (path: string) =>
  /\.(docx?|docm|rtf)$/i.test(path) ? '/blueprint/assets/identify/word.svg' : '/blueprint/assets/product/file.svg';

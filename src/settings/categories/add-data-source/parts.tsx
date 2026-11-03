import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Icon, Segmented, Steps, onMenuKeys, useDismiss } from '../../../ui';
import type { IconName } from '../../../ui';
import { HeaderActions } from '../../SettingsFrame';

/* Shared building blocks of the File Server console (spec: "File Server console chrome",
   "Wizard frame", "Status run", "Actions pane"). Built from Lepide Design System classes only. */

/** A static product logo (our own asset: URL or data: URI) rendered as an image. */
export function Logo({ src, size = 24, alt = '' }: { src: string; size?: number; alt?: string }) {
  return <img src={src} alt={alt} width={size} height={size} style={{ width: size, height: size, objectFit: 'contain' }} />;
}

/** Info glyph with a floating tooltip (TooltipHost reads data-tip). */
export function InfoTip({ text, label = 'More information' }: { text: string; label?: string }) {
  return (
    <span className="add-data-source-info" tabIndex={0} role="img" aria-label={`${label}: ${text}`} data-tip={text}>
      <Icon name="info" size={14} />
    </span>
  );
}

/** Note line: "**Note** - text" → bold lead + text. */
export function Note({ lead = 'Note', sep = ' - ', children }: { lead?: string; sep?: string; children: ReactNode }) {
  return <p className="add-data-source-note"><b>{lead}</b>{sep}{children}</p>;
}

/** Inline table cell input (dialog tables). */
export function CellInput({ value, onChange, placeholder, type = 'text', label, invalid, disabled, readOnly }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; label: string; invalid?: boolean; disabled?: boolean; readOnly?: boolean;
}) {
  return (
    <input className="add-data-source-cell" type={type} value={value} placeholder={placeholder} aria-label={label} aria-invalid={invalid || undefined}
      disabled={disabled} readOnly={readOnly} maxLength={256} onChange={(e) => onChange?.(e.target.value)} />
  );
}

/** Escape handler for full-page wizards: ignored while any overlay (dialog/drawer) is open. */
export function useEscape(enabled: boolean, fn: () => void) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => {
    if (!enabled) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[data-overlay]') || document.querySelector('.pop')) return;
      ref.current();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [enabled]);
}

/* ---------------- Status run ---------------- */
/** Simulated progress: starts at 10 %, +18 every 380 ms; task i is done once the bar passes (i+1)/n. */
export function useStatusRun(n: number) {
  const [pct, setPct] = useState(10);
  useEffect(() => {
    const t = window.setInterval(() => setPct((p) => { const v = Math.min(100, p + 18); if (v >= 100) clearInterval(t); return v; }), 380);
    return () => clearInterval(t);
  }, []);
  const doneAt = (i: number) => pct >= ((i + 1) / Math.max(1, n)) * 100;
  return { pct, done: pct >= 100, doneAt };
}

export function StatusTable({ tasks, doneTasks, doneText = 'The operation completed successfully.', run, compact }: {
  tasks: string[]; doneTasks?: string[]; doneText?: string; run: ReturnType<typeof useStatusRun>; compact?: boolean;
}) {
  const shown = run.done && doneTasks ? doneTasks : tasks;
  return (
    <div className="stack stack--sm">
      <section className={'lf-card tablecard tablecard--flat tablecard--static' + (compact ? ' add-data-source-compact' : '')}>
        <div className="tbl-wrap">
          <table className="lf-table lf-table--auto">
            <thead><tr><th>Tasks</th><th style={{ width: 280 }}>Status</th></tr></thead>
            <tbody>
              {shown.map((t, i) => (
                <tr key={i} className="lf-row" style={{ cursor: 'default' }}>
                  <td className="td-wrap">{t}</td>
                  <td className="td-wrap">
                    {run.doneAt(i)
                      ? <span className="add-data-source-done"><Icon name="check" size={14} />{doneText}</span>
                      : <span className="add-data-source-pending"><span className="lf-spin" aria-hidden="true" />In progress</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <ProgressLine pct={run.pct} />
    </div>
  );
}

function ProgressLine({ pct }: { pct: number }) {
  return (
    <div className="progress" role="progressbar" aria-label="Status" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <span className="progress__track"><span className="progress__fill" style={{ width: pct + '%' }} /></span>
      <span className="progress__val">{pct}%</span>
    </div>
  );
}

/* ---------------- Wizard frame (full page, 04 § 10) ---------------- */
export function WizardFrame({ root, crumb, steps, step, onClose, children, footer, busy }: {
  root: string; crumb: string; steps?: string[] | null; step?: number; onClose: () => void; children: ReactNode; footer: ReactNode; busy?: boolean;
}) {
  useEscape(!busy, onClose);
  useEffect(() => { window.scrollTo?.({ top: 0 }); }, []);
  const n = steps?.length ?? 0;
  return (
    <div className="stack add-data-source-wiz">
      <div className="row row--wrap add-data-source-wiz__top">
        <Button variant="ghost" size="sm" icon="chevron-left" onClick={() => { if (!busy) onClose(); }} aria-disabled={busy || undefined}>Back to the list</Button>
        <nav className="crumbs add-data-source-crumbs" aria-label="Wizard location"><span>{root}</span><span aria-hidden="true">/</span><b aria-current="page">{crumb}</b></nav>
      </div>
      <header className="add-data-source-wiz__head">
        {steps && step !== undefined && <p className="add-data-source-eyebrow">Step {step + 1} of {n} · {steps[step]}</p>}
        <h3>{crumb}</h3>
      </header>
      {steps && step !== undefined && <Steps steps={steps} current={step} page />}
      <section className="lf-card wiz-card page-form">
        <div className="wiz-card__body">{children}</div>
        <footer className="wiz-card__foot">{footer}</footer>
      </section>
    </div>
  );
}

/** Standard footer: Back (left) · Cancel + Next/Finish (right). */
export function WizardFooter({ onBack, backDisabled, onCancel, cancelDisabled, onNext, nextLabel = 'Next', nextDisabled, extra, nextIcon = true }: {
  onBack?: () => void; backDisabled?: boolean; onCancel: () => void; cancelDisabled?: boolean; onNext: () => void; nextLabel?: string;
  nextDisabled?: boolean; extra?: ReactNode; nextIcon?: boolean;
}) {
  return (
    <>
      {onBack && <Button icon="chevron-left" onClick={onBack} disabled={backDisabled}>Back</Button>}
      {extra}
      <span className="spacer" />
      <Button onClick={onCancel} disabled={cancelDisabled}>Cancel</Button>
      <Button variant="primary" onClick={onNext} disabled={nextDisabled} iconEnd={nextIcon && nextLabel === 'Next' ? 'arrow' : undefined}>{nextLabel}</Button>
    </>
  );
}

/* ---------------- Console chrome ---------------- */
export type ConsoleSection = 'list' | 'rules' | 'users' | 'general';
const RAIL: { value: ConsoleSection; label: string; to: string }[] = [
  { value: 'list', label: 'File servers list', to: '/settings/add-data-source/file-server' },
  { value: 'rules', label: 'Audit Rules & Policies', to: '/settings/add-data-source/file-server/rules' },
  { value: 'users', label: 'User group', to: '/settings/add-data-source/file-server/users' },
  { value: 'general', label: 'General Settings', to: '/settings/add-data-source/file-server/general' },
];
export type Crumb = { label: string; to?: string };

export function ConsoleChrome({ current, title, subtitle, crumbs, actions, icon = 'server', children }: {
  current: ConsoleSection; title: ReactNode; subtitle?: ReactNode; crumbs: Crumb[]; actions?: ReactNode; icon?: IconName; children: ReactNode;
}) {
  const nav = useNavigate();
  return (
    <>
      {actions && <HeaderActions>{actions}</HeaderActions>}
      <div className="add-data-source-rail">
        <Segmented items={RAIL.map((r) => ({ value: r.value, label: r.label }))} value={current} ariaLabel="File server settings"
          onChange={(v) => nav(RAIL.find((r) => r.value === v)!.to)} />
      </div>
      <header className="add-data-source-head">
        <nav className="crumbs add-data-source-crumbs" aria-label="File server location">
          <Link to="/settings/add-data-source">Add Data Source</Link>
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: 'contents' }}>
              <span aria-hidden="true">/</span>
              {i === crumbs.length - 1 || !c.to ? <b aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</b> : <Link to={c.to}>{c.label}</Link>}
            </span>
          ))}
        </nav>
        <div className="add-data-source-head__row">
          <span className="add-data-source-head__ic"><Icon name={icon} size={18} /></span>
          <div className="grow"><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
        </div>
      </header>
      {children}
    </>
  );
}

/* ---------------- Actions pane ---------------- */
export type PaneItem = { id: string; label: string; icon: IconName; disabled?: boolean };
export function ActionPane({ title = 'Actions', items, current, onPick }: { title?: string; items: PaneItem[]; current?: string | null; onPick: (id: string) => void }) {
  return (
    <nav className="lf-card add-data-source-pane" aria-label={title}>
      <p className="snav__title">{title}</p>
      {items.map((it) => (
        <button key={it.id} type="button" className="snav__item" disabled={it.disabled} aria-current={current === it.id ? 'page' : undefined}
          onClick={() => onPick(it.id)}>
          <Icon name={it.icon} /><span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ---------------- Portal menu (row ActionMenu; not clipped by table cells) ---------------- */
export type RowMenuItem = { label: string; icon?: IconName; onSelect: () => void; disabled?: boolean; reason?: string; danger?: boolean; submenu?: RowMenuItem[] };

export function PortalMenu({ label, trigger, items, align = 'right' }: {
  label: string; items: RowMenuItem[]; align?: 'right' | 'left';
  trigger: (p: { ref: (el: HTMLButtonElement | null) => void; onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<number | null>(null);
  const btn = useRef<HTMLButtonElement | null>(null);
  const pop = useRef<HTMLDivElement>(null);
  const subPop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const close = () => { setOpen(false); setSub(null); };
  useDismiss(open, close, [pop as React.RefObject<HTMLElement>, subPop as React.RefObject<HTMLElement>, btn as React.RefObject<HTMLElement>]);
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect();
      const w = pop.current?.offsetWidth ?? 220; const h = pop.current?.offsetHeight ?? 200;
      let left = align === 'right' ? r.right - w : r.left;
      left = Math.max(8, Math.min(left, innerWidth - w - 8));
      let top = r.bottom + 6; if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6);
      setPos({ top, left });
    };
    place();
    const h = () => close();
    addEventListener('scroll', h, true); addEventListener('resize', h);
    requestAnimationFrame(() => { place(); pop.current?.querySelector<HTMLElement>('.pop__item:not(:disabled)')?.focus(); });
    return () => { removeEventListener('scroll', h, true); removeEventListener('resize', h); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const subItems = sub !== null ? items[sub]?.submenu : undefined;
  const [subPos, setSubPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (sub === null || !pop.current) { setSubPos(null); return; }
    const el = pop.current.querySelectorAll<HTMLElement>('.pop__item')[sub]; if (!el) return;
    const r = el.getBoundingClientRect(); const w = 220;
    let left = r.right + 6; if (left + w > innerWidth - 8) left = r.left - w - 6;
    setSubPos({ top: r.top - 6, left: Math.max(8, left) });
  }, [sub]);
  const renderItem = (it: RowMenuItem, i: number, inSub: boolean) => (
    <button key={i} type="button" role="menuitem" className={'pop__item' + (it.danger ? ' pop__item--danger' : '')} disabled={it.disabled}
      data-tip={it.disabled ? it.reason : undefined} aria-haspopup={it.submenu ? 'menu' : undefined} aria-expanded={it.submenu ? sub === i : undefined}
      onMouseEnter={() => { if (!inSub) setSub(it.submenu ? i : null); }}
      onKeyDown={(e) => { if (it.submenu && (e.key === 'ArrowRight' || e.key === 'Enter')) { e.preventDefault(); setSub(i); requestAnimationFrame(() => subPop.current?.querySelector<HTMLElement>('.pop__item')?.focus()); } }}
      onClick={() => { if (it.submenu) { setSub(i); return; } close(); it.onSelect(); }}>
      {it.icon && <Icon name={it.icon} size={15} />}<span className="grow">{it.label}</span>{it.submenu && <Icon name="chevron-right" size={14} />}
    </button>
  );
  return (
    <>
      {trigger({ ref: (el) => { btn.current = el; }, onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {open && createPortal(
        <div ref={pop} className="pop lf add-data-source-pop" role="menu" aria-label={label} style={{ position: 'fixed', top: pos?.top ?? -999, left: pos?.left ?? -999, right: 'auto' }} onKeyDown={onMenuKeys}>
          {items.map((it, i) => renderItem(it, i, false))}
        </div>, document.body)}
      {open && subItems && subPos && createPortal(
        <div ref={subPop} className="pop lf add-data-source-pop" role="menu" aria-label={items[sub!].label.replace(/\s*›$/, '').toLowerCase()}
          style={{ position: 'fixed', top: subPos.top, left: subPos.left, right: 'auto' }} onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const s = sub; setSub(null); requestAnimationFrame(() => pop.current?.querySelectorAll<HTMLElement>('.pop__item')[s!]?.focus()); return; }
            onMenuKeys(e);
          }}>
          {subItems.map((it, i) => renderItem(it, i, true))}
        </div>, document.body)}
    </>
  );
}

/** Small table wrapper used inside dialogs and wizard steps. */
export function MiniTable({ label, head, children, empty, maxHeight }: { label: string; head: ReactNode; children: ReactNode; empty?: ReactNode; maxHeight?: number }) {
  return (
    <section className="lf-card tablecard tablecard--flat tablecard--static add-data-source-mini">
      <div className="tbl-wrap" style={maxHeight ? { maxHeight } : undefined}>
        <table className="lf-table lf-table--auto" aria-label={label}>
          <thead><tr>{head}</tr></thead>
          <tbody>{children}</tbody>
        </table>
        {empty}
      </div>
    </section>
  );
}

/** Header checkbox cell for MiniTable. */
export function HeadCheck({ label, checked, indeterminate, onChange, disabled }: { label: string; checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <th className="add-data-source-th-check">
      <label className="lf-check">
        <input type="checkbox" checked={checked} disabled={disabled} ref={(el) => { if (el) el.indeterminate = !!indeterminate && !checked; }} onChange={(e) => onChange(e.target.checked)} />
        <span className="lf-check__box" aria-hidden="true" /><span>{label}</span>
      </label>
    </th>
  );
}

export function RowCheck({ label, checked, onChange, disabled, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children?: ReactNode }) {
  return (
    <label className="lf-check">
      <input type="checkbox" checked={checked} disabled={disabled} aria-label={label} onChange={(e) => onChange(e.target.checked)} />
      <span className="lf-check__box" aria-hidden="true" />{children !== undefined && <span>{children}</span>}
    </label>
  );
}

/** Status run that owns its timer; reports completion once. */
export function StatusRunView({ tasks, doneTasks, doneText, onDone, compact }: {
  tasks: string[]; doneTasks?: string[]; doneText?: string; onDone: () => void; compact?: boolean;
}) {
  const run = useStatusRun(tasks.length);
  const fired = useRef(false);
  useEffect(() => { if (run.done && !fired.current) { fired.current = true; onDone(); } }, [run.done]); // eslint-disable-line react-hooks/exhaustive-deps
  return <StatusTable tasks={tasks} doneTasks={doneTasks} doneText={doneText} run={run} compact={compact} />;
}

/** "Check the highlighted fields" validation toast + invalid-field set. */
export function useInvalid() {
  const [bad, setBad] = useState<Set<string>>(new Set());
  const mark = (keys: string[]) => setBad(new Set(keys));
  const clear = (k: string) => setBad((b) => { if (!b.has(k)) return b; const n = new Set(b); n.delete(k); return n; });
  const inv = (k: string) => (bad.has(k) ? true : undefined);
  return { bad, mark, clear, inv };
}

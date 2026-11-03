import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon, IconButton, onMenuKeys, useDismiss, type MenuItem } from '../../ui';

/* Small generic pieces built from Lepide Design System classes (the kit's versions don't take the names this spec gives). */

/** Soft pill search with an explicit clear control (accessible name "Clear search", shown only while text is present). */
export function ClearableSearch({ value, onChange, placeholder = 'Search', ariaLabel, maxLength = 200, className, autoFocus, disabled, clearLabel = 'Clear search' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; ariaLabel: string; maxLength?: number; className?: string; autoFocus?: boolean; disabled?: boolean; clearLabel?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <label className={'lf-field detect-search' + (className ? ' ' + className : '')}>
      <span className="lf-input lf-input--pill" style={disabled ? { opacity: 0.6 } : undefined}>
        <Icon name="search" />
        <input ref={ref} value={value} placeholder={placeholder} aria-label={ariaLabel} maxLength={maxLength} autoFocus={autoFocus} disabled={disabled}
          onChange={(e) => onChange(e.target.value)} />
        {value && !disabled && (
          <button type="button" className="detect-search__x" aria-label={clearLabel} onClick={() => { onChange(''); ref.current?.focus(); }}>
            <Icon name="x" size={13} />
          </button>
        )}
      </span>
    </label>
  );
}

/** Non-modal detail panel (03 § 19) with a named close control. Escape closes it unless a dialog is open or `holdEscape`. */
export function SidePanel({ label, title, head, closeLabel, onClose, footer, children, holdEscape }: {
  label: string; title?: ReactNode; head?: ReactNode; closeLabel: string; onClose: () => void; footer?: ReactNode; children?: ReactNode; holdEscape?: boolean;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || holdEscape) return;
      if (document.querySelector('[data-overlay]')) return;
      onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose, holdEscape]);
  return (
    <aside className="lf-card detail" role="dialog" aria-label={label}>
      <header className="drawer__head">
        {head ?? <div><h3>{title}</h3></div>}
        <button type="button" className="lf-btn lf-btn--icon" aria-label={closeLabel} style={{ border: '1px solid var(--border)', background: 'var(--surface)' }} onClick={onClose}>
          <Icon name="x" />
        </button>
      </header>
      <div className="drawer__body">{children}</div>
      {footer && <footer className="drawer__foot">{footer}</footer>}
    </aside>
  );
}

/** Compact digits-only number input with step buttons (no visible label; name via aria-label). */
export function MiniNumber({ value, onChange, ariaLabel, min = 0, max = 999, maxLength, disabled }: {
  value: number | ''; onChange: (v: number | '') => void; ariaLabel: string; min?: number; max?: number; maxLength?: number; disabled?: boolean;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <span className="detect-num">
      <input inputMode="numeric" value={value} disabled={disabled} aria-label={ariaLabel} maxLength={maxLength}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, '');
          if (maxLength && t.length > maxLength) return;
          onChange(t === '' ? '' : clamp(Number(t)));
        }} />
      <button type="button" aria-label={`Decrease ${ariaLabel.toLowerCase()}`} disabled={disabled || (value !== '' && value <= min)}
        onClick={() => onChange(clamp((value === '' ? min : value) - 1))}><Icon name="minus" size={13} /></button>
      <button type="button" aria-label={`Increase ${ariaLabel.toLowerCase()}`} disabled={disabled || (value !== '' && value >= max)}
        onClick={() => onChange(clamp((value === '' ? min : value) + 1))}><Icon name="plus" size={13} /></button>
    </span>
  );
}

/** Row action menu (03 § 19 "Action menu (row kebab)") rendered in a portal so table cells never clip it. */
export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const refs = useMemo(() => [btn, pop] as RefObject<HTMLElement>[], []);
  const close = useCallback(() => setPos(null), []);
  useDismiss(pos !== null, close, refs);
  useEffect(() => {
    if (!pos) return;
    requestAnimationFrame(() => pop.current?.querySelector<HTMLElement>('.pop__item:not(:disabled)')?.focus());
    const off = () => setPos(null);
    window.addEventListener('scroll', off, true); window.addEventListener('resize', off);
    return () => { window.removeEventListener('scroll', off, true); window.removeEventListener('resize', off); };
  }, [pos]);
  return (
    <>
      <IconButton ref={btn} icon="more" label={label} aria-haspopup="menu" aria-expanded={pos !== null}
        onClick={() => {
          if (pos) return setPos(null);
          const r = btn.current!.getBoundingClientRect();
          setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
        }} />
      {pos && createPortal(
        <div ref={pop} className="pop lf" role="menu" aria-label={label} onKeyDown={onMenuKeys}
          style={{ position: 'fixed', top: pos.top, right: pos.right, left: 'auto', zIndex: 60 }}>
          {items.map((it, i) => (
            <button key={i} type="button" role="menuitem" className={'pop__item' + (it.danger ? ' pop__item--danger' : '')}
              onClick={() => { setPos(null); btn.current?.focus(); it.onSelect?.(); }}>
              {it.icon && <Icon name={it.icon} size={15} />}<span>{it.label}</span>
            </button>
          ))}
        </div>, document.body)}
    </>
  );
}

/** Emphasised "Key:" + value parts of a " · "-joined details string (SCR-DET-02 Details column). */
export function DetailsText({ details }: { details: string }) {
  return (
    <span className="detect-details">
      {details.split(' · ').map((part, i) => {
        const at = part.indexOf(':');
        return (
          <span key={i}>{i > 0 && ' '}{at > -1 ? <><b>{part.slice(0, at + 1)}</b>{part.slice(at + 1)}</> : part}</span>
        );
      })}
    </span>
  );
}

/** Parse a " · "-joined details string into a key → value map. */
export function parseDetails(details: string): Record<string, string> {
  const out: Record<string, string> = {};
  details.split(' · ').forEach((p) => { const at = p.indexOf(':'); if (at > -1) out[p.slice(0, at).trim()] = p.slice(at + 1).trim(); });
  return out;
}

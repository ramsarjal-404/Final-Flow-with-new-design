import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../ui';

/* Non-modal floating drawer (Lepide Design System 03 § 12.1 anatomy, no scrim, no focus trap): the table beside it stays
   usable, which the architecture needs for the record drawer (clicking another row moves the selection)
   and the Copilot conversation (clicking another row switches it). Escape closes it when no dialog is
   above it. Pages add the class `rlib--side` to narrow the main region while it is open. */

export function SidePanel({ open, onClose, label, head, footer, footerNote, width = 'md', children, bodyRef }: {
  open: boolean; onClose: () => void; label: string; head: ReactNode; footer?: ReactNode; footerNote?: ReactNode;
  width?: 'md' | 'chat' | 'rec'; children?: ReactNode; bodyRef?: React.Ref<HTMLDivElement>;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-autofocus], .drawer__body input, .drawer__body button, .drawer__head button')?.focus(), 40);
    return () => { clearTimeout(t); if (opener && document.contains(opener) && ref.current === null) opener.focus?.(); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[data-overlay]')) onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  const cls = 'drawer__panel' + (width === 'chat' ? ' drawer__panel--chat' : width === 'rec' ? ' drawer__panel--rec' : '');
  return createPortal(
    <div className="drawer lf rlib-side">
      <aside ref={ref} className={cls} role="complementary" aria-label={label}>
        <header className="drawer__head">
          {head}
          <button type="button" className="lf-btn lf-btn--icon" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
        </header>
        <div className="drawer__body" ref={bodyRef}>{children}</div>
        {(footer || footerNote) && <footer className="drawer__foot">{footerNote && <span className="lf-muted">{footerNote}</span>}{footer}</footer>}
      </aside>
    </div>, document.body);
}

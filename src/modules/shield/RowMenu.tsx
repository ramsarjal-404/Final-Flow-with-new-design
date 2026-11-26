import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon, IconButton, onMenuKeys, useDismiss, type MenuItem } from '../../ui';

/** Row action menu (⋯) drawn in a portal so the table's scroll area never clips it. Disabled items show their reason. */
export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [pos, setPos] = useState<{ right: number; top?: number; bottom?: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const refs = useMemo(() => [btn, pop] as RefObject<HTMLElement>[], []);
  const close = useCallback(() => setPos(null), []);
  useDismiss(!!pos, close, refs);
  useEffect(() => {
    if (!pos) return;
    const off = (e: Event) => { if (e.type === 'scroll' && pop.current?.contains(e.target as Node)) return; close(); };
    addEventListener('scroll', off, true); addEventListener('resize', off);
    requestAnimationFrame(() => pop.current?.querySelector<HTMLElement>('.pop__item:not(:disabled)')?.focus());
    return () => { removeEventListener('scroll', off, true); removeEventListener('resize', off); };
  }, [pos, close]);
  const open = () => {
    if (pos) return close();
    const button = btn.current!.getBoundingClientRect();
    const menuHeight = items.length * 38 + 14;
    // Open upwards when there is no room below.
    const up = button.bottom + menuHeight + 8 > innerHeight && button.top - menuHeight - 8 > 0;
    setPos({ right: innerWidth - button.right, ...(up ? { bottom: innerHeight - button.top + 6 } : { top: button.bottom + 6 }) });
  };
  return (
    <>
      <IconButton ref={btn} icon="more" label={label} aria-haspopup="menu" aria-expanded={!!pos} onClick={open} />
      {pos && createPortal(
        <div ref={pop} className="pop lf" role="menu" aria-label={label} onKeyDown={onMenuKeys}
          style={{ position: 'fixed', right: pos.right, top: pos.top ?? 'auto', bottom: pos.bottom ?? 'auto', left: 'auto', zIndex: 60 }}>
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

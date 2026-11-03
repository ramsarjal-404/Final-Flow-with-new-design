import { useRef } from 'react';

/* Local segmented control (Lepide Design System `.seg`) for the inner "Protect settings" navigation. Disabled items
   use aria-disabled (not `disabled`) so their reason tooltip (data-tip) still shows on hover/focus. */
export type NavItem = { value: string; label: string; disabled?: boolean; reason?: string };

export function SegNav({ items, value, onChange, ariaLabel }: { items: NavItem[]; value: string; onChange: (v: string) => void; ariaLabel: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const en = items.filter((i) => !i.disabled); if (!en.length) return;
    const i = en.findIndex((x) => x.value === value);
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? en.length - 1 : e.key === 'ArrowRight' ? (i + 1) % en.length : (i - 1 + en.length) % en.length;
    e.preventDefault(); onChange(en[n].value);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
  };
  return (
    <div ref={ref} className="seg protect-seg" role="tablist" aria-label={ariaLabel} onKeyDown={onKey}>
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button key={it.value} type="button" role="tab" aria-selected={on} aria-disabled={it.disabled || undefined}
            data-tip={it.disabled ? it.reason : undefined} tabIndex={on ? 0 : -1}
            onClick={() => { if (!it.disabled) onChange(it.value); }}>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

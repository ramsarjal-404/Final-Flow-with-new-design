import { useMemo, useState } from 'react';
import { Checkbox, Field, Icon, TextField, Toggle } from '../../../ui';
import { PRODUCTS, groupNames, productOf, type CatGroup, type Product } from '../model';
import { ClearableSearch } from '../parts';
import type { Draft } from './types';

/* DLG-DET-06 · Wizard step 1 · General. The same catalogue picker serves Add and Edit
   (GAP-DET-15 decision: reports can be added when editing; GAP-DET-02: Trust folder = "Lepide Trust"). */
export function GeneralStep({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const query = q.trim().toLowerCase();
  const product = PRODUCTS.find((p) => p.id === d.product)!;
  const selected = new Set(d.reports);
  const toggle = (name: string) => set({ reports: selected.has(name) ? d.reports.filter((r) => r !== name) : [...d.reports, name] });
  const countFor = (p: Product) => d.reports.filter((r) => productOf(r) === p).length;
  const flip = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Searching spans both products: one flat list of matches with their folder path.
  const matches = useMemo(() => {
    if (!query) return [];
    const out: { name: string; disabled: boolean; path: string; key: string }[] = [];
    const walk = (g: CatGroup, path: string) => {
      g.reports.forEach((r) => { if (r.name.toLowerCase().includes(query)) out.push({ ...r, path: path + ' › ' + g.name, key: g.id + '|' + r.name }); });
      g.groups.forEach((c) => walk(c, path + ' › ' + g.name));
    };
    PRODUCTS.forEach((p) => p.folders.forEach((f) => walk(f, p.label)));
    return out;
  }, [query]);

  const report = (r: { name: string; disabled: boolean }, key: string, sub?: string) => (
    <li key={key} className={'detect-pick__leaf' + (r.disabled ? ' is-off' : '')} data-tip={r.disabled ? `${r.name} (not available)` : undefined}>
      <Checkbox checked={selected.has(r.name)} disabled={r.disabled && !selected.has(r.name)} onChange={() => toggle(r.name)}
        label={<span className="detect-pick__name">{r.name}{sub && <small>{sub}</small>}</span>} />
    </li>
  );
  const folder = (g: CatGroup, depth: number): JSX.Element => {
    const isOpen = open.has(g.id);
    const n = groupNames(g).filter((x) => selected.has(x)).length;
    return (
      <li key={g.id} className="detect-pick__folder">
        <button type="button" className="detect-pick__node" aria-expanded={isOpen} onClick={() => flip(g.id)} style={{ paddingLeft: 8 + depth * 14 }}>
          <Icon name="chevron-right" size={14} />
          <span>{g.name}</span>
          {n > 0 && <span className="snav__badge">{n}</span>}
        </button>
        {isOpen && (
          <ul style={{ marginLeft: 16 + depth * 14 }}>
            {g.groups.map((c) => folder(c, depth + 1))}
            {g.reports.map((r) => report(r, g.id + '|' + r.name))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <div className="detect-general">
        <TextField label="Alert Name" value={d.name} maxLength={100} onChange={(v) => set({ name: v })} />
        <Field label="Status">
          <span className="row" style={{ minHeight: 46 }}>
            <Toggle label="Status" checked={d.enabled} onChange={(v) => set({ enabled: v })} />
            <span className="muted text-sm">{d.enabled ? 'Enabled' : 'Disabled'}</span>
          </span>
        </Field>
      </div>
      <TextField label="Description" value={d.description} maxLength={250} onChange={(v) => set({ description: v })} />

      <div className="detect-picker">
        <div className="detect-picker__side">
          <div role="tablist" aria-label="Product" aria-orientation="vertical" className="detect-plist">
            {PRODUCTS.map((p) => (
              <button key={p.id} type="button" role="tab" className="snav__item" aria-selected={!query && d.product === p.id}
                aria-current={!query && d.product === p.id ? 'page' : undefined}
                onClick={() => { setQ(''); set({ product: p.id }); }}>
                <span className="grow" style={{ textAlign: 'left' }}>{p.label}</span>
                {countFor(p.id) > 0 && <span className="snav__badge">{countFor(p.id)}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="detect-picker__main">
          <ClearableSearch value={q} onChange={setQ} placeholder="Search Reports" ariaLabel="Search reports" />
          <p className="detect-picker__head">Reports{query && <span className="muted"> matching "{q.trim()}"</span>}</p>
          <div className="detect-pick" role="group" aria-label="Reports">
            {query ? (
              matches.length ? <ul>{matches.map((m) => report(m, m.key, m.path))}</ul>
                : <p className="detect-empty-line">No reports match "{q.trim()}".</p>
            ) : (
              <ul>{product.folders.map((f) => folder(f, 0))}</ul>
            )}
          </div>
          {d.reports.length > 0 && (
            <ul className="detect-chips" aria-label="Selected reports">
              {d.reports.map((r) => (
                <li key={r} className="lf-chip lf-chip--brand">
                  <span>{r}</span>
                  <button type="button" aria-label={`Remove ${r}`} onClick={() => toggle(r)}><Icon name="x" size={12} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Button, EmptyState, Icon, Modal, Pager, RadioGroup, SearchField, SelectField, TextField } from '../../ui';
import { MODULE_LABELS, reportNames, type ChartStyle, type GraphConfig } from './store';

/* DLG-DSH-06 · Add Graph wizard: step 1 Select Report, step 2 Chart style and configuration. */

const EMPTY: GraphConfig = { module: 'Auditor', report: '', style: 'bar', title: '', label: '', top: '', column: '' };
const LABELS = ['Server Name', 'User Name', 'Object Name', 'Domain Name'];
const TOPS = ['5', '10', '15', '20'];
const COLUMNS = ['Risk Level', 'Count', 'Content Type(s)', 'Compliance'];
const SIZES = [10, 20, 50, 100];
let keptPageSize = 50; // page size persists between openings

/** Style pictograms (24 px line art, currentColor). */
const PICTO: Record<ChartStyle, JSX.Element> = {
  bar: <><path d="M4 20h16" /><rect x="5.5" y="11" width="3" height="7" rx="1" /><rect x="10.5" y="6" width="3" height="12" rx="1" /><rect x="15.5" y="9" width="3" height="9" rx="1" /></>,
  stacked: <><path d="M4 20h16" /><rect x="5.5" y="9" width="3.5" height="9" rx="1" /><path d="M5.5 13h3.5" /><rect x="10.25" y="5" width="3.5" height="13" rx="1" /><path d="M10.25 11h3.5" /><rect x="15" y="11" width="3.5" height="7" rx="1" /><path d="M15 14.5h3.5" /></>,
  line: <><path d="M4 20h16" /><path d="m4.5 15 4-5 4 3 6.5-7" /><circle cx="8.5" cy="10" r=".6" /><circle cx="12.5" cy="13" r=".6" /></>,
  donut: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3.5" /><path d="M12 4.5V8.5" /><path d="m18.5 15.8-3.3-1.9" /></>,
};
const STYLES: { value: ChartStyle; label: string }[] = [
  { value: 'bar', label: 'Bar' }, { value: 'stacked', label: 'Stacked column' }, { value: 'line', label: 'Line' }, { value: 'donut', label: 'Donuts' },
];

export function AddGraphWizard({ open, initial, onClose, onSubmit }: {
  open: boolean; initial?: GraphConfig; onClose: () => void; onSubmit: (c: GraphConfig) => void;
}) {
  const [step, setStep] = useState(1);
  const [module, setModule] = useState('Auditor');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(keptPageSize);
  const [cfg, setCfg] = useState<GraphConfig>(EMPTY);

  // Reset rule: step (1, or 2 when editing), module, search, page and configuration re-seed on every opening.
  useEffect(() => {
    if (!open) return;
    setStep(initial ? 2 : 1); setModule(initial?.module ?? 'Auditor'); setQuery(''); setPage(1); setCfg(initial ?? EMPTY); setSize(keptPageSize);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const names = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reportNames(module).filter((n) => !q || n.toLowerCase().includes(q));
  }, [module, query]);
  const pages = Math.max(1, Math.ceil(names.length / size));
  const cur = Math.min(page, pages);
  const slice = names.slice((cur - 1) * size, cur * size);
  const set = (p: Partial<GraphConfig>) => setCfg((c) => ({ ...c, ...p }));

  const footer = step === 1 ? <>
    <Button onClick={onClose}>Cancel</Button>
    <Button variant="primary" iconEnd="arrow" disabled={!cfg.report} onClick={() => { set({ module }); setStep(2); }}>Next</Button>
  </> : <>
    <Button onClick={onClose}>Cancel</Button>
    <Button variant="primary" onClick={() => onSubmit({ ...cfg })}>Submit</Button>
  </>;

  return (
    <Modal open={open} onClose={onClose} size="md" icon="plus" title="Add graph" steps={['Select Report', 'Chart style and configuration']} step={step - 1}
      footerHint={step === 2 ? <Button icon="chevron-left" onClick={() => setStep(1)}>Back</Button> : undefined} footer={footer}>
      {step === 1 ? (
        <>
          <div className="dashboards-wiz__tools">
            <SelectField aria-label="Module" options={MODULE_LABELS} value={module}
              onChange={(v) => { setModule(v); setPage(1); set({ report: '' }); }} />
            <SearchField value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search" ariaLabel="Search reports" className="grow" />
          </div>
          <div className="dashboards-wiz__list">
            <h4 id="dsh-all-reports">All Reports</h4>
            {slice.length ? (
              <div className="dashboards-wiz__scroll">
                <RadioGroup ariaLabel="Report" name="dsh-report" value={cfg.report} options={slice} onChange={(v) => set({ report: v })} />
              </div>
            ) : <EmptyState compact icon="file-search" title="No results match your search or filters." />}
            <Pager total={names.length} noun={['report', 'reports']} page={cur} pages={pages} size={size} sizes={SIZES}
              onPage={setPage} onSize={(s) => { keptPageSize = s; setSize(s); setPage(1); }} />
          </div>
        </>
      ) : (
        <>
          <p className="dashboards-wiz__report">Report: <b>{cfg.report}</b></p>
          <div className="fld">
            <span className="fld__lbl" id="dsh-style">Chart style</span>
            <div className="pick-grid dashboards-styles" role="radiogroup" aria-labelledby="dsh-style"
              onKeyDown={(e) => {
                const i = STYLES.findIndex((s) => s.value === cfg.style); let n = -1;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % STYLES.length;
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + STYLES.length) % STYLES.length;
                if (n < 0) return;
                e.preventDefault(); set({ style: STYLES[n].value });
                (e.currentTarget.children[n] as HTMLElement | undefined)?.focus();
              }}>
              {STYLES.map((s) => {
                const on = cfg.style === s.value;
                return (
                  <button key={s.value} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} className="pick" onClick={() => set({ style: s.value })}>
                    <span className="pick__ic"><svg className="lf-i" viewBox="0 0 24 24" aria-hidden="true">{PICTO[s.value]}</svg></span>
                    <span className="pick__text"><b>{s.label}</b></span>
                    {on && <span className="pick__check" aria-hidden="true"><Icon name="check" size={11} /></span>}
                  </button>
                );
              })}
            </div>
          </div>
          <TextField label="Chart title" placeholder="Type here" value={cfg.title} onChange={(v) => set({ title: v })} />
          <div className="dashboards-two">
            <SelectField label="Label" placeholder="Select" options={LABELS} value={cfg.label} onChange={(v) => set({ label: v })} />
            <SelectField label="Select top" placeholder="Select" options={TOPS} value={cfg.top} onChange={(v) => set({ top: v })} />
          </div>
          <SelectField label="Column" placeholder="Select" options={COLUMNS} value={cfg.column} onChange={(v) => set({ column: v })} />
        </>
      )}
    </Modal>
  );
}

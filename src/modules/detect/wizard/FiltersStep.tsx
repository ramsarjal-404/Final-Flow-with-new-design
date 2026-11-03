import { uid } from '../../../stores/createStore';
import { Button, Checkbox, IconButton, SelectField, TextField } from '../../../ui';
import { FILTER_FIELDS, FILTER_OPERATORS, THRESHOLD_UNITS, type FilterRule } from '../model';
import { MiniNumber } from '../parts';
import { ruleState, type Draft } from './types';
import { ValueFilterEditor } from './ValueFilterEditor';

/* DLG-DET-07 · Wizard step 2 · Filters. GAP-DET-16 intended: the per-report rule editor and the
   value-list editor are both shown (in Add and Edit), so neither kind of filter is hidden. */
export function FiltersStep({ d, set, active, setActive }: { d: Draft; set: (p: Partial<Draft>) => void; active: string; setActive: (r: string) => void }) {
  const rules = d.filters[active] ?? [];
  const setRules = (next: FilterRule[]) => set({ filters: { ...d.filters, [active]: next } });
  const patch = (id: string, p: Partial<FilterRule>) => setRules(rules.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const t = d.threshold;
  const setT = (p: Partial<Draft['threshold']>) => set({ threshold: { ...t, ...p } });

  return (
    <>
      <div className="detect-filters">
        <nav className="detect-filters__list" aria-label="Reports">
          <h4 className="detect-sec">Reports</h4>
          {d.reports.map((r) => {
            const n = (d.filters[r] ?? []).filter((x) => ruleState(x) === 'complete').length;
            return (
              <button key={r} type="button" className="snav__item" aria-current={r === active ? 'page' : undefined} onClick={() => setActive(r)}>
                <span className="grow detect-ellipsis" style={{ textAlign: 'left' }} title={r}>{r}</span>
                {n > 0 && <span className="snav__badge">{n}</span>}
              </button>
            );
          })}
        </nav>
        <div className="detect-filters__main">
          <div className="row row--between row--wrap">
            <div>
              <h4 className="detect-sec">Add filters</h4>
              <p className="detect-hint">Note - Please use semicolon ; separator for multiple values</p>
            </div>
            <Button icon="plus" onClick={() => setRules([...rules, { id: uid('rule'), field: '', operator: '', value: '' }])}>Add filter</Button>
          </div>
          <div role="region" aria-label={`Filters for ${active}`} className="stack stack--sm">
            {rules.length === 0 ? (
              <p className="detect-hint detect-box">No filters on <b>{active}</b>: the alert fires on every change. Click <b>Add filter</b> to narrow it.</p>
            ) : rules.map((r) => (
              <div key={r.id} className={'detect-rule' + (ruleState(r) === 'partial' ? ' is-partial' : '')}>
                <SelectField label="Filter" placeholder="Select" options={FILTER_FIELDS} value={r.field} onChange={(v) => patch(r.id, { field: v })} />
                <SelectField label="Include" placeholder="Select" options={FILTER_OPERATORS} value={r.operator} onChange={(v) => patch(r.id, { operator: v })} />
                <TextField label="Value" aria-label="Value" placeholder={r.field === 'Who' ? 'DOMAIN\\user' : undefined} value={r.value} onChange={(v) => patch(r.id, { value: v })} />
                <IconButton icon="trash" danger label="Remove filter" onClick={() => setRules(rules.filter((x) => x.id !== r.id))} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <ValueFilterEditor vf={d.valueFilter} onChange={(v) => set({ valueFilter: v })} />

      {/* ENT-DET-Threshold */}
      <div className="detect-box stack stack--sm">
        <Checkbox checked={t.enabled} onChange={(v) => setT({ enabled: v })} label="Threshold Alert" />
        <Checkbox checked={t.sameUser} disabled={!t.enabled} onChange={(v) => setT({ sameUser: v })} label="Send Alert when all changes made by same user" />
        <div className="detect-threshold">
          <span>Send alert only if event occurs</span>
          <MiniNumber ariaLabel="Number of events" value={t.times} disabled={!t.enabled} onChange={(v) => setT({ times: v })} />
          <span>Times in</span>
          <MiniNumber ariaLabel="Time window" value={t.within} disabled={!t.enabled} onChange={(v) => setT({ within: v })} />
          <SelectField aria-label="Time unit" options={THRESHOLD_UNITS} value={t.unit} disabled={!t.enabled} onChange={(v) => setT({ unit: v })} />
        </div>
      </div>
    </>
  );
}

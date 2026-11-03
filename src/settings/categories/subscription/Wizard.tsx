import { useEffect, useRef, useState } from 'react';
import {
  Button, Checkbox, Counter, Icon, IconButton, Modal, SearchField, Segmented, SelectField, TextField, Toggle, useToast,
} from '../../../ui';
import type { IconName } from '../../../ui';
import { SUB, newId, subStore } from '../../../stores/subscription';
import type { DeliveryAction, FilterRule, ScheduleType, SubSchedule, Subscription } from '../../../stores/subscription';
import ActionConfig from './ActionConfig';
import SchedulePicker from './SchedulePicker';

/* DLG-SAD-25 Add / Edit Subscription wizard (INT-SAD-284 … 310) with DLG-SAD-26 (action view)
   and DLG-SAD-27 (schedule picker). Lepide Design System: large Modal with a clickable step indicator and a step
   rail. Overlay click never closes; Escape closes unless a nested dialog / picker is open.
   GAP-SAD-09 intended: Cancel on the action view returns to step 3 without adding. */

const STEPS: { label: string; icon: IconName }[] = [
  { label: 'General', icon: 'settings' },
  { label: 'Filters', icon: 'filter' },
  { label: 'Delivery Settings', icon: 'send' },
  { label: 'Subscription Schedule', icon: 'calendar' },
];
const SOURCES = SUB.SUB_SOURCES;
const productOf = (report: string | undefined) => SOURCES.find((s) => report && s.reports.includes(report))?.id ?? SOURCES[0].id;
const complete = (r: FilterRule) => !!r.field && !!r.operator && !!r.value.trim();
const blank = (r: FilterRule) => !r.field && !r.operator && !r.value.trim();

export default function SubscriptionWizard({ editing, onClose, onSaved }: {
  editing?: Subscription; onClose: () => void; onSaved: (s: Subscription, isNew: boolean) => void;
}) {
  const toast = useToast();
  const all = subStore.use((s) => s.subscriptions);
  const edit = !!editing;
  const title = edit ? 'Edit Subscription' : 'Add Subscription';
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(edit ? 3 : 0);
  const [name, setName] = useState(editing?.name ?? '');
  const [enabled, setEnabled] = useState(editing?.enabled ?? true);
  const [description, setDescription] = useState(editing?.description ?? '');
  const [reports, setReports] = useState<string[]>(editing?.reports ?? []);
  const [filters, setFilters] = useState<Record<string, FilterRule[]>>(() =>
    Object.fromEntries(Object.entries(editing?.filters ?? {}).map(([k, v]) => [k, v.map((r) => ({ ...r }))])));
  const [actions, setActions] = useState<DeliveryAction[]>(editing?.actions ?? []);
  const [schedules, setSchedules] = useState<SubSchedule[]>(editing?.schedules ?? []);
  const [product, setProduct] = useState(productOf(editing?.reports[0]));
  const [q, setQ] = useState('');
  const [active, setActive] = useState<string>(editing?.reports[0] ?? '');
  const [view, setView] = useState<'steps' | 'action'>('steps');
  const [picker, setPicker] = useState<ScheduleType | null>(null);
  const [lastPill, setLastPill] = useState('');
  const [nested, setNested] = useState(false);
  const submitAction = useRef<(() => void) | null>(null);
  const marker = useRef<HTMLSpanElement>(null);

  const activeReport = reports.includes(active) ? active : reports[0] ?? '';

  // Escape closes the wizard only when it is the top-most overlay and nothing nested is open.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || picker || nested) return;
      const all = document.querySelectorAll('[data-overlay]');
      const mine = marker.current?.closest('[data-overlay]');
      if (mine && all[all.length - 1] === mine) { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [picker, nested, onClose]);

  /* ---------- validation ---------- */
  const validate = (i: number): string | null => {
    if (i === 0) {
      const n = name.trim();
      if (!n) return 'Please enter the subscription name.';
      if (all.some((s) => s.id !== editing?.id && s.name.trim().toLowerCase() === n.toLowerCase())) return `A subscription named "${n}" already exists.`;
      if (!reports.length) return 'Please select at least one report.';
    }
    if (i === 1) {
      const bad = reports.find((r) => (filters[r] ?? []).some((x) => !complete(x) && !blank(x)));
      if (bad) { setActive(bad); return `Complete or remove the filter on "${bad}".`; }
    }
    if (i === 2 && !actions.length) return 'Please add at least one delivery action.';
    if (i === 3 && !schedules.length) return 'Please add a Daily, Weekly or Monthly schedule.';
    return null;
  };
  const fail = (message: string) => toast({ variant: 'error', title, message });
  const goTo = (target: number) => {
    if (target <= step) { setStep(target); return; }
    for (let i = step; i < target; i++) {
      const m = validate(i);
      if (m) { setStep(i); fail(m); return; }
    }
    setReached((r) => Math.max(r, target));
    setStep(target);
  };
  const canGo = (i: number) => !(i > reached && i > step + 1);

  const save = () => {
    for (let i = 0; i < 4; i++) {
      const m = validate(i);
      if (m) { setStep(i); fail(m); return; }
    }
    const kept: Record<string, FilterRule[]> = {};
    reports.forEach((r) => {
      const rules = (filters[r] ?? []).filter(complete).map((x) => ({ ...x, value: x.value.trim() }));
      if (rules.length) kept[r] = rules;
    });
    onSaved({
      id: editing?.id ?? newId('sub'), name: name.trim(), description: description.trim(), enabled, reports, filters: kept, actions, schedules,
    }, !edit);
  };

  /* ---------- step bodies ---------- */
  const src = SOURCES.find((s) => s.id === product) ?? SOURCES[0];
  const shownReports = src.reports.filter((r) => !q.trim() || r.toLowerCase().includes(q.trim().toLowerCase()));
  const setRules = (r: string, fn: (xs: FilterRule[]) => FilterRule[]) => setFilters((f) => ({ ...f, [r]: fn(f[r] ?? []) }));

  const general = (
    <div className="stack">
      <div className="grid2" style={{ alignItems: 'end' }}>
        <TextField label="Subscription Name" maxLength={100} placeholder="Subscription name" value={name} onChange={setName} />
        <div className="fld">
          <span className="fld__lbl">Status</span>
          <div className="row" style={{ minHeight: 46 }}><Toggle label="Status" checked={enabled} onChange={setEnabled} />
            <span className="text-sm muted">{enabled ? 'Enabled' : 'Disabled'}</span></div>
        </div>
      </div>
      <TextField label="Description" maxLength={250} placeholder="Description" value={description} onChange={setDescription} />
      <div className="subscription-picker">
        <Segmented ariaLabel="Products" value={product} onChange={(v) => { setProduct(v); setQ(''); }}
          items={SOURCES.map((s) => ({ value: s.id, label: s.label, count: reports.filter((r) => s.reports.includes(r)).length }))} />
        <SearchField value={q} onChange={setQ} placeholder="Search" ariaLabel="Search reports" />
        <div className="subscription-reports" role="group" aria-label={src.label}>
          {shownReports.length === 0 ? <p className="muted text-sm">{`No reports match "${q.trim()}".`}</p>
            : shownReports.map((r) => (
              <Checkbox key={r} label={r} checked={reports.includes(r)}
                onChange={(v) => setReports((xs) => (v ? [...xs, r] : xs.filter((x) => x !== r)))} />
            ))}
        </div>
      </div>
    </div>
  );

  const rules = filters[activeReport] ?? [];
  const filtersStep = (
    <div className="subscription-filters">
      <nav className="subscription-replist" aria-label="Reports">
        <p className="section-label">Reports</p>
        {reports.map((r) => (
          <button key={r} type="button" aria-current={r === activeReport ? 'true' : undefined} onClick={() => setActive(r)}>
            <span>{r}</span><Counter>{(filters[r] ?? []).filter(complete).length}</Counter>
          </button>
        ))}
      </nav>
      <div className="stack">
        <div className="row row--between">
          <p className="section-label" style={{ margin: 0 }}>Add filters</p>
          <Button size="sm" icon="plus" disabled={!activeReport}
            onClick={() => setRules(activeReport, (xs) => [...xs, { id: newId('rule'), field: '', operator: '', value: '' }])}>Add filters</Button>
        </div>
        {rules.length === 0 ? (
          <p className="subscription-empty">No filters on <b>{activeReport}</b>: the whole report is delivered. Click <b>Add filters</b> to narrow it.</p>
        ) : rules.map((r) => (
          <div key={r.id} className="subscription-rule">
            <SelectField label="Filter" placeholder="Select" options={SUB.SUB_FILTER_FIELDS} value={r.field}
              onChange={(v) => setRules(activeReport, (xs) => xs.map((x) => (x.id === r.id ? { ...x, field: v } : x)))} />
            <SelectField label="Include" placeholder="Select" options={SUB.SUB_FILTER_OPERATORS} value={r.operator}
              onChange={(v) => setRules(activeReport, (xs) => xs.map((x) => (x.id === r.id ? { ...x, operator: v } : x)))} />
            <TextField label="Value" placeholder="192.168.30.343" value={r.value}
              onChange={(v) => setRules(activeReport, (xs) => xs.map((x) => (x.id === r.id ? { ...x, value: v } : x)))} />
            <IconButton icon="trash" label="Remove filter" danger onClick={() => setRules(activeReport, (xs) => xs.filter((x) => x.id !== r.id))} />
          </div>
        ))}
      </div>
    </div>
  );

  const delivery = (
    <div className="stack">
      <div className="row row--end"><Button size="sm" icon="plus" onClick={() => setView('action')}>Add action</Button></div>
      <section className="lf-card tablecard tablecard--flat">
        <div className="tbl-wrap">
          <table className="lf-table" aria-label="Delivery actions">
            <thead><tr><th>From</th><th>To</th><th>Report Format</th><th>Save Path</th><th style={{ width: 52 }}><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {actions.length === 0 ? (
                <tr><td colSpan={5} className="tbl-empty">No delivery actions yet. Click <b>Add action</b> to email the report or save it on disk.</td></tr>
              ) : actions.map((a) => (
                <tr key={a.id} className="lf-row" style={{ cursor: 'default' }}>
                  <td title={a.from}>{a.from}</td><td title={a.to}>{a.to}</td><td>{a.formats.join(', ')}</td><td title={a.path}>{a.path}</td>
                  <td><IconButton icon="trash" label="Remove delivery action" danger onClick={() => setActions((xs) => xs.filter((x) => x.id !== a.id))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const schedule = (
    <div className="stack">
      <div className="row row--end">
        <Segmented mode="pressed" hug ariaLabel="Add schedule" value={lastPill}
          items={(['Daily', 'Weekly', 'Monthly'] as const).map((t) => ({ value: t, label: t }))}
          onChange={(v) => { setLastPill(v); setPicker(v as ScheduleType); }} />
      </div>
      <section className="lf-card tablecard tablecard--flat">
        <div className="tbl-wrap">
          <table className="lf-table" aria-label="Schedules">
            <thead><tr><th>Type</th><th>Selection</th><th>Start Time</th><th>Duration</th><th style={{ width: 52 }}><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr><td colSpan={5} className="tbl-empty">No schedule yet. Pick <b>Daily</b>, <b>Weekly</b> or <b>Monthly</b> to choose when the report is delivered.</td></tr>
              ) : schedules.map((s) => (
                <tr key={s.id} className="lf-row" style={{ cursor: 'default' }}>
                  <td>{s.type}</td><td title={s.selection}>{s.selection}</td><td>{s.time}</td><td>{s.duration}</td>
                  <td><IconButton icon="trash" label={`Remove ${s.type} schedule`} danger onClick={() => setSchedules((xs) => xs.filter((x) => x.id !== s.id))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const bodies = [general, filtersStep, delivery, schedule];
  const actionView = view === 'action';

  return (
    <>
      <Modal open onClose={onClose} title={actionView ? 'Configure Report Delivery Action' : title} icon={actionView ? 'send' : edit ? 'edit' : 'plus'}
        size="lg" escapeCloses={false} bodyClassName="subscription-wizard"
        footer={actionView ? (
          <>
            <Button onClick={() => setView('steps')}>Cancel</Button>
            <Button icon="chevron-left" onClick={() => setView('steps')}>Back</Button>
            <Button variant="primary" iconEnd="arrow" onClick={() => submitAction.current?.()}>Next</Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            {step > 0 && <Button icon="chevron-left" onClick={() => setStep(step - 1)}>Back</Button>}
            {step < 3
              ? <Button variant="primary" iconEnd="arrow" onClick={() => goTo(step + 1)}>Next</Button>
              : <Button variant="primary" onClick={save}>{edit ? 'Save' : 'Done'}</Button>}
          </>
        )}>
        <span ref={marker} hidden />
        {actionView ? (
          <ActionConfig submitRef={submitAction} onNested={setNested}
            onAdd={(a) => { setActions((xs) => [...xs, a]); setView('steps'); }} />
        ) : (
          <>
            <ol className="steps subscription-steps" aria-label="Progress">
              {STEPS.map((s, i) => (
                <li key={s.label} style={{ display: 'contents' }}>
                  {i > 0 && <span className="steps__line" aria-hidden="true" style={{ background: i <= step ? 'var(--ink)' : 'var(--border)' }} />}
                  <button type="button" className={'steps__item' + (i < step ? ' steps__item--done' : '')} aria-current={i === step ? 'step' : undefined}
                    disabled={!canGo(i)} onClick={() => goTo(i)}>
                    <span className="steps__n">{i < step ? <Icon name="check" size={12} /> : i + 1}</span><span>{s.label}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="subscription-wiz">
              <nav className="tabs subscription-rail" aria-label="Wizard steps">
                {STEPS.map((s, i) => (
                  <button key={s.label} type="button" aria-current={i === step ? 'step' : undefined} disabled={!canGo(i)} onClick={() => goTo(i)}
                    aria-label={s.label}>
                    <Icon name={s.icon} size={15} /><span>{s.label}</span>
                  </button>
                ))}
              </nav>
              <div className="subscription-wiz__body">{bodies[step]}</div>
            </div>
          </>
        )}
      </Modal>
      {picker && (
        <SchedulePicker type={picker} onClose={() => setPicker(null)}
          onAdd={(s) => { setSchedules((xs) => [...xs, s]); setPicker(null); }} />
      )}
    </>
  );
}


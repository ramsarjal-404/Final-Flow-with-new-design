import { useEffect, useRef, useState } from 'react';
import { Button, Icon, IconButton, PageHeader, useToast } from '../../../ui';
import { deliveryStore } from '../../../stores/deliveryAccounts';
import { DEFAULT_THRESHOLD, describeAction, detectStore, productOf, type DeliveryAction, type ThreatAlert } from '../model';
import { ActionConfig, formFrom, freshForm, settingsOf, validateAction, type ActionForm } from './ActionConfig';
import { DeliveryStep } from './DeliveryStep';
import { FiltersStep } from './FiltersStep';
import { GeneralStep } from './GeneralStep';
import { ruleState, type Draft } from './types';

/* DLG-DET-05 · Add Alert / Edit Alert wizard, drawn as the Lepide Design System full-page wizard (04 § 10, 08 § 6).
   Steps General · Filters · Delivery Settings; DLG-DET-09 replaces the step body while open. */

const STEPS = ['General', 'Filters', 'Delivery Settings'];
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function initial(alert?: ThreatAlert): Draft {
  if (!alert) {
    return {
      name: '', description: '', enabled: true, reports: [], product: 'auditor', filters: {},
      valueFilter: { field: 'Server', include: 'All', values: [] }, threshold: { ...DEFAULT_THRESHOLD },
      actions: [], processRemotely: false, agent: '', alertType: 'Critical',
    };
  }
  return {
    name: alert.name, description: alert.description, enabled: alert.status === 'Enabled', reports: [...alert.reports],
    product: alert.reports.length ? productOf(alert.reports[0]) : 'auditor', filters: clone(alert.filters),
    valueFilter: alert.valueFilter ? clone(alert.valueFilter) : { field: 'Server', include: 'All', values: [] },
    threshold: { ...alert.threshold }, actions: clone(alert.actions), processRemotely: alert.processRemotely, agent: alert.agent, alertType: alert.alertType,
  };
}

export function AlertWizard({ alert, onClose, onSaved }: { alert?: ThreatAlert; onClose: () => void; onSaved: (a: ThreatAlert, mode: 'add' | 'edit') => void }) {
  const toast = useToast();
  const mode = alert ? 'edit' : 'add';
  const title = mode === 'add' ? 'Add alert' : 'Edit Alert';
  const [d, setD] = useState<Draft>(() => initial(alert));
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(alert ? 2 : 0);
  const [active, setActive] = useState(alert?.reports[0] ?? '');
  const [action, setAction] = useState<{ index: number | null; form: ActionForm; tried: boolean } | null>(null);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const firstEmail = () => deliveryStore.get().accounts.find((a) => a.type === 'Email')?.name ?? '';
  const top = useRef<HTMLDivElement>(null);

  const fail = (message: string) => toast({ variant: 'error', title, message });

  /** Message for the first failing rule of a step, or null. */
  const validate = (s: number): string | null => {
    if (s === 0) {
      const n = d.name.trim();
      if (!n) return 'Please enter the alert name.';
      // GAP-DET-01 intended: the duplicate rule applies in Edit too, excluding the alert itself.
      if (detectStore.get().alerts.some((a) => a.id !== alert?.id && a.name.trim().toLowerCase() === n.toLowerCase())) return `An alert named "${n}" already exists.`;
      if (!d.reports.length) return 'Please select at least one report.';
      return null;
    }
    if (s === 1) {
      const bad = d.reports.find((r) => (d.filters[r] ?? []).some((x) => ruleState(x) === 'partial'));
      if (bad) { setActive(bad); return `Complete or remove the filter on "${bad}".`; }
      if (d.valueFilter.include !== 'All' && !d.valueFilter.values.length) return `Add at least one ${d.valueFilter.field} value, or set Include to All.`;
      const t = d.threshold;
      if (t.enabled && (t.times === '' || t.times < 1 || t.within === '' || t.within < 1)) return 'Threshold values must be 1 or more.';
      return null;
    }
    if (!d.actions.length) return 'Please add at least one action.';
    if (d.processRemotely && !d.agent) return 'Please select the agent server that processes this alert.';
    return null;
  };

  const goTo = (target: number) => {
    if (target <= step) { setStep(target); return; }
    for (let s = step; s < target; s++) {
      const msg = validate(s);
      if (msg) { fail(msg); return; }
    }
    if (step < 1 && target >= 1 && !d.reports.includes(active)) setActive(d.reports[0] ?? '');
    setStep(target);
    setFurthest((f) => Math.max(f, target));
  };

  useEffect(() => { top.current?.closest('.main')?.scrollTo?.({ top: 0 }); }, [step, action === null]);

  const finish = () => {
    const msg = validate(2);
    if (msg) { fail(msg); return; }
    const filters: ThreatAlert['filters'] = {};
    d.reports.forEach((r) => { filters[r] = (d.filters[r] ?? []).filter((x) => ruleState(x) === 'complete').map((x) => ({ ...x, value: x.value.trim() })); });
    const remote = d.processRemotely;
    const saved: ThreatAlert = {
      id: alert?.id ?? 'alert-' + Date.now().toString(36),
      name: d.name.trim(), description: d.description.trim(), status: d.enabled ? 'Enabled' : 'Disabled',
      reports: [...d.reports], filters, valueFilter: d.valueFilter, threshold: d.threshold, actions: d.actions,
      alertType: d.alertType, processRemotely: remote, agent: remote ? d.agent : '', agentStatus: remote && d.agent ? d.agent : 'N/A',
    };
    onSaved(saved, mode);
  };

  /* ---- DLG-DET-09 handlers ---- */
  const openAction = (index: number | null) => setAction({ index, form: index === null ? freshForm(firstEmail()) : formFrom(d.actions[index], firstEmail()), tried: false });
  const backFromAction = () => setAction(null); // GAP-DET-03 intended: Cancel discards only the action form.
  const doneAction = () => {
    if (!action) return;
    const f = action.form;
    const msg = validateAction(f);
    if (msg) { setAction({ ...action, tried: true }); toast({ variant: 'error', title: 'Configure report delivery action', message: msg }); return; }
    const settings = settingsOf(f);
    const desc = describeAction(f.kind, settings ?? {});
    const rec: DeliveryAction = {
      id: action.index === null ? 'act-' + Date.now().toString(36) : d.actions[action.index].id,
      kind: f.kind, details: desc.details, ...(desc.sendTo ? { sendTo: desc.sendTo } : {}), ...(settings ? { settings } : {}),
    };
    set({ actions: action.index === null ? [...d.actions, rec] : d.actions.map((a, i) => (i === action.index ? rec : a)) });
    setAction(null);
  };

  /* Escape closes the wizard unless a nested dialog, drawer or popover is open (INT-DET-032);
     inside DLG-DET-09 it returns to Delivery Settings instead (GAP-DET-03 intended). */
  const esc = useRef<() => void>(() => {});
  esc.current = () => (action ? backFromAction() : onClose());
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[data-overlay], .pop')) return;
      esc.current();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  const last = step === STEPS.length - 1;
  return (
    <div className="sub detect-wizard" ref={top}>
      <PageHeader
        eyebrow={action ? `Step 3 of 3 · ${STEPS[2]}` : `Step ${step + 1} of 3 · ${STEPS[step]}`}
        title={action ? 'Configure Report Delivery Action' : title}
        actions={<IconButton icon="x" label="Close" bordered onClick={onClose} />} />

      {!action && (
        <ol className="steps steps--page detect-rail" aria-label="Alert steps">
          {STEPS.map((s, i) => {
            const disabled = i > furthest && i > step + 1;
            const done = i < step;
            return (
              <li key={s} style={{ display: 'contents' }}>
                {i > 0 && <span className="steps__line" aria-hidden="true" style={{ background: i <= step ? 'var(--ink)' : 'var(--border)' }} />}
                <button type="button" className={'steps__item' + (done ? ' steps__item--done' : '')} aria-current={i === step ? 'step' : undefined}
                  disabled={disabled} onClick={() => i !== step && goTo(i)}>
                  <span className="steps__n">{done ? <Icon name="check" size={12} /> : i + 1}</span><span>{s}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <section className="lf-card wiz-card page-form">
        <div className="wiz-card__body">
          {action ? (
            <ActionConfig f={action.form} triedDone={action.tried} set={(p) => setAction((x) => (x ? { ...x, form: { ...x.form, ...p } } : x))} />
          ) : step === 0 ? <GeneralStep d={d} set={set} />
            : step === 1 ? <FiltersStep d={d} set={set} active={d.reports.includes(active) ? active : d.reports[0]} setActive={setActive} />
              : <DeliveryStep d={d} set={set} onAdd={() => openAction(null)} onOpen={(i) => openAction(i)} />}
        </div>
        <footer className="wiz-card__foot">
          {action ? (
            <>
              <Button icon="chevron-left" onClick={backFromAction}>Back</Button>
              <span className="spacer" />
              <Button onClick={backFromAction}>Cancel</Button>
              <Button variant="primary" onClick={doneAction}>Done</Button>
            </>
          ) : (
            <>
              {step > 0 && <Button icon="chevron-left" onClick={() => setStep(step - 1)}>Back</Button>}
              <span className="spacer" />
              <Button onClick={onClose}>Cancel</Button>
              {last ? <Button variant="primary" onClick={finish}>{mode === 'add' ? 'Done' : 'Save'}</Button>
                : <Button variant="primary" iconEnd="arrow" onClick={() => goTo(step + 1)}>Next</Button>}
            </>
          )}
        </footer>
      </section>
    </div>
  );
}

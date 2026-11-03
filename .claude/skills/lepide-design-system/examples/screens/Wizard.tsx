import { useState } from 'react';
import {
  Checkbox, ConfirmDialog, Field, KeyValues, MultiSelect, NumberField, PageHeader, SelectField, TextAreaField,
  TextField, TilePicker, ToneTag, WizardCard, useToast,
} from '@lepide/ds-react';
import type { StatusTone, TileOption } from '@lepide/ds-react';

/* Wizard (DESIGN.md §4.2, docs/components/wizard-card.md): steps above one card; each step validates before Next,
   done steps can be revisited, Review has Edit links back to each step, Finish shows a success toast. */

const STEPS = ['Details', 'Scope', 'Actions', 'Review'];

const SEVERITY = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
const SEVERITY_TONE: Record<string, StatusTone> = { critical: 'bad', high: 'bad', medium: 'warn', low: 'info' };

type SourceType = 'windows' | 'netapp' | 'sharepoint';
const SOURCES: (TileOption & { value: SourceType })[] = [
  { value: 'windows', label: 'Windows file server', description: 'NTFS and share permissions', icon: 'server' },
  { value: 'netapp', label: 'NetApp filer', description: 'CIFS shares on ONTAP', icon: 'database' },
  { value: 'sharepoint', label: 'SharePoint Online', description: 'Sites and document libraries', icon: 'cloud' },
];
const SERVERS: Record<SourceType, { value: string; label: string }[]> = {
  windows: [
    { value: 'fs01', label: 'FS-01.corp.lepide.local' },
    { value: 'fs02', label: 'FS-02.corp.lepide.local' },
    { value: 'fs-fin', label: 'FS-FINANCE.corp.lepide.local' },
    { value: 'fs-hr', label: 'FS-HR.eu.lepide.local' },
  ],
  netapp: [
    { value: 'na-ldn', label: 'NA-LDN-01 (svm_corp)' },
    { value: 'na-nyc', label: 'NA-NYC-01 (svm_finance)' },
  ],
  sharepoint: [
    { value: 'sp-hr', label: 'HR Team site' },
    { value: 'sp-fin', label: 'Finance Documents' },
    { value: 'sp-legal', label: 'Legal Contracts' },
  ],
};

const ACTIONS = [
  { value: 'alert', label: 'Raise an alert for the security team' },
  { value: 'owner', label: 'Email the data owner' },
  { value: 'revert', label: 'Revert the permission change' },
  { value: 'disable', label: 'Disable the user account in Active Directory' },
];

type Policy = {
  name: string; description: string; severity: string;
  source: SourceType; servers: string[]; subfolders: boolean;
  actions: string[]; threshold: number | '';
};
const EMPTY: Policy = {
  name: '', description: '', severity: '',
  source: 'windows', servers: [], subfolders: true,
  actions: ['alert'], threshold: 5,
};
type Errors = Partial<Record<'name' | 'severity' | 'servers' | 'actions' | 'threshold', string>>;

function validateStep(step: number, p: Policy): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!p.name.trim()) e.name = 'Enter a name for the policy.';
    else if (p.name.trim().length > 80) e.name = 'Keep the name to 80 characters or fewer.';
    if (!p.severity) e.severity = 'Choose a severity.';
  }
  if (step === 1 && !p.servers.length) e.servers = 'Choose at least one server or site.';
  if (step === 2) {
    if (!p.actions.length) e.actions = 'Choose at least one action.';
    if (p.threshold === '' || p.threshold < 1 || p.threshold > 500) e.threshold = 'Use a number from 1 to 500.';
  }
  return e;
}

export default function Wizard() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Policy>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const set = <K extends keyof Policy>(k: K, v: Policy[K]) => {
    setP((cur) => ({ ...cur, [k]: v }));
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const toggleAction = (value: string, on: boolean) =>
    set('actions', on ? [...p.actions, value] : p.actions.filter((a) => a !== value));
  const pickSource = (s: SourceType) => { if (s !== p.source) setP((cur) => ({ ...cur, source: s, servers: [] })); };

  const go = (i: number) => { setErrors({}); setStep(i); };
  const restart = () => { setP(EMPTY); setErrors({}); setStep(0); };

  const next = () => {
    const e = validateStep(step, p);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      toast({ variant: 'success', title: 'Policy created', message: `"${p.name.trim()}" is now protecting ${p.servers.length} ${p.servers.length === 1 ? 'location' : 'locations'}.` });
      restart();
    }, 1000);
  };
  const dirty = JSON.stringify(p) !== JSON.stringify(EMPTY);
  const cancel = () => (dirty ? setConfirmCancel(true) : restart());

  const source = SOURCES.find((s) => s.value === p.source)!;
  const serverLabels = SERVERS[p.source].filter((s) => p.servers.includes(s.value)).map((s) => s.label);
  const severity = SEVERITY.find((s) => s.value === p.severity);
  const editLink = (i: number, what: string) => (
    <div className="row row--between">
      <h3 className="section-label">{STEPS[i]}</h3>
      <button type="button" className="lf-link text-sm" aria-label={`Edit ${what}`} onClick={() => go(i)}>Edit</button>
    </div>
  );

  return (
    <div className="sub">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Protect', to: '/protect' }, { label: 'Policies', to: '/protect/policies' }, { label: 'Create permission policy' }]}
        title="Create permission policy"
        description="Watch for risky permission changes on file servers and SharePoint, and respond automatically."
      />

      <WizardCard steps={STEPS} step={step} onStep={go} busy={busy} finishLabel="Create policy"
        onBack={() => go(step - 1)} onNext={next} onCancel={cancel}>
        {step === 0 && <>
          <TextField label="Policy name" value={p.name} onChange={(v) => set('name', v)} error={errors.name}
            placeholder="e.g. Finance share opened to Everyone" maxLength={120} autoFocus />
          <TextAreaField label="Description" note="Optional" value={p.description} onChange={(v) => set('description', v)}
            rows={3} placeholder="What this policy protects and who owns it" />
          <SelectField label="Severity" placeholder="Select severity" value={p.severity} onChange={(v) => set('severity', v)}
            options={SEVERITY} error={errors.severity} help="Sets the alert severity and where it appears on the dashboard." />
        </>}

        {step === 1 && <>
          <Field label="Source type">
            <TilePicker ariaLabel="Source type" value={p.source} onChange={(v) => pickSource(v as SourceType)} options={SOURCES} />
          </Field>
          <MultiSelect label={p.source === 'sharepoint' ? 'Sites' : 'Servers'} placeholder="Choose locations" selectAll
            value={p.servers} onChange={(v) => set('servers', v)} options={SERVERS[p.source]} error={errors.servers} />
          <Checkbox label={p.source === 'sharepoint' ? 'Include subsites and libraries' : 'Include subfolders'}
            checked={p.subfolders} onChange={(v) => set('subfolders', v)} />
        </>}

        {step === 2 && <>
          <Field label="When the policy is triggered" error={errors.actions}>
            <div className="stack stack--sm" role="group" aria-label="When the policy is triggered">
              {ACTIONS.map((a) => (
                <Checkbox key={a.value} label={a.label} checked={p.actions.includes(a.value)} onChange={(v) => toggleAction(a.value, v)} />
              ))}
            </div>
          </Field>
          <NumberField label="Trigger after" note="1–500" value={p.threshold} onChange={(v) => set('threshold', v)}
            min={1} max={500} suffix="changes in 10 minutes" error={errors.threshold}
            help="Lower numbers catch single risky changes; higher numbers catch bulk changes." />
        </>}

        {step === 3 && <>
          {editLink(0, 'details')}
          <KeyValues items={[
            { label: 'Policy name', value: p.name.trim() },
            { label: 'Severity', value: severity && <ToneTag tone={SEVERITY_TONE[severity.value]}>{severity.label}</ToneTag> },
            { label: 'Description', value: p.description.trim() || 'Not set', wide: true },
          ]} />
          {editLink(1, 'scope')}
          <KeyValues items={[
            { label: 'Source type', value: source.label },
            { label: p.subfolders ? 'Includes' : 'Excludes', value: p.source === 'sharepoint' ? 'Subsites and libraries' : 'Subfolders' },
            { label: p.source === 'sharepoint' ? 'Sites' : 'Servers', value: serverLabels.join(', '), wide: true },
          ]} />
          {editLink(2, 'actions')}
          <KeyValues items={[
            { label: 'Trigger', value: `${p.threshold} changes in 10 minutes` },
            { label: 'Actions', value: ACTIONS.filter((a) => p.actions.includes(a.value)).map((a) => a.label).join(', ') },
          ]} />
        </>}
      </WizardCard>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => { setConfirmCancel(false); restart(); }}
        title="Discard this policy?"
        message="The details you entered are not saved."
        confirmLabel="Discard policy"
        cancelLabel="Keep editing"
      />
    </div>
  );
}

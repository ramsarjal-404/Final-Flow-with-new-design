/* SCR-PRO-05 … SCR-PRO-10: five-step AD Cleaner policy wizard. */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Banner, Button, Checkbox, Chip, ConfirmDialog, Dropdown, EmptyState, Field, Icon, IconButton, KeyValues, NumberField, PageHeader, RadioGroup, SearchField, SelectField, TextAreaField, TextField, Toggle,
} from '../../ui';
import {
  DOMAINS, PLATFORMS, STATUS_LBL, TASKS, TENANTS, actionSummary, configFromPolicy, defaultConfig, deletesOf, hasScope, isEntra, ousFor, ouPath, stamp,
  taskOf, taskRungsFor, tplSummary, type Cfg, type Policy, type ReportTemplate, type Rung, type Template, type TplStatus,
} from './data';
import { protectStore, savePolicy, setDraft } from './store';
import { ChipInput } from './kit';
import { EmailAccountDialog, Ladder, MiniPager, ReportTemplateDialog, TemplateDialog, usePaged } from './cleanerDialogs';
import { EMAIL_RE } from './data';

const STEPS = ['Scope', 'Automation', 'Notifications', 'Schedule & Reports', 'Review'];
const STAGE: [string, string][] = [
  ['Scope & targeting', 'Choose one identity-hygiene task and where it looks. Nothing is changed here — this only defines what gets scanned.'],
  ['Automation', 'Define what happens to the items this policy finds, and after how long. These actions start running on schedule once the policy is saved.'],
  ['Notifications', 'Choose which account alerts are sent from, and who receives the AD Cleaner reports and notifications.'],
  ['Schedule & Reports', 'Choose when the AD Cleaner runs its scan. Reports, notifications and any cleanup actions — for accounts and empty groups — are all performed at this scheduled time.'],
  // GAP-PRO-01 intended: policies are saved inactive; activation is a separate action in Policy Management.
  ['Review & save', 'Confirm the scope, automation, notifications, schedule and reports. The policy is saved as inactive — activate it from Policy Management when you are ready to run it on its schedule.'],
];
const LOCK_TIP = 'This can’t be changed for an existing policy';
type Msg = { tone: 'error' | 'info'; text: string; undo?: () => void } | null;

function Section({ title, sub, children, aside }: { title: string; sub?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="protect-sec">
      <h4>{title}{sub && <small>{sub}</small>}{aside && <><span className="grow" />{aside}</>}</h4>
      {children}
    </section>
  );
}

/** Threshold rules shared by every ladder. */
function ladderError(rungs: Rung[], kind: 'tpl' | 'groups' | 'task'): string | null {
  const on = rungs.filter((r) => r.enabled);
  if (kind === 'groups' && !on.length) return 'Enable at least one empty-group action, or choose another task on the Scope step.';
  if (kind === 'task') { const m = on.find((r) => r.ou !== undefined && !r.ou); if (m) return `Choose the ${(m.ouLabel ?? 'quarantine OU').replace(/^./, (c) => c.toLowerCase())} the objects are moved to.`; }
  const withDays = on.filter((r) => r.hasDays);
  if (withDays.some((r) => !(Number(r.days) >= 1)))
    return kind === 'tpl' ? 'Each enabled cleanup action needs a threshold of at least one day.' : kind === 'groups' ? 'Each enabled empty-group action needs a threshold of at least one day.' : 'Each enabled action needs a threshold of at least one day.';
  for (let i = 1; i < withDays.length; i++) if (Number(withDays[i].days) <= Number(withDays[i - 1].days))
    return kind === 'tpl' ? 'Cleanup thresholds must increase from one action to the next.' : kind === 'groups' ? 'Empty-group thresholds must increase from report to quarantine to deletion.' : 'Thresholds must increase from one action to the next.';
  return null;
}

export default function CleanerWizard() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const editId = sp.get('edit');
  const editing: Policy | undefined = useMemo(() => protectStore.get().policies.find((p) => p.id === editId), [editId]);
  const initial = useMemo<{ cfg: Cfg; step: number; highest: number }>(() => {
    if (editing) return { cfg: editing.config ? JSON.parse(JSON.stringify(editing.config)) : configFromPolicy(editing), step: 0, highest: 4 };
    const d = protectStore.get().draft;
    return d ? JSON.parse(JSON.stringify(d)) : { cfg: defaultConfig(), step: 0, highest: 0 };
  }, [editing]);
  const [cfg, setCfg] = useState<Cfg>(initial.cfg);
  const [step, setStep] = useState(initial.step);
  const [highest, setHighest] = useState(initial.highest);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Msg>(null);
  const [cancel, setCancel] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const baseline = useRef(JSON.stringify(editing ? initial.cfg : defaultConfig()));

  // Draft autosave (create only), ~320 ms after a change; flushed when the page is left mid-way.
  const latest = useRef({ cfg, step, highest }); latest.current = { cfg, step, highest };
  const finished = useRef(false);
  useEffect(() => {
    if (editing) return;
    const t = setTimeout(() => setDraft({ cfg, step, highest }), 320);
    return () => clearTimeout(t);
  }, [cfg, step, highest, editing]);
  useEffect(() => () => { if (!editing && !finished.current) setDraft(latest.current); }, [editing]);

  const up = (patch: Partial<Cfg>) => setCfg((c) => ({ ...c, ...patch }));
  const go = (i: number) => { setStep(i); setHighest((h) => Math.max(h, i)); setMsg(null); top.current?.scrollIntoView({ block: 'start' }); document.querySelector('.main')?.scrollTo({ top: 0 }); };

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {}; let m: string | null = null;
    if (s === 0) {
      if (!cfg.name.trim()) e.name = 'Enter a policy name.';
      if (!hasScope(cfg)) { e.scope = isEntra(cfg) ? 'Choose a tenant.' : 'Choose a domain, domain controller or organizational unit.'; m = 'Choose at least one scope source before continuing.'; }
    }
    if (s === 1) {
      if (cfg.task === 'accounts') { const t = cfg.templates.find((x) => x.name === cfg.template); if (t) m = ladderError(t.rungs, 'tpl'); }
      else if (cfg.task === 'groups') m = ladderError(cfg.groupRungs, 'groups');
      else m = ladderError(cfg.taskRungs, 'task');
    }
    if (s === 3 && cfg.task === 'accounts' && cfg.reportOn) {
      if (!(Number(cfg.reportDays) >= 1)) { e.reportDays = 'Report inactivity must be at least one day.'; m = e.reportDays; }
      else if (!(cfg.reportTemplates.find((r) => r.name === cfg.reportTemplate)?.cols.length)) m = 'Include at least one column in the report.';
    }
    setErrs(e); setMsg(m ? { tone: 'error', text: m } : null);
    return !Object.keys(e).length && !m;
  };
  const next = () => {
    if (step < 4) { if (validate(step)) go(step + 1); return; }
    if (!cfg.name.trim()) { setStep(0); setErrs({ name: 'Policy name is required.' }); setMsg({ tone: 'error', text: 'Policy name is required.' }); return; }
    if (!hasScope(cfg)) { setStep(0); setErrs({ scope: 'Choose a domain, domain controller or organizational unit.' }); setMsg({ tone: 'error', text: 'Choose at least one scope source before continuing.' }); return; }
    const t = taskOf(cfg.task); const deletes = deletesOf(cfg);
    const p: Policy = {
      id: editing?.id ?? '', name: cfg.name.trim(), desc: cfg.desc.trim(), module: 'cleaner', ptype: t.ptype, task: t.key, domain: isEntra(cfg) ? cfg.tenant : cfg.domain,
      time: `${cfg.hh}:${cfg.mm}`, deletes, destructive: deletes.length > 0, action: actionSummary(cfg), config: cfg, updated: stamp(),
      status: editing?.status ?? 'draft', active: editing?.active ?? false, scheduled: editing?.scheduled ?? 'Not scheduled',
    };
    const id = savePolicy(p);
    finished.current = true;
    if (!editing) setDraft(null);
    nav(editing ? `/protect/policies?updated=${id}` : `/protect/policies?applied=${id}`);
  };
  const railClick = (i: number) => {
    if (i === step) return;
    if (i < step) { go(i); return; }
    if (!editing && i > highest + 1) return;
    for (let s = step; s < i; s++) if (!validate(s)) { setStep(s); return; }
    go(i);
  };
  const dirty = JSON.stringify(cfg) !== baseline.current;
  const leave = () => { finished.current = true; if (!editing) setDraft(null); nav('/protect/policies'); };

  return (
    <div className="sub" ref={top}>
      <PageHeader crumbs={[{ label: 'Dashboard', to: '/protect' }, { label: 'Policy Management', to: '/protect/policies' }, { label: editing ? 'Edit Policy' : 'New Policy' }]}
        eyebrow={`Step ${step + 1} of 5 · ${STEPS[step]}`} title={editing ? 'Edit Policy — AD Cleaner' : 'Create Policy — AD Cleaner'} />
      <ol className="steps steps--page protect-rail" aria-label="Policy steps">
        {STEPS.map((s, i) => {
          const reach = !!editing || i <= highest + 1; const done = i < step || (i <= highest && i !== step);
          return (
            <li key={s} style={{ display: 'contents' }}>
              {i > 0 && <span className="steps__line" style={{ background: i <= step ? 'var(--ink)' : 'var(--border)' }} aria-hidden="true" />}
              <button type="button" className={'steps__item' + (done ? ' steps__item--done' : '')} aria-current={i === step ? 'step' : undefined} disabled={!reach}
                onClick={() => railClick(i)}>
                <span className="steps__n">{done ? <Icon name="check" size={12} /> : i + 1}</span><span>{s}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <section className="lf-card wiz-card page-form">
        <div className="wiz-card__body">
          {msg && <Banner tone={msg.tone} onClose={() => setMsg(null)}
            action={msg.undo ? <Button size="sm" onClick={() => { msg.undo!(); setMsg(null); }}>Undo</Button> : undefined}>{msg.text}</Banner>}
          <header className="protect-stage">
            <h3>{STAGE[step][0]}</h3><p>{STAGE[step][1]}</p>
          </header>
          {step === 0 && <ScopeStep cfg={cfg} up={up} setCfg={setCfg} errs={errs} setErrs={setErrs} locked={!!editing} />}
          {step === 1 && <AutomationStep cfg={cfg} up={up} setMsg={setMsg} />}
          {step === 2 && <NotifyStep cfg={cfg} up={up} />}
          {step === 3 && <ScheduleStep cfg={cfg} up={up} errs={errs} />}
          {step === 4 && <ReviewStep cfg={cfg} onEdit={(i) => go(i)} />}
        </div>
        <footer className="wiz-card__foot">
          <Button icon="chevron-left" disabled={step === 0} onClick={() => go(step - 1)}>Back</Button>
          <span className="spacer" />
          <Button onClick={() => (dirty ? setCancel(true) : leave())}>Cancel</Button>
          <Button variant="primary" iconEnd={step < 4 ? 'arrow' : undefined} icon={step === 4 ? 'save' : undefined}
            disabled={step === 0 && !cfg.name.trim()} onClick={next}>{step < 4 ? 'Next' : editing ? 'Save changes' : 'Save policy'}</Button>
        </footer>
      </section>
      <ConfirmDialog open={cancel} onClose={() => setCancel(false)} title="Discard this policy?" icon="alert"
        message={editing ? 'Your changes to this policy will be lost.' : 'The policy you started will not be saved.'} confirmLabel="Discard changes" onConfirm={leave} />
    </div>
  );
}

/* ------------------------------------------------------------------ step 1 */
function ScopeStep({ cfg, up, setCfg, errs, setErrs, locked }: {
  cfg: Cfg; up: (p: Partial<Cfg>) => void; setCfg: React.Dispatch<React.SetStateAction<Cfg>>; errs: Record<string, string>; setErrs: (e: Record<string, string>) => void; locked: boolean;
}) {
  const [descOpen, setDescOpen] = useState(!!cfg.desc);
  const [dcOpen, setDcOpen] = useState(false);
  const [ouOpen, setOuOpen] = useState(cfg.ous.length > 0);
  const [q, setQ] = useState('');
  const descRef = useRef<HTMLDivElement>(null);
  const task = taskOf(cfg.task); const entra = task.platform === 'entra';
  const ous = ousFor(cfg.domain);
  const match = ous.filter((o) => !q.trim() || (o.n + ' ' + o.p).toLowerCase().includes(q.trim().toLowerCase()));
  const pg = usePaged(match, 6, [q, cfg.domain]);
  const allOn = match.length > 0 && match.every((o) => cfg.ous.includes(o.n)); const someOn = match.some((o) => cfg.ous.includes(o.n));
  const clr = (k: string) => { if (errs[k]) { const e = { ...errs }; delete e[k]; setErrs(e); } };
  const lockWrap = (n: ReactNode) => (locked ? <span data-tip={LOCK_TIP} className="protect-locked">{n}</span> : n);
  return (
    <>
      {locked && <Banner tone="info">Policy name, task and domain are fixed for an existing policy.</Banner>}
      <div className="protect-details">
        {lockWrap(<TextField label="Policy name" note="Required" value={cfg.name} placeholder="e.g. Inactive account cleanup" disabled={locked} error={errs.name}
          onChange={(v) => { up({ name: v }); clr('name'); }} />)}
        <Button icon={descOpen ? 'minus' : 'plus'} onClick={() => {
          if (!descOpen) { setDescOpen(true); requestAnimationFrame(() => descRef.current?.querySelector('textarea')?.focus()); }
          else if (!cfg.desc.trim()) setDescOpen(false);
        }}>{descOpen ? 'Hide description' : 'Add description'}</Button>
      </div>
      {descOpen && <div ref={descRef}><TextAreaField label="Description" rows={3} value={cfg.desc} placeholder="Optional — what this policy does, who owns it, or notes for your team."
        onChange={(v) => up({ desc: v })} /></div>}

      <Section title="What to clean up" sub="Pick one hygiene task. Each policy runs a single task on its own schedule.">
        <div className="protect-tasks">
          <div className="protect-tasks__list" role="radiogroup" aria-label="What to clean up">
            {(['ad', 'entra'] as const).map((pl) => {
              const ts = TASKS.filter((t) => t.platform === pl);
              return (
                <div key={pl} className="protect-tasks__grp">
                  <p className="protect-tasks__h">{PLATFORMS[pl]} · {ts.length}</p>
                  {ts.map((t) => (
                    <label key={t.key} className={'protect-task' + (cfg.task === t.key ? ' is-sel' : '') + (locked ? ' is-locked' : '')} data-tip={locked ? LOCK_TIP : undefined}>
                      <input type="radio" name="cleanup-task" value={t.key} checked={cfg.task === t.key} disabled={locked}
                        onChange={() => setCfg((c) => ({ ...c, task: t.key, taskRungs: t.builtin ? [] : taskRungsFor(t.key) }))} />
                      <span className="protect-radio" aria-hidden="true" />
                      <span className="protect-task__text"><b>{t.label}</b><small>{t.ptype}</small></span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
          <aside className="protect-tasks__detail" aria-live="polite">
            <p className="eyebrow">{PLATFORMS[task.platform]}</p>
            <h5>{task.label}</h5>
            <p>{task.desc}</p>
            <span className="fld__lbl">Actions</span>
            <div className="row row--wrap">{task.chips.map((c) => <Chip key={c} tone={c === 'Delete' ? 'bad' : 'neutral'} icon={c === 'Delete' ? 'alert' : undefined}>{c}</Chip>)}</div>
          </aside>
        </div>
      </Section>

      {!entra ? (
        <>
          <Section title="Domain & controllers" sub="The Active Directory forest and the servers to query">
            {lockWrap(<SelectField label="Domain" note="Required" value={cfg.domain} placeholder="Select a domain" options={DOMAINS} disabled={locked} error={errs.scope}
              help="Pick a connected domain — add more in Domain Properties"
              onChange={(v) => { const names = ousFor(v).map((o) => o.n); up({ domain: v, ous: cfg.ous.filter((o) => names.includes(o)) }); clr('scope'); }} />)}
            <div className="protect-choose">
              <div><b>Domain controllers</b><span>{cfg.dcMode === 'all' ? 'All controllers · 1 found' : `Selected · ${cfg.dcChecked ? 1 : 0} of 1`}</span></div>
              {lockWrap(<button type="button" className="lf-link protect-linkbtn" disabled={locked} aria-expanded={dcOpen} onClick={() => setDcOpen((o) => !o)}>Choose</button>)}
            </div>
            {dcOpen && (
              <div className="protect-choose__panel">
                <SelectField label="Include" value={cfg.dcMode} options={[{ value: 'all', label: 'All domain controllers' }, { value: 'selected', label: 'Selected only' }]}
                  onChange={(v) => { up({ dcMode: v as Cfg['dcMode'], dcChecked: true }); clr('scope'); }} />
                <Checkbox label={`DCONE.${cfg.domain || 'domain'}`} checked={cfg.dcChecked} disabled={cfg.dcMode === 'all'} onChange={(v) => { up({ dcChecked: v }); clr('scope'); }} />
              </div>
            )}
          </Section>
          <Section title="Organizational units" sub="Optional: narrow the policy to specific OUs">
            <div className="protect-choose">
              <div><b>Organizational units</b><span>{cfg.ous.length} of {ous.length} selected</span></div>
              <button type="button" className="lf-link protect-linkbtn" aria-expanded={ouOpen} onClick={() => setOuOpen((o) => !o)}>Choose</button>
            </div>
            {ouOpen && (
              <div className="protect-choose__panel">
                <SearchField value={q} onChange={setQ} placeholder="Search OU name or path…" ariaLabel="Search OU name or path…" />
                <Checkbox label="Select all" checked={allOn} indeterminate={someOn && !allOn} disabled={!match.length}
                  onChange={() => { up({ ous: allOn ? cfg.ous.filter((o) => !match.some((m) => m.n === o)) : Array.from(new Set([...cfg.ous, ...match.map((m) => m.n)])) }); clr('scope'); }} />
                <div className="protect-picklist">
                  {pg.slice.length === 0 ? <p className="protect-picklist__empty">No OUs match “{q}”.</p> : pg.slice.map((o) => (
                    <div key={o.n} className="protect-pickrow protect-pickrow--check">
                      <Checkbox checked={cfg.ous.includes(o.n)} label={<span className="protect-ou2"><b>{o.n}</b><small>{o.p}</small></span>}
                        onChange={(v) => { up({ ous: v ? [...cfg.ous, o.n] : cfg.ous.filter((x) => x !== o.n) }); clr('scope'); }} />
                    </div>
                  ))}
                </div>
                <MiniPager {...pg} onPage={pg.setPage} />
                {cfg.ous.length > 0 && (
                  <div className="protect-selected">
                    <div className="row"><b>Selected OUs</b><span className="grow" /><button type="button" className="lf-link protect-linkbtn" onClick={() => up({ ous: [] })}>Clear all</button></div>
                    <div className="row row--wrap">{cfg.ous.map((o) => (
                      <span key={o} className="lf-chip lf-chip--brand protect-chipin__chip">{o}<button type="button" aria-label={`Remove ${o}`} onClick={() => up({ ous: cfg.ous.filter((x) => x !== o) })}><Icon name="x" size={12} /></button></span>
                    ))}</div>
                  </div>
                )}
              </div>
            )}
          </Section>
        </>
      ) : (
        <Section title="Microsoft Entra ID tenant" sub="The cloud directory this task reads through Microsoft Graph">
          {lockWrap(<SelectField label="Tenant" note="Required" value={cfg.tenant} placeholder="Select a tenant" options={TENANTS} disabled={locked} error={errs.scope}
            help="Connected tenants from Data Source settings. Read access to users, devices and applications is required." onChange={(v) => { up({ tenant: v }); clr('scope'); }} />)}
        </Section>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ step 2 */
function AutomationStep({ cfg, up, setMsg }: { cfg: Cfg; up: (p: Partial<Cfg>) => void; setMsg: (m: Msg) => void }) {
  const [dlg, setDlg] = useState<{ initial: Template | null } | null>(null);
  const task = taskOf(cfg.task);
  if (cfg.task === 'accounts') {
    const tpl = cfg.templates.find((t) => t.name === cfg.template);
    return (
      <Section title="Action template" sub="A reusable set of cleanup rules applied to inactive accounts">
        <div className="protect-tplrow">
          <SelectField label="Select action template" value={cfg.template} options={[{ value: '', label: 'No cleanup actions' }, ...cfg.templates.map((t) => ({ value: t.name, label: t.name }))]}
            onChange={(v) => up({ template: v })} />
          <IconButton icon="plus" label="New action template" bordered onClick={() => setDlg({ initial: null })} />
          <IconButton icon="edit" label="Edit action template" bordered disabled={!tpl} onClick={() => tpl && setDlg({ initial: tpl })} />
          <IconButton icon="trash" label="Delete action template" bordered danger disabled={!tpl} onClick={() => {
            if (!tpl) return; const prevT = cfg.templates; const prevSel = cfg.template;
            up({ templates: cfg.templates.filter((t) => t.name !== tpl.name), template: '' });
            setMsg({ tone: 'info', text: `Action template “${tpl.name}” deleted.`, undo: () => up({ templates: prevT, template: prevSel }) });
          }} />
        </div>
        {tpl ? (
          <div className="protect-active">
            <span className="fld__lbl">Active configuration</span>
            <div className="row row--wrap">{tplSummary(tpl).map((c) => <Chip key={c} tone="brand">{c}</Chip>)}</div>
            <ol className="protect-steps">{tpl.rungs.filter((r) => r.enabled).map((r) => <li key={r.key}><b>{r.days} days</b> · {r.name}{r.del && <Chip tone="bad">Destructive</Chip>}</li>)}</ol>
          </div>
        ) : <EmptyState compact icon="layers" title="No cleanup actions" message="Inactive accounts won't be changed. Click + to create an action template that defines what happens, and after how long." />}
        <TemplateDialog open={!!dlg} initial={dlg?.initial ?? null} names={cfg.templates.map((t) => t.name)} domain={cfg.domain || 'LPDE4.local'} onClose={() => setDlg(null)}
          onSave={(t, prev) => {
            const exists = prev !== null && cfg.templates.some((x) => x.name === prev);
            up({ templates: exists ? cfg.templates.map((x) => (x.name === prev ? t : x)) : [...cfg.templates, t], template: t.name });
            setDlg(null); setMsg(null);
          }} />
      </Section>
    );
  }
  if (cfg.task === 'groups') {
    return (
      <Section title="Empty group actions" sub="Applies to empty security and distribution groups">
        <p className="lf-muted protect-intro">Each enabled step runs once a group has been empty for the set number of days.</p>
        <Ladder rungs={cfg.groupRungs} onChange={(groupRungs) => { up({ groupRungs }); setMsg(null); }} unit="days empty" domain={cfg.domain || 'LPDE4.local'} noun="groups" ouMode="picker"
          picker={{ title: 'Select quarantine OU', subtitle: 'Empty groups are moved here when this step runs.', label: 'Quarantine OU' }} />
      </Section>
    );
  }
  return (
    <Section title={`${task.label} actions`} sub={task.desc}>
      <p className="lf-muted protect-intro">{task.intro}</p>
      <Ladder rungs={cfg.taskRungs} onChange={(taskRungs) => { up({ taskRungs }); setMsg(null); }} unit={task.unit} domain={cfg.domain || 'LPDE4.local'} noun="objects" ouMode="select" />
    </Section>
  );
}

/* ------------------------------------------------------------------ step 3 */
function NotifyStep({ cfg, up }: { cfg: Cfg; up: (p: Partial<Cfg>) => void }) {
  const [add, setAdd] = useState(false);
  return (
    <>
      <Section title="Sender account" sub="The email account alerts are sent from">
        <div className="protect-tplrow">
          <SelectField label="Send from" note="Required" value={cfg.sender} options={cfg.senders} help="Pick an existing account, or configure a new one with +." onChange={(v) => up({ sender: v })} />
          <IconButton icon="plus" label="Add sender account" bordered onClick={() => setAdd(true)} />
        </div>
      </Section>
      <Section title="Recipients" sub="Who receives reports and notifications">
        <ChipInput label="Recipient email addresses" values={cfg.recipients} placeholder="name@example.com — press Enter" onChange={(recipients) => up({ recipients })}
          validate={(v, all) => (!EMAIL_RE.test(v) ? `“${v}” is not a valid email address.` : all.some((x) => x.toLowerCase() === v.toLowerCase()) ? `${v} is already added.` : null)} />
        <small className="help">Press Enter or comma to add each address. Leave empty to skip email notifications.</small>
      </Section>
      <EmailAccountDialog open={add} existing={cfg.senders.map((s) => s.label)} onClose={() => setAdd(false)}
        onDone={(name) => { up({ senders: [...cfg.senders, { value: name, label: name }], sender: name }); setAdd(false); }} />
    </>
  );
}

/* ------------------------------------------------------------------ step 4 */
function ScheduleStep({ cfg, up, errs }: { cfg: Cfg; up: (p: Partial<Cfg>) => void; errs: Record<string, string> }) {
  const [dlg, setDlg] = useState<{ initial: ReportTemplate | null } | null>(null);
  const rt = cfg.reportTemplates.find((r) => r.name === cfg.reportTemplate);
  const off = !cfg.reportOn;
  return (
    <>
      <Section title="Run schedule" sub="How often the policy runs, and at what time">
        <Field label="Time" note="Required">
          <div className="row protect-time">
            <Dropdown size="sm" ariaLabel="Hour" value={cfg.hh} onChange={(v) => up({ hh: v })} options={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))} search={false} />
            <b>:</b>
            <Dropdown size="sm" ariaLabel="Minute" value={cfg.mm} onChange={(v) => up({ mm: v })} options={Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))} search={false} />
            <span className="lf-muted">24-hour · server time</span>
          </div>
        </Field>
        <Banner tone="info">Runs every day at {cfg.hh}:{cfg.mm}.</Banner>
      </Section>
      {cfg.task === 'accounts' && (
        <Section title="Daily inactive-account report" sub="Emails a list of accounts that have crossed the inactivity threshold"
          aside={<span className="row"><span className="lf-muted">Send daily report</span><Toggle label="Send daily report" checked={cfg.reportOn} onChange={(v) => up({ reportOn: v })} /></span>}>
          <fieldset className="protect-fs" disabled={off}>
            <div className="grid2">
              <NumberField label="Report accounts inactive for" suffix="days or more" value={cfg.reportDays === '' ? '' : Number(cfg.reportDays)} min={1} disabled={off} error={errs.reportDays}
                onChange={(v) => up({ reportDays: v === '' ? '' : String(v) })} />
              <Field label="Account status">
                <RadioGroup row ariaLabel="Account status" value={cfg.reportStatus} onChange={(v) => up({ reportStatus: v as TplStatus })}
                  options={[{ value: 'all', label: 'All' }, { value: 'enabled', label: 'Enabled only' }, { value: 'disabled', label: 'Disabled only' }]} />
              </Field>
            </div>
            <div className="protect-tplrow">
              <SelectField label="Report template" value={cfg.reportTemplate} options={cfg.reportTemplates.map((r) => r.name)} disabled={off} onChange={(v) => up({ reportTemplate: v })} />
              <IconButton icon="plus" label="New template" bordered disabled={off} onClick={() => setDlg({ initial: null })} />
              <IconButton icon="sliders" label="Edit columns" bordered disabled={off || !rt} onClick={() => rt && setDlg({ initial: rt })} />
            </div>
            <span className="fld__lbl">Columns in each email</span>
            <div className="row row--wrap">{(rt?.cols ?? []).map((c) => <Chip key={c}>{c}</Chip>)}</div>
          </fieldset>
        </Section>
      )}
      <ReportTemplateDialog open={!!dlg} initial={dlg?.initial ?? null} names={cfg.reportTemplates.map((r) => r.name)} onClose={() => setDlg(null)}
        onSave={(t, prev) => {
          up({ reportTemplates: prev !== null ? cfg.reportTemplates.map((r) => (r.name === prev ? t : r)) : [...cfg.reportTemplates, t], reportTemplate: t.name });
          setDlg(null);
        }} />
    </>
  );
}

/* ------------------------------------------------------------------ step 5 */
function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="protect-review">
      <div className="row"><h4>{title}</h4><span className="grow" /><button type="button" className="lf-link protect-linkbtn" aria-label={`Edit ${title}`} onClick={onEdit}>Edit</button></div>
      {children}
    </section>
  );
}
function ReviewStep({ cfg, onEdit }: { cfg: Cfg; onEdit: (i: number) => void }) {
  const task = taskOf(cfg.task); const entra = task.platform === 'entra';
  const warn = [!cfg.name.trim() && 'No policy name', !hasScope(cfg) && 'Choose a domain, domain controller or organizational unit'].filter(Boolean) as string[];
  const tpl = cfg.templates.find((t) => t.name === cfg.template);
  const steps = (rs: Rung[], unit: string) => rs.filter((r) => r.enabled).map((r, i) => <li key={r.key}><b>{i + 1}.</b> {r.name} {r.hasDays ? `after ${r.days} ${unit}` : 'every run'}</li>);
  const rt = cfg.reportTemplates.find((r) => r.name === cfg.reportTemplate);
  const sender = cfg.senders.find((s) => s.value === cfg.sender)?.label ?? cfg.sender;
  let automation: { label: string; value: ReactNode; wide?: boolean }[];
  if (cfg.task === 'accounts') {
    automation = [{ label: 'Action template', value: cfg.template || 'No cleanup actions' }];
    if (tpl) automation.push({ label: 'Applies to', value: tplSummary(tpl).slice(0, 2).join(' · ') }, { label: 'Escalation', wide: true, value: <ol className="protect-steps">{steps(tpl.rungs, 'days')}</ol> });
    else automation.push({ label: 'Audit-only', wide: true, value: <span className="protect-flag">Audit-only: inactive accounts will be reported but never modified.</span> });
  } else if (cfg.task === 'groups') {
    const q = cfg.groupRungs.find((r) => r.key === 'quarantine');
    automation = [{ label: 'Group types', value: 'Security & distribution' }];
    if (q?.enabled) automation.push({ label: 'Quarantine OU', value: <span>{q.ou}<small className="lf-muted protect-dn"> {ouPath(cfg.domain, q.ou ?? '')}</small></span> });
    automation.push(cfg.groupRungs.some((r) => r.enabled)
      ? { label: 'Actions', wide: true, value: <ol className="protect-steps">{steps(cfg.groupRungs, 'days empty')}</ol> }
      : { label: 'Actions', wide: true, value: <span className="protect-flag">No empty-group actions are enabled.</span> });
  } else {
    automation = [{ label: 'Task', value: task.label }];
    cfg.taskRungs.filter((r) => r.enabled && r.ou !== undefined).forEach((r) => automation.push({ label: r.ouLabel ?? 'Quarantine OU', value: r.ou || 'Not set' }));
    automation.push(cfg.taskRungs.some((r) => r.enabled)
      ? { label: 'Actions', wide: true, value: <ol className="protect-steps">{steps(cfg.taskRungs, task.unit ?? 'days')}</ol> }
      : { label: 'Actions', wide: true, value: <span className="protect-flag">No actions are enabled. Matches are found but nothing is reported or changed.</span> });
  }
  return (
    <>
      {warn.length ? <Banner tone="warning"><b>Needs attention</b> — {warn.join(' · ')}</Banner>
        : <Banner tone="success"><b>Ready to save</b> — All required settings are present. This policy is saved as inactive; activate it from Policy Management.</Banner>}
      <div className="grid2">
        <ReviewCard title="Policy details" onEdit={() => onEdit(0)}>
          <KeyValues items={[{ label: 'Policy name', value: cfg.name.trim() || 'Not set' }, { label: 'Description', value: cfg.desc.trim() || 'None' }]} />
        </ReviewCard>
        <ReviewCard title="Scope & targeting" onEdit={() => onEdit(0)}>
          <KeyValues items={entra
            ? [{ label: 'Cleans up', value: <Chip tone="brand">{task.label}</Chip> }, { label: 'Directory', value: 'Microsoft Entra ID' }, { label: 'Tenant', value: cfg.tenant }]
            : [{ label: 'Cleans up', value: <Chip tone="brand">{task.label}</Chip> }, { label: 'Domain', value: cfg.domain || 'Not set' },
              { label: 'Domain controllers', value: cfg.dcMode === 'all' ? 'All controllers · 1 found' : `Selected · ${cfg.dcChecked ? 1 : 0} of 1` },
              { label: 'Organizational units', value: cfg.ous.length ? `${cfg.ous.length} selected` : 'None selected' },
              ...(cfg.ous.length ? [{ label: 'In scope', wide: true, value: <div className="row row--wrap">{cfg.ous.map((o) => <Chip key={o}>{o}</Chip>)}</div> }] : [])]} />
        </ReviewCard>
        <ReviewCard title="Automation" onEdit={() => onEdit(1)}><KeyValues items={automation} /></ReviewCard>
        <ReviewCard title="Notifications" onEdit={() => onEdit(2)}>
          <KeyValues items={[{ label: 'Send from', value: sender },
            { label: 'Recipients', value: cfg.recipients.length ? <div className="row row--wrap">{cfg.recipients.map((r) => <Chip key={r}>{r}</Chip>)}</div> : 'None — email notifications off' }]} />
        </ReviewCard>
        <ReviewCard title="Schedule & Reports" onEdit={() => onEdit(3)}>
          <KeyValues items={[{ label: 'Frequency', value: 'Every day' }, { label: 'Run time', value: `${cfg.hh}:${cfg.mm} · server time` },
            ...(cfg.task === 'accounts' ? (cfg.reportOn
              ? [{ label: 'Daily report', value: 'On' }, { label: 'Threshold', value: `Inactive ${cfg.reportDays} days or more` }, { label: 'Account status', value: STATUS_LBL[cfg.reportStatus] },
                { label: 'Email template', value: cfg.reportTemplate }, { label: 'Columns', value: `${rt?.cols.length ?? 0} included` }]
              : [{ label: 'Daily report', value: 'Off — no digest is sent' }]) : [])]} />
        </ReviewCard>
      </div>
    </>
  );
}

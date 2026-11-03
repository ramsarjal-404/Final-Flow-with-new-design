/* SCR-PRO-11 … SCR-PRO-14 Permission policy wizard and DLG-PRO-18 schedule dialog. */
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Banner, Button, Checkbox, ConfirmDialog, Dropdown, Field, Icon, IconButton, Modal, PageHeader, SelectField, TextField, Toggle, useToast,
} from '../../ui';
import {
  ACTION_TYPES, CRITERIA, FILE_SERVERS, MEMBERS, WEEKDAYS, nextPermRun, pad, permStamp, scheduleText,
  type Member, type PermPolicy, type Schedule,
} from './data';
import { protectStore, savePerm } from './store';
import { TreeTable, type TreeNode } from './kit';

const STEPS = ['Create policy', 'Add Share Location', 'Add Schedule'];
type MNode = TreeNode & Member & { children?: MNode[] };
const TREE: MNode[] = (() => {
  const by = (parent?: string): MNode[] => MEMBERS.filter((m) => m.parent === parent).map((m) => ({ ...m, children: by(m.id).length ? by(m.id) : undefined }));
  return by(undefined);
})();
const NON_LEAD = MEMBERS.filter((m) => m.kind !== 'lead').map((m) => m.id);
const ALL_SHARES = FILE_SERVERS.flatMap((s) => s.shares.map((x) => x.id));
const preselect = (c: string) => MEMBERS.filter((m) => (c === 'hierarchy' ? m.kind !== 'lead' : c === 'managers' ? m.kind === 'team' : m.kind === 'member')).map((m) => m.id);

/** Seed policies carry no member/share/schedule detail: rebuild plausible values so Edit opens prefilled. */
function fromPolicy(p: PermPolicy) {
  let schedule = p.schedule ?? null;
  if (schedule === null && p.scheduled !== 'Not scheduled') {
    const m = /(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d)/.exec(p.scheduled);
    if (m) { const d = new Date(+m[3], +m[2] - 1, +m[1]); schedule = { kind: 'weekly', days: [WEEKDAYS[(d.getDay() + 6) % 7]], h: m[4], m: m[5], s: '00' }; }
  }
  return {
    name: p.name, desc: p.desc === 'N/A' ? '' : p.desc, criteria: p.criteria ?? 'hierarchy', period: p.period ?? '30', actionType: p.ptype,
    members: p.members ?? NON_LEAD, shares: p.shares ?? ALL_SHARES, schedule, execute: p.executePolicy ?? true, email: p.emailNotify ?? true,
  };
}

/* DLG-PRO-18 */
function ScheduleDialog({ kind, initial, onClose, onDone }: { kind: 'weekly' | 'monthly' | null; initial: Schedule | null; onClose: () => void; onDone: (s: Schedule) => void }) {
  const same = initial && initial.kind === kind;
  const [days, setDays] = useState<(string | number)[]>(same ? initial!.days : []);
  const [h, setH] = useState(same ? initial!.h : '12'); const [m, setM] = useState(same ? initial!.m : '30'); const [s, setS] = useState(same ? initial!.s : '00');
  if (!kind) return null;
  const opts = kind === 'weekly' ? WEEKDAYS : Array.from({ length: 31 }, (_, i) => i + 1);
  const toggle = (d: string | number) => setDays((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]));
  const sel = (label: string, v: string, set: (x: string) => void, n: number) => (
    <Dropdown size="sm" ariaLabel={label} value={v} onChange={set} options={Array.from({ length: n }, (_, i) => pad(i))} search={false} />
  );
  return (
    <Modal open onClose={onClose} size="sm" icon="calendar" title={kind === 'weekly' ? 'Weekly Schedule' : 'Monthly Schedule'}
      subtitle={kind === 'weekly' ? 'Pick the weekdays the policy runs on.' : 'Pick the days of the month the policy runs on.'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!days.length} onClick={() => onDone({ kind, days, h, m, s })}>Done</Button></>}>
      <Field label={kind === 'weekly' ? 'Days of the week' : 'Days of the month'}>
        <div className={'protect-days' + (kind === 'monthly' ? ' protect-days--month' : '')} role="group" aria-label="Days">
          {opts.map((d) => (
            <button key={d} type="button" className="protect-day" aria-pressed={days.includes(d)} aria-label={String(d)} onClick={() => toggle(d)}>
              {typeof d === 'string' ? d.slice(0, 3) : d}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Start At"><div className="row protect-time">{sel('Hour', h, setH, 24)}<b>:</b>{sel('Minute', m, setM, 60)}<b>:</b>{sel('Second', s, setS, 60)}</div></Field>
    </Modal>
  );
}

export default function PermissionWizard() {
  const nav = useNavigate(); const toast = useToast(); const loc = useLocation();
  const [sp] = useSearchParams();
  const editing = useMemo(() => protectStore.get().perm.find((p) => p.id === sp.get('edit')), [sp]);
  const team = (loc.state as { from?: string; manager?: string } | null)?.from === 'team' ? (loc.state as { manager: string }).manager : null;
  const init = useMemo(() => editing ? fromPolicy(editing) : {
    name: team ? `Apply Least Privilege — ${team}` : '', desc: '', criteria: '', period: '', actionType: ACTION_TYPES[0],
    members: [] as string[], shares: [] as string[], schedule: null as Schedule | null, execute: true, email: true,
  }, [editing, team]);
  const [f, setF] = useState(init);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(editing ? 2 : 0);
  const [tried, setTried] = useState<boolean[]>([false, false, false]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['m0', 'm1']));
  const [server, setServer] = useState('all');
  const [open, setOpen] = useState<Set<string>>(new Set([FILE_SERVERS[0].id]));
  const [dlg, setDlg] = useState<'weekly' | 'monthly' | null>(null);
  const [pageRows, setPageRows] = useState<MNode[]>([]);
  const [leaving, setLeaving] = useState(false);
  const up = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  const errors = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!f.name.trim()) e.name = 'Policy name is required.';
      if (!f.criteria) e.criteria = 'Select a criteria.';
      if (!(Number(f.period) >= 1)) e.period = 'Enter at least 1 day.';
      if (!f.members.length) e.members = 'Select at least one member.';
    }
    if (s === 1 && !f.shares.length) e.shares = 'Select at least one share to include.';
    if (s === 2 && f.execute && !f.schedule) e.schedule = 'Add a weekly or monthly schedule.';
    return e;
  };
  const err = tried[step] ? errors(step) : {};
  const go = (i: number) => { setStep(i); setReached((r) => Math.max(r, i)); document.querySelector('.main')?.scrollTo({ top: 0 }); };
  const next = () => {
    setTried((t) => t.map((x, i) => (i === step ? true : x)));
    if (Object.keys(errors(step)).length) return;
    if (step < 2) { go(step + 1); return; }
    const base: PermPolicy = {
      id: editing?.id ?? '', name: f.name.trim(), desc: f.desc.trim() || 'N/A', ptype: f.actionType, status: 'automationQueue', active: true, updated: permStamp(),
      scheduled: f.execute ? nextPermRun(f.schedule) : 'Not scheduled', criteria: f.criteria, period: f.period, members: f.members, shares: f.shares,
      schedule: f.schedule, executePolicy: f.execute, emailNotify: f.email,
    };
    const id = savePerm(base);
    toast(editing ? { variant: 'success', title: 'Policy updated', message: `“${base.name}” was updated.` } : { variant: 'success', title: 'Policy created', message: `“${base.name}” was created.` });
    nav(`/protect/policies?tab=permission&perm=${id}`);
  };
  const dirty = JSON.stringify(f) !== JSON.stringify(init);
  const back = () => { if (step > 0) { go(step - 1); return; } if (dirty) setLeaving(true); else nav('/protect/policies?tab=permission'); };

  /* members */
  const toggleMember = (m: MNode, on: boolean) => {
    const ids = [m.id, ...(m.children ?? []).map((c) => c.id)];
    up({ members: on ? Array.from(new Set([...f.members, ...ids])) : f.members.filter((x) => !ids.includes(x)) });
  };
  const pageSel = pageRows.filter((r) => r.kind !== 'lead').map((r) => r.id);
  const allOn = pageSel.length > 0 && pageSel.every((id) => f.members.includes(id)); const someOn = pageSel.some((id) => f.members.includes(id));

  /* shares */
  const servers = server === 'all' ? FILE_SERVERS : FILE_SERVERS.filter((s) => s.id === server);
  const listed = servers.flatMap((s) => s.shares.map((x) => x.id));
  const sAll = listed.length > 0 && listed.every((id) => f.shares.includes(id)); const sSome = listed.some((id) => f.shares.includes(id));
  const setShares = (ids: string[], on: boolean) => up({ shares: on ? Array.from(new Set([...f.shares, ...ids])) : f.shares.filter((x) => !ids.includes(x)) });

  const primary = step < 2 ? 'Next' : (f.schedule || !f.execute) ? 'Done' : 'Next';
  return (
    <div className="sub">
      <PageHeader crumbs={[{ label: 'Dashboard', to: '/protect' }, { label: 'Policy Management', to: '/protect/policies?tab=permission' }, { label: STEPS[step] }]}
        eyebrow={`Step ${step + 1} of 3 · ${STEPS[step]}`} title={editing ? 'Edit Policy' : 'Create policy'}
        description="A least-privilege or stale-user policy over chosen members and shares, with a run schedule." />
      <ol className="steps steps--page protect-rail" aria-label="Create policy steps">
        {STEPS.map((s, i) => (
          <li key={s} style={{ display: 'contents' }}>
            {i > 0 && <span className="steps__line" style={{ background: i <= step ? 'var(--ink)' : 'var(--border)' }} aria-hidden="true" />}
            <button type="button" className={'steps__item' + (i < step ? ' steps__item--done' : '')} aria-current={i === step ? 'step' : undefined} disabled={i > reached} onClick={() => setStep(i)}>
              <span className="steps__n">{i < step ? <Icon name="check" size={12} /> : i + 1}</span><span>{s}</span>
            </button>
          </li>
        ))}
      </ol>
      <section className="lf-card wiz-card page-form">
        <div className="wiz-card__body">
          <header className="protect-stage"><h3>{step === 0 && editing ? 'Edit Policy' : STEPS[step]}</h3></header>
          {step === 0 && (
            <>
              <div className="grid2">
                <TextField label="Policy name" placeholder="Type text" value={f.name} error={err.name} onChange={(v) => up({ name: v })} />
                <TextField label="Policy description" placeholder="Type text" value={f.desc} onChange={(v) => up({ desc: v })} />
                <SelectField label="Criteria" placeholder="Select" value={f.criteria} options={CRITERIA} error={err.criteria}
                  onChange={(v) => up({ criteria: v, members: v ? preselect(v) : f.members })} />
                <Field label="Period of action" error={err.period}>
                  <div className="protect-suffix"><input inputMode="numeric" aria-label="Period of Action in days" value={f.period} aria-invalid={!!err.period || undefined}
                    onChange={(e) => up({ period: e.target.value.replace(/\D/g, '').slice(0, 4) })} /><span>Days</span></div>
                </Field>
                <SelectField label="Action Type:" value={f.actionType} options={ACTION_TYPES} onChange={(v) => up({ actionType: v })} />
              </div>
              {err.members && <Banner tone="error">{err.members}</Banner>}
              <TreeTable<MNode> root={TREE} expanded={expanded} nameKey="name" ariaLabel="Members" onVisibleChange={setPageRows}
                onToggle={(id) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                rootRowClass={(r) => (r.kind === 'lead' ? 'protect-leadrow' : undefined)}
                columns={[
                  { key: 'name', header: 'Members name', sortable: true, filterable: true,
                    lead: <span className="protect-thcheck"><Checkbox ariaLabel="Select all members" checked={allOn} indeterminate={someOn && !allOn} disabled={!pageSel.length}
                      onChange={() => up({ members: allOn ? f.members.filter((x) => !pageSel.includes(x)) : Array.from(new Set([...f.members, ...pageSel])) })} /></span>,
                    render: (r) => (
                      <span className="protect-person">
                        {r.kind !== 'lead' && <Checkbox ariaLabel={`Select ${r.name}`} checked={f.members.includes(r.id)} onChange={(v) => toggleMember(r, v)} />}
                        <span className={'protect-kind protect-kind--' + r.kind} aria-hidden="true"><Icon name={r.kind === 'member' ? 'user' : 'users'} size={13} /></span>
                        <b>{r.name}</b>
                      </span>
                    ) },
                  { key: 'title', header: 'Job title', sortable: true, filterable: true },
                  { key: 'email', header: 'Email ID', sortable: true, filterable: true },
                ]} />
            </>
          )}
          {step === 1 && (
            <>
              <SelectField label="File Server" value={server} options={[{ value: 'all', label: 'All servers' }, ...FILE_SERVERS.map((s) => ({ value: s.id, label: s.name }))]}
                help="Note: This server list is based on currently permission-scanned servers." onChange={setServer} />
              <div className="protect-shares">
                <p className="lf-muted">You can include any shares by checking the box</p>
                <Checkbox label="Select all" checked={sAll} indeterminate={sSome && !sAll} onChange={() => setShares(listed, !sAll)} />
                <ul>
                  {servers.map((s) => {
                    const ids = s.shares.map((x) => x.id); const on = ids.every((id) => f.shares.includes(id)); const some = ids.some((id) => f.shares.includes(id));
                    const isOpen = open.has(s.id);
                    return (
                      <li key={s.id}>
                        <div className="protect-shares__srv">
                          <button type="button" className="tree-toggle" aria-expanded={isOpen} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${s.name}`}
                            onClick={() => setOpen((x) => { const n = new Set(x); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}><Icon name="chevron-right" /></button>
                          <Checkbox ariaLabel={`Select all shares on ${s.name}`} checked={on} indeterminate={some && !on} onChange={() => setShares(ids, !on)}
                            label={<span className="protect-person"><Icon name="server" size={14} /><b>{s.name}</b></span>} />
                        </div>
                        {isOpen && <ul className="protect-shares__list">{s.shares.map((x) => (
                          <li key={x.id}><Checkbox ariaLabel={`Include ${x.name}`} checked={f.shares.includes(x.id)} onChange={(v) => setShares([x.id], v)}
                            label={<span className="protect-person"><Icon name="folder" size={14} />{x.name}</span>} /></li>
                        ))}</ul>}
                      </li>
                    );
                  })}
                </ul>
              </div>
              {err.shares && <Banner tone="error">{err.shares}</Banner>}
            </>
          )}
          {step === 2 && (
            <>
              <Checkbox label="Execute policy" checked={f.execute} onChange={(v) => up({ execute: v })} />
              <Field label="Schedule time">
                <div className="row">
                  <Button icon="calendar" disabled={!f.execute} aria-pressed={f.schedule?.kind === 'weekly'} className={f.schedule?.kind === 'weekly' ? 'protect-on' : undefined} onClick={() => setDlg('weekly')}>Weekly</Button>
                  <Button icon="calendar" disabled={!f.execute} aria-pressed={f.schedule?.kind === 'monthly'} className={f.schedule?.kind === 'monthly' ? 'protect-on' : undefined} onClick={() => setDlg('monthly')}>Monthly</Button>
                </div>
              </Field>
              <Field label="Scan schedule status">
                <div className="row protect-schedstat" aria-live="polite">
                  {f.schedule ? <><span>{scheduleText(f.schedule)}</span><IconButton icon="trash" label="Remove schedule" danger onClick={() => up({ schedule: null })} /></>
                    : <span className="lf-muted">No schedule set.</span>}
                </div>
              </Field>
              <div className="setrow"><div className="setrow__text"><b>Email Notification</b><span>Email the policy owner when a run completes.</span></div>
                <div className="row"><Toggle label="Email notification" checked={f.email} onChange={(v) => up({ email: v })} /></div></div>
              {err.schedule && <Banner tone="error">{err.schedule}</Banner>}
            </>
          )}
        </div>
        <footer className="wiz-card__foot">
          <Button icon="chevron-left" onClick={back}>Back</Button>
          <span className="spacer" />
          <Button onClick={() => (dirty ? setLeaving(true) : nav('/protect/policies?tab=permission'))}>Cancel</Button>
          <Button variant="primary" iconEnd={primary === 'Next' ? 'arrow' : undefined} icon={primary === 'Done' ? 'check' : undefined} onClick={next}>{primary}</Button>
        </footer>
      </section>
      {dlg && <ScheduleDialog key={dlg} kind={dlg} initial={f.schedule} onClose={() => setDlg(null)} onDone={(s) => { up({ schedule: s }); setDlg(null); }} />}
      <ConfirmDialog open={leaving} onClose={() => setLeaving(false)} title="Discard this policy?" icon="alert" message="The details you entered will not be saved."
        confirmLabel="Discard changes" onConfirm={() => nav('/protect/policies?tab=permission')} />
    </div>
  );
}

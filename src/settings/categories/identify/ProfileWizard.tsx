import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Checkbox, ConfirmDialog, Dropdown, Field, Icon, IconButton, Menu, useToast,
} from '../../../ui';
import {
  CLASSIFICATION_SERVERS, FILE_TYPES, describeSchedule, idfStore, newId, saveProfile, stamp,
} from './store';
import type { FileCriteria, IdfSource, Profile, Schedule, Template } from './store';
import { ENUMERATED, ProfileSettingsStep, validateSettings } from './ObjectStep';
import type { Errs } from './ObjectStep';
import { AddFileTypeDialog, ScheduleDialog, SqlFields, sqlErrors } from './Dialogs';
import { InstallAgentDialog } from './Agents';
import { Console, PickDrop } from './shared';

/* DLG-SDS-52 · Profile wizard, drawn as a full-page wizard (04 § 10) in place of the profile list. */

type StepId = 'settings' | 'template' | 'filetype' | 'sql' | 'classification';
const STEP_LABEL: Record<StepId, string> = {
  settings: 'Profile Settings', template: 'Template', filetype: 'File Type', sql: 'SQL Server Settings', classification: 'Classification',
};

export function blankProfile(source: IdfSource): Profile {
  return {
    id: '', sourceId: source.id, name: '', description: '', conn: {}, objects: [], templateIds: [],
    fileCriteria: 'All', extensions: [], ocr: false, sizeOp: 'Less Than or Equal', sizeValue: '20', sizeUnit: 'MB',
    sql: { server: '', auth: 'windows', user: '', password: '', dbMode: 'select', db: '0365' },
    onTheFly: false, classifyNow: false, scheduled: false, schedule: null, classificationServer: '192.168.30.210',
    progress: 0, status: 'Running', agentCommunication: 'Success', lastStart: '—', lastEnd: '—',
  };
}

export function ProfileWizard({ source, initial, onClose }: { source: IdfSource; initial: Profile | null; onClose: () => void }) {
  const toast = useToast();
  const nav = useNavigate();
  const edit = !!initial;
  const st = idfStore.use();
  const steps: StepId[] = source.sql ? ['settings', 'template', 'filetype', 'sql', 'classification'] : ['settings', 'template', 'filetype', 'classification'];
  const [d, setD] = useState<Profile>(() => (initial ? JSON.parse(JSON.stringify(initial)) as Profile : blankProfile(source)));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errs>({});
  const [enumerated, setEnumerated] = useState(edit && !!ENUMERATED[source.kind]);
  const [tested, setTested] = useState(edit);
  const [checkedTpl, setCheckedTpl] = useState<string[]>([]);
  const [customExt, setCustomExt] = useState<string[]>(() => (initial?.extensions ?? []).filter((e) => !FILE_TYPES.includes(e)));
  const [marked, setMarked] = useState<string[]>([]);
  const [addExt, setAddExt] = useState(false);
  const [sched, setSched] = useState<'weekly' | 'monthly' | null>(null);
  const [agentDlg, setAgentDlg] = useState(false);
  const [confirm, setConfirm] = useState<null | 'leave' | 'discard'>(null);

  const patch = (p: Partial<Profile>) => {
    setD((x) => ({ ...x, ...p }));
    setErrors((e) => {
      const n = { ...e };
      Object.keys(p).forEach((k) => { delete n[k]; if (k === 'conn') Object.keys(n).filter((x) => x.startsWith('conn.')).forEach((x) => { if ((p.conn ?? {})[x.slice(5)]) delete n[x]; }); });
      if (p.sql) { delete n.server; delete n.user; delete n.password; delete n.db; delete n.test; }
      if (p.schedule || p.scheduled !== undefined) delete n.schedule;
      if (p.onTheFly !== undefined || p.classifyNow !== undefined || p.scheduled !== undefined) delete n.methods;
      if (p.extensions || p.fileCriteria) delete n.extensions;
      if (p.sizeValue !== undefined) delete n.size;
      if (p.templateIds) delete n.templates;
      return n;
    });
  };

  const validate = (id: StepId): [string, string][] => {
    switch (id) {
      case 'settings': return validateSettings(source, d, st.profiles);
      case 'template': return d.templateIds.length ? [] : [['templates', 'Drag at least one template into the box on the right.']];
      case 'filetype': {
        const out: [string, string][] = [];
        if (d.fileCriteria !== 'All' && d.extensions.length === 0) out.push(['extensions', `Check at least one file type to ${d.fileCriteria.toLowerCase()}.`]);
        if (!/^\d+$/.test(d.sizeValue.trim()) || Number(d.sizeValue) <= 0) out.push(['size', 'Enter a whole number greater than 0 for the file size limit.']);
        return out;
      }
      case 'sql': return sqlErrors(d.sql, tested);
      case 'classification': {
        const out: [string, string][] = [];
        if (!d.onTheFly && !d.classifyNow && !d.scheduled) out.push(['methods', 'Choose at least one classification method.']);
        if (d.scheduled && !d.schedule) out.push(['schedule', 'Set up the Weekly or Monthly schedule.']);
        if (!d.classificationServer) out.push(['classificationServer', 'Select the classification server.']);
        return out;
      }
    }
  };
  const fail = (i: number, list: [string, string][]) => {
    setStep(i);
    setErrors(Object.fromEntries(list));
    toast({ variant: 'error', title: 'Check the highlighted fields', message: list[0][1] });
  };
  /** Forward moves validate every step being left, in order, and stop on the first failure. */
  const goTo = (target: number) => {
    if (target <= step || edit) { setErrors({}); setStep(target); return; }
    for (let i = step; i < target; i++) { const l = validate(steps[i]); if (l.length) { fail(i, l); return; } }
    setErrors({}); setStep(target);
  };
  const next = () => {
    const l = validate(steps[step]);
    if (l.length) { fail(step, l); return; }
    setErrors({}); setStep(step + 1);
  };
  const done = () => {
    for (let i = 0; i < steps.length; i++) { const l = validate(steps[i]); if (l.length) { fail(i, l); return; } }
    const p: Profile = { ...d, name: d.name.trim() };
    if (edit) {
      saveProfile(p);
      toast({ variant: 'success', title: 'Profile updated', message: `${p.name} was saved.` });
    } else {
      saveProfile({ ...p, id: newId('pr'), progress: 0, status: 'Running', lastStart: stamp(), lastEnd: '—', agentCommunication: 'Success' });
      toast({ variant: 'success', title: 'Profile created', message: `${p.name} is now classifying.` });
    }
    onClose();
  };
  const dirty = edit || !!d.name.trim() || d.objects.length > 0 || d.templateIds.length > 0;
  const cancel = () => (dirty ? setConfirm('discard') : onClose());

  const tplRows = st.templates;
  const tagName = (id: string) => st.tags.find((t) => t.id === id)?.name;
  const servers = useMemo(() => Array.from(new Set([...CLASSIFICATION_SERVERS, ...st.agents.map((a) => a.server)])), [st.agents]);
  const last = step === steps.length - 1;
  const cur = steps[step];
  const allExt = [...FILE_TYPES, ...customExt];

  return (
    <Console source={source} rail={false} title={edit ? 'Edit Profile' : 'Create profile'} subtitle={`Step ${step + 1} of ${steps.length} · ${STEP_LABEL[cur]}`}
      crumbs={[{ label: 'Profile list', onClick: cancel }, { label: edit ? 'Edit Profile' : 'Create profile' }]}
      actions={<Button variant="ghost" icon="chevron-left" onClick={cancel}>Back to profile list</Button>}>
      <div className="identify-wizard">
        <nav className="lf-card identify-wsteps" aria-label="Profile wizard steps">
          <ol>
            {steps.map((s, i) => (
              <li key={s}>
                <button type="button" aria-current={i === step ? 'step' : undefined} className={i < step ? 'is-done' : undefined} onClick={() => goTo(i)}>
                  <span className="identify-wsteps__n">{i < step ? <Icon name="check" size={12} /> : i + 1}</span>{STEP_LABEL[s]}
                </button>
              </li>
            ))}
          </ol>
          <p className="identify-dots" aria-hidden="true">
            {steps.map((s, i) => <span key={s} className={i <= step ? 'on' : ''} />)}<b>{step + 1} of {steps.length}</b>
          </p>
        </nav>
        <section className="lf-card wiz-card page-form">
          <div className="wiz-card__body">
            {cur === 'settings' && <ProfileSettingsStep source={source} draft={d} patch={patch} errors={errors} enumerated={enumerated} setEnumerated={setEnumerated} />}

            {cur === 'template' && (
              <>
                <div className="row row--between row--wrap">
                  <h3 className="identify-step-h">Select Templates</h3>
                  <div className="row">
                    <IconButton icon="refresh" label="Refresh" bordered onClick={() => setCheckedTpl([])} />
                    <Button variant="danger" icon="trash" disabled={d.templateIds.length === 0} onClick={() => patch({ templateIds: [] })}>Delete all</Button>
                    <Button icon="plus" onClick={() => setConfirm('leave')}>Create templates</Button>
                  </div>
                </div>
                <PickDrop<Template> rows={tplRows} rowKey={(t) => t.id} rowName={(t) => t.name} noun="templates" container="profile"
                  leftTitle="Templates" rightTitle="Selected Templates" dropText="Drag and Drop the tag name to create template"
                  checked={checkedTpl} onChecked={setCheckedTpl} chosen={d.templateIds} onChosen={(ids) => patch({ templateIds: ids })}
                  left={[
                    { key: 'name', header: 'Template', value: (t) => t.name },
                    { key: 'kind', header: 'Type', value: (t) => t.kind },
                    { key: 'description', header: 'Description', value: (t) => t.description },
                    { key: 'tags', header: 'Tags', value: (t) => t.tagIds.map(tagName).filter(Boolean).join(', ') },
                  ]}
                  right={[
                    { key: 'name', header: 'Template', value: (t) => t.name },
                    { key: 'kind', header: 'Type', value: (t) => t.kind },
                    { key: 'description', header: 'Description', value: (t) => t.description },
                  ]} />
                {errors.templates && <small className="fld__err" role="alert">{errors.templates}</small>}
              </>
            )}

            {cur === 'filetype' && (
              <>
                <h3 className="identify-step-h">Select file types to be included for classification</h3>
                <div className="row row--wrap">
                  <Menu label="File criteria" align="left" items={(['All', 'Include', 'Exclude'] as FileCriteria[]).map((c) => ({
                    label: c, selected: d.fileCriteria === c,
                    onSelect: () => { patch(c === 'All' ? { fileCriteria: c, extensions: [] } : { fileCriteria: c }); if (c === 'All') setMarked([]); },
                  }))}
                    trigger={(p) => <Button iconEnd="chevron" {...p}>File Criteria: {d.fileCriteria}</Button>} />
                  <IconButton icon="plus" label="Add file type" bordered disabled={d.fileCriteria === 'All'} onClick={() => setAddExt(true)} />
                  <IconButton icon="x" label="Remove checked custom file types" bordered disabled={d.fileCriteria === 'All' || marked.length === 0}
                    onClick={() => {
                      setCustomExt((c) => c.filter((x) => !marked.includes(x)));
                      patch({ extensions: d.extensions.filter((x) => !marked.includes(x)) });
                      setMarked([]);
                    }} />
                  <span className="grow" />
                  <Checkbox label="Enable OCR" checked={d.ocr} onChange={(v) => patch({ ocr: v })} />
                </div>
                <div className={'identify-ftbox' + (errors.extensions ? ' is-bad' : '')}>
                  <div className="identify-ftbox__head">
                    <Checkbox label="File Type" disabled={d.fileCriteria === 'All'}
                      checked={d.fileCriteria !== 'All' && allExt.every((e) => d.extensions.includes(e))}
                      indeterminate={d.extensions.length > 0}
                      onChange={(v) => patch({ extensions: v ? [...allExt] : [] })} />
                  </div>
                  {d.fileCriteria === 'All' ? (
                    <p className="identify-ftbox__msg">All file types are classified. Choose Include or Exclude to pick file types.</p>
                  ) : (
                    <div className="identify-ftgrid">
                      {allExt.map((e) => {
                        const custom = customExt.includes(e);
                        return (
                          <div key={e} className="identify-ft">
                            <Checkbox label={e} checked={d.extensions.includes(e)}
                              onChange={(v) => patch({ extensions: v ? [...d.extensions, e] : d.extensions.filter((x) => x !== e) })} />
                            {custom && <Checkbox label="custom" ariaLabel={`Mark ${e} for removal`} checked={marked.includes(e)}
                              onChange={(v) => setMarked((m) => (v ? [...m, e] : m.filter((x) => x !== e)))} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {errors.extensions && <small className="fld__err" role="alert">{errors.extensions}</small>}
                <Field label="File size limit" error={errors.size}>
                  <div className="identify-size">
                    <Dropdown ariaLabel="Size condition" value={d.sizeOp} onChange={(v) => patch({ sizeOp: v })} options={['Less Than or Equal', 'Greater Than or Equal']} />
                    <input aria-label="File size" inputMode="numeric" maxLength={6} value={d.sizeValue} aria-invalid={!!errors.size || undefined}
                      onChange={(e) => patch({ sizeValue: e.target.value })} />
                    <Dropdown ariaLabel="Size unit" value={d.sizeUnit} onChange={(v) => patch({ sizeUnit: v })} options={['KB', 'MB', 'GB']} />
                  </div>
                </Field>
              </>
            )}

            {cur === 'sql' && (
              <>
                <h3 className="identify-step-h">Enter SQL details to restore the data</h3>
                <div className="form-col">
                  <SqlFields value={d.sql} onChange={(v) => patch({ sql: v })} tested={tested} setTested={setTested}
                    errors={{ server: errors.server, user: errors.user, password: errors.password, test: errors.test, db: errors.db }} />
                </div>
              </>
            )}

            {cur === 'classification' && (
              <>
                <h3 className="identify-step-h">Select the Classification method and server</h3>
                <div className={'stack stack--sm' + (errors.methods ? ' identify-bad-group' : '')}>
                  <Checkbox label="On the fly Classification" checked={d.onTheFly} onChange={(v) => patch({ onTheFly: v })} />
                  <Checkbox label="Classify now" checked={d.classifyNow} onChange={(v) => patch({ classifyNow: v })} />
                  <div className="row row--wrap">
                    <Checkbox label="Classification schedule" checked={d.scheduled} onChange={(v) => patch({ scheduled: v })} />
                    {(['weekly', 'monthly'] as const).map((k) => (
                      <button key={k} type="button" className="identify-chip" disabled={!d.scheduled} aria-pressed={d.schedule?.kind === k} onClick={() => setSched(k)}>
                        {k === 'weekly' ? 'Weekly' : 'Monthly'}
                      </button>
                    ))}
                  </div>
                  {errors.methods && <small className="fld__err" role="alert">{errors.methods}</small>}
                </div>
                <div className={'identify-summary' + (errors.schedule ? ' is-bad' : '')} role="status" aria-label="Schedule summary">
                  {d.scheduled ? (d.schedule ? describeSchedule(d.schedule) : 'Choose Weekly or Monthly to set the schedule.') : 'Check Classification Schedule to run classification on a schedule.'}
                </div>
                {errors.schedule && <small className="fld__err" role="alert">{errors.schedule}</small>}
                <div className="identify-inline form-col">
                  <Field label="Classification Server :" error={errors.classificationServer} className="grow">
                    <Dropdown ariaLabel="Classification server" placeholder="Select" clearable value={d.classificationServer}
                      onChange={(v) => patch({ classificationServer: v })} options={servers} />
                  </Field>
                  <Button icon="plus" onClick={() => setAgentDlg(true)}>Add agent</Button>
                </div>
              </>
            )}
          </div>
          <footer className="wiz-card__foot">
            {step > 0 && <Button icon="chevron-left" onClick={() => { setErrors({}); setStep(step - 1); }}>Back</Button>}
            <span className="spacer" />
            <Button onClick={cancel}>Cancel</Button>
            {edit && !last && <Button onClick={done}>Done</Button>}
            {last ? <Button variant="primary" onClick={done}>Done</Button> : <Button variant="primary" iconEnd="arrow" onClick={next}>Next</Button>}
          </footer>
        </section>
      </div>

      <AddFileTypeDialog open={addExt} onClose={() => setAddExt(false)} existing={allExt}
        onAdd={(ext) => {
          setCustomExt((c) => [...c, ext]); patch({ extensions: [...d.extensions, ext] }); setAddExt(false);
          toast({ variant: 'success', title: 'File type added', message: `${ext} is included.` });
        }} />
      <ScheduleDialog open={!!sched} kind={sched ?? 'weekly'} initial={d.schedule} onClose={() => setSched(null)}
        onDone={(s: Schedule) => { patch({ schedule: s }); setSched(null); }} />
      <InstallAgentDialog open={agentDlg} onClose={() => setAgentDlg(false)} onInstalled={(ips) => patch({ classificationServer: ips[ips.length - 1] })} />
      <ConfirmDialog open={confirm === 'leave'} onClose={() => setConfirm(null)} destructive={false} icon="info"
        title="Leave the profile wizard?" message="Creating a template opens the Templates page. This unsaved profile will be discarded."
        confirmLabel="Create template" onConfirm={() => { setConfirm(null); onClose(); nav(`/settings/identify/${source.id}/templates/new`); }} />
      <ConfirmDialog open={confirm === 'discard'} onClose={() => setConfirm(null)}
        title={edit ? 'Discard changes?' : 'Discard this profile?'}
        message={edit ? `Changes to ${initial!.name} will not be saved.` : 'The profile you started will not be created.'}
        confirmLabel="Discard" onConfirm={() => { setConfirm(null); onClose(); }} />
    </Console>
  );
}

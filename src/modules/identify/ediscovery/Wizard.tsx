import { useEffect, useMemo, useState } from 'react';
import {
  Button, Calendar, Checkbox, Chip, Icon, IconButton, MultiSelect, NumberField, PasswordField, RadioGroup, SelectField, TextField, useToast,
} from '../../../ui';
import { COMPONENTS, FILE_TYPES, edStore, newId, stamp } from './store';
import type { Case, Location, Operator, ScanSettings, SourcePath } from './store';
import { DOMAIN_USER, DOMAIN_USER_HINT, EXT, HOST, NAME, UNC, WIZARD_DATE } from './rules';
import { EdModal, KeyChips, MiniTable } from './parts';

/* DLG-IDN-05 Create New Case wizard and DLG-IDN-13 Create New Location wizard (location mode),
   with DLG-IDN-06 Add UNC Path, DLG-IDN-07 Add File Server and DLG-IDN-08 Date / time picker.

   Intended behaviour built for: GAP-IDN-08 (one domain\user hint), GAP-IDN-13 (labels name the
   object: "Case Name" / "Location Name"), GAP-IDN-16 (collected values kept), GAP-IDN-17 (every
   source path kept on the location), GAP-IDN-18 ("Re Index" not offered on creation). */

type Mode = 'case' | 'location';
export type WizardResult = { kind: 'case'; value: Case } | { kind: 'location'; value: Location };

type Form = {
  name: string; description: string; component: string; searchType: 'Index' | 'Non-Index'; locations: string[];
  user: string; password: string; sources: SourcePath[];
  fileCriteria: 'All' | 'Include' | 'Exclude'; ocr: boolean; fileTypes: string[]; customTypes: string[]; typeSearch: string;
  modifiedOn: boolean; modified: string; size: string; unit: 'MB' | 'KB';
  keyword: string; keywords: string[]; operator: Operator;
  schedule: 'now' | 'none' | 'later'; laterAt: string; host: 'local' | 'agent'; agentServer: string; validated: string | null; threads: number | '';
};
const fresh = (): Form => ({
  name: '', description: '', component: COMPONENTS[0], searchType: 'Index', locations: [],
  user: '', password: '', sources: [],
  fileCriteria: 'All', ocr: false, fileTypes: [], customTypes: [], typeSearch: '',
  modifiedOn: false, modified: '', size: '80', unit: 'MB',
  keyword: '', keywords: [], operator: '',
  schedule: 'now', laterAt: '', host: 'local', agentServer: '', validated: null, threads: 20,
});
type Fail = { msg: string; field?: string };
const DATE_HINT = 'use “YYYY/MM/DD HH:II” format';

export function CaseWizard({ mode, open, onClose, onDone }: { mode: Mode; open: boolean; onClose: () => void; onDone: (r: WizardResult) => void }) {
  const toast = useToast();
  const { cases, locations, agents } = edStore.use();
  const [f, setF] = useState<Form>(fresh);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [tried, setTried] = useState<Set<number>>(new Set());
  const [nested, setNested] = useState<null | 'unc' | 'server' | 'modified' | 'later'>(null);

  // Opening resets every field.
  useEffect(() => { if (open) { setF(fresh()); setStep(0); setReached(0); setTried(new Set()); setNested(null); } }, [open]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const title = mode === 'case' ? 'Create New Case' : 'Create New Location';
  const noun = mode === 'case' ? 'case' : 'location';
  const fail = (message: string) => toast({ variant: 'error', title, message });
  const rail = mode === 'location' || f.searchType === 'Non-Index';
  const steps = ['Object Selection', 'File Type', mode === 'case' ? 'Search Server' : 'Index Server'];
  const allTypes = useMemo(() => [...FILE_TYPES, ...f.customTypes], [f.customTypes]);

  /* ---------- validation per step: first failure (toast) + every failing field (marks) ---------- */
  const check = (i: number): Fail[] => {
    const out: Fail[] = [];
    if (i === 0) {
      const nm = f.name.trim();
      if (!nm) out.push({ msg: `Please enter the ${noun} name.`, field: 'name' });
      else if (!NAME.test(nm)) out.push({ msg: `Use letters, numbers, spaces, dots, dashes or underscores (max 60) in the ${noun} name.` });
      else if ((mode === 'case' ? cases : locations).some((x) => x.name.toLowerCase() === nm.toLowerCase()))
        out.push({ msg: `A ${noun} named "${nm}" already exists.` });
      if (!rail) {
        if (!f.locations.length) out.push({ msg: 'Please select at least one location.' });
      } else {
        if (!DOMAIN_USER.test(f.user.trim())) out.push({ msg: 'Use the "Domain name\\User name" format for the user name.', field: 'user' });
        if (!f.password) out.push({ msg: 'Please enter the password.', field: 'password' });
        if (!f.sources.length) out.push({ msg: 'Add at least one file server or UNC path.' });
      }
    } else if (i === 1) {
      if (f.fileCriteria !== 'All' && !f.fileTypes.length) out.push({ msg: `Select at least one file type to ${f.fileCriteria === 'Include' ? 'include' : 'exclude'}.` });
      if (f.modifiedOn && !WIZARD_DATE.test(f.modified.trim())) out.push({ msg: 'Enter the last modified date in "YYYY/MM/DD HH:II" format.', field: 'modified' });
      if (!(Number(f.size) > 0)) out.push({ msg: 'Enter a file size limit greater than 0.', field: 'size' });
      if (mode === 'case') {
        if (!f.keywords.length) out.push({ msg: 'Add at least one keyword to search for.', field: 'keyword' });
        else if (f.keywords.length > 1 && !f.operator) out.push({ msg: 'Select the operator that joins the keywords.', field: 'operator' });
      }
    } else {
      if (f.schedule === 'later' && !WIZARD_DATE.test(f.laterAt.trim()))
        out.push({ msg: `Select when to ${mode === 'case' ? 'search' : 'index'} ("YYYY/MM/DD HH:II").`, field: 'laterAt' });
      if (f.host === 'agent') {
        const sv = f.agentServer.trim();
        if (!HOST.test(sv)) out.push({ msg: 'Enter the agent server name or IP address.', field: 'agentServer' });
        else if (f.validated !== sv) out.push({ msg: 'Click Validate Agent before you continue.', field: 'agentServer' });
      }
      const t = f.threads;
      if (t === '' || !Number.isInteger(t) || t < 1 || t > 64) out.push({ msg: 'Enter a thread count between 1 and 64.', field: 'threads' });
    }
    return out;
  };
  // After a failed attempt the step's failing fields stay marked (with their message) until fixed.
  const marks = new Map<string, string>();
  tried.forEach((i) => check(i).forEach((x) => x.field && !marks.has(x.field) && marks.set(x.field, x.msg)));
  const bad = (field: string) => marks.get(field) ?? null;

  const validate = (i: number) => {
    const out = check(i);
    if (out.length) { fail(out[0].msg); setTried((t) => new Set(t).add(i)); return false; }
    return true;
  };
  const goTo = (target: number) => {
    if (target <= step) { setStep(target); return; }
    for (let i = step; i < target; i++) if (!validate(i)) { setStep(i); return; }
    setStep(target); setReached((r) => Math.max(r, target));
  };

  const done = () => {
    if (!validate(rail ? 2 : 0)) return;
    if (rail) for (const i of [0, 1]) if (!validate(i)) { setStep(i); return; }
    const settings: ScanSettings = {
      component: f.component, user: f.user.trim(), fileCriteria: f.fileCriteria, fileTypes: f.fileTypes, ocr: f.ocr,
      lastModified: f.modifiedOn ? f.modified.trim() : '', sizeLimit: f.size, sizeUnit: f.unit,
      schedule: f.schedule, laterAt: f.schedule === 'later' ? f.laterAt.trim() : '', host: f.host === 'agent' ? 'Agent Server' : 'Local Host',
      threads: Number(f.threads),
    };
    const agent = f.host === 'agent' ? f.agentServer.trim() : 'localhost';
    if (mode === 'location') {
      const paths = f.sources.map((s) => (s.folder === 'All Shares' ? `\\\\${s.server}` : s.folder));
      onDone({
        kind: 'location', value: {
          id: newId('loc'), name: f.name.trim(), description: f.description.trim(), sharePath: paths.join(', '), lastIndex: 'NA',
          status: f.schedule === 'now' ? 'Starting' : f.schedule === 'later' ? 'Scheduled' : 'Not Indexed',
          scheduledAt: f.schedule === 'later' ? f.laterAt.trim() : undefined, agent, sources: f.sources, settings,
        },
      });
      return;
    }
    const base = { id: newId('case'), name: f.name.trim(), description: f.description.trim(), agentStatus: 'Success', lastEnd: '—' };
    if (!rail) {
      const first = locations.find((l) => l.name === f.locations[0]);
      onDone({
        kind: 'case', value: {
          ...base, agent: first?.agent ?? 'localhost', status: 'In Progress', lastStart: stamp(), type: 'Index',
          locations: f.locations, sources: [], keywords: [], operator: '', settings: { ...settings, component: f.component },
        },
      });
      return;
    }
    onDone({
      kind: 'case', value: {
        ...base, agent, type: 'Non-Index', locations: [], sources: f.sources, keywords: f.keywords, operator: f.keywords.length > 1 ? f.operator : '',
        status: f.schedule === 'now' ? 'In Progress' : f.schedule === 'later' ? 'Pending' : 'Never Started',
        lastStart: f.schedule === 'now' ? stamp() : f.schedule === 'later' ? f.laterAt.trim() : '—', settings,
      },
    });
  };

  /* ---------- step 1 helpers ---------- */
  const addSource = (src: Omit<SourcePath, 'id'>) => set('sources', [...f.sources, { id: newId('src'), ...src }]);
  const removeSource = (id: string) => set('sources', f.sources.filter((s) => s.id !== id));

  /* ---------- step 2 helpers ---------- */
  const typeQ = f.typeSearch.trim().replace(/^\./, '').toLowerCase();
  const shownTypes = allTypes.filter((t) => !typeQ || t.includes(typeQ));
  const typesOff = f.fileCriteria === 'All';
  const allShownOn = shownTypes.length > 0 && shownTypes.every((t) => f.fileTypes.includes(t));
  const toggleType = (t: string, on: boolean) => set('fileTypes', on ? [...f.fileTypes, t] : f.fileTypes.filter((x) => x !== t));
  const addType = () => {
    const t = f.typeSearch.trim().replace(/^\./, '').toLowerCase();
    if (!t) { fail('Type a file extension to add, for example "dwg".'); return; }
    if (!EXT.test(t)) { fail('File extensions use letters and numbers only (max 8).'); return; }
    setF((x) => ({
      ...x, typeSearch: '',
      customTypes: allTypes.includes(t) ? x.customTypes : [...x.customTypes, t],
      fileTypes: x.fileTypes.includes(t) ? x.fileTypes : [...x.fileTypes, t],
    }));
  };
  const addKeyword = () => {
    const k = f.keyword.trim();
    if (!k) { fail('Type a keyword to add.'); return; }
    if (k.length > 200) { fail('Keywords are limited to 200 characters.'); return; }
    if (f.keywords.some((x) => x.toLowerCase() === k.toLowerCase())) { fail(`"${k}" is already added.`); return; }
    setF((x) => ({ ...x, keywords: [...x.keywords, k], keyword: '' }));
  };

  /* ---------- step 3 helpers ---------- */
  const validateAgent = () => {
    const sv = f.agentServer.trim();
    if (!HOST.test(sv)) { fail('Enter the agent server name or IP address.'); return; }
    if (!agents.some((a) => a.server.toLowerCase() === sv.toLowerCase())) {
      toast({ variant: 'error', title: 'Agent not available', message: `No e-Discovery agent is installed on ${sv}. Install it from e-Discovery Settings → Agents.` });
      return;
    }
    set('validated', sv);
    toast({ variant: 'success', title: 'Success!', message: 'Agent is available' });
  };

  const last = !rail || step === 2;
  const heading = mode === 'case' ? 'New Case & Object Selection' : 'New Location & Object Selection';

  return (
    <>
      <EdModal open={open} onClose={onClose} size="lg" icon={null} label={`e-Discovery / ${title}`}
        title={<span className="identify-wiz__title"><IconButton icon="chevron-left" label="Back to e-Discovery" onClick={onClose} />e-Discovery / {title}</span>}
        footerHint={rail ? <Button icon="chevron-left" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button> : undefined}
        footer={<>
          <Button onClick={onClose}>Cancel</Button>
          {last ? <Button variant="primary" icon="check" onClick={done}>Done</Button>
            : <Button variant="primary" iconEnd="arrow" onClick={() => goTo(step + 1)}>Next</Button>}
        </>}>
        {rail && (
          <ol className="steps identify-steps" aria-label="Progress">
            {steps.map((s, i) => (
              <li key={s} style={{ display: 'contents' }}>
                {i > 0 && <span className="steps__line" style={{ background: i <= step ? 'var(--ink)' : 'var(--border)' }} aria-hidden="true" />}
                <button type="button" className={'steps__item' + (i < step ? ' steps__item--done' : '')} aria-current={i === step ? 'step' : undefined}
                  disabled={i > reached + 1} onClick={() => i !== step && goTo(i)}>
                  <span className="steps__n">{i < step ? <Icon name="check" size={12} /> : i + 1}</span><span>{s}</span>
                </button>
              </li>
            ))}
          </ol>
        )}

        {step === 0 && (
          <div className="identify-wiz__body">
            <h4 className="section-label">{heading}</h4>
            <div className="fld-row">
              <TextField label={mode === 'case' ? 'Case Name' : 'Location Name'} value={f.name} maxLength={60} onChange={(v) => set('name', v)} error={bad('name')} />
              <TextField label="Description" value={f.description} maxLength={200} onChange={(v) => set('description', v)} />
            </div>
            <div className="fld-row">
              <SelectField label="Component" options={COMPONENTS} value={f.component} onChange={(v) => set('component', v)} />
              <SelectField label="Search Type" value={mode === 'location' ? 'Index' : f.searchType}
                options={mode === 'location' ? [{ value: 'Index', label: 'Index' }] : [{ value: 'Index', label: 'Index' }, { value: 'Non-Index', label: 'Non Index' }]}
                onChange={(v) => { setF((x) => ({ ...x, searchType: v as Form['searchType'] })); setTried(new Set()); setStep(0); setReached(0); }} />
            </div>
            {!rail ? (
              <>
                <MultiSelect label="Location" placeholder="Select" value={f.locations} onChange={(v) => set('locations', v)}
                  options={locations.map((l) => l.name)} selectAll={locations.length > 1} />
                <MiniTable label="Location Names" head={['Location Names', <span key="a" className="sr-only">Actions</span>]}
                  rows={f.locations.map((n) => [n, <IconButton key="r" icon="x" label={`Remove ${n}`} onClick={() => set('locations', f.locations.filter((x) => x !== n))} />])}
                  empty={locations.length ? 'Select the indexed locations this case searches.' : 'No indexed location yet. Create one in e-Discovery Settings → Indexed Locations.'} />
              </>
            ) : (
              <>
                <div className="fld-row">
                  <TextField label="User Name" value={f.user} onChange={(v) => set('user', v)} help={DOMAIN_USER_HINT} error={bad('user')} autoComplete="off" />
                  <PasswordField label="Password" value={f.password} onChange={(v) => set('password', v)} error={bad('password')} autoComplete="new-password" />
                </div>
                <div className="row row--wrap">
                  <Button icon="server" onClick={() => setNested('server')}>Add file server</Button>
                  <Button icon="link" onClick={() => setNested('unc')}>Add UNC Path</Button>
                </div>
                <MiniTable label="Folder paths" head={['Folder Path', 'Server', <span key="a" className="sr-only">Actions</span>]}
                  rows={f.sources.map((s) => [<span key="f" className="mono" title={s.folder}>{s.folder}</span>, s.server,
                    <IconButton key="r" icon="x" label={`Remove ${s.folder}`} onClick={() => removeSource(s.id)} />])}
                  empty="No folder added yet. Use Add File Server or Add UNC Path." />
              </>
            )}
          </div>
        )}

        {rail && step === 1 && (
          <div className="identify-wiz__body">
            <h4 className="section-label">File Type</h4>
            <div className="fld-row">
              <SelectField label="File Criteria" options={['All', 'Include', 'Exclude']} value={f.fileCriteria} onChange={(v) => set('fileCriteria', v as Form['fileCriteria'])} />
              <div className="fld identify-fld-end"><Checkbox label="Enable OCR" checked={f.ocr} onChange={(v) => set('ocr', v)} /></div>
            </div>
            <div className="identify-types">
              <div className="identify-types__bar">
                <Checkbox label="Select All" checked={!typesOff && allShownOn} disabled={typesOff || !shownTypes.length}
                  indeterminate={!typesOff && !allShownOn && shownTypes.some((t) => f.fileTypes.includes(t))}
                  onChange={(on) => setF((x) => ({ ...x, fileTypes: on ? Array.from(new Set([...x.fileTypes, ...shownTypes])) : x.fileTypes.filter((t) => !shownTypes.includes(t)) }))} />
                <label className="lf-field grow">
                  <span className="lf-input lf-input--pill">
                    <Icon name="search" />
                    <input value={f.typeSearch} placeholder="Search File Type" aria-label="Search File Type" disabled={typesOff} maxLength={20}
                      onChange={(e) => set('typeSearch', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addType(); } }} />
                  </span>
                </label>
                <IconButton icon="plus" label="Add file type" data-tip="Add the typed file type" bordered disabled={typesOff} onClick={addType} />
                <IconButton icon="x" label="Clear file type search" bordered disabled={typesOff || !f.typeSearch} onClick={() => set('typeSearch', '')} />
              </div>
              <div className="identify-types__box" role="group" aria-label="File types">
                {typesOff ? <span className="lf-na">File Type</span>
                  : shownTypes.length ? shownTypes.map((t) => <Checkbox key={t} label={`.${t}`} checked={f.fileTypes.includes(t)} onChange={(on) => toggleType(t, on)} />)
                    : <span className="muted">No file type matches "{f.typeSearch.trim()}". Click + to add it.</span>}
              </div>
            </div>
            <div className="identify-pair identify-pair--bare">
              <div className="fld identify-fld-end" style={{ flex: 'none' }}>
                <Checkbox label="Last Modified" checked={f.modifiedOn} onChange={(on) => setF((x) => ({ ...x, modifiedOn: on, modified: on ? x.modified : '' }))} />
              </div>
              <TextField className="grow" aria-label="Last Modified" placeholder="Last Modified" value={f.modified} disabled={!f.modifiedOn}
                onChange={(v) => set('modified', v)} help={DATE_HINT} error={bad('modified')} />
              <Button icon="calendar" disabled={!f.modifiedOn} onClick={() => setNested('modified')}>Select date</Button>
            </div>
            <div className="identify-pair">
              <TextField className="grow" label="File Size Limit" inputMode="decimal" value={f.size} error={bad('size')}
                onChange={(v) => set('size', v.replace(/[^\d.]/g, ''))} />
              <SelectField label={' '} aria-label="Unit" options={['MB', 'KB']} value={f.unit} onChange={(v) => set('unit', v as Form['unit'])} />
            </div>
            {mode === 'case' && (
              <>
                <div className="identify-pair">
                  <TextField className="grow" label="Search For" value={f.keyword} maxLength={200} help="Max limit 200 characters" error={bad('keyword')}
                    onChange={(v) => set('keyword', v)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }} />
                  <Button icon="plus" onClick={addKeyword}>Add</Button>
                </div>
                <SelectField label="Operator" placeholder="Select" options={['AND', 'OR']} value={f.operator} error={bad('operator')}
                  onChange={(v) => set('operator', v as Operator)} />
                <KeyChips keys={f.keywords} operator={f.operator} onRemove={(k) => set('keywords', f.keywords.filter((x) => x !== k))} />
              </>
            )}
          </div>
        )}

        {rail && step === 2 && (
          <div className="identify-wiz__body">
            <h4 className="section-label">{steps[2]}</h4>
            <RadioGroup row ariaLabel={mode === 'case' ? 'Search schedule' : 'Index schedule'} value={f.schedule} onChange={(v) => set('schedule', v as Form['schedule'])}
              options={mode === 'case'
                ? [{ value: 'now', label: 'Search Now' }, { value: 'none', label: "Don't Search" }, { value: 'later', label: 'Search Later' }]
                : [{ value: 'now', label: 'Index Now' }, { value: 'none', label: "Don't Index" }, { value: 'later', label: 'Index Later' }]} />
            <div className="identify-pair identify-pair--bare">
              <TextField className="grow" aria-label={mode === 'case' ? 'Search later at' : 'Index later at'} placeholder="YYYY/MM/DD HH:II" value={f.laterAt}
                disabled={f.schedule !== 'later'} help={DATE_HINT} error={bad('laterAt')} onChange={(v) => set('laterAt', v)} />
              <Button icon="calendar" disabled={f.schedule !== 'later'} onClick={() => setNested('later')}>Select date time</Button>
            </div>
            <RadioGroup row ariaLabel="Search host" value={f.host} onChange={(v) => set('host', v as Form['host'])}
              options={[{ value: 'local', label: 'Local Host' }, { value: 'agent', label: 'Agent Server' }]} />
            <div className="identify-pair identify-pair--bare">
              <TextField className="grow" aria-label="Agent server" placeholder="192.168.30.150" value={f.agentServer} disabled={f.host !== 'agent'} error={bad('agentServer')}
                onChange={(v) => setF((x) => ({ ...x, agentServer: v, validated: null }))}
                help={f.host === 'agent' && f.validated && f.validated === f.agentServer.trim() ? <Chip tone="good" icon="check">Agent validated</Chip> : undefined} />
              <Button icon="shield" disabled={f.host !== 'agent'} onClick={validateAgent}>Validate agent</Button>
            </div>
            <NumberField label="No. of threads" value={f.threads} min={1} max={64} onChange={(v) => set('threads', v)} error={bad('threads')}
              help="For quick results, try using minimum thread count value as 20" />
          </div>
        )}
      </EdModal>

      <UncPathDialog open={nested === 'unc'} onClose={() => setNested(null)} onAdd={(path) => {
        if (f.sources.some((s) => s.folder.toLowerCase() === path.toLowerCase())) { fail(`${path} is already added.`); return false; }
        addSource({ folder: path, server: path.slice(2).split('\\')[0] }); return true;
      }} />
      <FileServerDialog open={nested === 'server'} onClose={() => setNested(null)} onAdd={(server) => {
        if (f.sources.some((s) => s.folder === 'All Shares' && s.server.toLowerCase() === server.toLowerCase())) { fail(`${server} is already added.`); return false; }
        addSource({ folder: 'All Shares', server }); return true;
      }} />
      <DateTimeDialog open={nested === 'modified' || nested === 'later'} initial={nested === 'later' ? f.laterAt : f.modified}
        onClose={() => setNested(null)} onDone={(v) => { set(nested === 'later' ? 'laterAt' : 'modified', v); setNested(null); }} />
    </>
  );
}

/* ---------- DLG-IDN-06 Add UNC Path ---------- */
function UncPathDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (path: string) => boolean }) {
  const toast = useToast();
  const [v, setV] = useState('');
  const [badMark, setBad] = useState(false);
  useEffect(() => { if (open) { setV(''); setBad(false); } }, [open]);
  const submit = () => {
    const p = v.trim();
    if (!UNC.test(p)) { setBad(true); toast({ variant: 'error', title: 'Add UNC Path', message: 'Use the "\\\\Server name\\Share name" format.' }); return; }
    if (onAdd(p)) onClose();
  };
  return (
    <EdModal open={open} onClose={onClose} title="Add UNC Path" icon="link" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Done</Button></>}>
      <TextField label="UNC Path" value={v} data-autofocus placeholder={'\\\\192.168.30.150\\data'} help={'Use "\\\\Server name\\Share name" format'}
        error={badMark ? 'Use the "\\\\Server name\\Share name" format.' : null} onChange={setV} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} />
    </EdModal>
  );
}

/* ---------- DLG-IDN-07 Add File Server ---------- */
function FileServerDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (server: string) => boolean }) {
  const toast = useToast();
  const [v, setV] = useState('');
  const [badMark, setBad] = useState(false);
  useEffect(() => { if (open) { setV(''); setBad(false); } }, [open]);
  const submit = () => {
    const s = v.trim();
    if (!HOST.test(s)) { setBad(true); toast({ variant: 'error', title: 'Add file server', message: 'Enter the file server name or IP address.' }); return; }
    if (onAdd(s)) onClose();
  };
  return (
    <EdModal open={open} onClose={onClose} title="Add file server" icon="server" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Done</Button></>}>
      <TextField label="File Server" value={v} data-autofocus placeholder="192.168.30.150" error={badMark ? 'Enter the file server name or IP address.' : null}
        onChange={setV} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} />
    </EdModal>
  );
}

/* ---------- DLG-IDN-08 Date / time picker ---------- */
const p2 = (n: number) => String(n).padStart(2, '0');
function DateTimeDialog({ open, initial, onClose, onDone }: { open: boolean; initial: string; onClose: () => void; onDone: (v: string) => void }) {
  const toast = useToast();
  const [day, setDay] = useState<Date | null>(null);
  const [hh, setHh] = useState(0); const [mm, setMm] = useState(0); const [ss, setSs] = useState(0);
  useEffect(() => {
    if (!open) return;
    const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(initial.trim());
    if (m && WIZARD_DATE.test(initial.trim())) { setDay(new Date(+m[1], +m[2] - 1, +m[3])); setHh(+m[4]); setMm(+m[5]); }
    else { setDay(null); const n = new Date(); setHh(n.getHours()); setMm(n.getMinutes()); }
    setSs(0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = () => {
    if (!day) { toast({ variant: 'error', title: 'Select a date', message: 'Pick a day in the calendar first.' }); return; }
    onDone(`${day.getFullYear()}/${p2(day.getMonth() + 1)}/${p2(day.getDate())} ${p2(hh)}:${p2(mm)}`);
  };
  const num = (label: string, v: number, max: number, on: (n: number) => void) => (
    <label className="identify-time__f">
      <span>{label}</span>
      <span className="lf-input lf-input--pill">
        <input inputMode="numeric" aria-label={label} value={p2(v)} maxLength={2}
          onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')); on(Math.min(max, Number.isNaN(n) ? 0 : n)); }} />
      </span>
    </label>
  );
  return (
    <EdModal open={open} onClose={onClose} title="Date" icon="calendar" size="xs"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Done</Button></>}>
      <div className="identify-dtp">
        <Calendar key={String(open)} from={day} to={day} onPick={(d) => setDay(d)} />
        <div className="identify-time">{num('Hour', hh, 23, setHh)}{num('Minute', mm, 59, setMm)}{num('Second', ss, 59, setSs)}</div>
      </div>
    </EdModal>
  );
}

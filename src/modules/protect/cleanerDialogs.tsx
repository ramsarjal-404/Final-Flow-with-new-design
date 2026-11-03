/* AD Cleaner creator pieces: the escalation Ladder and dialogs DLG-PRO-13 … DLG-PRO-17. */
import { useEffect, useMemo, useState } from 'react';
import {
  Button, Checkbox, Chip, Field, Icon, Modal, NumberField, PasswordField, RadioGroup, SearchField, SelectField, TextField, Toggle,
} from '../../ui';
import {
  ACCOUNTS, EMAIL_RE, REPORT_COLS, STATUS_LBL, TYPE_LBL, accountTag, newTemplate, ousFor, ouPath,
  type ReportTemplate, type Rung, type Template, type TplStatus, type TplType,
} from './data';
import { ChipInput } from './kit';

/* ------------------------------------------------------------------ pager used by the paged pickers */
export function MiniPager({ page, pages, from, to, total, onPage }: { page: number; pages: number; from: number; to: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="protect-minipager">
      <span className="lf-muted">Showing {total ? from : 0}–{to} of {total}</span>
      <span className="grow" />
      <Button size="sm" icon="chevron-left" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="lf-muted">Page {page} of {pages}</span>
      <Button size="sm" iconEnd="chevron-right" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}
export function usePaged<T>(items: T[], per: number, deps: unknown[] = []) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), deps); // eslint-disable-line react-hooks/exhaustive-deps
  const pages = Math.max(1, Math.ceil(items.length / per)); const cur = Math.min(page, pages);
  const from = (cur - 1) * per + 1; const slice = items.slice(from - 1, from - 1 + per);
  return { slice, page: cur, pages, from, to: from - 1 + slice.length, total: items.length, setPage };
}

/* ------------------------------------------------------------------ Ladder (rung contract INT-PRO-095 … 099) */
export function Ladder({ rungs, onChange, unit, domain, noun, ouMode, picker }: {
  rungs: Rung[]; onChange: (r: Rung[]) => void; unit?: string; domain: string; noun: string;
  ouMode: 'picker' | 'select'; picker?: { title: string; subtitle: string; label: string };
}) {
  const [pick, setPick] = useState<number | null>(null);
  const upd = (i: number, patch: Partial<Rung>) => onChange(rungs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const ouOpts = ousFor(domain).map((o) => o.n);
  return (
    <ol className="protect-ladder">
      {rungs.map((r, i) => (
        <li key={r.key} className={'protect-rung' + (r.enabled ? '' : ' is-off') + (r.del ? ' is-del' : '')}>
          <span className="protect-rung__n" aria-hidden="true">{i + 1}</span>
          <div className="protect-rung__body">
            <div className="protect-rung__head">
              <b>{r.name}</b>{r.del && <Chip tone="bad" icon="alert">Destructive</Chip>}
              <span className="grow" />
              <Toggle label={`Toggle ${r.name}`} checked={r.enabled} onChange={(v) => upd(i, { enabled: v })} />
            </div>
            <p className="protect-rung__desc">{r.desc}</p>
            <div className="protect-rung__ctl">
              {r.hasDays && (
                <NumberField label="After" value={r.days === '' ? '' : Number(r.days)} min={1} disabled={!r.enabled} suffix={unit}
                  onChange={(v) => upd(i, { days: v === '' ? '' : String(v) })} />
              )}
              {!r.notifyHidden && <Checkbox label="Notify administrator" checked={r.notify} disabled={!r.enabled} onChange={(v) => upd(i, { notify: v })} />}
              {r.ou !== undefined && ouMode === 'picker' && (
                <div className="protect-rung__ou">
                  <span className="fld__lbl">{picker?.label ?? 'Destination OU'}</span>
                  <span className="protect-oubox"><Icon name="folder" size={14} /><span><b>{r.ou || 'Not set'}</b>{r.ou && <small>{ouPath(domain, r.ou)}</small>}</span>
                    <Button size="sm" disabled={!r.enabled} onClick={() => setPick(i)}>Change</Button></span>
                </div>
              )}
              {r.ou !== undefined && ouMode === 'select' && (
                <SelectField label={r.ouLabel} value={r.ou} placeholder="Choose an OU…" options={ouOpts} disabled={!r.enabled} aria-label={r.ouLabel}
                  onChange={(v) => upd(i, { ou: v })} />
              )}
            </div>
            {r.del && <p className="protect-rung__warn"><Icon name="alert" size={14} />This permanently deletes {noun} and cannot be undone. Review the threshold and scope before activation.</p>}
          </div>
        </li>
      ))}
      {picker && (
        <OuPicker open={pick !== null} title={picker.title} subtitle={picker.subtitle} domain={domain} value={pick !== null ? rungs[pick].ou ?? '' : ''}
          onClose={() => setPick(null)} onSelect={(ou) => { if (pick !== null) upd(pick, { ou }); setPick(null); }} />
      )}
    </ol>
  );
}

/* ------------------------------------------------------------------ DLG-PRO-14 OU picker */
export function OuPicker({ open, title, subtitle, domain, value, onClose, onSelect }: {
  open: boolean; title: string; subtitle: string; domain: string; value: string; onClose: () => void; onSelect: (ou: string) => void;
}) {
  const [q, setQ] = useState(''); const [sel, setSel] = useState(value);
  const all = ousFor(domain);
  const list = all.filter((o) => !q.trim() || (o.n + ' ' + o.p).toLowerCase().includes(q.trim().toLowerCase()));
  const pg = usePaged(list, 8, [q, open]);
  useEffect(() => {
    if (!open) return; setQ(''); setSel(value);
    const i = all.findIndex((o) => o.n === value); if (i >= 0) setTimeout(() => pg.setPage(Math.floor(i / 8) + 1), 0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} icon="folder" size="sm"
      footerHint={sel ? `Selected: ${sel}` : 'None selected'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!sel} onClick={() => onSelect(sel)}>Select OU</Button></>}>
      <SearchField value={q} onChange={setQ} placeholder="Search OU name or path…" ariaLabel="Search OU name or path…" />
      <div role="listbox" aria-label="Organizational units" className="protect-picklist">
        {pg.slice.length === 0 ? <p className="protect-picklist__empty">No OUs match “{q}”.</p> : pg.slice.map((o) => (
          <button key={o.n} type="button" role="option" aria-selected={sel === o.n} className={'protect-pickrow' + (sel === o.n ? ' is-sel' : '')} onClick={() => setSel(o.n)}>
            <Icon name="folder" size={15} /><span><b>{o.n}</b><small>{o.p}</small></span>{sel === o.n && <Icon name="check" size={14} />}
          </button>
        ))}
      </div>
      <MiniPager {...pg} onPage={pg.setPage} />
    </Modal>
  );
}

/* ------------------------------------------------------------------ DLG-PRO-15 Exclude accounts */
export function ExcludePicker({ open, current, onClose, onAdd }: { open: boolean; current: string[]; onClose: () => void; onAdd: (xs: string[]) => void }) {
  const [q, setQ] = useState(''); const [temp, setTemp] = useState<string[]>([]);
  useEffect(() => { if (open) { setQ(''); setTemp(['Administrator', ...current]); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = ACCOUNTS.filter((a) => !q.trim() || a.toLowerCase().includes(q.trim().toLowerCase()));
  const pg = usePaged(list, 8, [q]);
  return (
    <Modal open={open} onClose={onClose} title="Select accounts to exclude" subtitle="These accounts will be skipped by every cleanup action." icon="user" size="sm"
      footerHint={`${temp.length} selected`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => onAdd(temp.filter((a) => a !== 'Administrator'))}>Add selected</Button></>}>
      <SearchField value={q} onChange={setQ} placeholder="Search accounts…" ariaLabel="Search accounts…" />
      <div className="protect-picklist">
        {pg.slice.length === 0 ? <p className="protect-picklist__empty">No accounts match “{q}”.</p> : pg.slice.map((a) => {
          const t = accountTag(a);
          return (
            <div key={a} className="protect-pickrow protect-pickrow--check">
              <Checkbox checked={temp.includes(a)} disabled={a === 'Administrator'} label={a}
                onChange={(v) => setTemp((xs) => (v ? [...xs, a] : xs.filter((x) => x !== a)))} />
              <Chip tone={t === 'Protected' ? 'brand' : t === 'Built-in' ? 'warn' : 'neutral'}>{t}</Chip>
            </div>
          );
        })}
      </div>
      <MiniPager {...pg} onPage={pg.setPage} />
    </Modal>
  );
}

/* ------------------------------------------------------------------ DLG-PRO-13 Action template */
export function TemplateDialog({ open, initial, names, domain, onClose, onSave }: {
  open: boolean; initial: Template | null; names: string[]; domain: string; onClose: () => void; onSave: (t: Template, prev: string | null) => void;
}) {
  const [t, setT] = useState<Template>(newTemplate());
  const [err, setErr] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [browse, setBrowse] = useState(false);
  useEffect(() => { if (open) { setT(initial ? JSON.parse(JSON.stringify(initial)) : newTemplate()); setErr(null); setNameErr(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    const name = t.name.trim();
    if (!name) { setNameErr('Enter an action name.'); return; }
    if (names.some((n) => n.toLowerCase() === name.toLowerCase() && n !== initial?.name)) { setNameErr(`An action template named “${name}” already exists.`); return; }
    if (!t.rungs.some((r) => r.enabled)) { setErr('Enable at least one escalation step.'); return; }
    onSave({ ...t, name }, initial?.name ?? null);
  };
  return (
    <Modal open={open} onClose={onClose} size="lg" icon={initial ? 'edit' : 'plus'} title={initial ? 'Edit action template' : 'New action template'}
      subtitle="A reusable set of cleanup rules applied to inactive accounts" escapeCloses={!browse}
      footerHint={err ? <span className="protect-err" role="alert">{err}</span> : undefined}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save action</Button></>}>
      <TextField label="Action name" note="Required" value={t.name} placeholder="e.g. Standard inactive-account cleanup" error={nameErr}
        onChange={(v) => { setT({ ...t, name: v }); setNameErr(null); }} />
      <section className="protect-sec">
        <h4>Target accounts<small>Which accounts these actions apply to</small></h4>
        <div className="grid2">
          <Field label="Account type"><RadioGroup ariaLabel="Account type" value={t.type} onChange={(v) => setT({ ...t, type: v as TplType })}
            options={(Object.keys(TYPE_LBL) as TplType[]).map((k) => ({ value: k, label: TYPE_LBL[k] }))} /></Field>
          <Field label="Account status"><RadioGroup ariaLabel="Account status" value={t.status} onChange={(v) => setT({ ...t, status: v as TplStatus })}
            options={(Object.keys(STATUS_LBL) as TplStatus[]).map((k) => ({ value: k, label: k === 'all' ? 'All' : STATUS_LBL[k] }))} /></Field>
        </div>
      </section>
      <section className="protect-sec">
        <h4>Excluded accounts<small>These accounts are never touched by any action</small>
          <span className="grow" /><Button size="sm" icon="search" onClick={() => setBrowse(true)}>Browse</Button></h4>
        <ChipInput values={t.excluded} locked={['Administrator']} ariaLabel="Add account to exclude" placeholder="Add account to exclude — press Enter"
          onChange={(xs) => setT({ ...t, excluded: xs })} />
        <small className="help">Administrator is always protected and cannot be removed.</small>
      </section>
      <section className="protect-sec">
        <h4>Escalation ladder<small>Staged actions, applied as inactivity grows</small></h4>
        <p className="lf-muted protect-intro">Each enabled step runs once an account has been inactive for the set number of days.</p>
        <Ladder rungs={t.rungs} onChange={(rungs) => { setT({ ...t, rungs }); setErr(null); }} unit="days of inactivity" domain={domain} noun="accounts" ouMode="picker"
          picker={{ title: 'Select destination OU', subtitle: 'Accounts are moved here when this step runs.', label: 'Destination OU' }} />
      </section>
      <ExcludePicker open={browse} current={t.excluded} onClose={() => setBrowse(false)} onAdd={(xs) => { setT({ ...t, excluded: xs }); setBrowse(false); }} />
    </Modal>
  );
}

/* ------------------------------------------------------------------ DLG-PRO-16 Configure New Email Account */
export function EmailAccountDialog({ open, existing, onClose, onDone }: { open: boolean; existing: string[]; onClose: () => void; onDone: (name: string) => void }) {
  const blank = { display: '', sender: '', recipient: '', auth: true, logon: '', password: '', server: '', port: '25', ssl: false, tenant: '', client: '', secret: '' };
  const [f, setF] = useState(blank);
  const [mfa, setMfa] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [test, setTest] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(null);
  useEffect(() => { if (open) { setF(blank); setMfa(false); setErr(null); setTest(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const up = (k: keyof typeof blank) => (v: string | boolean) => { setF((x) => ({ ...x, [k]: v })); setErr(null); };
  const sendTest = () => {
    if (!EMAIL_RE.test(f.sender.trim())) { setTest({ tone: 'error', text: 'Enter a valid Sender’s Email ID before testing.' }); return; }
    setTest({ tone: 'info', text: 'Sending test email…' });
    setTimeout(() => setTest({ tone: 'success', text: `Test message accepted for ${f.sender.trim()}.` }), 1000);
  };
  const done = () => {
    const name = f.display.trim();
    if (!name) { setErr('Enter a Display Name.'); return; }
    if (!EMAIL_RE.test(f.sender.trim())) { setErr('Enter a valid Sender’s Email ID.'); return; }
    if (existing.some((x) => x.toLowerCase() === name.toLowerCase())) { setErr(`An account named “${name}” already exists.`); return; }
    onDone(name);
  };
  return (
    <Modal open={open} onClose={onClose} size="lg" icon="mail" title="Configure new email account" subtitle="The account AD Cleaner alerts are sent from."
      footerHint={err ? <span className="protect-err" role="alert">{err}</span> : undefined}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <div className="setrow">
        <div className="setrow__text"><b>Multi-Factor Authentication</b><span>Use OAuth 2.0 (Microsoft 365 / Azure) instead of SMTP username &amp; password.</span></div>
        <div className="row"><Toggle label="Multi-Factor Authentication" checked={mfa} onChange={setMfa} /></div>
      </div>
      <p className="section-label">User Information</p>
      <div className="grid2">
        <TextField label="Display Name" note="Required" placeholder="e.g. Simon Wilson" value={f.display} onChange={up('display')} />
        <TextField label="Sender's Email ID" note="Required" placeholder="sender@example.com" value={f.sender} onChange={up('sender')} />
        {mfa && <TextField label="Recipient’s Email ID" placeholder="recipient@example.com" value={f.recipient} onChange={up('recipient')} />}
      </div>
      {!mfa ? (
        <>
          <Checkbox label="Required authentication" checked={f.auth} onChange={up('auth')} />
          <div className="grid2">
            <TextField label="Logon Name" value={f.logon} disabled={!f.auth} onChange={up('logon')} />
            <PasswordField label="Password" value={f.password} disabled={!f.auth} onChange={up('password')} autoComplete="new-password" />
          </div>
          <p className="section-label">Server Information</p>
          <div className="grid2">
            <TextField label="Server Name / IP" placeholder="smtp.office365.com" value={f.server} onChange={up('server')} />
            <TextField label="Port" inputMode="numeric" value={f.port} onChange={(v) => up('port')(v.replace(/\D/g, '').slice(0, 5))} />
          </div>
          <Checkbox label="Requires a Secure Connection (SSL)" checked={f.ssl} onChange={up('ssl')} />
        </>
      ) : (
        <>
          <p className="section-label">Tenant Information</p>
          <div className="grid2">
            <TextField label="Tenant ID" value={f.tenant} onChange={up('tenant')} />
            <TextField label="Client ID" value={f.client} onChange={up('client')} />
            <PasswordField label="Secret Key" value={f.secret} onChange={up('secret')} autoComplete="new-password" />
          </div>
        </>
      )}
      <p className="section-label">Test Settings</p>
      <p className="lf-muted protect-intro">After filling out the information above, we recommend testing your account by sending a test email. (Requires network connection)</p>
      <div className="row row--wrap">
        <Button icon="send" disabled={test?.tone === 'info'} onClick={sendTest}>Send test email</Button>
        {test && <span className={'protect-test protect-test--' + test.tone} role="status">{test.text}</span>}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ DLG-PRO-17 Report template */
export function ReportTemplateDialog({ open, initial, names, onClose, onSave }: {
  open: boolean; initial: ReportTemplate | null; names: string[]; onClose: () => void; onSave: (t: ReportTemplate, prev: string | null) => void;
}) {
  const [n, setN] = useState(''); const [cols, setCols] = useState<string[]>([]); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setN(initial?.name ?? ''); setCols(initial ? [...initial.cols] : [...REPORT_COLS]); setErr(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const ordered = useMemo(() => REPORT_COLS.filter((c) => cols.includes(c)), [cols]);
  const save = () => {
    const name = n.trim();
    if (!name) { setErr('Enter a template name.'); return; }
    if (!cols.length) { setErr('Select at least one column.'); return; }
    if (names.some((x) => x.toLowerCase() === name.toLowerCase() && x !== initial?.name)) { setErr(`A report template named “${name}” already exists.`); return; }
    onSave({ name, cols: ordered }, initial?.name ?? null);
  };
  return (
    <Modal open={open} onClose={onClose} size="sm" icon="file" title="Report template" subtitle="Choose which details appear in each alert email."
      footerHint={err ? <span className="protect-err" role="alert">{err}</span> : `${cols.length} column${cols.length === 1 ? '' : 's'}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save template</Button></>}>
      <TextField label="Template name" placeholder="e.g. Weekly summary" value={n} onChange={(v) => { setN(v); setErr(null); }} />
      <Field label="Columns">
        <div className="protect-colgrid" role="group" aria-label="Columns">
          {REPORT_COLS.map((c) => <Checkbox key={c} label={c} checked={cols.includes(c)} onChange={(v) => { setCols((xs) => (v ? [...xs, c] : xs.filter((x) => x !== c))); setErr(null); }} />)}
        </div>
      </Field>
    </Modal>
  );
}


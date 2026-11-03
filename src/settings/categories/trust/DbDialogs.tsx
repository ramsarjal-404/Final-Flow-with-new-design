import { useState } from 'react';
import { Button, Checkbox, Chip, EmptyState, Field, Icon, IconButton, Modal, PasswordField, SelectField, TextField, Toggle, useToast } from '../../../ui';
import { CheckTable, CredBlock, SqlBlock, TreeGroup, TreeLeaf, credErrors, emptyCreds, sqlErrors, testConnection } from './shared';
import type { Creds, CredErrors, SqlErrors } from './shared';
import { AD_COMPUTERS, OU_TREE, SHARE_COMPUTERS, SQL_SERVERS, addAgent, ipToNum, isIp, numToIp, plural } from './store';
import type { OuNode, SqlValue } from './store';

/* ================= DLG-SDS-44 · Enumerate SQL Servers ================= */
export function EnumerateSqlDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (server: string) => void }) {
  const toast = useToast();
  const [openNodes, setOpenNodes] = useState<string[]>(['Local Servers']);
  const [sel, setSel] = useState('');
  const ok = (v = sel) => {
    if (!v) { toast({ variant: 'error', title: 'Enumerate SQL servers', message: 'Please select a SQL Server.' }); return; }
    onPick(v); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Enumerate SQL servers" icon="database" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => ok()}>Ok</Button></>}>
      <Field label="Select location">
        <div className="trust-treebox">
          <ul className="tree" role="tree" aria-label="SQL servers">
            {Object.entries(SQL_SERVERS).map(([grp, list]) => {
              const o = openNodes.includes(grp);
              return (
                <TreeGroup key={grp} label={grp} open={o} icon="server" onToggle={() => setOpenNodes(o ? openNodes.filter((x) => x !== grp) : [...openNodes, grp])}>
                  {list.map((s) => <TreeLeaf key={s} label={s} icon="database" selected={sel === s} onSelect={() => setSel(s)} onDouble={() => ok(s)} />)}
                </TreeGroup>
              );
            })}
          </ul>
        </div>
      </Field>
    </Modal>
  );
}

/* ================= DLG-SDS-45 · Add File server from Domain ================= */
const PAGE = 5;
export function AdDomainDialog({ open, onClose, onDone, title = 'Add File server from Domain' }: {
  open: boolean; onClose: () => void; onDone: (names: string[]) => void; title?: string;
}) {
  const toast = useToast();
  const [creds, setCreds] = useState<Creds>(emptyCreds);
  const [errs, setErrs] = useState<CredErrors>({});
  const [found, setFound] = useState(false);
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState<string[]>([]);
  const check = () => {
    const e = credErrors(creds); setErrs(e);
    if (Object.keys(e).length) { toast({ variant: 'error', title, message: 'Please enter the user name, password and domain.' }); return false; }
    return true;
  };
  const pages = Math.ceil(AD_COMPUTERS.length / PAGE);
  const rows = AD_COMPUTERS.slice((page - 1) * PAGE, page * PAGE);
  const done = () => {
    if (!check()) return;
    if (!checked.length) { toast({ variant: 'error', title, message: 'Please select at least one computer.' }); return; }
    onDone(checked); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={title} icon="server" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <CredBlock value={creds} onChange={(c) => { setCreds(c); setErrs({}); }} errors={errs} />
      <div><Button icon="search" onClick={() => { if (check()) { setFound(true); setPage(1); } }}>Find</Button></div>
      {found ? (
        <>
          <CheckTable label="Computers" rows={rows} rowKey={(r) => r.name} checked={checked} onChecked={setChecked} maxHeight={320}
            empty="No computers found."
            cols={[{ key: 'name', header: 'Name', cell: (r) => r.name }, { key: 'dn', header: 'Distinguished Name', cell: (r) => <span className="text-sm">{r.dn}</span> }]} />
          <div className="row row--between">
            <span className="muted text-sm">Total Records - {AD_COMPUTERS.length}</span>
            <div className="row">
              <IconButton icon="chevron-left" label="Previous page" bordered disabled={page <= 1} onClick={() => setPage(page - 1)} />
              <span className="text-sm">{page} / {pages}</span>
              <IconButton icon="chevron-right" label="Next page" bordered disabled={page >= pages} onClick={() => setPage(page + 1)} />
            </div>
          </div>
        </>
      ) : <EmptyState compact icon="search" title="Enter the credentials and click Find to list the computers." />}
    </Modal>
  );
}

/* ================= DLG-SDS-46 · Add computers from Containers/OUs. ================= */
const OU_TITLE = 'Add computers from Containers/OUs.';
export function OuDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (labels: string[]) => void }) {
  const toast = useToast();
  const [creds, setCreds] = useState<Creds>(emptyCreds);
  const [errs, setErrs] = useState<CredErrors>({});
  const [found, setFound] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [hi, setHi] = useState<OuNode | null>(null);
  const [list, setList] = useState<string[]>([]);
  const check = () => {
    const e = credErrors(creds); setErrs(e);
    if (Object.keys(e).length) { toast({ variant: 'error', title: OU_TITLE, message: 'Please enter the user name, password and domain.' }); return false; }
    return true;
  };
  const done = () => {
    if (!check()) return;
    if (!list.length) { toast({ variant: 'error', title: OU_TITLE, message: 'Please move at least one container or computer to the list.' }); return; }
    onDone(list); onClose();
  };
  const node = (n: OuNode) => n.kind === 'ou' ? (
    <TreeGroup key={n.id} label={n.label} icon="folder" open={openIds.includes(n.id)} selected={hi?.id === n.id} onSelect={() => setHi(n)}
      onToggle={() => setOpenIds(openIds.includes(n.id) ? openIds.filter((x) => x !== n.id) : [...openIds, n.id])}>
      {n.children?.map(node)}
    </TreeGroup>
  ) : <TreeLeaf key={n.id} label={n.label} icon="server" selected={hi?.id === n.id} onSelect={() => setHi(n)} />;
  return (
    <Modal open={open} onClose={onClose} title={OU_TITLE} icon="folder" size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <CredBlock value={creds} onChange={(c) => { setCreds(c); setErrs({}); }} errors={errs} />
      <div className="row"><b className="text-sm">Select Containers/OUs</b><Button size="sm" icon="search" onClick={() => { if (check()) setFound(true); }}>Find</Button></div>
      <div className="trust-shuttle">
        <div className="trust-treebox">
          {found ? <ul className="tree" role="tree" aria-label="Containers/OUs">{OU_TREE.map(node)}</ul>
            : <p className="muted text-sm" style={{ margin: 8 }}>Enter the credentials and click Find.</p>}
        </div>
        <div className="trust-shuttle__mid">
          <IconButton icon="chevron-right" label="Add to list" bordered disabled={!hi}
            onClick={() => { if (hi && !list.includes(hi.label)) setList([...list, hi.label]); }} />
        </div>
        <CheckTable label="Selected containers" rows={list} rowKey={(r) => r} empty="Nothing added yet."
          cols={[{ key: 'n', header: 'Computer/OU', cell: (r) => r },
            { key: 'a', header: 'Action', cell: (r) => <IconButton icon="trash" label={`Remove ${r}`} danger onClick={() => setList(list.filter((x) => x !== r))} /> }]} />
      </div>
    </Modal>
  );
}

/* ================= DLG-SDS-47 · IP range ================= */
const IP_TITLE = 'Select domain and set start and end IP. All file servers in that IP range will be added.';
export function IpRangeDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (ips: string[]) => void }) {
  const toast = useToast();
  const [creds, setCreds] = useState<Creds>(emptyCreds);
  const [errs, setErrs] = useState<CredErrors & { start?: boolean; end?: boolean }>({});
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const fail = (message: string) => toast({ variant: 'error', title: 'IP range', message });
  const done = () => {
    const e = credErrors(creds);
    if (Object.keys(e).length) { setErrs(e); fail('Please enter the user name, password and domain.'); return; }
    if (!isIp(start) || !isIp(end)) { setErrs({ start: !isIp(start), end: !isIp(end) }); fail('Please enter a valid start and end IP address.'); return; }
    const a = ipToNum(start.trim()), b = ipToNum(end.trim());
    if ((a >>> 8) !== (b >>> 8) || b < a) { setErrs({ end: true }); fail('End IP must follow the start IP in the same subnet.'); return; }
    if (b - a + 1 > 50) { setErrs({ end: true }); fail('Please keep the range to 50 addresses or fewer.'); return; }
    onDone(Array.from({ length: b - a + 1 }, (_, i) => numToIp(a + i))); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={IP_TITLE} icon="globe" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <CredBlock ip value={creds} onChange={(c) => { setCreds(c); setErrs({}); }} errors={errs} />
      <small className="help">* DOMAIN NETBIOS NAME*</small>
      <p className="section-label">Set Range</p>
      <div className="fld-row">
        <TextField label="Start IP" placeholder="192.168.30.150" value={start} error={errs.start ? ' ' : null} onChange={(v) => { setStart(v); setErrs({}); }} />
        <TextField label="End IP" placeholder="192.168.30.154" value={end} error={errs.end ? ' ' : null} onChange={(v) => { setEnd(v); setErrs({}); }} />
      </div>
    </Modal>
  );
}

/* ================= DLG-SDS-43 · Database Settings ================= */
export type DbResult = { db: SqlValue; fileServers: string[]; separate: boolean };
export function DatabaseSettingsDialog({ open, onClose, onDone, mappedServers, initial }: {
  open: boolean; onClose: () => void; onDone: (r: DbResult) => void;
  /** Mapping-step use: the read-only list of file servers. Omit for the Secondary Database(s) tab. */
  mappedServers?: string[];
  initial?: { db?: Partial<SqlValue>; fileServers?: string[]; separate?: boolean };
}) {
  const toast = useToast();
  const secondary = !mappedServers;
  const [db, setDb] = useState<SqlValue>(() => ({ server: '', auth: 'sql', user: '', password: '', mode: 'select', database: '', connTimeout: '300', queryTimeout: '300', ...initial?.db }));
  const [errs, setErrs] = useState<SqlErrors>({});
  const [servers, setServers] = useState<string[]>(initial?.fileServers ?? []);
  const [separate, setSeparate] = useState(!!initial?.separate);
  const [sub, setSub] = useState<'' | 'browse' | 'ad' | 'ou' | 'ip'>('');
  const addServers = (names: string[]) => setServers((s) => Array.from(new Set([...s, ...names])));
  const done = () => {
    const e = sqlErrors(db); setErrs(e);
    if (Object.keys(e).length) { toast({ variant: 'error', title: 'Database Settings', message: 'Please enter the SQL Server, credentials and database.' }); return; }
    const list = mappedServers ?? servers;
    if (!list.length) { toast({ variant: 'error', title: 'Database Settings', message: 'Please add at least one file server.' }); return; }
    onDone({ db, fileServers: list, separate: secondary && separate }); onClose();
  };
  return (
    <>
      <Modal open={open} onClose={onClose} title="Database Settings" icon="database" size="md" escapeCloses={!sub}
        footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
        <SqlBlock value={db} errors={errs} onChange={(v) => { setDb(v); setErrs({}); }} onBrowse={() => setSub('browse')}
          onTest={() => toast(testConnection(db))} />
        {secondary ? (
          <>
            <Checkbox checked={separate} onChange={setSeparate} label={'Use separate database for each file server (Append "_[File_Server_Name]" in database name)'} />
            <Field label="File Server(s)">
              <div className="trust-chips">
                {servers.length === 0 ? <span className="muted text-sm">No file servers added.</span> : servers.map((s) => (
                  <span key={s} className="lf-chip trust-chip">{s}
                    <button type="button" aria-label={`Remove ${s}`} onClick={() => setServers(servers.filter((x) => x !== s))}><Icon name="x" size={12} /></button>
                  </span>
                ))}
              </div>
            </Field>
            <div className="row row--wrap">
              <Button size="sm" icon="building" onClick={() => setSub('ad')}>Add From AD</Button>
              <Button size="sm" icon="folder" onClick={() => setSub('ou')}>Add From OU</Button>
              <Button size="sm" icon="globe" onClick={() => setSub('ip')}>Add IP Range</Button>
            </div>
          </>
        ) : (
          <Field label="File Server(s)">
            <div className="trust-chips">{mappedServers!.map((s) => <Chip key={s}>{s}</Chip>)}</div>
          </Field>
        )}
      </Modal>
      {sub === 'browse' && <EnumerateSqlDialog open onClose={() => setSub('')} onPick={(s) => { setDb((d) => ({ ...d, server: s })); setErrs({}); }} />}
      {sub === 'ad' && <AdDomainDialog open onClose={() => setSub('')} onDone={addServers} />}
      {sub === 'ou' && <OuDialog open onClose={() => setSub('')} onDone={addServers} />}
      {sub === 'ip' && <IpRangeDialog open onClose={() => setSub('')} onDone={addServers} />}
    </>
  );
}

/* ================= DLG-SDS-48 · Add Server (scan agent) ================= */
export function AddServerDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (ip: string) => void }) {
  const toast = useToast();
  const [f, setF] = useState({ ip: '', path: '', user: '', password: '' });
  const [errs, setErrs] = useState<Record<string, boolean>>({});
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setErrs({}); };
  const done = () => {
    const e: Record<string, boolean> = {};
    (Object.keys(f) as (keyof typeof f)[]).forEach((k) => { if (!f[k].trim()) e[k] = true; });
    if (f.ip.trim() && !isIp(f.ip)) {
      setErrs({ ...e, ip: true }); toast({ variant: 'error', title: 'Add server', message: 'Please enter a valid IP address.' }); return;
    }
    if (Object.keys(e).length) { setErrs(e); toast({ variant: 'error', title: 'Add server', message: 'Please fill in all the fields.' }); return; }
    const ip = f.ip.trim();
    addAgent(ip); onAdded(ip);
    toast({ variant: 'success', title: 'Agent added', message: `${ip} is available as a scan agent.` });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add server" icon="server" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <TextField label="IP Address :" placeholder="Enter IP address" value={f.ip} error={errs.ip ? ' ' : null} onChange={(v) => set('ip', v)} />
      <TextField label="Agent Path :" placeholder="Enter agent path" help={'Use "\\\\Server name\\Share name" format'} value={f.path} error={errs.path ? ' ' : null} onChange={(v) => set('path', v)} />
      <TextField label="User Name :" placeholder="Enter user name" help={'Use "Domain name\\user name" format'} value={f.user} error={errs.user ? ' ' : null} onChange={(v) => set('user', v)} />
      <PasswordField label="Password :" placeholder="Enter password" value={f.password} error={errs.password ? ' ' : null} onChange={(v) => set('password', v)} />
    </Modal>
  );
}

/* ================= DLG-SDS-49 · Find all shares ================= */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const two = (v: string, max: number) => { const d = v.replace(/\D/g, '').slice(0, 2); return d === '' ? '' : String(Math.min(max, Number(d))); };
const pad = (v: string) => v.padStart(2, '0');
export function FindSharesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ domain: '', user: '', password: '' });
  const [errs, setErrs] = useState<Record<string, boolean>>({});
  const [found, setFound] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [scheduled, setScheduled] = useState(true);
  const [day, setDay] = useState('Monday');
  const [t, setT] = useState({ h: '06', m: '42', s: '11' });
  const find = () => {
    const e: Record<string, boolean> = {};
    (Object.keys(f) as (keyof typeof f)[]).forEach((k) => { if (!f[k].trim()) e[k] = true; });
    setErrs(e);
    if (Object.keys(e).length) { toast({ variant: 'error', title: 'Find all shares', message: 'Please enter the domain name or IP, user name and password.' }); return; }
    setFound(true);
  };
  const finish = () => {
    const n = checked.length;
    const at = `${pad(t.h || '0')}:${pad(t.m || '0')}:${pad(t.s || '0')}`;
    toast({ variant: 'success', title: 'Share discovery saved', message: scheduled ? `${plural(n, 'computer')} will be searched for shares every ${day} at ${at}` : `${plural(n, 'computer')} will be searched for shares once` });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Find all shares" subtitle="Data Set / Find all shares" icon="search" size="lg"
      footerHint={<button type="button" className="trust-linkbtn" onClick={onClose}><Icon name="chevron-left" size={14} />Back to Data Set</button>}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!checked.length} onClick={finish}>Finish</Button></>}>
      <div className="trust-find">
        <TextField label="Domain name or IP" value={f.domain} error={errs.domain ? ' ' : null} onChange={(v) => { setF({ ...f, domain: v }); setErrs({}); }} />
        <TextField label="User Name" placeholder="User@domain.com" value={f.user} error={errs.user ? ' ' : null} onChange={(v) => { setF({ ...f, user: v }); setErrs({}); }} />
        <PasswordField label="Password" value={f.password} error={errs.password ? ' ' : null} onChange={(v) => { setF({ ...f, password: v }); setErrs({}); }} />
        <Button icon="search" onClick={find}>Find</Button>
      </div>
      <CheckTable label="Computers" rows={found ? SHARE_COMPUTERS : []} rowKey={(r) => r.name} checked={checked} onChecked={setChecked}
        empty="Enter the domain name or IP and credentials, then click Find."
        cols={[{ key: 'n', header: 'Computer name', cell: (r) => r.name }, { key: 'ip', header: 'IP Address', cell: (r) => r.ip }]} />
      <div className="trust-band">
        <div className="row row--between"><b>Schedule</b><Toggle label="Schedule" checked={scheduled} onChange={setScheduled} /></div>
        <div className="fld-row">
          <SelectField label="Starts On" options={DAYS} value={day} disabled={!scheduled} onChange={setDay} />
          <Field label="At">
            <div className="trust-time">
              {([['h', 'Hour', 23], ['m', 'Minute', 59], ['s', 'Second', 59]] as const).map(([k, l, max]) => (
                <input key={k} aria-label={l} placeholder={l} inputMode="numeric" disabled={!scheduled} value={t[k]}
                  onChange={(e) => setT({ ...t, [k]: two(e.target.value, max) })} onBlur={() => setT((x) => ({ ...x, [k]: pad(x[k] || '0') }))} />
              ))}
            </div>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

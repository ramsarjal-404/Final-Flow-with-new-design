import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Banner, Button, Modal, NumberField, PasswordField, RadioGroup, SelectField, SetCard, TextField, useToast,
} from '../../../ui';
import { digitsGuard, wait } from '../configure-notifications/shared/util';
import { NEW_DB_RE, SQL_DATABASES, SQL_SERVERS, sqlStore, timeoutOk, type Auth, type Conn, type GpSettings } from './store';

/* ---------------- shared blocks ---------------- */
function AuthBlock({ auth, user, password, onAuth, onUser, onPassword, showErrors }: {
  auth: Auth; user: string; password: string; onAuth: (a: Auth) => void; onUser: (v: string) => void; onPassword: (v: string) => void; showErrors: boolean;
}) {
  const win = auth === 'Windows';
  return (
    <div className="stack sql-authentication-block">
      <h4 className="section-label">Authentication Type</h4>
      <RadioGroup row ariaLabel="Authentication Type" value={auth} onChange={(v) => onAuth(v as Auth)}
        options={[{ value: 'Windows', label: 'Windows Authentication' }, { value: 'SQL', label: 'SQL Authentication (Recommended)' }]} />
      <div className="fld-row">
        <TextField label="User Name" value={win ? '' : user} disabled={win} autoComplete="off"
          placeholder={win ? 'Uses the Lepide service account' : undefined} onChange={onUser}
          error={showErrors && !win && !user.trim() ? 'Enter the SQL user name.' : null} />
        <PasswordField label="Password" value={win ? '' : password} disabled={win} autoComplete="new-password" onChange={onPassword}
          error={showErrors && !win && !password ? 'Enter the password.' : null} />
      </div>
    </div>
  );
}

function Timeouts({ connection, query, onConnection, onQuery }: {
  connection: number | ''; query: number | ''; onConnection: (v: number | '') => void; onQuery: (v: number | '') => void;
}) {
  const bad = !timeoutOk(connection) || !timeoutOk(query);
  return (
    <div className="stack sql-authentication-block">
      <h4 className="section-label">Time out Settings</h4>
      <div className="fld-row">
        <NumberField label="Connection Time Out" suffix="Seconds" value={connection} min={1} max={3600} onChange={digitsGuard(4, onConnection)}
          className={!timeoutOk(connection) ? 'is-bad' : undefined} />
        <NumberField label="Query Time Out" suffix="Seconds" value={query} min={1} max={3600} onChange={digitsGuard(4, onQuery)}
          className={!timeoutOk(query) ? 'is-bad' : undefined} />
      </div>
      {bad && <small className="fld__err" role="alert">Time outs are 1–3600 seconds.</small>}
    </div>
  );
}

/** Test Connection (Prototype-only: always succeeds after ≈ 0.9 s) with the result as an inline banner. */
function useConnectionTest(conn: Conn, onOk?: () => void) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const missing = !conn.server.trim() || (conn.auth === 'SQL' && (!conn.user.trim() || !conn.password));
  const run = async () => {
    if (missing) {
      toast({ variant: 'error', title: 'Connection details missing', message: 'Enter the server name and credentials first.' });
      return false;
    }
    setBusy(true); setResult(null);
    await wait(900);
    if (!alive.current) return false;
    setBusy(false);
    setResult(`Connected to ${conn.server.trim()}.`);
    toast({ variant: 'success', title: 'Connection successful', message: `Connected to ${conn.server.trim()}.` });
    onOk?.();
    return true;
  };
  return { busy, result, clear: () => setResult(null), run };
}

function TestRow({ busy, result, onTest }: { busy: boolean; result: string | null; onTest: () => void }) {
  return (
    <div className="stack stack--sm">
      <div><Button icon="plug" loading={busy} onClick={onTest}>Test connection</Button></div>
      {result && <Banner tone="success">{result}</Banner>}
    </div>
  );
}

function FormCard({ title, description, onSubmit, footer, children }: { title: string; description?: string; onSubmit: () => void; footer: ReactNode; children: ReactNode }) {
  return (
    <form noValidate onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit(); }}>
      <SetCard title={title} description={description} footer={footer}>
        <div className="page-form form-col">{children}</div>
      </SetCard>
    </form>
  );
}

/* ---------------- DLG-SAD-42 · Select SQL Server ---------------- */
function BrowseServers({ open, current, onClose, onPick }: { open: boolean; current: string; onClose: () => void; onPick: (s: string) => void }) {
  const [hi, setHi] = useState('');
  // GAP-SAD-07 intended: reopening highlights the current server (or nothing), never a stale row.
  useEffect(() => { if (open) setHi(SQL_SERVERS.includes(current.trim()) ? current.trim() : ''); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open={open} onClose={onClose} title="Select SQL Server" icon="server" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!hi} onClick={() => onPick(hi)}>Select</Button></>}>
      <p className="sql-authentication-lead">SQL Server instances found on your network:</p>
      <div className="sql-authentication-listbox" role="listbox" aria-label="SQL servers"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          e.preventDefault();
          const i = SQL_SERVERS.indexOf(hi);
          const n = e.key === 'ArrowDown' ? Math.min(SQL_SERVERS.length - 1, i + 1) : Math.max(0, i - 1);
          setHi(SQL_SERVERS[n]);
          (e.currentTarget.querySelectorAll<HTMLElement>('[role=option]')[n])?.focus();
        }}>
        {SQL_SERVERS.map((s) => (
          <button key={s} type="button" role="option" aria-selected={hi === s} className="pop__item" tabIndex={hi === s || (!hi && s === SQL_SERVERS[0]) ? 0 : -1}
            onClick={() => setHi(s)} onDoubleClick={() => onPick(s)}>
            <span className="mono">{s}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ---------------- SCR-SAD-17 · Default SQL Server Settings ---------------- */
export function DefaultSqlForm({ title }: { title: string }) {
  const toast = useToast();
  const [f, setF] = useState<Conn>(() => ({ ...sqlStore.get().def }));
  const [tried, setTried] = useState(false);
  const [browse, setBrowse] = useState(false);
  const test = useConnectionTest(f);
  const set = <K extends keyof Conn>(k: K, v: Conn[K]) => { setF((s) => ({ ...s, [k]: v })); if (k !== 'connection' && k !== 'query') test.clear(); };
  const setAuth = (a: Auth) => { setF((s) => ({ ...s, auth: a, ...(a === 'Windows' ? { user: '', password: '' } : {}) })); test.clear(); };

  const errServer = !f.server.trim() ? 'Enter or browse for the SQL Server.' : null;
  const credsBad = f.auth === 'SQL' && (!f.user.trim() || !f.password);
  const apply = () => {
    setTried(true);
    if (errServer || credsBad || !timeoutOk(f.connection) || !timeoutOk(f.query)) {
      toast({ variant: 'error', title: 'Check the highlighted fields', message: 'Server, credentials and time outs are required.' });
      return;
    }
    sqlStore.set((s) => ({ ...s, def: { ...f, server: f.server.trim(), user: f.user.trim() } }));
    toast({ variant: 'success', title: 'SQL settings applied', message: `Lepide now stores audit data on ${f.server.trim()}.` });
  };

  return (
    <>
      <FormCard title={title} description="Configure SQL Server settings" onSubmit={apply}
        footer={<Button type="submit" variant="primary">Apply</Button>}>
        <div className="sql-authentication-inline">
          <TextField label="Server Name" value={f.server} onChange={(v) => set('server', v)} error={tried ? errServer : null} />
          <Button icon="search" onClick={() => setBrowse(true)}>Browse</Button>
        </div>
        <AuthBlock auth={f.auth} user={f.user} password={f.password} onAuth={setAuth} showErrors={tried}
          onUser={(v) => set('user', v)} onPassword={(v) => set('password', v)} />
        <TestRow busy={test.busy} result={test.result} onTest={() => { setTried(true); void test.run(); }} />
        <Timeouts connection={f.connection} query={f.query} onConnection={(v) => set('connection', v)} onQuery={(v) => set('query', v)} />
      </FormCard>
      <BrowseServers open={browse} current={f.server} onClose={() => setBrowse(false)}
        onPick={(s) => { set('server', s); setBrowse(false); }} />
    </>
  );
}

/* ---------------- SCR-SAD-18 · Group Policy SQL Settings ---------------- */
export function GroupPolicySqlForm({ title }: { title: string }) {
  const toast = useToast();
  const [f, setF] = useState<GpSettings>(() => ({ ...sqlStore.get().gp }));
  const [tried, setTried] = useState(false);
  const [tested, setTested] = useState(false);
  const test = useConnectionTest(f, () => setTested(true));
  const touchConn = () => { setTested(false); test.clear(); };
  const set = <K extends keyof GpSettings>(k: K, v: GpSettings[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    if (k === 'server' || k === 'user' || k === 'password') touchConn();
  };
  const setAuth = (a: Auth) => { setF((s) => ({ ...s, auth: a, ...(a === 'Windows' ? { user: '', password: '' } : {}) })); touchConn(); };

  const newDbBad = f.newDb !== '' && !NEW_DB_RE.test(f.newDb);
  const dbOk = f.dbMode === 'create' ? NEW_DB_RE.test(f.newDb) : !!f.db;
  const canApply = tested && dbOk && timeoutOk(f.connection) && timeoutOk(f.query);
  const apply = () => {
    if (!canApply) return;
    sqlStore.set((s) => ({ ...s, gp: { ...f, server: f.server.trim(), user: f.user.trim() } }));
    toast({
      variant: 'success', title: 'Group Policy SQL settings applied',
      message: f.dbMode === 'create' ? `Using new database ${f.newDb} on ${f.server.trim()}.` : `Using ${f.db} on ${f.server.trim()}.`,
    });
  };

  return (
    <FormCard title={title} onSubmit={apply} footer={<Button type="submit" variant="primary" disabled={!canApply}>Apply</Button>}>
      <TextField label="Server Name" value={f.server} onChange={(v) => set('server', v)} error={tried && !f.server.trim() ? 'Enter the SQL Server.' : null} />
      <AuthBlock auth={f.auth} user={f.user} password={f.password} onAuth={setAuth} showErrors={tried}
        onUser={(v) => set('user', v)} onPassword={(v) => set('password', v)} />
      <TestRow busy={test.busy} result={test.result} onTest={() => { setTried(true); void test.run(); }} />
      <div className="stack stack--sm sql-authentication-block">
        <div className="lf-radio sql-authentication-db" role="radiogroup" aria-label="Database">
          <div className="sql-authentication-dbrow">
            <label>
              <input type="radio" name="gp-db" value="create" checked={f.dbMode === 'create'} disabled={!tested} onChange={() => set('dbMode', 'create')} />
              Create Database
            </label>
            <TextField value={f.newDb} placeholder="New database name" aria-label="New database name" disabled={!tested || f.dbMode !== 'create'}
              className={newDbBad ? 'is-bad' : undefined} aria-invalid={newDbBad || undefined} onChange={(v) => set('newDb', v)} />
          </div>
          <div className="sql-authentication-dbrow">
            <label>
              <input type="radio" name="gp-db" value="select" checked={f.dbMode === 'select'} disabled={!tested} onChange={() => set('dbMode', 'select')} />
              Select Database
            </label>
            <SelectField placeholder="Select" aria-label="Select Database" value={f.db} options={SQL_DATABASES}
              disabled={!tested || f.dbMode !== 'select'} onChange={(v) => set('db', v)} />
          </div>
        </div>
        {!tested && <small className="help">Test the connection to choose a database.</small>}
      </div>
      <Timeouts connection={f.connection} query={f.query} onConnection={(v) => set('connection', v)} onQuery={(v) => set('query', v)} />
    </FormCard>
  );
}

/* ---------------- SCR-SAD-19 · MySQL Credentials ---------------- */
export function MySqlForm({ title }: { title: string }) {
  const toast = useToast();
  const saved = sqlStore.get().mysql;
  const [host, setHost] = useState(saved.host);
  const [port, setPort] = useState<number | ''>(saved.port);
  const [user, setUser] = useState(saved.user);
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);

  const errHost = !host.trim() ? 'Enter the MySQL host.' : null;
  const errPort = port === '' || port < 1 || port > 65535 ? 'Port is 1–65535.' : null;
  const errUser = !user.trim() ? 'Enter the user.' : null;
  const errPw = !password ? 'Enter the password.' : null;
  const update = () => {
    setTried(true);
    if (errHost || errPort || errUser || errPw) {
      toast({ variant: 'error', title: 'Check the highlighted fields', message: 'All MySQL credentials are required.' });
      return;
    }
    sqlStore.set((s) => ({ ...s, mysql: { host: host.trim(), port, user: user.trim() } }));
    toast({ variant: 'success', title: 'MySQL credentials updated', message: `${user.trim()}@${host.trim()}:${port}` });
    setPassword('');
    setTried(false);
  };

  return (
    <FormCard title={title} onSubmit={update} footer={<Button type="submit" variant="primary">Update</Button>}>
      <div className="fld-row">
        <TextField label="Host" value={host} onChange={setHost} error={tried ? errHost : null} />
        <NumberField label="Port" value={port} min={0} max={99999} onChange={digitsGuard(5, setPort)} error={tried ? errPort : null} />
      </div>
      <div className="fld-row">
        <TextField label="User" value={user} autoComplete="off" onChange={setUser} error={tried ? errUser : null} />
        <PasswordField label="Password" placeholder="Password" value={password} autoComplete="new-password" onChange={setPassword} error={tried ? errPw : null} />
      </div>
    </FormCard>
  );
}

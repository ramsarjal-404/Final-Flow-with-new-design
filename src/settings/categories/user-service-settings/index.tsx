import { useEffect, useRef, useState } from 'react';
import notify from '../../../data/settings/notify.json';
import {
  Button, DataTable, IconButton, Modal, PasswordField, SelectField, SetCard, TextField, ToneTag, useToast, type Column,
} from '../../../ui';
import { createStore } from '../../../stores/createStore';
import { HeaderActions } from '../../SettingsFrame';
import { DOMAIN_USER_RE, wait } from '../configure-notifications/shared/util';
import './styles.css';

/* SCR-SAD-21 · User Service Settings + DLG-SAD-48 · Service Account.
   GAP-SAD-02 intended (AC-SAD-175): account / startup / running changes persist for the session. */

type Service = { id: string; name: string; description: string; account: string; startup: string; running: boolean };
const SERVICES = notify.exports.LEPIDE_SERVICES as Service[];
const STARTUP_TYPES = notify.exports.SERVICE_STARTUP_TYPES as string[];

const servicesStore = createStore<{ services: Service[] }>({ services: SERVICES.map((s) => ({ ...s })) });
const patch = (id: string, p: Partial<Service>) =>
  servicesStore.set((s) => ({ services: s.services.map((x) => (x.id === id ? { ...x, ...p } : x)) }));

export default function UserServiceSettingsPage() {
  const toast = useToast();
  const services = servicesStore.use((s) => s.services);
  const [busy, setBusy] = useState<string[]>([]);
  const [dialog, setDialog] = useState<{ id: string | 'all' } | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const control = async (svc: Service, action: 'stop' | 'start' | 'restart') => {
    setBusy((b) => [...b, svc.id]);
    await wait(700);
    if (alive.current) setBusy((b) => b.filter((x) => x !== svc.id));
    const cur = servicesStore.get().services.find((x) => x.id === svc.id) ?? svc;
    if (action === 'stop') {
      patch(svc.id, { running: false });
      toast({ variant: 'success', title: `${svc.name} stopped`, message: 'Its data collection is paused until you start it again.' });
    } else {
      patch(svc.id, { running: true });
      toast({ variant: 'success', title: `${svc.name} ${action === 'start' ? 'started' : 'restarted'}`, message: `Running as ${cur.account}.` });
    }
  };

  const columns: Column<Service>[] = [
    {
      key: 'name', header: 'Service name', sortable: true, minWidth: 260, value: (r) => r.name,
      render: (r) => (
        <span className="user-service-settings-svc" data-tip={r.description}>
          <b>{r.name}</b><span>{r.description}</span>
        </span>
      ),
    },
    { key: 'account', header: 'Log On As', sortable: true, mono: true },
    { key: 'startup', header: 'Startup type', sortable: true },
    // GAP-SAD-04 intended: Status sorts by Running / Stopped.
    { key: 'status', header: 'Status', sortable: true, value: (r) => (r.running ? 'Running' : 'Stopped'),
      render: (r) => <ToneTag tone={r.running ? 'good' : 'bad'}>{r.running ? 'Running' : 'Stopped'}</ToneTag> },
    {
      key: 'action', header: 'Action', value: () => '', minWidth: 250,
      render: (r) => busy.includes(r.id) ? (
        <Button size="sm" loading aria-label="Working">Working</Button>
      ) : (
        <span className="row">
          <IconButton icon="edit" label={`Change account of ${r.name}`} data-tip="Change service account" onClick={() => setDialog({ id: r.id })} />
          {r.running
            ? <Button size="sm" icon="pause" onClick={() => void control(r, 'stop')}>Stop</Button>
            : <Button size="sm" icon="play" onClick={() => void control(r, 'start')}>Start</Button>}
          <Button size="sm" icon="refresh" disabled={!r.running} onClick={() => void control(r, 'restart')}>Restart</Button>
        </span>
      ),
    },
  ];

  const target = dialog && dialog.id !== 'all' ? services.find((s) => s.id === dialog.id) ?? null : null;

  return (
    <>
      <HeaderActions>
        <Button variant="primary" icon="users" onClick={() => setDialog({ id: 'all' })}>Change account for all services</Button>
      </HeaderActions>
      <SetCard>
        <p className="user-service-settings-lead">Lepide services run under these Windows accounts. The account needs local administrator rights on this server and read access to the audited components.</p>
        <DataTable flat columns={columns} rows={services} rowKey={(r) => r.id} noun={['service', 'services']} />
      </SetCard>
      <ServiceAccountDialog open={!!dialog} service={target} onClose={() => setDialog(null)}
        onApply={(account, startup) => {
          if (target) patch(target.id, { account, startup: startup ?? target.startup });
          else servicesStore.set((s) => ({ services: s.services.map((x) => ({ ...x, account })) }));
          setDialog(null);
          toast({ variant: 'success', title: 'Service account updated', message: `${target ? target.name : 'All Lepide services'} will log on as ${account} after the next restart.` });
        }} />
    </>
  );
}

/* ---------------- DLG-SAD-48 · Service Account ---------------- */
function ServiceAccountDialog({ open, service, onClose, onApply }: {
  open: boolean; service: Service | null; onClose: () => void; onApply: (account: string, startup?: string) => void;
}) {
  const toast = useToast();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [startup, setStartup] = useState('');
  const [tried, setTried] = useState(false);
  const [testing, setTesting] = useState(false);
  useEffect(() => {
    if (!open) return;
    setUser(service && service.account !== 'LocalSystem' ? service.account : '');
    setPassword(''); setConfirm(''); setTried(false); setTesting(false);
    setStartup(service?.startup ?? '');
  }, [open, service?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const u = user.trim();
  const errUser = !u ? 'Enter the account.' : !DOMAIN_USER_RE.test(u) ? 'Use the "domain\\user name" format.' : null;
  const errPw = !password ? 'Enter the password.' : null;
  const errConfirm = !errPw && confirm !== password ? 'Passwords don’t match.' : null;
  const invalid = !!(errUser || errPw || errConfirm);

  const test = async () => {
    setTried(true);
    if (invalid) return;
    setTesting(true);
    await wait(800);
    setTesting(false);
    toast({ variant: 'success', title: 'Credentials verified', message: `${u} can log on as a service.` });
  };
  const apply = () => {
    setTried(true);
    if (invalid) return;
    onApply(u, service ? startup : undefined);
  };

  return (
    <Modal open={open} onClose={onClose} title={service ? `Service Account — ${service.name}` : 'Change account for all services'} icon="user" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={apply}>Apply</Button></>}>
      <TextField label="User Name" placeholder="domain\user name" value={user} autoComplete="off" onChange={setUser}
        help={'Please enter user name in "domain\\user name" format'} error={tried ? errUser : null} />
      <div className="fld-row">
        <PasswordField label="Password" value={password} autoComplete="new-password" onChange={setPassword} error={tried ? errPw : null} />
        <PasswordField label="Confirm password" value={confirm} autoComplete="new-password" onChange={setConfirm} error={tried ? errConfirm : null} />
      </div>
      {service && <SelectField label="Startup type" value={startup} options={STARTUP_TYPES} onChange={setStartup} />}
      <div><Button icon="shield" loading={testing} onClick={() => void test()}>Test credentials</Button></div>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Banner, Button, Checkbox, Modal, NumberField, PasswordField, SelectField, TextAreaField, TextField, useToast } from '../../ui';
import {
  addAgentServer, addDeliveryAccount, addScriptAccountName, deliveryStore, updateDeliveryAccount, type DeliveryAccount,
} from '../../stores/deliveryAccounts';
import { EMAIL_RE, IPV4_RE, MOBILE_APP_ID, renameAccountInAlerts } from './model';
import { parseDetails } from './parts';

/* DLG-DET-12 … DLG-DET-17 — delivery / account dialogs. Fields reset every time a dialog opens (AC-DET-110).
   Edit mode (GAP-DET-07 intended) reopens DLG-DET-12 / 13 / 16 prefilled from the account record. */

const digits = (max: number, set: (v: number | '') => void) => (v: number | '') => {
  if (v === '') return set('');
  if (!Number.isInteger(v) || v < 0 || String(v).length > max) return;
  set(v);
};

/** Shared "Account updated" feedback for the edit mode of the account dialogs. */
function useUpdated() {
  const toast = useToast();
  return (acc: DeliveryAccount, name: string, details: string) => {
    updateDeliveryAccount(acc.id, { name, details });
    renameAccountInAlerts(acc.name, name, acc.type);
    toast({ variant: 'success', title: 'Account updated', message: `${name} was updated.` });
  };
}

/* ---------------- DLG-DET-12 · Configure New Email Account ---------------- */
export function EmailAccountDialog({ open, onClose, onCreated, editing }: {
  open: boolean; onClose: () => void; onCreated?: (a: DeliveryAccount) => void; editing?: DeliveryAccount | null;
}) {
  const toast = useToast();
  const updated = useUpdated();
  const blank = { mfa: false, display: '', sender: '', reqAuth: true, logon: '', password: '', recipient: '', tenant: '', client: '', secret: '', server: '', port: 25 as number | '', ssl: false };
  const [f, setF] = useState(blank);
  const [test, setTest] = useState<null | 'ok' | 'bad'>(null);
  useEffect(() => {
    if (!open) return;
    setTest(null);
    if (editing) {
      const d = parseDetails(editing.details);
      const mfa = d['MFA'] === 'Yes';
      setF({
        ...blank, mfa, display: editing.name, sender: d["Sender's Email"] ?? '', tenant: d['Tenant ID'] ?? '',
        reqAuth: !mfa && (d['Login'] ?? '—') !== '—', logon: d['Login'] && d['Login'] !== '—' ? d['Login'] : '',
        server: d['Server'] ?? '', ssl: d['SSL Connection'] === 'SSL', port: d['Port'] ? Number(d['Port']) || '' : 25,
      });
    } else setF(blank);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => { setF((s) => ({ ...s, [k]: v })); setTest(null); };

  // GAP-DET-04 intended: Sender's Email ID (and Recipient's Email ID in MFA mode) use the wizard's email pattern.
  const senderBad = f.sender.trim() !== '' && !EMAIL_RE.test(f.sender.trim());
  const recipientBad = f.mfa && f.recipient.trim() !== '' && !EMAIL_RE.test(f.recipient.trim());
  const valid = f.display.trim() !== '' && f.sender.trim() !== '' && !senderBad && !recipientBad
    && (f.mfa ? f.tenant.trim() !== '' && f.client.trim() !== '' && f.secret !== '' : f.server.trim() !== '');

  const done = () => {
    if (!valid) return;
    const name = f.display.trim();
    const details = f.mfa
      ? `Display Name: ${name} · Sender's Email: ${f.sender.trim()} · Tenant ID: ${f.tenant.trim()} · MFA: Yes`
      : `Display Name: ${name} · Sender's Email: ${f.sender.trim()} · Login: ${(f.reqAuth && f.logon.trim()) || '—'} · Server: ${f.server.trim()} · SSL Connection: ${f.ssl ? 'SSL' : 'None'} · Port: ${f.port}`;
    if (editing) updated(editing, name, details);
    else {
      const acc = addDeliveryAccount({ name, type: 'Email', details });
      toast({ variant: 'success', title: 'Email account added', message: `${name} can now send alerts.` });
      onCreated?.(acc);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Email Account' : 'Configure New Email Account'} icon="mail" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={done}>{editing ? 'Save' : 'Done'}</Button></>}>
      <Checkbox checked={f.mfa} onChange={(v) => set('mfa', v)} label="Multi-Factor Authentication" />
      <div className="detect-cols">
        <div className="detect-col">
          <h4 className="detect-h">User Information</h4>
          <TextField label="Display Name" value={f.display} onChange={(v) => set('display', v)} />
          <TextField label="Sender's Email ID" type="email" value={f.sender} onChange={(v) => set('sender', v)}
            error={senderBad ? `"${f.sender.trim()}" is not a valid email address.` : null} />
          {!f.mfa ? (
            <>
              <Checkbox checked={f.reqAuth} onChange={(v) => set('reqAuth', v)} label="Required authentication" />
              <TextField label="Logon Name" value={f.logon} disabled={!f.reqAuth} onChange={(v) => set('logon', v)} />
              <PasswordField label="Password" value={f.password} disabled={!f.reqAuth} autoComplete="new-password" onChange={(v) => set('password', v)} />
            </>
          ) : (
            <>
              <TextField label="Recipient's Email ID" type="email" value={f.recipient} onChange={(v) => set('recipient', v)}
                error={recipientBad ? `"${f.recipient.trim()}" is not a valid email address.` : null} />
              <h4 className="detect-h">Tenant Information</h4>
              <TextField label="Tenant ID" value={f.tenant} onChange={(v) => set('tenant', v)} />
              <TextField label="Client ID" value={f.client} onChange={(v) => set('client', v)} />
              <PasswordField label="Secret Key" value={f.secret} autoComplete="new-password" onChange={(v) => set('secret', v)} />
            </>
          )}
        </div>
        <div className="detect-col">
          {!f.mfa && (
            <>
              <h4 className="detect-h">Server Information</h4>
              <TextField label="Server Name/IP" value={f.server} onChange={(v) => set('server', v)} />
              <NumberField label="Port" value={f.port} min={0} max={99999} onChange={digits(5, (v) => set('port', v))} />
              <Checkbox checked={f.ssl} onChange={(v) => set('ssl', v)} label="Requires a Secure Connection (SSL)" />
            </>
          )}
          <div className="detect-test">
            <h4 className="detect-h">Test Settings</h4>
            <p className="detect-lead">After filling out the information on the screen, we recommend that you test your account by clicking the button below. (Requires network connection)</p>
            <div><Button icon="send" onClick={() => setTest(valid ? 'ok' : 'bad')}>Send test email</Button></div>
            {test === 'ok' && <Banner tone="success"><b>Send test email</b> A test email was sent from {f.sender.trim()}.</Banner>}
            {test === 'bad' && <Banner tone="error"><b>Send test email</b> Fill in the account details first.</Banner>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- DLG-DET-13 · Add App Account ---------------- */
/** Decorative pairing-code artwork drawn from the App ID (not scannable — prototype). */
function PairingCode({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    const n = 21; const out: [number, number][] = []; let h = 2166136261;
    const finder = (x: number, y: number) => [[0, 0], [n - 7, 0], [0, n - 7]].find(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const f = finder(x, y);
      if (f) {
        const dx = x - f[0], dy = y - f[1];
        if (dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)) out.push([x, y]);
        continue;
      }
      h ^= seed.charCodeAt((x * 7 + y * 13) % seed.length) + x * 31 + y; h = Math.imul(h, 16777619) >>> 0;
      if (h % 5 < 2) out.push([x, y]);
    }
    return out;
  }, [seed]);
  return (
    <span className="detect-qr" role="img" aria-label="App pairing code">
      <svg viewBox="0 0 21 21" aria-hidden="true" shapeRendering="crispEdges">
        {cells.map(([x, y]) => <rect key={x + '-' + y} x={x} y={y} width="1" height="1" fill="currentColor" />)}
      </svg>
    </span>
  );
}

export function AppAccountDialog({ open, onClose, onCreated, editing }: {
  open: boolean; onClose: () => void; onCreated?: (a: DeliveryAccount) => void; editing?: DeliveryAccount | null;
}) {
  const toast = useToast();
  const updated = useUpdated();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => { if (open) { setUser(editing?.name ?? ''); setPassword(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const valid = user.trim() !== '' && password !== '';
  const done = () => {
    if (!valid) return;
    const name = user.trim();
    const details = `User ID: ${name} · Mobile App ID: ${MOBILE_APP_ID}`;
    if (editing) updated(editing, name, details);
    else {
      const acc = addDeliveryAccount({ name, type: 'App', details });
      toast({ variant: 'success', title: 'App account added', message: `${name} will receive alerts on the Lepide app.` });
      onCreated?.(acc);
    }
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit App Account' : 'Add app account'} icon="user" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={done}>{editing ? 'Save' : 'Done'}</Button></>}>
      <p className="detect-lead">Please enter login credentials for using both Windows and Mobile App</p>
      <TextField label="User ID" value={user} onChange={setUser} />
      <PasswordField label="Password" value={password} autoComplete="new-password" onChange={setPassword} />
      <TextField label="Mobile app ID" value={MOBILE_APP_ID} readOnly className="mono" />
      <div className="detect-app">
        <PairingCode seed={MOBILE_APP_ID} />
        <p className="detect-lead">Note: Use this App ID to configure App on Android, iOS and Windows</p>
      </div>
    </Modal>
  );
}

/* ---------------- DLG-DET-14 · Add new Account to be used to execute script ---------------- */
export function ScriptAccountDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (name: string) => void }) {
  const [name, setName] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => { if (open) { setName(''); setUser(''); setPassword(''); } }, [open]);
  const valid = name.trim() !== '' && user.includes('\\') && password !== '';
  const done = () => {
    if (!valid) return;
    addScriptAccountName(name.trim());
    onCreated?.(name.trim());
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add new Account to be used to execute script" icon="key" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={done}>Done</Button></>}>
      <TextField label="Account name" value={name} onChange={setName} />
      <TextField label="User Name" placeholder="domain\user name" value={user} onChange={setUser} help={'Please enter user name in "domain\\user name" format'} />
      <PasswordField label="Password" value={password} autoComplete="new-password" onChange={setPassword} />
    </Modal>
  );
}

/* ---------------- DLG-DET-15 · Configure Notification Email Account ---------------- */
export function NotificationEmailDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (summary: string) => void }) {
  const accounts = deliveryStore.use((s) => s.accounts);
  const emails = accounts.filter((a) => a.type === 'Email').map((a) => a.name);
  const [sender, setSender] = useState('');
  const [recipients, setRecipients] = useState('');
  const [adding, setAdding] = useState(false);
  useEffect(() => { if (open) { setSender(''); setRecipients(''); setAdding(false); } }, [open]);
  const valid = sender !== '' && recipients.trim() !== '';
  const done = () => { if (!valid) return; onDone(`${sender} → ${recipients.trim()}`); onClose(); };
  return (
    <>
      <Modal open={open && !adding} onClose={onClose} title="Configure notification email account" icon="bell" size="sm"
        footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={done}>Done</Button></>}>
        <div className="detect-inline-field">
          <SelectField label="Sender email account" placeholder="Select" options={emails} value={sender} onChange={setSender} />
          <Button icon="plus" onClick={() => setAdding(true)}>Add new email account</Button>
        </div>
        <TextAreaField label="Recipient's email" value={recipients} onChange={setRecipients} help={'Separate multiple email by ","'} />
      </Modal>
      <EmailAccountDialog open={open && adding} onClose={() => setAdding(false)} onCreated={(a) => setSender(a.name)} />
    </>
  );
}

/* ---------------- DLG-DET-16 · Add SIEM Account ---------------- */
export function SiemAccountDialog({ open, onClose, onCreated, editing }: {
  open: boolean; onClose: () => void; onCreated?: (a: DeliveryAccount) => void; editing?: DeliveryAccount | null;
}) {
  const toast = useToast();
  const updated = useUpdated();
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState<number | ''>(514);
  const [cef, setCef] = useState(false);
  useEffect(() => {
    if (!open) return;
    const d = editing ? parseDetails(editing.details) : {};
    setName(editing?.name ?? ''); setIp(d['IP Address'] ?? ''); setPort(d['Port'] ? Number(d['Port']) || '' : 514); setCef(d['CEF Format'] === 'Yes');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const ipOk = IPV4_RE.test(ip.trim());
  const valid = name.trim() !== '' && ipOk && port !== '';
  const submit = () => {
    if (!valid) return;
    const n = name.trim();
    const details = `IP Address: ${ip.trim()} · Port: ${port} · CEF Format: ${cef ? 'Yes' : 'No'}`;
    if (editing) updated(editing, n, details);
    else {
      const acc = addDeliveryAccount({ name: n, type: 'SIEM', details });
      toast({ variant: 'success', title: 'SIEM account added', message: `Alerts can now be sent to ${n}.` });
      onCreated?.(acc);
    }
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit SIEM Account' : 'Add SIEM Account'} icon="server" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={submit}>{editing ? 'Save' : 'Submit'}</Button></>}>
      <TextField label="Name" value={name} onChange={setName} />
      <TextField label="IP Address" placeholder="192.168.30.90" value={ip} onChange={setIp}
        error={ip.trim() !== '' && !ipOk ? 'Enter an IPv4 address, e.g. 192.168.30.90' : null} />
      <NumberField label="Port number" value={port} min={0} max={99999} onChange={digits(5, setPort)} />
      <Checkbox checked={cef} onChange={setCef} label="CEF Format" />
    </Modal>
  );
}

/* ---------------- DLG-DET-17 · Add Agent ---------------- */
export function AgentDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (ip: string) => void }) {
  const [ip, setIp] = useState('');
  const [path, setPath] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => { if (open) { setIp(''); setPath(''); setUser(''); setPassword(''); } }, [open]);
  const valid = IPV4_RE.test(ip.trim()) && path.startsWith('\\\\') && user.trim() !== '' && password !== '';
  const done = () => {
    if (!valid) return;
    addAgentServer(ip.trim());
    onCreated?.(ip.trim());
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add agent" icon="server" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={done}>Done</Button></>}>
      <TextField label="IP Address" placeholder="192.168.30.90" value={ip} onChange={setIp} />
      <TextField label="Agent Path" placeholder={'\\\\192.168.30.90\\share'} value={path} onChange={setPath} help={'Use "\\\\server name\\share name" format'} />
      <TextField label="User Name" placeholder={'\\\\ldsp2\\ishan'} value={user} onChange={setUser} help={'Use "\\\\Domain name\\User name" format'} />
      <PasswordField label="Password" value={password} autoComplete="new-password" onChange={setPassword} />
    </Modal>
  );
}

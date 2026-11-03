import { useEffect, useMemo, useState } from 'react';
import detect from '../../../../data/detect.json';
import { Button, Checkbox, Modal, NumberField, PasswordField, TextField, useToast } from '../../../../ui';
import { addDeliveryAccount, deliveryStore, type DeliveryAccount } from '../../../../stores/deliveryAccounts';
import { DOMAIN_USER_RE, EMAIL_RE, digitsGuard } from './util';
import './shared.css';

/* Detect-owned dialogs reached from MOD-SAD (contract: modules/detect/screens.md DLG-DET-12…14).
   They write the shared Detect delivery-account store (src/stores/deliveryAccounts.ts). */

export const MOBILE_APP_ID = detect.exports.MOBILE_APP_ID as string;

/* ---------------- DLG-DET-12 · Configure New Email Account ---------------- */
export function EmailAccountDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated?: (a: DeliveryAccount) => void;
}) {
  const toast = useToast();
  const blank = { mfa: false, display: '', sender: '', reqAuth: true, logon: '', password: '', recipient: '', tenant: '', client: '', secret: '', server: '', port: 25 as number | '', ssl: false };
  const [f, setF] = useState(blank);
  useEffect(() => { if (open) setF(blank); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setF((s) => ({ ...s, [k]: v }));

  // GAP-DET-04 intended: Sender's Email ID (and Recipient's Email ID in MFA mode) must be valid emails.
  const senderBad = f.sender.trim() !== '' && !EMAIL_RE.test(f.sender.trim());
  const recipientBad = f.mfa && f.recipient.trim() !== '' && !EMAIL_RE.test(f.recipient.trim());
  const valid = f.display.trim() !== '' && f.sender.trim() !== '' && !senderBad && !recipientBad
    && (f.mfa ? f.tenant.trim() !== '' && f.client.trim() !== '' && f.secret !== '' : f.server.trim() !== '');

  const done = () => {
    if (!valid) return;
    const name = f.display.trim();
    const details = f.mfa
      ? `Display Name: ${name} · Sender's Email: ${f.sender.trim()} · Tenant ID: ${f.tenant.trim()} · MFA: Yes`
      : `Display Name: ${name} · Sender's Email: ${f.sender.trim()} · Login: ${(f.reqAuth && f.logon.trim()) || '—'} · Server: ${f.server.trim()} · SSL Connection: ${f.ssl ? 'SSL' : 'None'} · Port: ${f.port === '' ? '' : f.port}`;
    const acc = addDeliveryAccount({ name, type: 'Email', details });
    toast({ variant: 'success', title: 'Email account added', message: `${name} can now send alerts.` });
    onCreated?.(acc);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Configure New Email Account" icon="mail" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={done}>Done</Button></>}>
      <Checkbox checked={f.mfa} onChange={(v) => set('mfa', v)} label="Multi-Factor Authentication" />
      <div className="configure-notifications-cols">
        <div className="configure-notifications-col">
          <h4 className="configure-notifications-h">User Information</h4>
          <TextField label="Display Name" value={f.display} onChange={(v) => set('display', v)} />
          <TextField label="Sender's Email ID" type="email" value={f.sender} onChange={(v) => set('sender', v)} className={senderBad ? 'is-bad' : undefined} aria-invalid={senderBad || undefined} />
          {!f.mfa ? (
            <>
              <Checkbox checked={f.reqAuth} onChange={(v) => set('reqAuth', v)} label="Required Authentication" />
              <TextField label="Logon Name" value={f.logon} disabled={!f.reqAuth} onChange={(v) => set('logon', v)} />
              <PasswordField label="Password" value={f.password} disabled={!f.reqAuth} autoComplete="new-password" onChange={(v) => set('password', v)} />
            </>
          ) : (
            <>
              <TextField label="Recipient's Email ID" type="email" value={f.recipient} onChange={(v) => set('recipient', v)} className={recipientBad ? 'is-bad' : undefined} aria-invalid={recipientBad || undefined} />
              <h4 className="configure-notifications-h">Tenant Information</h4>
              <TextField label="Tenant ID" value={f.tenant} onChange={(v) => set('tenant', v)} />
              <TextField label="Client ID" value={f.client} onChange={(v) => set('client', v)} />
              <PasswordField label="Secret Key" value={f.secret} autoComplete="new-password" onChange={(v) => set('secret', v)} />
            </>
          )}
        </div>
        <div className="configure-notifications-col">
          {!f.mfa && (
            <>
              <h4 className="configure-notifications-h">Server Information</h4>
              <TextField label="Server Name/IP" value={f.server} onChange={(v) => set('server', v)} />
              <NumberField label="Port" value={f.port} min={0} max={99999} onChange={digitsGuard(5, (v) => set('port', v))} />
              <Checkbox checked={f.ssl} onChange={(v) => set('ssl', v)} label="Requires a Secure Connection (SSL)" />
            </>
          )}
          <div className="configure-notifications-test">
            <h4 className="configure-notifications-h">Test Settings</h4>
            <p className="configure-notifications-lead">After filling out the information on the screen, we recommend that you test your account by clicking the button below. (Requires network connection)</p>
            <Button icon="send" onClick={() => toast(valid
              ? { variant: 'success', title: 'Send test email', message: `A test email was sent from ${f.sender.trim()}.` }
              : { variant: 'error', title: 'Send test email', message: 'Fill in the account details first.' })}>Send test email</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- DLG-DET-13 · Add App Account ---------------- */
/** Decorative pairing-code artwork (not scannable — prototype). Drawn from the App ID. */
function PairingCode({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    const out: [number, number][] = [];
    const n = 21;
    const finder = (x: number, y: number) => [[0, 0], [n - 7, 0], [0, n - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (finder(x, y)) {
          const [fx, fy] = x < 7 && y < 7 ? [0, 0] : x >= n - 7 ? [n - 7, 0] : [0, n - 7];
          const dx = x - fx, dy = y - fy;
          const ring = dx === 0 || dy === 0 || dx === 6 || dy === 6;
          const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
          if (ring || core) out.push([x, y]);
          continue;
        }
        h ^= seed.charCodeAt((x * 7 + y * 13) % seed.length) + x * 31 + y;
        h = Math.imul(h, 16777619) >>> 0;
        if (h % 5 < 2) out.push([x, y]);
      }
    }
    return out;
  }, [seed]);
  return (
    <span className="configure-notifications-qr" role="img" aria-label="App pairing code">
      <svg viewBox="0 0 21 21" aria-hidden="true" shapeRendering="crispEdges">
        {cells.map(([x, y]) => <rect key={x + '-' + y} x={x} y={y} width="1" height="1" fill="currentColor" />)}
      </svg>
    </span>
  );
}

export function AppAccountDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated?: (a: DeliveryAccount) => void;
}) {
  const toast = useToast();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => { if (open) { setUser(''); setPassword(''); } }, [open]);
  const valid = user.trim() !== '' && password !== '';
  const done = () => {
    if (!valid) return;
    const name = user.trim();
    const acc = addDeliveryAccount({ name, type: 'App', details: `User ID: ${name} · Mobile App ID: ${MOBILE_APP_ID}` });
    toast({ variant: 'success', title: 'App account added', message: `${name} will receive alerts on the Lepide app.` });
    onCreated?.(acc);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add app account" icon="user" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={done}>Done</Button></>}>
      <p className="configure-notifications-lead">Please enter login credentials for using both Windows and Mobile App</p>
      <TextField label="User ID" value={user} onChange={setUser} />
      <PasswordField label="Password" value={password} autoComplete="new-password" onChange={setPassword} />
      <TextField label="Mobile App ID" value={MOBILE_APP_ID} readOnly className="mono" />
      <div className="configure-notifications-app">
        <PairingCode seed={MOBILE_APP_ID} />
        <p className="configure-notifications-lead">Note: Use this App ID to configure App on Android, iOS and Windows</p>
      </div>
    </Modal>
  );
}

/* ---------------- DLG-DET-14 · Add new Account to be used to execute script ---------------- */
export const addScriptAccount = (name: string) =>
  deliveryStore.set((s) => (s.scriptAccounts.includes(name) ? s : { ...s, scriptAccounts: [...s.scriptAccounts, name] }));

export function ScriptAccountDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated?: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => { if (open) { setName(''); setUser(''); setPassword(''); } }, [open]);
  const valid = name.trim() !== '' && user.includes('\\') && password !== '';
  const done = () => {
    if (!valid) return;
    addScriptAccount(name.trim());
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

export { DOMAIN_USER_RE };

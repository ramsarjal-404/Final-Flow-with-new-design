import { useState } from 'react';
import {
  Button, Checkbox, Modal, NumberField, PasswordField, SelectField, TextAreaField, TextField, useToast,
} from '../../../ui';
import { addDeliveryAccount, deliveryStore } from '../../../stores/deliveryAccounts';
import type { DeliveryAccount } from '../../../stores/deliveryAccounts';

/* Detect-owned dialogs used by the Subscription wizard (modules/detect/screens.md):
   DLG-DET-12 Configure New Email Account and DLG-DET-15 Configure Notification Email Account.
   Built here because no shared implementation exists yet; they read and write the shared
   delivery-account store. Fields reset every time they open (mounted only while open). */

const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

export function EmailAccountDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (a: DeliveryAccount) => void }) {
  const toast = useToast();
  const [mfa, setMfa] = useState(false);
  const [display, setDisplay] = useState('');
  const [sender, setSender] = useState('');
  const [reqAuth, setReqAuth] = useState(true);
  const [logon, setLogon] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [port, setPort] = useState<number | ''>(25);
  const [ssl, setSsl] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [tenant, setTenant] = useState('');
  const [client, setClient] = useState('');
  const [secret, setSecret] = useState('');

  // GAP-DET-04 intended: the sender (and an MFA recipient, when given) must be an email address.
  const senderOk = EMAIL.test(sender.trim());
  const valid = !!display.trim() && senderOk && (mfa
    ? !!tenant.trim() && !!client.trim() && !!secret && (!recipient.trim() || EMAIL.test(recipient.trim()))
    : !!server.trim());

  const done = () => {
    if (!valid) return;
    const name = display.trim();
    const details = mfa
      ? `Display Name: ${name} · Sender's Email: ${sender.trim()} · Tenant ID: ${tenant.trim()} · MFA: Yes`
      : `Display Name: ${name} · Sender's Email: ${sender.trim()} · Login: ${reqAuth && logon.trim() ? logon.trim() : '—'} · Server: ${server.trim()} · SSL Connection: ${ssl ? 'SSL' : 'None'} · Port: ${port}`;
    const acc = addDeliveryAccount({ name, type: 'Email', details });
    toast({ variant: 'success', title: 'Email account added', message: `${name} can now send alerts.` });
    onCreated(acc);
  };
  const test = () => (valid
    ? toast({ variant: 'success', title: 'Send test email', message: `A test email was sent from ${sender.trim()}.` })
    : toast({ variant: 'error', title: 'Send test email', message: 'Fill in the account details first.' }));

  return (
    <Modal open onClose={onClose} title="Configure new email account" icon="mail" size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={done}>Done</Button></>}>
      <Checkbox label="Multi-Factor Authentication" checked={mfa} onChange={setMfa} />
      <div className="grid2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <p className="section-label">User Information</p>
          <TextField label="Display Name" value={display} onChange={setDisplay} />
          <TextField label="Sender's Email ID" type="email" value={sender} onChange={setSender}
            error={sender.trim() && !senderOk ? `"${sender.trim()}" is not a valid email address.` : null} />
          {!mfa ? (
            <>
              <Checkbox label="Required authentication" checked={reqAuth} onChange={setReqAuth} />
              <TextField label="Logon Name" value={logon} disabled={!reqAuth} onChange={setLogon} />
              <PasswordField label="Password" value={password} disabled={!reqAuth} onChange={setPassword} />
            </>
          ) : (
            <>
              <TextField label="Recipient's Email ID" type="email" value={recipient} onChange={setRecipient} />
              <p className="section-label">Tenant Information</p>
              <TextField label="Tenant ID" value={tenant} onChange={setTenant} />
              <TextField label="Client ID" value={client} onChange={setClient} />
              <PasswordField label="Secret Key" value={secret} onChange={setSecret} />
            </>
          )}
        </div>
        <div className="stack">
          {!mfa && (
            <>
              <p className="section-label">Server Information</p>
              <TextField label="Server Name/IP" value={server} onChange={setServer} />
              <NumberField label="Port" value={port} min={0} max={99999}
                onChange={(v) => { if (v === '' || (Number.isInteger(v) && v >= 0 && String(v).length <= 5)) setPort(v); }} />
              <Checkbox label="Requires a Secure Connection (SSL)" checked={ssl} onChange={setSsl} />
            </>
          )}
          <p className="section-label">Test Settings</p>
          <p className="muted text-sm" style={{ margin: 0 }}>After filling out the information on the screen, we recommend that you test your account by clicking the button below. (Requires network connection)</p>
          <div><Button icon="send" onClick={test}>Send test email</Button></div>
        </div>
      </div>
    </Modal>
  );
}

export function NotificationEmailDialog({ onClose, onDone, onNested }: {
  onClose: () => void; onDone: (summary: string) => void; onNested?: (open: boolean) => void;
}) {
  const accounts = deliveryStore.use((s) => s.accounts);
  const [sender, setSender] = useState('');
  const [recipients, setRecipients] = useState('');
  const [adding, setAdding] = useState(false);
  const emailNames = accounts.filter((a) => a.type === 'Email').map((a) => a.name);
  const valid = !!sender && !!recipients.trim();
  const setAdd = (v: boolean) => { setAdding(v); onNested?.(v); };
  return (
    <>
      <Modal open={!adding} onClose={onClose} title="Configure notification email account" icon="bell" size="md"
        footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={() => onDone(`${sender} → ${recipients.trim()}`)}>Done</Button></>}>
        <div className="subscription-inline">
          <SelectField label="Sender email account" placeholder="Select" options={emailNames} value={sender} onChange={setSender} className="grow" />
          <Button icon="plus" onClick={() => setAdd(true)}>Add new email account</Button>
        </div>
        <TextAreaField label="Recipient's email" rows={4} value={recipients} onChange={setRecipients} help={'Separate multiple email by ","'} />
      </Modal>
      {adding && (
        <EmailAccountDialog onClose={() => setAdd(false)} onCreated={(a) => { setSender(a.name); setAdd(false); }} />
      )}
    </>
  );
}

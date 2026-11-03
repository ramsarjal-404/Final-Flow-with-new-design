import { useState } from 'react';
import { Button, Checkbox, PasswordField, SelectField, SetCard, TextField, useToast } from '../../../ui';
import { EMPTY_EMAIL, protectStore, type EmailConfig } from './store';

/* SCR-SDS-21 sub-view Email Configuration (FLW-SDS-25). Saved values are kept in the Protect store
   and prefilled when the view is reopened (GAP-SDS-14 intended). */
type Key = Exclude<keyof EmailConfig, 'graph' | 'auth'>;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailView() {
  const toast = useToast();
  const saved = protectStore.use((s) => s.email);
  const [f, setF] = useState<EmailConfig>(() => ({ ...(saved ?? EMPTY_EMAIL) }));
  const [err, setErr] = useState<Partial<Record<Key, string>>>({});

  const set = (k: Key, v: string) => { setF((x) => ({ ...x, [k]: v })); if (err[k]) setErr(({ [k]: _, ...r }) => r); };
  const required = (): Key[] => f.graph
    ? ['displayName', 'sender', 'recipient', 'tenant', 'client', 'secret']
    : ['displayName', 'sender', ...(f.auth ? ['logon', 'password'] as Key[] : []), 'server', 'port', 'ssl'];

  const validate = () => {
    const e: Partial<Record<Key, string>> = {};
    for (const k of required()) if (!f[k].trim()) e[k] = 'Required';
    if (!e.sender && !EMAIL_RE.test(f.sender.trim())) e.sender = 'Enter a valid email address';
    if (f.graph && !e.recipient && !EMAIL_RE.test(f.recipient.trim())) e.recipient = 'Enter a valid email address';
    if (!f.graph && !e.port && !/^\d{1,5}$/.test(f.port.trim())) e.port = 'Port must be a number';
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const test = () => {
    if (!validate()) return;
    toast({ variant: 'info', title: 'Test email sent', message: `Check ${f.graph ? f.recipient.trim() : f.sender.trim()} for the Lepide test message.` });
  };
  const save = () => {
    if (!validate()) return;
    protectStore.set((s) => ({ ...s, email: { ...f } }));
    toast({ variant: 'success', title: 'Email configuration saved', message: `Team notifications are sent from ${f.sender.trim()}.` });
  };

  const text = (k: Key, label: string, placeholder?: string) =>
    <TextField label={label} value={f[k]} placeholder={placeholder} error={err[k]} maxLength={255} onChange={(v) => set(k, v)} />;

  return (
    <SetCard title="Please configure email id"
      footer={<>
        <Button icon="send" onClick={test}>Send test email</Button>
        <Button variant="primary" onClick={save}>Save</Button>
      </>}>
      <div className="page-form stack">
        <Checkbox label="Microsoft 365 GraphAPI SMTP" checked={f.graph} onChange={(v) => { setF((x) => ({ ...x, graph: v })); setErr({}); }} />
        {f.graph ? (
          <>
            <div className="grid2">
              <div className="protect-group">
                <h4>User Information</h4>
                {text('displayName', 'Display Name')}
                {text('sender', "Sender's Email ID")}
                {text('recipient', "Recipient's Email ID")}
              </div>
              <div className="protect-group">
                <h4>Tenant Information</h4>
                {text('tenant', 'Tenant ID')}
                {text('client', 'Client ID')}
                <PasswordField label="Secret Key" value={f.secret} error={err.secret} autoComplete="new-password" onChange={(v) => set('secret', v)} />
              </div>
            </div>
            <div className="protect-group">
              <h4>Connection Test</h4>
              <p className="protect-lead">After entering all required information above, click "Send test email" to verify that your email settings are configured correctly.</p>
              <p className="protect-note"><b>Note</b> An active internet connection is required to perform this test</p>
            </div>
          </>
        ) : (
          <div className="grid2">
            <div className="protect-group">
              <h4>User Information</h4>
              {text('displayName', 'Display Name')}
              {text('sender', "Sender's Email ID")}
              <Checkbox label="Requires authentication" checked={f.auth} onChange={(v) => { setF((x) => ({ ...x, auth: v })); setErr(({ logon, password, ...r }) => r); }} />
              {f.auth && (
                <>
                  {text('logon', 'Logon Name')}
                  <PasswordField label="Password" value={f.password} error={err.password} autoComplete="new-password" onChange={(v) => set('password', v)} />
                </>
              )}
            </div>
            <div className="stack">
              <div className="protect-group">
                <h4>Server Information</h4>
                {text('server', 'Server Name/IP')}
                <TextField label="Port" value={f.port} error={err.port} inputMode="numeric" maxLength={5} onChange={(v) => set('port', v)} />
              </div>
              <div className="protect-group">
                <h4>Requires a secure connection (SSL)</h4>
                <SelectField label="SSL type" value={f.ssl} placeholder="Select" options={['None', 'SSL', 'TLS', 'STARTTLS']} error={err.ssl} onChange={(v) => set('ssl', v)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </SetCard>
  );
}

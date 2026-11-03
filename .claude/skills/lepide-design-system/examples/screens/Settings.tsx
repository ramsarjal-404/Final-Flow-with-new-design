import { useState } from 'react';
import {
  Banner, Button, Card, ConfirmDialog, EmptyState, Field, PageHeader, PasswordField, RadioGroup,
  SectionNav, SelectField, SetCard, SettingRow, TextField, Toggle, ToneTag, useToast,
} from '@lepide/ds-react';
import type { IconName, SectionNavItem } from '@lepide/ds-react';

/* Settings (DESIGN.md §4.2): a 260 px sticky SectionNav (.settings > .snav, a dropdown under 860 px) beside a column
   of SetCards. Form cards save with Cancel / Save changes; switches apply at once; the reset is confirmed. */

type Section = SectionNavItem & { icon: IconName };
const SECTIONS: Section[] = [
  { value: 'general', label: 'General', icon: 'settings' },
  { value: 'mail', label: 'Mail server and delivery', icon: 'mail' },
  { value: 'sources', label: 'Data sources', icon: 'server' },
  { value: 'retention', label: 'Data retention', icon: 'database' },
  { value: 'users', label: 'Users and roles', icon: 'users' },
  { value: 'integrations', label: 'Integrations', icon: 'plug' },
  { value: 'licensing', label: 'Licensing', icon: 'key' },
];

type Smtp = { server: string; port: string; encryption: string; username: string; password: string; sender: string };
const SAVED: Smtp = {
  server: 'mail01.corp.lepide.local', port: '587', encryption: 'starttls',
  username: 'svc-lepide-smtp', password: 'stored-secret', sender: 'alerts@lepide-corp.com',
};
const ENCRYPTION = [
  { value: 'starttls', label: 'STARTTLS (recommended)' },
  { value: 'ssl', label: 'SSL/TLS' },
  { value: 'none', label: 'None' },
];
const DIGEST = [
  { value: 'off', label: 'Off' },
  { value: 'daily', label: 'Daily at 08:00' },
  { value: 'weekly', label: 'Weekly on Monday' },
];

type Errors = Partial<Record<keyof Smtp, string>>;
function validateSmtp(v: Smtp): Errors {
  const e: Errors = {};
  if (!v.server.trim()) e.server = 'Enter the SMTP server name.';
  else if (!/^[a-z0-9.-]+$/i.test(v.server.trim())) e.server = 'Use a host name such as mail01.corp.lepide.local.';
  const port = Number(v.port);
  if (!v.port.trim()) e.port = 'Enter a port.';
  else if (!Number.isInteger(port) || port < 1 || port > 65535) e.port = 'Use a port between 1 and 65535.';
  if (!v.sender.trim()) e.sender = 'Enter the address emails are sent from.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.sender.trim())) e.sender = 'Enter a valid email address.';
  if (v.username.trim() && !v.password) e.password = 'Enter the password for this account.';
  return e;
}

export default function Settings() {
  const toast = useToast();
  const [section, setSection] = useState('mail');
  const current = SECTIONS.find((s) => s.value === section) ?? SECTIONS[1];

  // SMTP server form: draft vs saved, errors shown after the first save attempt.
  const [saved, setSaved] = useState<Smtp>(SAVED);
  const [smtp, setSmtp] = useState<Smtp>(SAVED);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const dirty = (Object.keys(smtp) as (keyof Smtp)[]).some((k) => smtp[k] !== saved[k]);
  const set = (k: keyof Smtp) => (v: string) => {
    setSmtp((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const save = () => {
    const e = validateSmtp(smtp);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(smtp);
      toast({ variant: 'success', title: 'Mail server saved', message: `Alerts and reports now go through ${smtp.server}.` });
    }, 900);
  };
  const cancel = () => { setSmtp(saved); setErrors({}); };

  const sendTest = () => {
    const e = validateSmtp(smtp);
    if (Object.keys(e).length) { setErrors(e); toast({ variant: 'error', title: 'Test email', message: 'Fix the highlighted fields first.' }); return; }
    setTesting(true);
    const t = toast({ loading: true, title: 'Sending test email', message: `Connecting to ${smtp.server}:${smtp.port}…` });
    setTimeout(() => {
      setTesting(false);
      t.update({ loading: false, variant: 'success', title: 'Test email sent', message: 'Check the inbox of ann.lee@lepide-corp.com.' });
    }, 1200);
  };

  // Delivery: switches apply immediately; the digest frequency is saved with its own footer.
  const [criticalNow, setCriticalNow] = useState(true);
  const [attachCsv, setAttachCsv] = useState(true);
  const [quietHours, setQuietHours] = useState(false);
  const flip = (name: string, set: (v: boolean) => void) => (v: boolean) => {
    set(v);
    toast({ variant: 'success', message: `${name} turned ${v ? 'on' : 'off'}` });
  };
  const [digestSaved, setDigestSaved] = useState('daily');
  const [digest, setDigest] = useState('daily');

  // Danger zone
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const reset = () => {
    setResetting(true);
    setTimeout(() => {
      const empty: Smtp = { server: '', port: '587', encryption: 'starttls', username: '', password: '', sender: '' };
      setResetting(false);
      setConfirmReset(false);
      setSaved(empty);
      setSmtp(empty);
      setErrors({});
      toast({ variant: 'success', title: 'Mail settings reset', message: 'Email delivery is paused until you add a server.' });
    }, 900);
  };

  const [showBanner, setShowBanner] = useState(true);
  const configured = !!saved.server;

  return (
    <div className="sub">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Settings', to: '/settings' }, { label: current.label }]}
        title={current.label}
        description={section === 'mail' ? 'Where Lepide sends alert emails, scheduled reports and digests from.' : undefined}
      />

      <div className="settings">
        <SectionNav title="Settings" ariaLabel="Settings sections" selectLabel="Settings section"
          value={section} onChange={setSection} items={SECTIONS} />

        <section className="settings__body" aria-label={current.label}>
          {section !== 'mail' ? (
            <Card>
              <EmptyState icon={current.icon} title={current.label}
                message="This golden example fills in only the Mail server and delivery section."
                action={<Button onClick={() => setSection('mail')}>Open mail settings</Button>} />
            </Card>
          ) : (
            <>
              {showBanner && (
                <Banner onClose={() => setShowBanner(false)}
                  action={<Button size="sm" icon="refresh" onClick={() => toast({ variant: 'info', message: 'DNS record still pending. We check again every hour.' })}>Check now</Button>}>
                  The sender domain <b>lepide-corp.com</b> is waiting for its DNS record to be verified. Until then, emails are
                  sent from <b>noreply@corp.lepide.local</b>.
                </Banner>
              )}

              <SetCard
                title="SMTP server"
                description="Used for every email the console sends."
                actions={<>
                  {configured ? <ToneTag tone="good">Connected</ToneTag> : <ToneTag tone="warn">Not configured</ToneTag>}
                  <Button size="sm" icon="send" loading={testing} onClick={sendTest}>Send test email</Button>
                </>}
                footer={<>
                  <span className="lf-muted">{dirty ? 'Unsaved changes' : 'Last saved 2 hours ago by Ann Lee'}</span>
                  <Button onClick={cancel} disabled={!dirty || saving}>Cancel</Button>
                  <Button variant="primary" loading={saving} disabled={!dirty} onClick={save}>Save changes</Button>
                </>}
              >
                <div className="page-form stack">
                  <div className="fld-row">
                    <TextField label="Server" value={smtp.server} onChange={set('server')} error={errors.server}
                      placeholder="mail01.corp.lepide.local" autoComplete="off" />
                    <TextField label="Port" note="Usually 587" value={smtp.port} onChange={set('port')} error={errors.port}
                      inputMode="numeric" />
                  </div>
                  <SelectField label="Encryption" value={smtp.encryption} onChange={set('encryption')} options={ENCRYPTION}
                    help={smtp.encryption === 'none' ? 'Credentials are sent in plain text. Use only on an isolated network.' : undefined} />
                  <div className="fld-row">
                    <TextField label="Username" note="Optional" value={smtp.username} onChange={set('username')} autoComplete="off" />
                    <PasswordField label="Password" value={smtp.password} onChange={set('password')} error={errors.password}
                      autoComplete="new-password" />
                  </div>
                  <TextField label="Sender address" type="email" value={smtp.sender} onChange={set('sender')} error={errors.sender}
                    placeholder="alerts@lepide-corp.com" help="Recipients see this as the From address." />
                </div>
              </SetCard>

              <SetCard
                title="Delivery"
                description="How and when alert emails and digests reach people."
                footer={<>
                  <span className="lf-muted">Switches apply straight away</span>
                  <Button onClick={() => setDigest(digestSaved)} disabled={digest === digestSaved}>Cancel</Button>
                  <Button variant="primary" disabled={digest === digestSaved}
                    onClick={() => { setDigestSaved(digest); toast({ variant: 'success', message: 'Digest frequency saved' }); }}>Save changes</Button>
                </>}
              >
                <div>
                  <SettingRow title="Send critical alerts immediately" help="Critical alerts skip the digest and are emailed as they happen.">
                    <Toggle label="Send critical alerts immediately" checked={criticalNow} onChange={flip('Immediate critical alerts', setCriticalNow)} />
                  </SettingRow>
                  <SettingRow title="Attach report as CSV" help="Scheduled reports include a CSV file as well as the link.">
                    <Toggle label="Attach report as CSV" checked={attachCsv} onChange={flip('CSV attachments', setAttachCsv)} />
                  </SettingRow>
                  <SettingRow title="Quiet hours" help="Hold non-critical emails between 20:00 and 07:00 (UTC+00:00).">
                    <Toggle label="Quiet hours" checked={quietHours} onChange={flip('Quiet hours', setQuietHours)} />
                  </SettingRow>
                </div>
                <Field label="Digest frequency">
                  <RadioGroup ariaLabel="Digest frequency" value={digest} onChange={setDigest} options={DIGEST} />
                </Field>
              </SetCard>

              <SetCard title="Reset mail settings" description="Actions here can't be undone.">
                <SettingRow title="Clear the SMTP configuration"
                  help="Removes the server, credentials and sender address. Alert emails and scheduled reports stop until a new server is added.">
                  <Button variant="danger" icon="trash" disabled={!configured} onClick={() => setConfirmReset(true)}>Reset mail settings</Button>
                </SettingRow>
              </SetCard>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={reset}
        busy={resetting}
        title="Reset mail settings?"
        message={<>Lepide stops sending alert emails and scheduled reports through <b>{saved.server}</b> until you add a server again.</>}
        confirmLabel="Reset mail settings"
      />
    </div>
  );
}

import { useId, useMemo, useState } from 'react';
import { Button, Checkbox, Drawer, Dropdown, Field, IconButton, SelectField, SettingRow, TextAreaField, Toggle, useToast } from '../../../ui';
import { deliveryStore } from '../../../stores/deliveryAccounts';
import { EmailAccountDialog } from './shared/DetectAccountDialogs';
import { EMAIL_RE } from './shared/util';
import { NOTIFY_HOURS, notifyStore, type NotifyComponent, type NotifyConfig } from './store';

const splitRecipients = (s: string) => s.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);

/* DLG-SAD-30 · Notification panel "Configure Notification for {component}" (side panel = Drawer). */
export function NotifyPanel({ component, onClose }: { component: NotifyComponent; onClose: () => void }) {
  const toast = useToast();
  const saved = notifyStore.use((s) => s.configs[component.id]);
  const accounts = deliveryStore.use((s) => s.accounts);
  const emails = useMemo(() => accounts.filter((a) => a.type === 'Email'), [accounts]);
  const [cfg, setCfg] = useState<NotifyConfig>(() => saved
    ? { ...saved, options: [...saved.options] }
    : { options: [], every: '1', sender: '', recipients: '', enabled: true });
  const [addEmail, setAddEmail] = useState(false);
  const everyId = useId();

  const set = <K extends keyof NotifyConfig>(k: K, v: NotifyConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const toggleOpt = (o: string, on: boolean) => set('options', on ? [...cfg.options, o].filter((x, i, a) => a.indexOf(x) === i) : cfg.options.filter((x) => x !== o));
  const senderOk = emails.some((a) => a.id === cfg.sender);
  const list = splitRecipients(cfg.recipients);
  const canApply = cfg.options.length > 0 && senderOk && list.length > 0;

  const apply = () => {
    if (!canApply) return;
    const bad = list.find((x) => !EMAIL_RE.test(x));
    if (bad) {
      toast({ variant: 'error', title: 'Invalid email address', message: `"${bad}" is not a valid email. Separate addresses with commas.` });
      return;
    }
    const recipients = list.join(', ');
    // keep options in the component's order
    const options = component.options.filter((o) => cfg.options.includes(o));
    notifyStore.set((s) => ({ ...s, configs: { ...s.configs, [component.id]: { ...cfg, options, recipients } } }));
    onClose();
    toast({
      variant: 'success', title: 'Notification configured',
      message: cfg.enabled ? `${component.name}: emails every ${cfg.every} hour(s) to ${recipients}.` : `${component.name}: saved with notifications turned off.`,
    });
  };

  return (
    <>
      <Drawer open onClose={onClose} title={`${component.name} notification settings`}
        head={<div className="configure-notifications-panel-head">
          <span className="pick__ic" aria-hidden="true"><img src={component.logo} alt="" /></span>
          <h3>{component.name}</h3>
          <IconButton icon="x" label="Close panel" onClick={onClose} />
        </div>}
        footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!canApply} onClick={apply}>Apply</Button></>}>
        <div className="page-form stack">
          <h4 className="section-label">Configure Notification for {component.name}</h4>
          <div className="stack stack--sm" role="group" aria-label={`Notify options for ${component.name}`}>
            {component.options.map((o) => (
              <Checkbox key={o} label={o} checked={cfg.options.includes(o)} onChange={(v) => toggleOpt(o, v)} />
            ))}
          </div>
          <fieldset className="configure-notifications-fieldset" disabled={cfg.options.length === 0}>
            <legend className="sr-only">Notification delivery</legend>
            <Field label="Notification every" htmlFor={everyId}>
              <div className="row">
                <Dropdown id={everyId} value={cfg.every} onChange={(v) => set('every', v)} style={{ maxWidth: 120 }} options={NOTIFY_HOURS} search={false} />
                <span className="muted text-sm">Hour(s)</span>
              </div>
            </Field>
            <SelectField label="Sender’s Email Account:" placeholder="Select" value={senderOk ? cfg.sender : ''}
              options={emails.map((a) => ({ value: a.id, label: a.name }))} onChange={(v) => set('sender', v)} />
            <div><Button size="sm" icon="plus" onClick={() => setAddEmail(true)}>Add new email account</Button></div>
            <TextAreaField label="Recipient Email Address(es):" rows={5} placeholder="name@company.com" value={cfg.recipients}
              help="Separate multiple email addresses with a comma." onChange={(v) => set('recipients', v)} />
          </fieldset>
          <SettingRow title="Notification status">
            <Toggle label="Notification status" checked={cfg.enabled} onChange={(v) => set('enabled', v)} />
          </SettingRow>
        </div>
      </Drawer>
      <EmailAccountDialog open={addEmail} onClose={() => setAddEmail(false)} onCreated={(a) => set('sender', a.id)} />
    </>
  );
}

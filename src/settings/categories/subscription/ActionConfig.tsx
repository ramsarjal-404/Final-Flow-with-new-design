import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Button, Checkbox, Field, SelectField, TextAreaField, useToast } from '../../../ui';
import { deliveryStore } from '../../../stores/deliveryAccounts';
import { SUB, newId } from '../../../stores/subscription';
import type { DeliveryAction } from '../../../stores/subscription';
import { EmailAccountDialog, NotificationEmailDialog } from './DetectDialogs';

/* DLG-SAD-26 Configure Report Delivery Action (INT-SAD-311 … 324): a view inside the wizard dialog.
   The wizard owns the footer; it calls `submitRef.current()` for "Next". Starts fresh each time. */

const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;
const TITLE = 'Configure Report Delivery Action';

export default function ActionConfig({ submitRef, onAdd, onNested }: {
  submitRef: MutableRefObject<(() => void) | null>; onAdd: (a: DeliveryAction) => void; onNested: (open: boolean) => void;
}) {
  const toast = useToast();
  const accounts = deliveryStore.use((s) => s.accounts);
  const [mechanism, setMechanism] = useState(SUB.DELIVERY_MECHANISMS[0]);
  const [sender, setSender] = useState('');
  const [recipients, setRecipients] = useState('');
  const [formats, setFormats] = useState<string[]>([]);
  const [notifyOn, setNotifyOn] = useState(false);
  const [notify, setNotify] = useState('');
  const [nested, setNested] = useState<null | 'email' | 'notify'>(null);
  const email = mechanism === 'Send Email';
  const emailNames = accounts.filter((a) => a.type === 'Email').map((a) => a.name);
  const entries = recipients.split(',').map((x) => x.trim()).filter(Boolean);
  const invalid = entries.find((e) => !EMAIL.test(e));

  const openNested = (n: null | 'email' | 'notify') => { setNested(n); onNested(n !== null); };

  const submit = () => {
    const err = (message: string) => toast({ variant: 'error', title: TITLE, message });
    if (email) {
      if (!sender) return err("Please select the sender's email account.");
      if (!entries.length) return err("Please enter the recipient's email.");
      if (invalid) return err(`"${invalid}" is not a valid email address.`);
    }
    if (!formats.length) return err('Please select a report format.');
    if (!email && notifyOn && !notify) return err('Click Configure to choose who is notified.');
    const fm = SUB.REPORT_FORMATS.filter((f) => formats.includes(f));
    if (email) {
      const to = entries.join(', ');
      onAdd({ id: newId('act'), kind: 'email', from: sender, to, formats: fm, path: 'N/A' });
      toast({ variant: 'success', title: 'Delivery action added', message: `Reports will be emailed to ${to}.` });
    } else {
      onAdd({ id: newId('act'), kind: 'disk', from: 'N/A', to: 'N/A', formats: fm, path: SUB.DISK_PATH, ...(notifyOn && notify ? { notify } : {}) });
      toast({ variant: 'success', title: 'Delivery action added', message: 'Reports will be saved on disk.' });
    }
  };
  useEffect(() => { submitRef.current = submit; });
  useEffect(() => () => { submitRef.current = null; }, [submitRef]);

  const formatChecks = (
    <Field label="Report Format">
      <div className="row" role="group" aria-label="Report Format" style={{ gap: 18 }}>
        {SUB.REPORT_FORMATS.map((f) => (
          <Checkbox key={f} label={f} checked={formats.includes(f)} onChange={(v) => setFormats((xs) => (v ? [...xs, f] : xs.filter((x) => x !== f)))} />
        ))}
      </div>
    </Field>
  );

  return (
    <div className="stack subscription-action">
      <SelectField label="Delivery mechanism" options={SUB.DELIVERY_MECHANISMS} value={mechanism} onChange={setMechanism} />
      {email ? (
        <>
          <div className="subscription-inline">
            <SelectField label="Sender's Email Account:" placeholder="Select" options={emailNames} value={sender} onChange={setSender} className="grow" />
            <Button icon="plus" onClick={() => openNested('email')}>Add email</Button>
          </div>
          <TextAreaField label="Recipient's Email" rows={5} placeholder="name@company.com" value={recipients} onChange={setRecipients}
            help={'Separate multiple emails by ","'} error={invalid ? `"${invalid}" is not a valid email address.` : null} />
          {formatChecks}
        </>
      ) : (
        <>
          <div className="subscription-disk">
            <p>Your reports will save at this location.</p>
            <code>{SUB.DISK_PATH}</code>
          </div>
          {formatChecks}
          <div className="row row--wrap" style={{ gap: 12 }}>
            <Checkbox label="Notify when report is saved" checked={notifyOn} onChange={(v) => { setNotifyOn(v); if (!v) setNotify(''); }} />
            <Button size="sm" icon="bell" disabled={!notifyOn} onClick={() => openNested('notify')}>Configure</Button>
          </div>
          {notify && <p className="subscription-notify">{notify}</p>}
        </>
      )}
      {nested === 'email' && (
        <EmailAccountDialog onClose={() => openNested(null)} onCreated={(a) => { setSender(a.name); openNested(null); }} />
      )}
      {nested === 'notify' && (
        <NotificationEmailDialog onClose={() => openNested(null)} onDone={(s) => { setNotify(`Notify: ${s}`); openNested(null); }} />
      )}
    </div>
  );
}

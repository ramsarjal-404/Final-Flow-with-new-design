import { useState } from 'react';
import { Button, Checkbox, RadioGroup, SelectField, TextAreaField, TextField } from '../../../ui';
import { deliveryStore } from '../../../stores/deliveryAccounts';
import {
  ALERT_ACTIONS, EMAIL_RE, EMAIL_TO_USER, REPORT_FORMATS, SCRIPT_PARAMETERS, splitEmails, type ActionKind, type ActionSettings, type DeliveryAction,
} from '../model';
import { DetailsText, MiniNumber } from '../parts';
import { AppAccountDialog, EmailAccountDialog, NotificationEmailDialog, ScriptAccountDialog, SiemAccountDialog } from '../AccountDialogs';

/* DLG-DET-09 · Configure Report Delivery Action — a view inside the wizard. */

export type ActionForm = Required<Omit<ActionSettings, 'runAs'>> & { runAs: 'system' | 'account'; kind: ActionKind };

export function freshForm(firstEmail: string): ActionForm {
  return {
    kind: 'Send Email Alert', sender: firstEmail, recipients: '', pastOn: false, pastDays: '7', formats: ['CSV'], content: '', toUser: false,
    userMessage: EMAIL_TO_USER, appAccounts: [], path: '', runAs: 'system', scriptAccount: '', notify: false, notifySummary: '', paramOn: false, param: '', siem: '',
  };
}
export const formFrom = (a: DeliveryAction, firstEmail: string): ActionForm => ({ ...freshForm(firstEmail), ...a.settings, kind: a.kind } as ActionForm);

/** Only the chosen kind's fields go into `settings` (ENT-DET-DeliveryActionSettings). */
export function settingsOf(f: ActionForm): ActionSettings | undefined {
  switch (f.kind) {
    case 'Send Email Alert': return { sender: f.sender, recipients: f.recipients, pastOn: f.pastOn, pastDays: f.pastDays, formats: f.formats, content: f.content, toUser: f.toUser, userMessage: f.userMessage };
    case 'Send Alert to App': return { appAccounts: f.appAccounts };
    case 'Execute Script': return { path: f.path.trim(), runAs: f.runAs, scriptAccount: f.scriptAccount, notify: f.notify, notifySummary: f.notifySummary, paramOn: f.paramOn, param: f.param };
    case 'Send Alert to SIEM': return { siem: f.siem };
    default: return undefined;
  }
}

/** Validation message for "Done", or null. */
export function validateAction(f: ActionForm): string | null {
  switch (f.kind) {
    case 'Send Email Alert': {
      if (!f.sender) return 'Please select the sender email account.';
      const emails = splitEmails(f.recipients);
      if (!emails.length) return "Please enter the recipient's email.";
      const bad = emails.find((e) => !EMAIL_RE.test(e));
      if (bad) return `"${bad}" is not a valid email address.`;
      if (f.pastOn && !f.formats.length) return 'Please select a report format.';
      return null;
    }
    case 'Send Alert to App': return f.appAccounts.length ? null : 'Please add or select an app account.';
    case 'Execute Script':
      if (!f.path.trim()) return 'Please enter local path of script location on LDSP server.';
      if (f.runAs === 'account' && !f.scriptAccount) return 'Please select the account that runs the script.';
      if (f.notify && !f.notifySummary) return 'Click Configure to choose who is notified.';
      return null;
    case 'Send Alert to SIEM': return f.siem ? null : 'Please add or select a SIEM account.';
    default: return null;
  }
}

type Nested = null | 'email' | 'app' | 'script' | 'notify' | 'siem';

export function ActionConfig({ f, set, triedDone }: { f: ActionForm; set: (p: Partial<ActionForm>) => void; triedDone: boolean }) {
  const { accounts, scriptAccounts } = deliveryStore.use();
  const [nested, setNested] = useState<Nested>(null);
  const [pathTouched, setPathTouched] = useState(false);
  const emailAccounts = accounts.filter((a) => a.type === 'Email');
  const appAccounts = accounts.filter((a) => a.type === 'App');
  const siemAccounts = accounts.filter((a) => a.type === 'SIEM');
  const badEmail = splitEmails(f.recipients).find((e) => !EMAIL_RE.test(e));
  const close = () => setNested(null);

  return (
    <>
      <SelectField label="Select Alert Action" options={ALERT_ACTIONS} value={f.kind} onChange={(v) => set({ kind: v as ActionKind })} />

      {f.kind === 'Send Email Alert' && (
        <div className="grid2 detect-action-cols">
          <div className="stack">
            <div className="detect-inline-field">
              <SelectField label="Sender Email Account" placeholder="Select" options={emailAccounts.map((a) => a.name)} value={f.sender} onChange={(v) => set({ sender: v })} />
              <Button icon="plus" onClick={() => setNested('email')}>Add new email account</Button>
            </div>
            <TextAreaField label="Recipient's Email" placeholder="name@company.com" value={f.recipients} onChange={(v) => set({ recipients: v })}
              help={'Separate multiple email by ","'} error={badEmail ? `"${badEmail}" is not a valid email address.` : null} />
          </div>
          <div className="stack">
            <div className="row row--wrap">
              <Checkbox checked={f.pastOn} onChange={(v) => set({ pastOn: v })} label="Send Action for past" />
              <MiniNumber ariaLabel="Days" value={f.pastDays === '' ? '' : Number(f.pastDays)} maxLength={3} disabled={!f.pastOn}
                onChange={(v) => set({ pastDays: v === '' ? '' : String(v) })} />
              <span className="text-sm">Days</span>
            </div>
            <div className="stack stack--sm">
              <span className="fld__lbl">Report Format</span>
              <div className="row" role="group" aria-label="Report Format">
                {REPORT_FORMATS.map((fm) => (
                  <Checkbox key={fm} label={fm} checked={f.formats.includes(fm)} disabled={!f.pastOn}
                    onChange={(c) => set({ formats: c ? REPORT_FORMATS.filter((x) => x === fm || f.formats.includes(x)) : f.formats.filter((x) => x !== fm) })} />
                ))}
              </div>
            </div>
            <TextAreaField label="Email Content" placeholder="Type Description here" value={f.content} onChange={(v) => set({ content: v })} />
            <div className="stack stack--sm">
              <Checkbox checked={f.toUser} onChange={(v) => set({ toUser: v })} label="Send email to user" />
              <TextAreaField aria-label="Email to user" value={f.userMessage} disabled={!f.toUser} onChange={(v) => set({ userMessage: v })} />
              <p className="detect-hint">Note: Send Email to User option is applicable for file Server alerts only</p>
            </div>
          </div>
        </div>
      )}

      {f.kind === 'Show in LiveFeed' && <p className="detect-box detect-hint">Click Done button to set LiveFeed Alert</p>}

      {f.kind === 'Send Alert to App' && (
        <div className="stack">
          <div className="row row--between row--wrap">
            <p className="detect-hint">Select sender's app account, add new account</p>
            <Button icon="plus" onClick={() => setNested('app')}>Add app account</Button>
          </div>
          {appAccounts.length ? (
            <div className="detect-acc-list" role="group" aria-label="App accounts">
              {appAccounts.map((a) => (
                <Checkbox key={a.id} checked={f.appAccounts.includes(a.name)}
                  onChange={(c) => set({ appAccounts: c ? [...f.appAccounts, a.name] : f.appAccounts.filter((x) => x !== a.name) })}
                  label={<span className="detect-acc"><b>{a.name}</b><small><DetailsText details={a.details} /></small></span>} />
              ))}
            </div>
          ) : <p className="detect-box detect-hint">No app accounts yet. Click Add App Account to add one.</p>}
        </div>
      )}

      {f.kind === 'Execute Script' && (
        <div className="stack">
          <TextField label="File Path" placeholder="C:\Scripts\disable-user.ps1" value={f.path} onChange={(v) => set({ path: v })} onBlur={() => setPathTouched(true)}
            // GAP-DET-05 intended: the hint shows after blur or on Done, not before any input.
            error={!f.path.trim() && (pathTouched || triedDone) ? 'Please enter local path of script location on LDSP server' : null} />
          <div className="detect-script-run">
            <RadioGroup ariaLabel="Run as" value={f.runAs} onChange={(v) => set({ runAs: v as 'system' | 'account' })}
              options={[{ value: 'system', label: 'Run with SYSTEM account' }, { value: 'account', label: 'Run with selected account' }]} />
            <div className="detect-inline-field">
              <SelectField aria-label="Script account" placeholder="Select" options={scriptAccounts} value={f.scriptAccount}
                disabled={f.runAs !== 'account'} onChange={(v) => set({ scriptAccount: v })} />
              <Button icon="plus" disabled={f.runAs !== 'account'} onClick={() => setNested('script')}>Add account</Button>
            </div>
          </div>
          <div className="stack stack--sm">
            <div className="row row--between row--wrap">
              <Checkbox checked={f.notify} onChange={(v) => set({ notify: v })} label="Notify me when script is executed" />
              <Button disabled={!f.notify} onClick={() => setNested('notify')}>Configure</Button>
            </div>
            <TextAreaField aria-label="Notification settings" readOnly value={f.notify ? f.notifySummary : ''} rows={2}
              placeholder={f.notify ? 'Click Configure to choose the sender and recipients' : 'Notifications are off'} />
          </div>
          <div className="stack stack--sm">
            <div className="row row--wrap detect-param">
              <Checkbox checked={f.paramOn} onChange={(v) => set({ paramOn: v })} label="Parameterized input file contains" />
              <SelectField aria-label="Input parameter" placeholder="Select" options={SCRIPT_PARAMETERS} value={f.param} disabled={!f.paramOn} onChange={(v) => set({ param: v })} />
              <span className="text-sm">Information</span>
            </div>
            <p className="detect-hint">Note: This option is applicable for file server and Active Directory reports</p>
          </div>
        </div>
      )}

      {f.kind === 'Send Alert to SIEM' && (
        <div className="stack">
          <div className="row row--between row--wrap">
            <p className="detect-hint">Select SIEM account</p>
            <Button icon="plus" onClick={() => setNested('siem')}>Add SIEM Account</Button>
          </div>
          {siemAccounts.length ? (
            <div className="lf-radio detect-acc-list" role="radiogroup" aria-label="SIEM accounts">
                {siemAccounts.map((a) => (
                <label key={a.id}>
                  <input type="radio" name="detect-siem" checked={f.siem === a.name} onChange={() => set({ siem: a.name })} />
                  <span className="detect-acc"><b>{a.name}</b><small><DetailsText details={a.details} /></small></span>
                </label>
                ))}
            </div>
          ) : <p className="detect-box detect-hint">No SIEM accounts yet. Click Add SIEM Account to add one.</p>}
        </div>
      )}

      {/* Nested account dialogs: whatever they create becomes the selection. */}
      <EmailAccountDialog open={nested === 'email'} onClose={close} onCreated={(a) => set({ sender: a.name })} />
      <AppAccountDialog open={nested === 'app'} onClose={close} onCreated={(a) => set({ appAccounts: [...f.appAccounts, a.name] })} />
      <ScriptAccountDialog open={nested === 'script'} onClose={close} onCreated={(n) => set({ scriptAccount: n, runAs: 'account' })} />
      <NotificationEmailDialog open={nested === 'notify'} onClose={close} onDone={(s) => set({ notifySummary: s })} />
      <SiemAccountDialog open={nested === 'siem'} onClose={close} onCreated={(a) => set({ siem: a.name })} />
    </>
  );
}

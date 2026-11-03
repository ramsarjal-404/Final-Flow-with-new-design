import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Icon, SelectField, SetCard, SettingRow, TextField, Toggle, useToast } from '../../../ui';
import {
  BACKUP_RETENTION, DATE_FORMATS, DATE_TIME_DISPLAY, LOGON_DB_SIZES, REFRESH_INTERVALS, adminActions, adminStore, formatDate, useDateFormat,
  type DateFormatId, type GeneralSettings,
} from '../../../stores/admin';
import { DigitsField } from './kit';
import { AllowlistDialog } from './AllowlistDialog';
import './styles.css';

/* SCR-SAD-01 · General Settings.
   Draft model: the fields below are a draft saved by "Apply" or thrown away by "Discard".
   Three rows save on their own button: Date Settings "Update", the API White Listing dialog "Save"
   and — GAP-SAD-01 resolved as "immediate-save and leaves the draft" — the Retention Log
   Configuration row ("Retention Days" + "Enable Time Retention" + "Update"). */

type G = GeneralSettings;
type NumKey = 'maxLogFileSize' | 'retentionDays' | 'concurrentSessions' | 'concurrentThreads' | 'collectFrequency' | 'diskSpaceLimit';
const RULES: Record<NumKey, { min: number; max: number; unit: string; blank?: boolean }> = {
  maxLogFileSize: { min: 1, max: 1024, unit: 'MB' },
  retentionDays: { min: 1, max: 3650, unit: 'days' },
  concurrentSessions: { min: 1, max: 10, unit: 'sessions' },
  concurrentThreads: { min: 1, max: 100, unit: 'threads' },
  collectFrequency: { min: 5, max: 1440, unit: 'minutes' },
  diskSpaceLimit: { min: 1, max: 10000, unit: 'GB', blank: true },
};
const DRAFT_NUMS: NumKey[] = ['maxLogFileSize', 'concurrentSessions', 'concurrentThreads', 'collectFrequency', 'diskSpaceLimit'];
/** Fields saved by the retention row, outside the draft (GAP-SAD-01). */
const RETENTION_KEYS: (keyof G)[] = ['retentionDays', 'timeRetention'];
const DRAFT_KEYS = (Object.keys(adminStore.get().general) as (keyof G)[]).filter((k) => !RETENTION_KEYS.includes(k));

function check(key: NumKey, v: string): string | null {
  const r = RULES[key];
  if (v.trim() === '') return r.blank ? null : 'Required.';
  const n = Number(v);
  if (!/^\d+$/.test(v) || n < r.min || n > r.max) return `Enter ${r.min}–${r.max} ${r.unit}.`;
  return null;
}

const ZIP_NOTE = (
  <div className="general-note" role="note">
    <Icon name="alert" />
    <div><b>Warning:</b> The file will be sent in its native format chosen during the Subscription/Alert setup. Large files may exceed email size limits and fail to deliver.</div>
  </div>
);

export default function GeneralSettingsPage() {
  const toast = useToast();
  const saved = adminStore.use((s) => s.general);
  const dateFormat = useDateFormat();
  const [draft, setDraft] = useState<G>(saved);
  const [errors, setErrors] = useState<Partial<Record<NumKey, string>>>({});
  const [unlocked, setUnlocked] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<DateFormatId>(dateFormat);
  const [refreshing, setRefreshing] = useState(false);
  const [retention, setRetention] = useState({ days: saved.retentionDays, on: saved.timeRetention });
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const [allowOpen, setAllowOpen] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const dirty = DRAFT_KEYS.some((k) => draft[k] !== saved[k]);
  const set = <K extends keyof G>(k: K, v: G[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (k in RULES) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  /* ---- Date Settings: saves immediately ---- */
  const today = new Date();
  const updateFormat = () => {
    if (pendingFormat === dateFormat) {
      toast({ variant: 'info', title: 'No changes', message: 'This date format is already in use.' });
      return;
    }
    adminActions.setDateFormat(pendingFormat);
    toast({ variant: 'success', title: 'Date format updated', message: `Dates now show as ${formatDate(today, pendingFormat)}.` });
  };

  /* ---- Update Components ([Prototype-only] 1.4 s) ---- */
  const refresh = () => {
    setRefreshing(true);
    timer.current = window.setTimeout(() => {
      setRefreshing(false);
      toast({ variant: 'success', title: 'Components updated', message: 'All Lepide components are up to date.' });
    }, 1400);
  };

  /* ---- Retention row: immediate save, outside the draft ---- */
  const updateRetention = () => {
    const err = check('retentionDays', retention.days);
    setRetentionError(err);
    if (err) { document.getElementById('general-retentionDays')?.focus(); return; }
    adminActions.saveGeneral({ retentionDays: retention.days, timeRetention: retention.on });
    toast({ variant: 'success', title: 'Retention updated',
      message: retention.on ? `Logs older than ${Number(retention.days)} days are removed.` : 'Time retention is off; logs are kept.' });
  };

  /* ---- Apply / Discard ---- */
  const apply = () => {
    const next: Partial<Record<NumKey, string>> = {};
    for (const k of DRAFT_NUMS) { const e = check(k, String(draft[k])); if (e) next[k] = e; }
    setErrors(next);
    const first = DRAFT_NUMS.find((k) => next[k]);
    if (first) {
      if (first === 'maxLogFileSize') setUnlocked(true);
      requestAnimationFrame(() => document.getElementById('general-' + first)?.focus());
      toast({ variant: 'error', title: 'Check the highlighted fields', message: 'Some values are outside their allowed range.' });
      return;
    }
    const values: Record<string, unknown> = {};
    for (const k of DRAFT_KEYS) values[k] = draft[k];
    adminActions.saveGeneral(values as Partial<G>);
    setUnlocked(false);
    toast({ variant: 'success', title: 'General Settings saved', message: 'Your changes are applied.' });
  };
  const discard = () => { setDraft(saved); setErrors({}); setUnlocked(false); };

  const num = (k: NumKey, aria: string, extra?: { suffix?: string; placeholder?: string; disabled?: boolean }) => (
    <DigitsField id={'general-' + k} className="general-ctl general-ctl--num" ariaLabel={aria} value={String(draft[k])}
      onChange={(v) => set(k, v)} error={errors[k]} min={RULES[k].min} max={RULES[k].max} {...extra} />
  );

  return (
    <div className="stack general-page page-form">
      {/* 1 · Date and components (untitled) */}
      <SetCard>
        <div>
          <SettingRow title="Date Settings">
            <SelectField className="general-ctl" aria-label="Date Settings" value={pendingFormat}
              onChange={(v) => setPendingFormat(v as DateFormatId)}
              options={DATE_FORMATS.map((f) => ({ value: f.id, label: `${f.label} (${formatDate(today, f.id)})` }))} />
            <Button onClick={updateFormat}>Update</Button>
          </SettingRow>
          <SettingRow title="Update Components">
            <Button icon="refresh" loading={refreshing} onClick={refresh}>{refreshing ? 'Refreshing' : 'Refresh'}</Button>
          </SettingRow>
          <SettingRow title="API White Listing">
            <Button icon="settings" onClick={() => setAllowOpen(true)}>Config</Button>
          </SettingRow>
        </div>
      </SetCard>

      {/* 2 · ZIP delivery (untitled) */}
      <SetCard>
        <div>
          <SettingRow title="Subscriptions Delivered in Zip Folder">
            <SelectField className="general-ctl" aria-label="Subscriptions Delivered in Zip Folder" value={draft.subscriptionZip}
              onChange={(v) => set('subscriptionZip', v)} options={['Yes', 'No']} />
          </SettingRow>
          {draft.subscriptionZip === 'No' && ZIP_NOTE}
          <SettingRow title="Alerts Delivered in Zip Folder">
            <SelectField className="general-ctl" aria-label="Alerts Delivered in Zip Folder" value={draft.alertZip}
              onChange={(v) => set('alertZip', v)} options={['Yes', 'No']} />
          </SettingRow>
          {draft.alertZip === 'No' && ZIP_NOTE}
        </div>
      </SetCard>

      {/* 3 · Display Settings */}
      <SetCard title="Display Settings">
        <div>
          <SettingRow title="Date Time Display Setting :">
            <SelectField className="general-ctl" aria-label="Date Time Display Setting" value={draft.dateTimeDisplay}
              onChange={(v) => set('dateTimeDisplay', v)} options={DATE_TIME_DISPLAY} />
          </SettingRow>
          <SettingRow title="Dashboard Refresh Interval :">
            <SelectField className="general-ctl" aria-label="Dashboard Refresh Interval" value={draft.refreshInterval}
              onChange={(v) => set('refreshInterval', v)} options={REFRESH_INTERVALS} />
          </SettingRow>
        </div>
      </SetCard>

      {/* 4 · Retention Settings */}
      <SetCard title="Retention Settings">
        <div>
          <SettingRow title="Keep Active Directory and Group Policy backups for :">
            <SelectField className="general-ctl" aria-label="Keep Active Directory and Group Policy backups for" value={draft.backupRetention}
              onChange={(v) => set('backupRetention', v)} options={BACKUP_RETENTION} />
          </SettingRow>
        </div>
      </SetCard>

      {/* 5 · Logging System Configuration */}
      <SetCard title="Logging System Configuration"
        actions={<Button size="sm" className="general-lock" icon="lock" aria-pressed={unlocked} onClick={() => setUnlocked((u) => !u)}>{unlocked ? 'Lock' : 'Open to edit'}</Button>}>
        <div>
          <SettingRow title="Log Directory Path">
            <TextField id="general-logDirectory" className="general-ctl--wide" aria-label="Log Directory Path" value={draft.logDirectory}
              maxLength={260} disabled={!unlocked} onChange={(v) => set('logDirectory', v)} />
          </SettingRow>
          <SettingRow title="Max File Size">
            {num('maxLogFileSize', 'Max File Size', { suffix: 'MB', disabled: !unlocked })}
          </SettingRow>
        </div>
      </SetCard>

      {/* 6 · Retention Log Configuration (saves on its own Update) */}
      <SetCard title="Retention Log Configuration">
        <div>
          <SettingRow title="Retention Days">
            <DigitsField id="general-retentionDays" className="general-ctl general-ctl--num" ariaLabel="Retention Days" value={retention.days}
              min={1} max={3650} error={retentionError}
              onChange={(v) => { setRetention((r) => ({ ...r, days: v })); setRetentionError(null); }} />
            <span className="general-inline">
              <Toggle label="Enable Time Retention" checked={retention.on} onChange={(on) => setRetention((r) => ({ ...r, on }))} />
              <span aria-hidden="true">Enable Time Retention</span>
            </span>
            <Button onClick={updateRetention}>Update</Button>
          </SettingRow>
        </div>
      </SetCard>

      {/* 7 · Other Settings */}
      <SetCard title="Other Settings">
        <div>
          <SettingRow title="Maximum number of concurrent session :" help="(Active Directory, Exchange Online, SharePoint Online, Office 365)">
            {num('concurrentSessions', 'Maximum number of concurrent session')}
          </SettingRow>
          <SettingRow title="Maximum number of concurrent thread for process alert :">
            {num('concurrentThreads', 'Maximum number of concurrent thread for process alert')}
          </SettingRow>
          <SettingRow title="Frequency to collect changes in SharePoint Online, Office 365 :" help="(In minutes, minimum 5 minutes)">
            {num('collectFrequency', 'Frequency to collect changes in SharePoint Online, Office 365')}
          </SettingRow>
          <SettingRow title="Maximum file size for Logon/Logoff database :">
            <SelectField className="general-ctl" aria-label="Maximum file size for Logon/Logoff database" value={draft.logonDbSize}
              onChange={(v) => set('logonDbSize', v)} options={LOGON_DB_SIZES.map((s) => ({ value: s, label: `${s} GB` }))} />
          </SettingRow>
          <SettingRow title="Stop Active Directory, Exchange Server, Group Policy and File Server auditing when free disk space goes below:">
            {num('diskSpaceLimit', 'Stop Active Directory, Exchange Server, Group Policy and File Server auditing when free disk space goes below', { suffix: 'GB', placeholder: 'Not set' })}
          </SettingRow>
          <div className="general-checks" role="group" aria-label="Other options">
            <Checkbox label="Do not send scheduled reports if blank" checked={draft.skipBlankReports} onChange={(v) => set('skipBlankReports', v)} />
            <Checkbox label="Don’t capture “From” information (Active Directory)" checked={draft.skipFromInfo} onChange={(v) => set('skipFromInfo', v)} />
            <Checkbox label="Encrypt the data in the Archive Database" checked={draft.encryptArchive} onChange={(v) => set('encryptArchive', v)} />
          </div>
        </div>
      </SetCard>

      {/* 8 · Change Summary */}
      <SetCard title="Change Summary">
        <Checkbox label="Send daily change report" checked={draft.dailyChangeReport} onChange={(v) => set('dailyChangeReport', v)} />
      </SetCard>

      {/* Footer pinned under the scrolled form */}
      <div className="lf-card set-card general-foot">
        <div className="set-card__foot">
          {dirty && <span className="lf-muted" role="status">You have unsaved changes.</span>}
          {dirty && <Button onClick={discard}>Discard</Button>}
          <Button variant="primary" disabled={!dirty} onClick={apply}>Apply</Button>
        </div>
      </div>

      <AllowlistDialog open={allowOpen} onClose={() => setAllowOpen(false)} />
    </div>
  );
}

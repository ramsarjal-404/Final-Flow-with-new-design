import { useState } from 'react';
import { useToast } from '../../../ui';
import { HeaderDescription } from '../../SettingsFrame';
import { SegNav } from './SegNav';
import { HRMS_PROVIDERS, protectStore, scheduleText, setSource, type WizardResult } from './store';
import { AdView, CsvView, HrmsView } from './TeamViews';
import { EmailView } from './EmailView';
import { SuperAdminView } from './SuperAdminView';
import { SettingsView } from './SettingsView';
import { SourceWizard, type WizardTarget } from './SourceWizard';
import './styles.css';

/* SCR-SDS-21 · Configure Team Members (Protect Settings). Sub-views are local state, not routes. */
type View = 'hrms' | 'ad' | 'csv' | 'email' | 'super' | 'settings';
const NAV: { value: View; label: string }[] = [
  { value: 'hrms', label: 'HRMS' }, { value: 'ad', label: 'Active Directory' }, { value: 'csv', label: 'CSV' },
  { value: 'email', label: 'Email Configuration' }, { value: 'super', label: 'Super Admin Privileges' }, { value: 'settings', label: 'Settings' },
];
const SOURCE_VIEWS: View[] = ['hrms', 'ad', 'csv'];

export default function ProtectSettings() {
  const toast = useToast();
  const source = protectStore.use((s) => s.source);
  const [view, setView] = useState<View>(() => (source ? (source.kind as View) : 'hrms'));
  const [wiz, setWiz] = useState<WizardTarget | null>(null);

  const finish = (t: WizardTarget, r: WizardResult) => {
    const rows = t.kind === 'ad' ? r.rows.map(({ isNew, ...x }) => x) : r.rows;
    const result = { ...r, rows };
    const sched = scheduleText(r.schedule);
    const body = r.schedule.syncNow ? `${rows.length} users are syncing now. ${sched}.` : `Sync is scheduled. ${sched}.`;
    if (t.kind === 'hrms') {
      const p = HRMS_PROVIDERS.find((x) => x.id === t.provider)!;
      setSource({ kind: 'hrms', provider: p.id, result });
      toast({ variant: 'success', title: t.edit ? 'HRMS configuration updated' : `${p.label} added`, message: body });
    } else {
      setSource({ kind: 'ad', result });
      toast({ variant: 'success', title: t.edit ? 'Active Directory updated' : 'Active Directory added', message: `${r.domain}: ${body}` });
    }
    setWiz(null);
  };

  const desc = null; // the page title is "Configure Team Members" (categories.ts)
  if (wiz) return <>{desc}<SourceWizard target={wiz} onClose={() => setWiz(null)} onDone={(r) => finish(wiz, r)} /></>;

  const items = NAV.map((n) => ({
    ...n,
    disabled: !!source && SOURCE_VIEWS.includes(n.value) && source.kind !== n.value,
    reason: 'Only one member source can be used at a time',
  }));

  return (
    <>
      {desc}
      <SegNav items={items} value={view} onChange={(v) => setView(v as View)} ariaLabel="Protect settings" />
      {view === 'hrms' && <HrmsView onOpen={setWiz} />}
      {view === 'ad' && <AdView onOpen={setWiz} />}
      {view === 'csv' && <CsvView />}
      {view === 'email' && <EmailView />}
      {view === 'super' && <SuperAdminView />}
      {view === 'settings' && <SettingsView />}
    </>
  );
}

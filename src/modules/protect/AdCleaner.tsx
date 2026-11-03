/* SCR-PRO-15 AD Cleaner configuration and SCR-PRO-16 AD Cleaner workspace (/protect/ad-cleaner[?tab=]). */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Chip, PageHeader, Segmented, SetCard, Toggle, useToast } from '../../ui';
import { DOMAINS, VIEWS, type ViewKey } from './data';
import { WorkspaceTable } from './WorkspaceTable';

const TABS: ViewKey[] = ['accounts', 'schedule', 'activity', 'runs', 'groups'];
const TAB_LABEL: Record<ViewKey, string> = { accounts: 'Accounts', schedule: 'Schedule', activity: 'Activity', runs: 'Policy runs', groups: 'Empty groups' };

function Row({ title, hint, children, action }: { title: string; hint?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="setrow protect-cfgrow">
      <div className="setrow__text"><b>{title}</b>{hint && <span>{hint}</span>}</div>
      <div className="protect-cfgrow__val">{children}</div>
      {action && <div className="row">{action}</div>}
    </div>
  );
}

function CleanerConfig() {
  const nav = useNavigate(); const toast = useToast();
  const [enabled, setEnabled] = useState(true);
  const [report, setReport] = useState(true);
  const act = (label: string, text: string) => <Button size="sm" aria-label={label} onClick={() => toast({ variant: 'info', title: label, message: label })}>{text}</Button>;
  return (
    <div className="sub">
      <PageHeader crumbs={[{ label: 'Dashboard', to: '/protect' }, { label: 'Policy Management', to: '/protect/policies' }, { label: 'Active Directory Cleaner' }]}
        title="Active Directory Cleaner" description="Find inactive user and computer accounts, send scheduled reports, and apply controlled cleanup actions."
        actions={<span className="row"><b className={enabled ? 'protect-on-text' : 'lf-muted'}>{enabled ? 'Enabled' : 'Disabled'}</b>
          <Toggle label="Enable Active Directory Cleaner" checked={enabled} onChange={(v) => { setEnabled(v); toast({ variant: 'info', title: 'Active Directory Cleaner', message: `Active Directory Cleaner ${v ? 'Enabled' : 'Disabled'}` }); }} /></span>}>
        <div className="row row--wrap" style={{ marginTop: 12 }}>{['LPDE4.local', 'Full Control', 'Asia/Kolkata', 'Policy controls'].map((t) => <Chip key={t}>{t}</Chip>)}</div>
      </PageHeader>
      <div className="stack protect-cfg">
        <SetCard title="Scope">
          <Row title="Domain controllers" hint="Servers scanned to find inactive accounts." action={act('Manage domain controllers', 'Manage')}>
            <b>1 of 1 selected</b><span className="lf-muted">DC-LPDE4.LPDE4.local · Online</span></Row>
          <Row title="Organizational Units" hint="Only accounts in these OUs are in scope." action={act('Manage Organizational Units', 'Manage')}>
            <b>1 selected</b><span><Chip>DCD01</Chip></span></Row>
        </SetCard>
        <SetCard title="Schedule & notifications">
          <Row title="Execution time" hint="Used for the daily report and automated actions." action={act('Edit execution time', 'Edit')}><b>13:30</b><span className="lf-muted">Daily · Asia/Kolkata</span></Row>
          <Row title="Sender account" action={act('Change sender account', 'Change')}><b>MFACONFIGURATION</b></Row>
          <Row title="Recipients" hint="Required when reports or notifications are enabled." action={act('Edit recipients', 'Edit')}><b>yash.chowdhary@lepide.com</b></Row>
        </SetCard>
        <SetCard title="Automated actions" actions={<>{act('Edit action template', 'Edit')}{act('Create action template', 'Create')}</>}>
          <Row title="Template"><b>Inactive account lifecycle</b><span className="lf-muted">Applies to all user &amp; computer accounts · Excludes: Administrator</span></Row>
          <ol className="protect-stagelist">
            {[['20 days', 'Set random password'], ['40 days', 'Disable account'], ['60 days', 'Move to Inactive Accounts OU'], ['365 days', 'Delete account']].map(([d, a], i) => (
              <li key={a} className={i === 3 ? 'is-del' : undefined}><span className="protect-rung__n">{i + 1}</span><b>{d} · {a}</b><span className="grow" /><Chip tone="flat" icon="bell">Notify admin</Chip></li>
            ))}
          </ol>
        </SetCard>
        <SetCard title="Daily inactive-account report"
          actions={<span className="row"><b className={report ? 'protect-on-text' : 'lf-muted'}>{report ? 'On' : 'Off'}</b>
            <Toggle label="Send daily reports of inactive accounts" checked={report} onChange={(v) => { setReport(v); toast({ variant: 'info', title: 'Daily report', message: `Daily report ${v ? 'enabled' : 'disabled'}` }); }} /></span>}>
          <fieldset className="protect-fs" disabled={!report}>
            <Row title="Account inactivity period" hint="Accounts at or above this threshold are included." action={act('Edit inactivity period', 'Edit')}><b>20 days</b></Row>
            <Row title="Email template" action={act('Manage email template', 'Manage')}><b>Default Email Template 1</b><span className="lf-muted">9 columns · SAM Account Name, Account Type, DN, E-Mail…</span></Row>
            <Row title="Account status" action={act('Change account status', 'Change')}><b>Enabled only</b></Row>
            <p className="protect-impact">24 accounts currently match this report policy.</p>
          </fieldset>
        </SetCard>
        <section className="lf-card protect-cfgfoot">
          <span className="lf-muted grow">Changes are saved to this policy configuration.</span>
          <Button onClick={() => nav('/protect/policies')}>Cancel</Button>
          <Button variant="primary" icon="save" onClick={() => toast({ variant: 'success', title: 'Configuration saved', message: 'Configuration saved' })}>Save</Button>
        </section>
      </div>
    </div>
  );
}

function Workspace({ tab }: { tab: ViewKey }) {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const params: Record<string, string> = {}; sp.forEach((v, k) => { if (k !== 'tab') params[k] = v; });
  const domain = DOMAINS.includes(params.domain ?? '') ? params.domain! : 'LPDE4.local';
  if (tab === 'groups') params.domain = domain;
  const keep = (extra: Record<string, string> = {}) => {
    const o: Record<string, string> = { ...extra };
    for (const k of ['type', 'range', 'domain']) if (sp.get(k)) o[k] = sp.get(k)!;
    return o;
  };
  const v = VIEWS[tab]; const groups = tab === 'groups';
  return (
    <div className="sub">
      <PageHeader
        crumbs={groups ? [{ label: 'Dashboard', to: '/protect' }, { label: 'Policy Management', to: '/protect/policies' }, { label: 'AD Cleaner — Empty groups' }]
          : [{ label: 'Dashboard', to: '/protect' }, { label: 'Protect', to: '/protect?view=ad-cleaner' }, { label: `AD Cleaner — ${v.label}` }]}
        title={v.title}
        description={groups ? `Security and distribution groups with no members in ${domain}, and the action the AD Cleaner policy takes on each one.` : v.description}
        actions={groups ? <>
          <Button icon="mail" onClick={() => nav(`/protect/ad-cleaner/report?type=groups&domain=${encodeURIComponent(domain)}`)}>View latest report</Button>
          <Button icon="chevron-left" onClick={() => nav('/protect/policies')}>Back to policy management</Button>
        </> : <Button icon="chevron-left" onClick={() => nav('/protect?view=ad-cleaner')}>Back to dashboard</Button>}>
        <div className="protect-tabs">
          <Segmented ariaLabel="AD Cleaner workspace views" value={tab} onChange={(t) => setSp({ tab: t, ...keep() })}
            items={TABS.map((t) => ({ value: t, label: TAB_LABEL[t] }))} />
        </div>
      </PageHeader>
      <WorkspaceTable key={sp.toString()} tab={tab} params={params} keep={['type', 'range', 'domain']} onClear={() => setSp({ tab, ...keep() })} />
    </div>
  );
}

export default function AdCleanerPage() {
  const [sp] = useSearchParams();
  const tab = sp.get('tab') as ViewKey | null;
  return tab && TABS.includes(tab) ? <Workspace tab={tab} /> : <CleanerConfig />;
}

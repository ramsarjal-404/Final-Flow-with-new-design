import type { CSSProperties, ReactNode } from 'react';
import { Chart } from '../../ui';

/* ENT-AI-AnswerWidget: the inline widget under every AI answer, drawn with the Lepide Design System assistant widget
   classes (.lai-*) and the kit Chart. Tone is always repeated as text (AC-AI-014). */

type Tone = 'danger' | 'warning' | 'success' | 'info' | 'accent' | 'neutral';
const TONE_WORD: Record<Tone, string> = { danger: 'critical', warning: 'warning', success: 'good', info: 'info', accent: 'info', neutral: '' };
const tone = (t: Tone): CSSProperties => ({ ['--lai-tone' as string]: `var(--lai-tone-${t})` });

type Stat = { label: string; value: string; tone?: Tone; delta?: string };
type Bar = { label: string; value: number };
type Sev = 'critical' | 'high' | 'medium' | 'low' | 'info';
type Item = { time: string; text: string; sev: Sev };
const SEV_TONE: Record<Sev, Tone> = { critical: 'danger', high: 'warning', medium: 'accent', low: 'neutral', info: 'info' };

function Stats({ items }: { items: Stat[] }) {
  return (
    <div className={`lai-stats lai-stats--${Math.min(4, Math.max(2, items.length))}`} style={items.length === 1 ? { gridTemplateColumns: 'minmax(0,1fr)' } : undefined}>
      {items.map((s) => (
        <div key={s.label} className="lai-stat" style={tone(s.tone ?? 'neutral')}>
          <span className="lai-stat__label">{s.label}</span>
          <span className="lai-stat__value" style={s.tone ? undefined : { color: 'var(--ink)' }}>{s.value}
            {s.tone && TONE_WORD[s.tone] && <span className="sr-only"> ({TONE_WORD[s.tone]})</span>}</span>
          {s.delta && <span className="lai-stat__delta">{s.delta}</span>}
        </div>
      ))}
    </div>
  );
}
function Frame({ title, badge, badgeTone = 'accent', children }: { title: string; badge?: string; badgeTone?: Tone; children: ReactNode }) {
  return (
    <div className="lai-card">
      <div className="lai-card__head"><span className="lai-card__title">{title}</span>{badge && <span className="lai-badge" style={tone(badgeTone)}>{badge}</span>}</div>
      {children}
    </div>
  );
}
function Bars({ title, rows, barTone = 'accent' }: { title: string; rows: Bar[]; barTone?: Tone }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Frame title={title}>
      <ul className="lai-bars">
        {rows.map((r) => (
          <li key={r.label} className="lai-bars__row" style={tone(barTone)}>
            <span className="lai-bars__label">{r.label}</span>
            <span className="lai-bars__track" aria-hidden="true"><span className="lai-bars__fill" style={{ width: `${(r.value / max) * 100}%` }} /></span>
            <span className="lai-bars__value">{r.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
function Table({ title, badge, badgeTone, head, rows }: { title: string; badge?: string; badgeTone?: Tone; head: string[]; rows: string[][] }) {
  return (
    <Frame title={title} badge={badge} badgeTone={badgeTone}>
      <div style={{ overflowX: 'auto' }}>
        <table className="lai-mini-table">
          <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Frame>
  );
}
function Timeline({ title, items }: { title: string; items: Item[] }) {
  return (
    <Frame title={title}>
      <ul className="lai-timeline">
        {items.map((it, i) => (
          <li key={i} className="lai-timeline__item" style={tone(SEV_TONE[it.sev])}>
            <span className="lai-timeline__dot" role="img" aria-label={it.sev} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="lai-timeline__text">{it.text}</span>
              <span className="lai-timeline__time">{it.time} · {it.sev.charAt(0).toUpperCase() + it.sev.slice(1)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/* ---------------- catalogue (data-model.md § ENT-AI-AnswerWidget, fixed seed values) ---------------- */
type WidgetId = 'posture' | 'sensitive' | 'adChanges' | 'stale' | 'compliance' | 'alerts' | 'permissions' | 'signin' | 'gpo'
  | 'controls' | 'copilot' | 'auditTrail' | 'connectors' | 'threats' | 'templates';

const WIDGETS: Record<WidgetId, () => ReactNode> = {
  posture: () => (<>
    <Stats items={[
      { label: 'Risk Score', value: '67', tone: 'warning', delta: '↓ 8% this week' },
      { label: 'Critical Exposures', value: '3', tone: 'danger', delta: '↑ 1 new' },
      { label: 'Privileged Changes', value: '47', tone: 'warning', delta: '↑ 31% this week' },
      { label: 'Compliance', value: '82%', tone: 'success', delta: '→ Stable' },
    ]} />
    <Frame title="Risk Score Trend (7 days)">
      <Chart kind="dateColumns" height={190} title="Risk Score Trend (7 days)"
        data={{ name: 'Risk Score', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'], values: [75, 73, 71, 70, 68, 67, 67] }} />
    </Frame>
  </>),
  sensitive: () => (<>
    <Stats items={[
      { label: 'Sensitive Files', value: '33.7K', tone: 'danger' },
      { label: 'Over-Exposed', value: '847', tone: 'danger', delta: 'Needs attention' },
      { label: 'Monthly Growth', value: '+8.2%', tone: 'warning' },
    ]} />
    <Bars title="Sensitive Data by System" rows={[
      { label: 'SharePoint', value: 2100 }, { label: 'OneDrive', value: 1700 }, { label: 'File Shares', value: 1400 },
      { label: 'Azure Storage', value: 680 }, { label: 'SQL Server', value: 320 }]} />
  </>),
  adChanges: () => (<>
    <Stats items={[{ label: 'Total Changes (7d)', value: '47', tone: 'warning', delta: '31% above baseline' }, { label: 'Unapproved', value: '1', tone: 'danger', delta: 'Needs review' }]} />
    <Table title="Top AD Changes This Week" badge="Active Directory" head={['User', 'Change', 'Group', 'Time']} rows={[
      ['alex.turner', 'Admin rights added', 'Finance', '1h ago'], ['mark.chen', 'Admin rights added', 'Root Group', '8h ago'],
      ['john.davis', 'Role elevation', 'HR Site', '3h ago'], ['priya.mehta', 'Group membership', 'Exchange', '2h ago'],
      ['lisa.wang', 'Access scope +3', 'OneDrive', '5h ago']]} />
  </>),
  stale: () => (<>
    <Stats items={[
      { label: 'Stale Admin Accounts', value: '14', tone: 'warning' },
      { label: 'High Risk (45+ days)', value: '2', tone: 'danger', delta: 'Domain Admin level' },
      { label: 'Medium Risk (30+ days)', value: '12', tone: 'warning' }]} />
    <Table title="Top Risk Accounts" badge="Immediate Action" badgeTone="danger" head={['Account', 'Level', 'Last Login', 'Risk']} rows={[
      ['j.smith@corp', 'Domain Admin', '47 days ago', 'Critical'], ['m.jones@corp', 'Domain Admin', '62 days ago', 'Critical'],
      ['r.patel@corp', 'Exchange Admin', '38 days ago', 'High'], ['s.kim@corp', 'SharePoint Admin', '35 days ago', 'Medium']]} />
  </>),
  compliance: () => (<>
    <Stats items={[
      { label: 'SOX', value: '85%', tone: 'success' }, { label: 'NIST', value: '76%', tone: 'warning' },
      { label: 'GDPR', value: '91%', tone: 'success' }, { label: 'PCI-DSS', value: '70%', tone: 'danger', delta: 'Lowest score' }]} />
    <Bars title="Control Status" rows={[{ label: 'Passed', value: 42 }, { label: 'Partial', value: 8 }, { label: 'Failed', value: 3 }, { label: 'Not Reviewed', value: 5 }]} />
  </>),
  alerts: () => (<>
    <Stats items={[{ label: 'Critical', value: '1', tone: 'danger' }, { label: 'High', value: '1', tone: 'warning' }, { label: 'Medium', value: '1', tone: 'accent' }]} />
    <Timeline title="Active Alerts" items={[
      { time: '2 hours ago', text: 'Excessive permissions in Finance AD Group — 9 users affected', sev: 'critical' },
      { time: '4 hours ago', text: '2 inactive accounts with admin rights — 45+ days dormant', sev: 'high' },
      { time: '6 hours ago', text: 'Permission spike in Exchange admin group — 4 users', sev: 'medium' }]} />
  </>),
  permissions: () => (<>
    <Stats items={[{ label: 'Changes (48h)', value: '14', tone: 'warning', delta: 'Above baseline' }, { label: 'High Risk', value: '3', tone: 'danger' }]} />
    <Table title="Recent Permission Changes" badge="Last 48 hours" head={['User', 'Change', 'System', 'Risk']} rows={[
      ['alex.turner', 'Admin added', 'Finance Shares', 'High'], ['mark.chen', 'Admin added', 'AD Root', 'Critical'],
      ['john.davis', 'Role elevated', 'SharePoint HR', 'High'], ['priya.mehta', 'Group added', 'Exchange', 'Medium'],
      ['lisa.wang', 'Scope +3', 'OneDrive', 'Medium']]} />
  </>),
  signin: () => (<>
    <Stats items={[{ label: 'Anomalies (7d)', value: '7', tone: 'warning' }, { label: 'After-Hours', value: '3', tone: 'danger' }, { label: 'New Locations', value: '2', tone: 'warning' }]} />
    <Timeline title="Sign-in Anomalies" items={[
      { time: 'Today 2:14 AM', text: 'priya.mehta — after-hours mailbox access from unknown IP', sev: 'high' },
      { time: 'Today 1:48 AM', text: 'priya.mehta — Exchange admin actions after midnight', sev: 'high' },
      { time: 'Yesterday 11:22 PM', text: 'alex.turner — login from new city (Chicago)', sev: 'medium' },
      { time: '2 days ago', text: 'mark.chen — failed MFA then successful bypass', sev: 'critical' }]} />
  </>),
  gpo: () => (<>
    <Stats items={[{ label: 'GPO Changes This Week', value: '4', tone: 'warning', delta: '1 security downgrade detected' }]} />
    <Table title="Group Policy Changes" badge="GPO Comparison" head={['GPO Name', 'Change', 'Impact', 'When']} rows={[
      ['Finance Workstations', 'Password complexity relaxed', 'Security ↓', 'Tue'], ['Server Baseline', 'Audit logging modified', 'Monitoring', 'Wed'],
      ['Remote Access', 'VPN timeout changed', 'Low', 'Thu'], ['Developer VMs', 'UAC settings updated', 'Medium', 'Fri']]} />
  </>),
  controls: () => (<>
    <Stats items={[
      { label: 'Open Failures', value: '3', tone: 'danger' }, { label: 'Evidence Pending', value: '7', tone: 'warning' },
      { label: 'Exceptions', value: '12', tone: 'accent' }, { label: 'Readiness', value: '74%', tone: 'success', delta: '↑ 2%' }]} />
    <Table title="Control Failures" badge="Audit Period" head={['Control', 'Name', 'Evidence', 'Status']} rows={[
      ['AC-2.3', 'Privileged Access Review', 'Missing', 'Unresolved'], ['AC-3.1', 'Least Privilege', 'Incomplete', 'Partial'],
      ['AU-6.2', 'Audit Log Monitoring', 'Present', 'Pending']]} />
  </>),
  copilot: () => (<>
    <Stats items={[
      { label: 'Active Users', value: '47', tone: 'accent' }, { label: 'Departments', value: '3' },
      { label: 'High-Risk Queries', value: '3', tone: 'danger' }, { label: 'Sessions/Month', value: '847', tone: 'accent' }]} />
    <Bars title="Copilot Usage by Department" rows={[{ label: 'Engineering', value: 23 }, { label: 'Marketing', value: 14 }, { label: 'Data Science', value: 10 }]} />
  </>),
  auditTrail: () => (
    <Timeline title="Recent Remediation Actions" items={[
      { time: 'Today 14:32', text: 'Permission revoked — J.Smith AD account (approved by Sarah Mitchell)', sev: 'info' },
      { time: 'Today 12:11', text: 'Watchlist created — Inactive admin accounts monitoring', sev: 'info' },
      { time: 'Yesterday 17:45', text: 'Executive report generated and exported as PDF', sev: 'info' },
      { time: '2 days ago', text: 'Control AC-2.3 review initiated — evidence collection started', sev: 'medium' },
      { time: '3 days ago', text: 'Entra ID connector configured and verified (Tom Wright)', sev: 'info' }]} />
  ),
  connectors: () => (<>
    <Stats items={[{ label: 'Connected Sources', value: '1 / 8', tone: 'warning', delta: '15% coverage' }]} />
    <Table title="Data Source Status" head={['Source', 'Status', 'Priority']} rows={[
      ['Entra ID', '✅ Connected', 'Done'], ['Active Directory', '⚠️ Not connected', 'High'], ['SharePoint', '○ Pending', 'Medium'],
      ['Exchange Online', '○ Pending', 'Medium'], ['File Servers', '○ Pending', 'Medium'], ['SQL Server', '○ Pending', 'Low']]} />
  </>),
  threats: () => (<>
    <Stats items={[
      { label: 'Rule-Based Alerts', value: '12', tone: 'accent', delta: 'Layer 1' },
      { label: 'Behavioral Anomalies', value: '7', tone: 'warning', delta: 'Layer 2' },
      { label: 'AI Correlations', value: '2', tone: 'danger', delta: 'Layer 3' }]} />
    <Timeline title="Recent Threat Detections" items={[
      { time: '2 min ago', text: 'Bulk file download — 847 files from OneDrive', sev: 'critical' },
      { time: '8 min ago', text: 'Failed login attempt (3rd in 1 hour) via Entra ID', sev: 'medium' },
      { time: '31 min ago', text: 'Service account elevated to Domain Admin', sev: 'critical' },
      { time: '52 min ago', text: 'Suspicious login from new location — alex.turner', sev: 'high' }]} />
  </>),
  templates: () => (
    <Bars title="Available Report Types" rows={[
      { label: 'Risk Summary', value: 12 }, { label: 'Compliance', value: 8 }, { label: 'Access Review', value: 15 },
      { label: 'Data Classification', value: 6 }, { label: 'Change Audit', value: 20 }]} />
  ),
};

/* Matching rules in order; first match wins. GAP-AI-07 (intended): a term must start a word ("ad" must
   also end one), so "read" or "load" no longer select AD Changes. */
const RULES: [string[], WidgetId][] = [
  [['inactive users', 'safe to delete', "what's safe"], 'stale'],
  [['risk score', 'attack surface', 'security posture'], 'posture'],
  [['access to sensitive', 'sensitive data'], 'sensitive'],
  [['ad changes', 'audit ad'], 'adChanges'],
  [['compliance status report'], 'compliance'],
  [['stale privileged', 'stale accounts'], 'stale'],
  [['recent permission changes'], 'permissions'],
  [['critical alerts', 'alerts'], 'alerts'],
  [['over-privileged', 'excessive permissions'], 'stale'],
  [['entra id sign-in', 'sign-in anomal'], 'signin'],
  [['gpo changes', 'group policy'], 'gpo'],
  [['control failures'], 'controls'],
  [['evidence for the privileged'], 'auditTrail'],
  [['compliance posture'], 'compliance'],
  [['audit trail'], 'auditTrail'],
  [['copilot'], 'copilot'],
  [['lepide ai help me audit', 'lepide ai help me with'], 'connectors'],
  [['connect active directory', 'lepide is monitoring'], 'connectors'],
  [['insider threat', 'lepide detect'], 'threats'],
  [['reports can'], 'templates'],
  [['posture', 'risk'], 'posture'],
  [['sensitive', 'data'], 'sensitive'],
  [['change', 'ad'], 'adChanges'],
  [['compliance', 'report'], 'compliance'],
];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hit = (q: string, term: string) => new RegExp(`(^|[^a-z0-9])${esc(term)}${term === 'ad' ? '(?![a-z0-9])' : ''}`).test(q);
export function widgetFor(question: string): WidgetId {
  const q = question.toLowerCase();
  for (const [terms, id] of RULES) if (terms.some((t) => hit(q, t))) return id;
  return 'posture';
}

export function AnswerWidget({ question }: { question: string }) {
  return <div className="lai-widget">{WIDGETS[widgetFor(question)]()}</div>;
}

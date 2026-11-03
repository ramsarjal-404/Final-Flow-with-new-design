/* SCR-PRO-17 AD Cleaner report email viewer — covers the whole window (no shell). */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, BrandMark, Button, Chip, EmptyState, Icon, IconButton, SearchField } from '../../ui';
import { DOMAINS, G_QUARANTINE, shortDate } from './data';
import { accountsFor, groupsFor } from './workspace';
import { useAuth } from '../../app/auth';

type Email = {
  id: string; unread: boolean; from: string; sender: string; time: string; date: string; subject: string; intro: string;
  band: [string, string][]; heading: string; meta: [string, string][]; columns?: string[]; rows?: string[][]; empty?: boolean; notice?: boolean;
};
const SIMON = { from: 'Simon', sender: 'Simon@lepidesoftware.onmicrosoft.com' };
const today = new Date();
const dateText = `${shortDate(today)}, 13:30`;

function buildEmails(p: URLSearchParams): Email[] {
  const accRows = accountsFor('users').filter((a) => a.status === 'In scope' && !a.never).slice(0, 13);
  const n = accRows.length;
  const base = (a: (typeof accRows)[number]) => [a.name, 'User', `CN=${a.name},OU=${a.ou},DC=LPDE4,DC=local`, `${a.name}@lpde4.local`, a.last, String(a.days + 210), 'Never'];
  const baseCols = ['SAM Account Name', 'Account Type', 'Distinguished Name', 'E-Mail', 'Last Logon Time', 'Account Age(In days)', 'Account Expires'];
  const meta = (alert: string): [string, string][] => [['Alert', alert], ['Domain Name', 'LPDE4.local'], ['Selected OUs', 'DCD01'], ['Selected Servers', 'DC-LPDE4.LPDE4.local'],
    ['Selected Status', 'Enabled only'], ['Exclude Accounts', 'Administrator'], ['Account Type', 'User & Computer'], ['Generated On', dateText]];
  const gd = DOMAINS.includes(p.get('domain') ?? '') ? p.get('domain')! : 'LPDE4.local';
  const groups = groupsFor(gd).filter((g) => g.status === 'In scope' && (g.days ?? 0) >= 7).sort((a, b) => (b.days ?? 0) - (a.days ?? 0));
  const quarantined = groups.filter((g) => g.stage === 'Quarantined').length;
  const out: Email[] = [];
  if (p.get('type') === 'policy') {
    const name = p.get('name') || 'New AD Cleaner policy'; const dom = p.get('domain') || 'LPDE4.local';
    out.push({ id: 'policy', unread: true, from: 'Lepide AD Cleaner', sender: 'notifications@lepide.com', time: 'Now', date: dateText,
      subject: `${dom}: ${name} saved as inactive`, intro: `The AD Cleaner policy **${name}** was saved. It stays **inactive** until an administrator activates it.`,
      band: [['Domain Name', dom], ['Message', 'Policy saved']], heading: 'Policy saved',
      meta: [['Policy', name], ['Domain', dom], ['Schedule', p.get('schedule') || 'Daily 13:30'], ['Cleanup action', p.get('action') || 'No cleanup actions'], ['Status', 'Inactive']], notice: true });
  }
  out.push(
    { id: 'report', unread: true, ...SIMON, time: '13:30', date: dateText, subject: 'LPDE4.local : Inactive Account Notification',
      intro: `You have received this alert because **${n} account(s)** have been inactive for **20 days or more**.`,
      band: [['Domain Name', 'LPDE4.local'], ['Alert', 'Inactive Account Notification']], heading: 'Attention!', meta: meta('Inactive Account Notification'),
      columns: baseCols, rows: accRows.map(base) },
    { id: 'groups', unread: true, ...SIMON, time: '13:31', date: dateText, subject: `${gd} : Empty Group Report`,
      intro: `You have received this alert because **${groups.length} group(s)** have had no members for 7 days or more. **${quarantined}** are in quarantine.`,
      band: [['Domain Name', gd], ['Alert', 'Empty Group Report']], heading: 'Attention!',
      meta: [['Alert', 'Empty Group Report'], ['Domain Name', gd], ['Group Types', 'Security & distribution'], ['Quarantine OU', G_QUARANTINE], ['Generated On', dateText]],
      columns: ['Group Name', 'Group Type', 'Group Scope', 'Distinguished Name', 'Created', 'Empty For(In days)', 'Stage'],
      rows: groups.map((g) => [g.name, g.type, g.scope, g.dn, g.created, String(g.days), g.stage]) },
    { id: 'password', unread: true, ...SIMON, time: '13:32', date: dateText, subject: 'LPDE4.local : Random password was set by Lepide Active Directory Cleaner',
      intro: `Lepide Active Directory Cleaner set a **random password** on **${n} account(s)** that have been inactive for 20 days or more.`,
      band: [['Domain Name', 'LPDE4.local'], ['Alert', 'Random password set']], heading: 'Attention!', meta: meta('Random password set'),
      columns: [...baseCols, 'Inactivity Time(In days)', 'Account Status', 'Set Random Password Status'], rows: accRows.map((a) => [...base(a), String(a.days), 'Enabled', 'Success']) },
    { id: 'move', unread: true, ...SIMON, time: '13:33', date: dateText, subject: 'LPDE4.local : Inactive account was moved by Lepide Active Directory Cleaner',
      intro: `Lepide Active Directory Cleaner **moved ${n} account(s)** to the **Inactive Accounts OU** after 60 days of inactivity.`,
      band: [['Domain Name', 'LPDE4.local'], ['Alert', 'Inactive account moved']], heading: 'Attention!', meta: meta('Inactive account moved'),
      columns: [...baseCols, 'Inactivity Time(In days)', 'Account Status', 'Move To OU Status'], rows: accRows.map((a) => [...base(a), String(a.days), 'Disabled', 'Success']) },
    { id: 'none', unread: false, ...SIMON, time: 'Yesterday', date: `${shortDate(new Date(today.getTime() - 864e5))}, 13:30`, subject: 'LPDE4.local : Inactive Account Notification — no matches',
      intro: 'There are no inactive account(s) as per the defined criteria.', band: [['Domain Name', 'LPDE4.local'], ['Alert', 'Inactive Account Notification']],
      heading: 'Attention!', meta: meta('Inactive Account Notification'), empty: true },
  );
  return out;
}
const rich = (s: string): ReactNode => s.split(/(\*\*[^*]+\*\*)/).map((x, i) => (x.startsWith('**') ? <b key={i}>{x.slice(2, -2)}</b> : <span key={i}>{x}</span>));
const FOLDERS: [string, 'mail' | 'star' | 'clock' | 'send' | 'file'][] = [['Inbox', 'mail'], ['Starred', 'star'], ['Snoozed', 'clock'], ['Sent', 'send'], ['Drafts', 'file']];

export default function ReportViewer() {
  const nav = useNavigate(); const { user } = useAuth();
  const [sp] = useSearchParams();
  const initial = useMemo(() => buildEmails(sp), []); // eslint-disable-line react-hooks/exhaustive-deps
  const startId = initial.some((e) => e.id === sp.get('type')) ? sp.get('type')! : initial[0].id;
  const [read, setRead] = useState<Set<string>>(() => new Set([...initial.filter((e) => !e.unread).map((e) => e.id), startId]));
  const [openId, setOpenId] = useState<string | null>(startId);
  const [folder, setFolder] = useState('Inbox');
  const [q, setQ] = useState('');
  const [compose, setCompose] = useState<{ to: string; subject: string; body: string; sent: boolean } | null>(null);
  const [sent, setSent] = useState<{ to: string; subject: string; body: string }[]>([]);
  const toRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && compose && !compose.sent) setCompose(null); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [compose]);
  const list = initial.filter((e) => !q.trim() || `${e.from} ${e.subject} ${e.intro}`.toLowerCase().includes(q.trim().toLowerCase()));
  const unread = initial.filter((e) => !read.has(e.id)).length;
  const open = initial.find((e) => e.id === openId);
  const back = () => { if ((window.history.state?.idx ?? 0) > 0) nav(-1); else nav('/protect'); };
  const pick = (id: string) => { setOpenId(id); setCompose(null); setRead((r) => new Set(r).add(id)); };

  return createPortal(
    <div className="protect-mail lf" role="main" aria-label="AD Cleaner report emails">
      <header className="protect-mail__top">
        <IconButton icon="chevron-left" label="Back" bordered onClick={back} />
        <span className="protect-mail__brand"><BrandMark size={30} /><b>Lepide Mail</b></span>
        <SearchField value={q} onChange={setQ} placeholder="Search mail" ariaLabel="Search mail" style={{ flex: '0 1 520px' }} />
        <span className="grow" /><Avatar name={user?.name ?? 'Administrator'} size={34} />
      </header>
      <div className="protect-mail__body">
        <nav className="protect-mail__folders" aria-label="Mail folders">
          <Button variant="primary" icon="edit" onClick={() => setCompose({ to: '', subject: '', body: '', sent: false })}>Compose</Button>
          {FOLDERS.map(([f, ic]) => (
            <button key={f} type="button" aria-current={folder === f ? 'page' : undefined} className="protect-mail__folder"
              onClick={() => { setFolder(f); setCompose(null); if (f === 'Inbox') { setOpenId(list[0]?.id ?? null); if (list[0]) setRead((r) => new Set(r).add(list[0].id)); } else setOpenId(null); }}>
              <Icon name={ic} size={15} /><span className="grow">{f}</span>{f === 'Inbox' && unread > 0 && <b className="count-chip">{unread}</b>}{f === 'Sent' && sent.length > 0 && <b className="count-chip">{sent.length}</b>}
            </button>
          ))}
        </nav>
        <section className="protect-mail__list" aria-label={folder}>
          <h3>{folder}</h3>
          {folder === 'Inbox' ? (list.length ? list.map((e) => (
            <button key={e.id} type="button" className={'crow' + (e.id === openId && !compose ? ' crow--active' : '') + (read.has(e.id) ? '' : ' protect-mail__unread')} onClick={() => pick(e.id)}>
              <span className="crow__top"><span className="row" style={{ gap: 8, minWidth: 0 }}><Avatar name={e.from} size={22} /><span className="crow__title">{e.from}</span></span><span className="crow__time">{e.time}</span></span>
              <span className="crow__title protect-mail__subj">{e.subject}</span>
              <span className="crow__preview">{e.intro.replace(/\*\*/g, '')}</span>
            </button>
          )) : <p className="protect-picklist__empty">No emails match this search.</p>)
            : folder === 'Sent' && sent.length ? sent.map((s, i) => (
              <div key={i} className="crow"><span className="crow__title">To: {s.to}</span><span className="crow__preview">{s.subject || '(no subject)'}</span></div>
            )) : <p className="protect-picklist__empty">No messages in {folder.toLowerCase()}.</p>}
        </section>
        <section className="protect-mail__pane">
          {compose ? (
            <div className="protect-compose">
              <h3>New message</h3>
              <label className="fld"><span className="fld__lbl">To</span><input ref={toRef} type="email" value={compose.to} disabled={compose.sent} onChange={(e) => setCompose({ ...compose, to: e.target.value })} /></label>
              <label className="fld"><span className="fld__lbl">Subject</span><input value={compose.subject} disabled={compose.sent} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} /></label>
              <label className="fld"><span className="fld__lbl">Message</span><textarea rows={10} value={compose.body} disabled={compose.sent} onChange={(e) => setCompose({ ...compose, body: e.target.value })} /></label>
              <div className="row"><Button variant="primary" icon="send" disabled={compose.sent}
                onClick={() => { if (!compose.to.includes('@')) { toRef.current?.focus(); return; } setCompose({ ...compose, sent: true }); setSent((s) => [...s, compose]); }}>{compose.sent ? 'Sent' : 'Send'}</Button>
                <span className="lf-muted">Frontend preview</span></div>
            </div>
          ) : folder !== 'Inbox' || !open ? (
            <EmptyState icon="mail" title={folder !== 'Inbox' ? 'Select Inbox to return to AD Cleaner notifications.' : 'Select an email to read it.'} />
          ) : (
            <article className="protect-email">
              <div className="row row--wrap"><h2>{open.subject}</h2><Chip>External</Chip><Chip tone="brand">Inbox</Chip></div>
              <div className="protect-email__from"><Avatar name={open.from} size={36} /><div><b>{open.from}</b> <span className="lf-muted">&lt;{open.sender}&gt;</span><small>to me</small></div><span className="grow" /><span className="lf-muted">{open.date}</span></div>
              <div className="protect-email__frame">
                <div className="protect-email__band">{open.band.map(([k, v]) => <span key={k}>{k} : <b>{v}</b></span>)}</div>
                <div className="protect-email__inner">
                  <h4>{open.heading}</h4>
                  <p>{rich(open.intro)}</p>
                  {open.notice && <div className="banner banner--info"><Icon name="info" /><div className="grow"><b>Inactive by default</b> — This confirmation records the policy configuration only. Activation remains a separate administrator action in Policy Management.</div></div>}
                  <dl className="protect-email__meta">{open.meta.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>: {v}</dd></div>)}</dl>
                  {open.columns && open.rows && (
                    <div className="tbl-wrap protect-email__tbl"><table className="lf-table"><thead><tr>{open.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                      <tbody>{open.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
                  )}
                  <p>Thanks<br />Lepide Team</p>
                </div>
              </div>
            </article>
          )}
        </section>
      </div>
    </div>, document.body);
}

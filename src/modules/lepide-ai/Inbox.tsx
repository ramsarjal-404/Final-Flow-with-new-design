import { useMemo, useState } from 'react';
import { Button, EmptyState, Icon, IconButton, SearchField, Segmented, type IconName } from '../../ui';
import {
  ACTION_LABEL, BUCKETS, BUCKET_LABELS, INITIAL_ALERTS, bucketEntries, timeAgo,
  type ActionType, type Alert,
} from './data';
import { aiStore, alertAction, alertHistory, chatList, isLocked, isPending, selectChat, setLeftView, toggleRead, type LeftView } from './store';

/* Left half: SCR-AI-02 alerts feed, SCR-AI-03 Chat History, SCR-AI-04 Alert History, drawn as the Lepide Design System
   inbox card (04 § 8, 03 § 17): Alerts · Chats · Alert log segments plus the History menu in the header. */

const ACTIONS: ActionType[] = ['disable', 'view-report', 'tune-settings'];
const ACT_ICON: Record<ActionType, IconName> = { disable: 'x', 'view-report': 'external', 'tune-settings': 'settings' };
const TITLES: Record<LeftView, string> = { alerts: 'Inbox', 'chat-history': 'Chat History', 'alert-history': 'Alert History' };
const SEARCH: Record<LeftView, string> = { alerts: 'Search alerts…', 'chat-history': 'Search chat history…', 'alert-history': 'Search alert history…' };
const SEARCH_NAME: Record<LeftView, string> = { alerts: 'Search alerts', 'chat-history': 'Search chat history…', 'alert-history': 'Search alert history…' };

/** Topic tile read from the alert text (03 § 17 "Alert card"). */
function topic(message: string): { cls: string; icon: IconName } {
  if (/schema|golden ticket|dc ?sync|failed sign/i.test(message)) return { cls: 'risk', icon: 'shield' };
  if (/co-?pilot|credit card/i.test(message)) return { cls: 'query', icon: 'search' };
  if (/account|admin|privilege/i.test(message)) return { cls: 'account', icon: 'user_plus' };
  if (/cop(y|ied)|files?/i.test(message)) return { cls: 'files', icon: 'copy' };
  return { cls: 'default', icon: 'bell' };
}

function Done({ action }: { action: ActionType }) {
  return <span className="lf-chip lf-chip--done" role="button" aria-disabled="true" tabIndex={-1}>
    <Icon name="check" size={12} />{ACTION_LABEL[action]}<span className="sr-only"> — Action taken</span></span>;
}

function AlertCard({ alert, taken, archived }: { alert: Alert; taken: ActionType[]; archived?: { when: number } }) {
  const s = aiStore.use();
  const read = !archived && s.readAlerts.includes(alert.id);
  const busy = s.aiState !== 'idle';
  const t = topic(alert.message);
  return (
    <article className={'ax' + (archived ? ' ax--archived' : '') + (read ? ' ax--read' : '')}>
      <span className={'ax__ic ax__ic--' + t.cls} aria-hidden="true"><Icon name={t.icon} size={17} /></span>
      <div className="ax__head">
        <p className="ax__text">{alert.message}</p>
        {archived ? <span className="ax__time">{timeAgo(archived.when)}</span> : (
          <IconButton icon="check" size={14} className="ax__read" aria-pressed={read} label={read ? 'Mark as unread' : 'Mark as read'} onClick={() => toggleRead(alert.id)} />
        )}
      </div>
      <div className="ax__acts">
        {ACTIONS.map((a) => {
          const done = taken.includes(a);
          if (archived) return done ? <Done key={a} action={a} /> : <Button key={a} size="sm" icon={ACT_ICON[a]} disabled>{ACTION_LABEL[a]}</Button>;
          if (a === 'tune-settings') {
            // Tuning stays repeatable; a saved edit shows the tick (GAP-AI-03 intended).
            return <Button key={a} size="sm" icon={done ? 'check' : ACT_ICON[a]} disabled={busy} onClick={() => alertAction(alert, a)}>
              {ACTION_LABEL[a]}{done && <span className="sr-only"> — Action taken</span>}</Button>;
          }
          if (isLocked(s, alert.id, a)) return <Done key={a} action={a} />;
          const pending = isPending(s, alert.id, a);
          return <Button key={a} size="sm" variant={a === 'disable' ? 'danger' : 'secondary'} icon={ACT_ICON[a]} disabled={busy || pending}
            aria-disabled={busy || pending || undefined} onClick={() => alertAction(alert, a)}>{ACTION_LABEL[a]}</Button>;
        })}
      </div>
    </article>
  );
}

function Bucket({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
  return <section aria-label={label}><h4 className="bucket"><Icon name="calendar" size={13} />{label}{count !== undefined && <span className="n">{count}</span>}</h4>{children}</section>;
}

export function Inbox() {
  const s = aiStore.use();
  const view = s.leftView;
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const unread = INITIAL_ALERTS.filter((a) => !s.readAlerts.includes(a.id)).length;
  const go = (v: LeftView) => { setQ(''); setLeftView(v); };

  const alertsBody = useMemo(() => {
    const vis = INITIAL_ALERTS.filter((a) => !query || a.message.toLowerCase().includes(query));
    if (!vis.length) return <EmptyState compact icon="search" title={`No alerts match "${q.trim()}".`} />;
    return vis.map((a) => <AlertCard key={a.id} alert={a} taken={s.actionsByAlert[a.id] ?? []} />);
  }, [query, q, s.actionsByAlert]);

  let body: React.ReactNode;
  if (view === 'alerts') body = alertsBody;
  else if (view === 'chat-history') {
    const all = chatList(s);
    const chats = all.filter((c) => !query || c.title.toLowerCase().includes(query) || c.messages.some((m) => m.content.toLowerCase().includes(query)));
    const b = bucketEntries(chats);
    body = !chats.length
      ? <EmptyState compact icon={query ? 'search' : 'history'} title={query ? `No chats match "${q.trim()}".` : 'Your conversation history will appear here.'} />
      : BUCKETS.filter((k) => b[k].length).map((k) => (
        <Bucket key={k} label={BUCKET_LABELS[k]}>
          {b[k].map((c) => {
            const active = s.chatId === c.id;
            const first = (c.messages.find((m) => m.role === 'user') ?? c.messages[0])?.content ?? '';
            const n = c.messages.length;
            return (
              <button key={c.id} type="button" className={'crow' + (active ? ' crow--active' : '')} aria-current={active || undefined} onClick={() => selectChat(c)}>
                <span className="crow__top"><span className="crow__title">{c.title}</span><span className="crow__time">{timeAgo(c.timestamp)}</span></span>
                <span className="crow__preview">"{first}"</span>
                <span className="crow__count">{n} {n === 1 ? 'message' : 'messages'}</span>
              </button>
            );
          })}
        </Bucket>
      ));
  } else {
    const hist = alertHistory(s).filter((e) => !query || e.alertMessage.toLowerCase().includes(query));
    const b = bucketEntries(hist);
    body = !hist.length
      ? <EmptyState compact icon={query ? 'search' : 'history'} title={query ? `No alerts match "${q.trim()}".` : 'Your alert actions will appear here.'} />
      : BUCKETS.filter((k) => b[k].length).map((k) => {
        const groups = new Map<string, { alert: Alert; actions: ActionType[]; latest: number }>();
        b[k].forEach((e) => {
          const g = groups.get(e.alertId);
          if (g) { if (!g.actions.includes(e.action)) g.actions.push(e.action); g.latest = Math.max(g.latest, e.timestamp); }
          else groups.set(e.alertId, { alert: { id: e.alertId, message: e.alertMessage }, actions: [e.action], latest: e.timestamp });
        });
        const items = [...groups.values()].sort((x, y) => y.latest - x.latest);
        return (
          <Bucket key={k} label={BUCKET_LABELS[k]} count={items.length}>
            {items.map((it) => <AlertCard key={it.alert.id + it.latest} alert={it.alert} taken={it.actions} archived={{ when: it.latest }} />)}
          </Bucket>
        );
      });
  }

  return (
    <aside className="lf-card ai__inbox" aria-label="Alerts and history">
      <div className="inbox__head">
        <h3 className="lf-card__title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {view !== 'alerts' && <IconButton icon="chevron-left" label="Back to alerts" style={{ width: 28, height: 28, marginLeft: -6 }} onClick={() => go('alerts')} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{TITLES[view]}</span>
        </h3>
        {view === 'alerts' && <span className="lf-chip lf-chip--brand">{unread} unread</span>}
      </div>
      <Segmented ariaLabel="Inbox views" value={view} onChange={(v) => go(v as LeftView)}
        items={[{ value: 'alerts', label: 'Alerts' }, { value: 'chat-history', label: 'Chats' }, { value: 'alert-history', label: 'Alert log' }]} />
      <SearchField key={"q-" + view} value={q} onChange={setQ} placeholder={SEARCH[view]} ariaLabel={SEARCH_NAME[view]} />
      <div className={'ai__list lepide-ai-list lepide-ai-list--' + (view === 'alerts' ? 'in-left' : 'in-right')} key={"l-" + view}>{body}</div>
    </aside>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, IconButton, ModuleIcon, useToast, type IconName } from '../../ui';
import { mountThemedOrb } from '../../vendor/themedOrb';
import {
  EXPLORE_ACTIONS, IDLE_NUDGES, PANEL_LABEL, PROMPT_CHIPS, commitGreeting, followUps, greetingText, peekGreetingIndex, timeAgo,
  type Msg, type MsgAction,
} from './data';
import { AnswerWidget } from './Widgets';
import { aiStore, ask, chatList, confirmAlert, newChat, revealed, settle } from './store';

/* Right half: SCR-AI-05 welcome and SCR-AI-06 conversation (04 § 8, 03 § 17). */

/* One persistent orb renderer, moved into whichever welcome slot is mounted (one WebGL context). */
let orbHost: HTMLDivElement | null = null;
function useOrb(slot: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const el = slot.current; if (!el) return;
    if (!orbHost) {
      orbHost = document.createElement('div');
      orbHost.style.cssText = 'position:absolute;inset:0';
      el.appendChild(orbHost);
      try {
        mountThemedOrb(orbHost, { glow: 2, bleed: 0, thickness: 1, highlight: 1.6, hoverIntensity: 1, trail: 1, rotateOnHover: true, followCursor: true });
      } catch { orbHost.classList.add('orb--fallback'); }
    } else el.appendChild(orbHost);
    return () => { orbHost?.remove(); };
  }, [slot]);
}

function Avatar() {
  return <span className="avatar" aria-hidden="true"><ModuleIcon name="ai" size={18} /></span>;
}

const EXPLORE_ICON: Record<string, IconName> = { shield: 'shield', users: 'users', changes: 'file-search', sparkles: 'sparkles' };

/* ---------------- SCR-AI-05 welcome ---------------- */
function Welcome({ greeting, name, role }: { greeting: string; name: string; role: string }) {
  const [text, setText] = useState('');
  const [exploreGone, setExploreGone] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [nudge, setNudge] = useState<{ text: string; prompt: string } | null>(null);
  const [nudgeGone, setNudgeGone] = useState(false);
  const orb = useRef<HTMLDivElement>(null);
  useOrb(orb);
  useEffect(() => {
    const t = setTimeout(() => setNudge(IDLE_NUDGES[Math.floor(Math.random() * IDLE_NUDGES.length)]), 12000);
    return () => clearTimeout(t);
  }, []);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!text.trim()) return; const v = text; setText(''); ask(v); };

  return (
    <div className="welcome">
      <div className="lepide-ai-burst" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ ['--a' as string]: `${i * 30}deg` }} />)}</div>
      <div className="welcome__orb" ref={orb} aria-hidden="true" style={{ position: 'relative' }} />
      <h3 className="welcome__greeting">{greeting}</h3>
      <p className="welcome__sub">Signed in as <b>{name}</b> &middot; {role}</p>
      <form className="ask" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about permissions, compliance, threats..." aria-label="Ask Lepide AI" autoComplete="off" />
        <span className="ask__mark" aria-hidden="true"><ModuleIcon name="ai" size={20} /></span>
        <Button type="submit" variant="primary" className="ask__go" disabled={!text.trim()}>Ask Lepide AI</Button>
      </form>
      {!exploreGone && (
        <section className="explore" aria-label="What would you like to explore first?">
          <div className="explore__head">
            <span className="explore__title"><Icon name="sparkles" size={17} />What would you like to explore first?</span>
            <button type="button" className="explore__dismiss" onClick={() => setExploreGone(true)}>Dismiss</button>
          </div>
          <div className="explore__grid">
            {EXPLORE_ACTIONS.map((a, i) => {
              const isDone = done.includes(a.id);
              return (
                <button key={a.id} type="button" className="tile" style={{ animationDelay: `${i * 80}ms` }} disabled={isDone}
                  onClick={() => { setDone((d) => [...d, a.id]); ask(a.prompt); }}>
                  <span className="tile__ic"><Icon name={EXPLORE_ICON[a.icon] ?? 'sparkles'} size={19} /></span>
                  <span className="tile__text"><span className="tile__title">{a.title}</span><span className="tile__desc">{a.description}</span></span>
                  <span className="tile__end"><Icon name={isDone ? 'check' : 'arrow'} size={14} /></span>
                </button>
              );
            })}
          </div>
        </section>
      )}
      <div className="chips">
        {PROMPT_CHIPS.ciso.slice(0, 4).map((c, i) => <button key={c} type="button" className="chip" style={{ animationDelay: `${300 + i * 70}ms` }} onClick={() => ask(c)}>{c}</button>)}
      </div>
      {nudge && !nudgeGone && (
        <div className="nudge" role="note">
          <span className="tile__ic" aria-hidden="true"><Icon name="sparkles" size={14} /></span>
          <p>{nudge.text}<br /><button type="button" className="lf-link" onClick={() => { setNudgeGone(true); ask(nudge.prompt); }}>Ask now →</button></p>
          <IconButton icon="x" size={14} label="Dismiss suggestion" onClick={() => setNudgeGone(true)} />
        </div>
      )}
    </div>
  );
}

/* ---------------- SCR-AI-06 messages ---------------- */
function UserBubble({ m }: { m: Msg }) {
  return (
    <div className="row row--user">
      <div className="bubble">
        <span className="sr-only">You: </span><div>{m.content}</div>
        {m.actionLabel && <div className="bubble__stamp"><b>Action Taken :</b> {m.actionLabel}</div>}
      </div>
    </div>
  );
}

function AlertBubble({ m, busy }: { m: Msg; busy: boolean }) {
  const nav = useNavigate();
  const pick = (a: MsgAction) => { const to = confirmAlert(m.id, a.action); if (to) nav(to); };
  return (
    <div className="row">
      <Avatar />
      <div className="msg">
        <span className="sr-only">Lepide AI: </span>
        <p className="msg__title">{m.content}</p>
        {m.subtitle && <p className="msg__sub">{m.subtitle}</p>}
        {m.actions && m.actions.length > 0 && (
          <div className="pills">
            {m.actions.map((a) => (
              <button key={a.action} type="button" className={'pill' + (a.variant === 'primary' ? ' pill--primary' : '') + (m.chosen && m.chosen !== a.action ? ' pill--dim' : '')}
                disabled={!!m.chosen || busy} aria-pressed={m.chosen ? m.chosen === a.action : undefined} onClick={() => pick(a)}>{a.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Answer offsets after the text has typed in (screens.md § SCR-AI-06): widget, sections, buttons. */
const OFFSETS = { widget: 300, finding: 500, why: 900, affected: 1200, nextStep: 1500, actions: 2200 } as const;
type Part = keyof typeof OFFSETS;

function AIAnswer({ m, question, onGrow }: { m: Msg; question: string; onGrow: () => void }) {
  const toast = useToast();
  const words = useMemo(() => m.content.split(' '), [m.content]);
  const parts = useMemo(() => (Object.keys(OFFSETS) as Part[]).filter((p) => p === 'widget' || (p === 'actions' ? !!m.actions?.length : !!m[p])), [m]);
  const [instant] = useState(() => revealed.has(m.id));
  const [n, setN] = useState(instant ? words.length : 0);
  const [shown, setShown] = useState<Part[]>(instant ? parts : []);

  useEffect(() => {
    revealed.add(m.id);
    if (instant) { settle(m.id); return; }
    const timers: number[] = [];
    let i = 0;
    const sections = () => parts.forEach((p, k) => timers.push(window.setTimeout(() => {
      setShown((s) => (s.includes(p) ? s : [...s, p])); onGrow();
      if (k === parts.length - 1) settle(m.id);
    }, OFFSETS[p])));
    const iv = window.setInterval(() => {
      i++; setN(i);
      if (i % 6 === 0) onGrow();
      if (i >= words.length) { clearInterval(iv); sections(); }
    }, 25);
    return () => { clearInterval(iv); timers.forEach(clearTimeout); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (a: MsgAction) => {
    // INT-AI-042; action "none" gets the same placeholder (GAP-AI-06 intended), titled with the button.
    const title = PANEL_LABEL[a.action] ?? a.label;
    toast({ variant: 'info', title, message: `${title} isn't part of this prototype yet.` });
  };
  const has = (p: Part) => shown.includes(p);
  return (
    <div className="row">
      <Avatar />
      <div className="msg">
        <p className="msg__text"><span className="sr-only">Lepide AI: </span>{words.slice(0, n).join(' ')}{n < words.length && <span className="caret" aria-hidden="true" />}</p>
        {has('widget') && <div className="msg__widget"><AnswerWidget question={question} /></div>}
        {has('finding') && <div className="callout callout--finding"><p className="msg__label">Key Finding</p><p>{m.finding}</p></div>}
        {has('why') && <div className="msg__section"><p className="msg__label">Why it matters</p><p>{m.why}</p></div>}
        {has('affected') && <div className="msg__section"><p className="msg__label">What's impacted</p><p>{m.affected}</p></div>}
        {has('nextStep') && <div className="callout callout--suggest"><p className="msg__label">What I'd suggest</p><p>{m.nextStep}</p></div>}
        {has('actions') && (
          <div className="msg__actions">
            {m.actions!.map((a) => <Button key={a.label} size="sm" variant={a.variant === 'primary' ? 'primary' : 'secondary'} onClick={() => run(a)}>{a.label}</Button>)}
          </div>
        )}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="thinking" role="status" aria-label="Lepide AI is thinking">
      <Avatar />
      <div>
        <div className="thinking__bar"><i /><i /><i /><span>Thinking</span></div>
        <span className="thinking__line" style={{ width: 190 }} />
        <span className="thinking__line" style={{ width: 140 }} />
      </div>
    </div>
  );
}

function Composer() {
  const busy = aiStore.use((s) => s.aiState === 'thinking');
  const [text, setText] = useState('');
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!text.trim() || busy) return; const v = text; setText(''); ask(v); };
  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer__field">
        <span aria-hidden="true"><ModuleIcon name="ai" size={18} /></span>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a follow-up..." aria-label="Ask a follow-up" autoComplete="off" />
        <button type="submit" className="composer__send" aria-label="Send" disabled={!text.trim() || busy}><Icon name="up" size={16} /></button>
      </div>
      <p className="composer__note">Lepide AI analyses your connected data sources to provide security intelligence</p>
    </form>
  );
}

/* ---------------- the chat card ---------------- */
export function ChatPane({ name, role }: { name: string; role: string }) {
  const s = aiStore.use();
  const [gi] = useState(peekGreetingIndex);
  useEffect(() => { commitGreeting(gi); }, [gi]);
  const scroller = useRef<HTMLDivElement>(null);
  const scrollDown = () => requestAnimationFrame(() => { const el = scroller.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); });

  const msgs = s.messages;
  const last = msgs[msgs.length - 1];
  const welcome = msgs.length === 0 && s.aiState === 'idle';
  const busy = s.aiState !== 'idle';
  const unanswered = !!last && last.kind === 'alert-ai-prompt' && !last.chosen;
  const lastSettled = !last || last.role !== 'ai' || !!last.kind || s.settled.includes(last.id);
  const chips = msgs.length > 0 && !busy && !unanswered && lastSettled ? followUps(msgs) : [];
  const viewing = s.viewingChatId ? chatList(s).find((c) => c.id === s.viewingChatId) : undefined;

  useEffect(() => { if (msgs.length || busy) scrollDown(); }, [msgs.length, s.aiState, chips.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="lf-card ai__chat" aria-label="Lepide AI">
      {viewing && (
        <div className="ai__banner" role="status">
          <span aria-hidden="true" style={{ display: 'inline-grid' }}><Icon name="calendar" size={14} /></span>
          <span>Viewing past chat: <b>{viewing.title}</b> · {timeAgo(viewing.timestamp)}</span>
          <IconButton icon="x" label="Close past chat view" onClick={newChat} />
        </div>
      )}
      <div className="ai__scroll" ref={scroller}>
        <div className="ai__inner">
          {welcome ? <Welcome greeting={greetingText(gi, name.trim().split(/\s+/)[0] || 'there')} name={name} role={role} /> : (
            <div className="thread">
              {msgs.map((m, i) => {
                if (m.role === 'user') return <UserBubble key={m.id} m={m} />;
                if (m.kind) return <AlertBubble key={m.id} m={m} busy={busy} />;
                const prev = msgs[i - 1];
                return <AIAnswer key={m.id} m={m} question={prev && prev.role === 'user' ? prev.content : m.content} onGrow={scrollDown} />;
              })}
              {s.aiState === 'thinking' && <Thinking />}
            </div>
          )}
          {chips.length > 0 && (
            <div className="followups" aria-label="Suggested follow-ups" role="group">
              {chips.map((c, i) => <button key={c} type="button" className="followup" style={{ animationDelay: `${i * 70}ms` }} onClick={() => ask(c)}>{c}</button>)}
            </div>
          )}
        </div>
      </div>
      {msgs.length > 0 && <Composer />}
    </section>
  );
}

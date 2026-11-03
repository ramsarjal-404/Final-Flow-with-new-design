import { useEffect, useLayoutEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Button, EmptyState, IconButton, Menu, PageHeader } from '../../ui';
import { useAuth } from '../../app/auth';
import home from '../../data/home.json';
import { ChatPane } from './Chat';
import { EditAlertDialog } from './EditAlert';
import { Inbox } from './Inbox';
import { aiStore, ask, hydrate, newChat, setLeftView, type TuneDraft } from './store';
import './styles.css';

/* MOD-AI Lepide AI — SCR-AI-01 split page at /lepide-ai (modules/lepide-ai/screens.md, ui-design-system 04 § 8). */

const AI_TILE = (home.exports.HOME_MODULES as { name: string; description: string }[]).find((m) => m.name === 'Lepide AI');
/** Home's ask box hands its question over once per navigation (decision D-04). */
const handled = new Set<string>();

function Page() {
  const { user, hasPermission } = useAuth();
  const email = user?.email ?? '';
  const ready = aiStore.use((s) => s.user === email);
  const chatKey = aiStore.use((s) => s.chatKey);
  const loc = useLocation();
  const nav = useNavigate();
  const unsaved = useRef(new Map<string, TuneDraft>());

  useLayoutEffect(() => { if (email) hydrate(email); }, [email]);

  useEffect(() => {
    const prompt = (loc.state as { prompt?: string } | null)?.prompt;
    if (!ready || !prompt || handled.has(loc.key)) return;
    handled.add(loc.key);
    newChat();
    ask(prompt);
    nav(loc.pathname, { replace: true, state: null });
  }, [ready, loc.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const header = (actions?: React.ReactNode) => (
    <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Lepide AI' }]} title="Lepide AI"
      chip={<span className="lf-chip lf-chip--ai">New</span>} description={AI_TILE?.description} actions={actions} />
  );

  // GAP-AI-10 (intended): users without LepideAI.Access are refused.
  if (!hasPermission('LepideAI.Access')) {
    return (
      <div className="sub sub--fill">
        {header()}
        <section className="lf-card tablecard"><EmptyState icon="lock" title="Not granted by your administrator" /></section>
      </div>
    );
  }
  if (!ready) return null;

  return (
    <div className="sub sub--fill sub--ai">
      {header(<>
        <Menu label="History" width={200} items={[
          { label: 'Chat history', icon: 'clock', onSelect: () => setLeftView('chat-history') },
          { label: 'Alert history', icon: 'alert', onSelect: () => setLeftView('alert-history') },
        ]} trigger={(p) => <IconButton icon="history" label="History" bordered className={p['aria-expanded'] ? 'is-active' : undefined} {...p} />} />
        <Button variant="primary" icon="plus" onClick={newChat}>New chat</Button>
      </>)}
      <div className="ai">
        <Inbox />
        <ChatPane key={chatKey} name={user?.name ?? ''} role={user?.roleLabel ?? ''} />
      </div>
      <EditAlertDialog unsaved={unsaved.current} />
    </div>
  );
}

export default function LepideAI() {
  return (
    <Routes>
      <Route index element={<Page />} />
      <Route path="*" element={<Navigate to="/lepide-ai" replace />} />
    </Routes>
  );
}

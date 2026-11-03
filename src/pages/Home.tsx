import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, ModuleIcon, type ModuleIconName } from '../ui';
import { useAuth, type Permission } from '../app/auth';
import home from '../data/home.json';
import { mountThemedOrb } from '../vendor/themedOrb';

/* SCR-PLAT-02 Home launcher, drawn as ui-design-system/04 § 2 (decisions D-01, D-04, D-05). */
type HomeModule = { group: 'Security modules' | 'Workspace'; name: string; description: string; ai?: boolean; tag?: string };
const MODULES = home.exports.HOME_MODULES as HomeModule[];
const ROUTES: Record<string, string> = {
  Auditor: '/auditor', Identify: '/identify', Protect: '/protect', Trust: '/trust', Detect: '/detect/alert-status',
  'My Lepide': '/my-lepide', Dashboards: '/dashboards', 'Lepide AI': '/lepide-ai',
};
const ICON: Record<string, ModuleIconName> = { Auditor: 'auditor', Identify: 'identify', Protect: 'protect', Trust: 'trust', Detect: 'detect', 'My Lepide': 'mylepide', Dashboards: 'dashboards', 'Lepide AI': 'ai' };
const CLS: Record<string, string> = { Auditor: 'auditor', Identify: 'identify', Protect: 'protect', Trust: 'trust', Detect: 'detect', 'My Lepide': 'mylepide', Dashboards: 'dashboards' };
const PERM: Record<string, Permission> = {
  Auditor: 'Auditor.Reports.Predefined.View', Trust: 'Trust.Reports.View', Detect: 'Detect.Alerts.Predefined.Access', Protect: 'Protect.Access',
  Identify: 'EDiscovery.Cases.View', 'My Lepide': 'MyLepide.Access', Dashboards: 'Dashboard.Predefined.Access',
};
/** Lepide Design System copy for the AI card's prompt chips (design addition D-04). */
const PROMPTS = ['Show my risk score and attack surface', 'Who has access to sensitive data?', 'Audit AD changes from this week'];

/* One persistent orb renderer, moved into whichever card shows it (avoids re-creating WebGL contexts). */
let orbHost: HTMLDivElement | null = null;
function useOrb(slot: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const el = slot.current; if (!el) return;
    if (!orbHost) {
      orbHost = document.createElement('div');
      orbHost.className = 'orb-container'; orbHost.style.cssText = 'position:absolute;inset:0';
      el.appendChild(orbHost);
      try { mountThemedOrb(orbHost, { glow: 2, bleed: 0, thickness: 1.2, highlight: 1.6 }); }
      catch { orbHost.classList.add('orb--fallback'); }
    } else el.appendChild(orbHost);
    return () => { orbHost?.remove(); };
  }, [slot]);
}

export default function Home() {
  const { user, hasPermission } = useAuth();
  const nav = useNavigate();
  const [ask, setAsk] = useState('');
  const [empty, setEmpty] = useState(0);
  const orbSlot = useRef<HTMLDivElement>(null);
  useOrb(orbSlot);
  const h = new Date().getHours();
  const greet = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', ' + (user?.name.split(' ')[0] ?? '');
  const ai = MODULES.find((m) => m.ai)!;
  const groups = (['Security modules', 'Workspace'] as const).map((g) => ({ g, items: MODULES.filter((m) => m.group === g && !m.ai) }));
  let k = 0;

  const open = (m: HomeModule) => { const p = PERM[m.name]; if (p && !hasPermission(p)) return; nav(ROUTES[m.name]); };
  const submit = (q: string) => {
    if (!q.trim()) { setEmpty((n) => n + 1); return; }
    nav('/lepide-ai', { state: { prompt: q.trim() } });
  };

  return (
    <div className="sub sub--home">
      <header className="home-head">
        <h1 className="hero__title">{greet}</h1>
        <p className="hero__sub">Ask Lepide AI anything about your environment, or open a module below.</p>
      </header>

      <section className="ai-hero lf-card" aria-labelledby="aiHeroTitle">
        <div className="ai-hero__orb orb-container" ref={orbSlot} aria-hidden="true" style={{ position: 'relative' }} />
        <div className="ai-hero__body">
          <div className="ai-hero__top">
            <h2 id="aiHeroTitle">
              <a href={ROUTES['Lepide AI']} onClick={(e) => { e.preventDefault(); nav(ROUTES['Lepide AI']); }} style={{ color: 'inherit' }}>{ai.name}</a>
              {ai.tag && <span className="lf-chip lf-chip--brand">{ai.tag === 'NEW' ? 'New' : ai.tag}</span>}
            </h2>
          </div>
          <p className="ai-hero__text">{ai.description}</p>
          <form key={empty} className={'ai-hero__ask' + (empty ? ' is-empty' : '')} onSubmit={(e) => { e.preventDefault(); submit(ask); }}>
            <input value={ask} placeholder="Ask about permissions, compliance, threats..." aria-label="Ask Lepide AI" autoComplete="off" onChange={(e) => setAsk(e.target.value)} />
            <button className="lf-btn lf-btn--primary" type="submit">Ask Lepide AI</button>
          </form>
          <div className="ai-hero__chips">
            {PROMPTS.map((p, i) => <button key={p} type="button" className="chip" style={{ animationDelay: 200 + i * 60 + 'ms' }} onClick={() => submit(p)}>{p}</button>)}
          </div>
        </div>
      </section>

      <section className="mods" aria-label="Modules">
        <div className="mods__grid">
          {groups.map(({ g, items }) => (
            <section key={g} aria-label={g} style={{ display: 'contents' }}>
              <h3 className="mods__label">{g}<span>{items.length}</span></h3>
              {items.map((m) => {
                const perm = PERM[m.name]; const dis = !!perm && !hasPermission(perm); const ws = g === 'Workspace';
                return (
                  <a key={m.name} href={ROUTES[m.name]} className={'lf-card mod mod--' + CLS[m.name] + (ws ? ' mod--ws' : '')}
                    style={{ animationDelay: 80 + (k++) * 50 + 'ms', ...(dis ? { opacity: .5, cursor: 'not-allowed', transform: 'none' } : {}) }}
                    aria-label={`${m.name} — ${m.description}`} aria-disabled={dis || undefined} data-tip={dis ? 'Not granted by your administrator' : undefined}
                    onClick={(e) => { e.preventDefault(); open(m); }}>
                    <div className="mod__top"><span className="mod__ic"><ModuleIcon name={ICON[m.name]} size={20} /></span></div>
                    <div className="mod__text"><h4>{m.name}</h4><p>{m.description}</p></div>
                    <div className="mod__foot"><span /><span className="mod__arrow"><Icon name="arrow" size={14} /></span></div>
                  </a>
                );
              })}
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

import { useState } from 'react';
import { AiOrb, Icon, ModuleIcon, type ModuleIconName } from '@lepide/ds-react';

/* Home (DESIGN.md §4.2 Home): the prototype's launcher, https://lepide-new-ui.vercel.app/. A greeting, the Lepide AI
   card (the real WebGL orb, an ask pill, suggestion chips), then the module tiles: AI Shield featured across the row,
   five security modules, two wide workspace tiles. Everything here is @lepide/ds-css classes; no CSS of its own. */

type Mod = { name: string; icon: ModuleIconName; cls: string; text: string; tag?: string; featured?: boolean };
const SECURITY: Mod[] = [
  { name: 'AI Shield', icon: 'shield', cls: 'shield', tag: 'New', featured: true,
    text: 'Scan every AI prompt and response in real time, and stop sensitive data leaving through chat assistants and copilots.' },
  { name: 'Auditor', icon: 'auditor', cls: 'auditor', text: 'Track user interactions to sensitive data and key infrastructure.' },
  { name: 'Identify', icon: 'identify', cls: 'identify', text: 'Discover and classify sensitive data based on risk and value.' },
  { name: 'Protect', icon: 'protect', cls: 'protect', text: 'Identify and adjust overly permissive file or folder access.' },
  { name: 'Trust', icon: 'trust', cls: 'trust', text: 'Identify permission changes and users with privileged access.' },
  { name: 'Detect', icon: 'detect', cls: 'detect', text: 'Detect and respond to threats with anomaly detection and alerts.' },
];
const WORKSPACE: Mod[] = [
  { name: 'My Lepide', icon: 'mylepide', cls: 'mylepide', text: 'A collection of all of your favourite reports.' },
  { name: 'Dashboards', icon: 'dashboards', cls: 'dashboards', text: 'Visual overviews of data security metrics across your estate.' },
];
const PROMPTS = ['Show my risk score and attack surface', 'Who has access to sensitive data?', 'Audit AD changes from this week'];

function Tile({ m, ws }: { m: Mod; ws?: boolean }) {
  return (
    <a href={`#${m.cls}`} className={`lf-card mod mod--${m.cls}${ws ? ' mod--ws' : ''}${m.featured ? ' mod--featured' : ''}`} aria-label={`${m.name} — ${m.text}`}>
      <div className="mod__top"><span className="mod__ic"><ModuleIcon name={m.icon} size={20} /></span></div>
      <div className="mod__text">
        <h4>{m.name}{m.tag && <span className="lf-chip lf-chip--brand">{m.tag}</span>}</h4>
        <p>{m.text}</p>
      </div>
      <div className="mod__foot"><span /><span className="mod__arrow"><Icon name="arrow" size={14} /></span></div>
    </a>
  );
}

export default function Home() {
  const [ask, setAsk] = useState('');
  const [empty, setEmpty] = useState(0);
  const h = new Date().getHours();
  const greeting = `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}, Console`;
  const submit = (q: string) => { if (!q.trim()) setEmpty((n) => n + 1); /* else: open Lepide AI with the question */ };

  return (
    <div className="sub sub--home">
      <header className="home-head">
        <h1 className="hero__title">{greeting}</h1>
        <p className="hero__sub">Ask Lepide AI anything about your environment, or open a module below.</p>
      </header>

      <section className="ai-hero lf-card" aria-labelledby="ai-hero-title">
        <AiOrb className="ai-hero__orb" />
        <div className="ai-hero__body">
          <div className="ai-hero__top">
            <h2 id="ai-hero-title">Lepide AI<span className="lf-chip lf-chip--brand">New</span></h2>
          </div>
          <p className="ai-hero__text">Find critical files fast and stay secure — the Lepide AI way.</p>
          <form key={empty} className={'ai-hero__ask' + (empty ? ' is-empty' : '')} onSubmit={(e) => { e.preventDefault(); submit(ask); }}>
            <input value={ask} placeholder="Ask about permissions, compliance, threats..." aria-label="Ask Lepide AI" autoComplete="off" onChange={(e) => setAsk(e.target.value)} />
            <button className="lf-btn lf-btn--primary" type="submit">Ask Lepide AI</button>
          </form>
          <div className="ai-hero__chips">
            {PROMPTS.map((p) => <button key={p} type="button" className="chip" onClick={() => submit(p)}>{p}</button>)}
          </div>
        </div>
      </section>

      <section className="mods" aria-label="Modules">
        <div className="mods__grid">
          <h3 className="mods__label">Security modules<span>{SECURITY.length}</span></h3>
          {SECURITY.map((m) => <Tile key={m.name} m={m} />)}
          <h3 className="mods__label">Workspace<span>{WORKSPACE.length}</span></h3>
          {WORKSPACE.map((m) => <Tile key={m.name} m={m} ws />)}
        </div>
      </section>
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark, Dropdown, Icon, ModuleIcon, useToast } from '../ui';
import { useAuth } from './auth';
import { useTheme, type Theme } from './theme';
import { NAV, currentKey, type NavItem } from './nav';

const NOT_GRANTED = 'Not granted by your administrator';
const COLLAPSE_KEY = 'lepide.dockCollapsed';

/* ------------------------------------------------------------------ Sidebar (02 § 2) */
function Sidebar({ collapsed, onAccount, accountOpen }: { collapsed: boolean; onAccount: (el: HTMLElement) => void; accountOpen: boolean }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, hasPermission } = useAuth();
  const current = currentKey(loc.pathname);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const timer = useRef(0);
  const dockRef = useRef<HTMLElement>(null);
  const [fly, setFly] = useState<{ top: number; left: number }>({ top: 0, left: 90 });

  const allowed = (it: NavItem) => !it.permission || hasPermission(it.permission);
  const go = (it: NavItem) => { if (!allowed(it)) return; setOpenSub(null); nav(it.path); };
  const place = (el: HTMLElement) => {
    if (!collapsed || !dockRef.current) return;
    const r = el.getBoundingClientRect(); const d = dockRef.current.getBoundingClientRect();
    setFly({ top: Math.max(8, Math.min(r.top - 6, innerHeight - 120)), left: d.right + 6 });
  };
  const openLater = (key: string | null, ms: number) => { clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpenSub(key), ms); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => setOpenSub(null), [loc.pathname]);

  const item = (it: NavItem) => {
    const dis = !allowed(it); const isCur = current === it.key; const hasSub = !!it.menu && !dis; const open = openSub === it.key;
    return (
      <div key={it.key} style={{ display: 'contents' }}>
        <button type="button" className={'lf-dock__item' + (hasSub ? ' lf-dock__item--parent' : '')}
          aria-current={isCur ? 'page' : undefined} aria-disabled={dis || undefined} aria-expanded={hasSub ? open : undefined}
          data-tip={dis ? NOT_GRANTED : collapsed && !hasSub ? it.label : undefined}
          onClick={() => go(it)}
          onMouseEnter={(e) => { place(e.currentTarget); openLater(hasSub ? it.key : null, hasSub ? 120 : 260); }}
          onMouseLeave={() => hasSub && openLater(null, 220)}
          onFocus={(e) => { place(e.currentTarget); if (hasSub) setOpenSub(it.key); }}
          onKeyDown={(e) => {
            if (hasSub && (e.key === 'ArrowDown' || e.key === 'ArrowRight')) {
              e.preventDefault(); const el = e.currentTarget; place(el); setOpenSub(it.key);
              requestAnimationFrame(() => (el.nextElementSibling?.querySelector('button') as HTMLElement | null)?.focus());
            }
          }}>
          <span data-nav-icon>{it.icon && <ModuleIcon name={it.icon} size={19} />}</span>
          <span className="lf-dock__label">{it.label}</span>
          {hasSub && <Icon name="chevron" size={12} className="lf-dock__chev" />}
        </button>
        {hasSub && (
          <div className={'lf-dock__sub' + (open ? ' is-open' : '')} data-title={it.label}
            style={{ '--fly-top': fly.top + 'px', '--fly-left': fly.left + 'px' } as CSSProperties}
            onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={() => openLater(null, 220)}>
            <div className="lf-dock__sub-in" role="group" aria-label={`${it.label} pages`}
              onKeyDown={(e) => {
                const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button')); const i = items.indexOf(document.activeElement as HTMLElement);
                if (e.key === 'ArrowDown' && i < items.length - 1) { e.preventDefault(); items[i + 1].focus(); }
                if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? items[i - 1] : (e.currentTarget.parentElement!.previousElementSibling as HTMLElement)).focus(); }
                if (e.key === 'Escape') { setOpenSub(null); (e.currentTarget.parentElement!.previousElementSibling as HTMLElement).focus(); }
              }}>
              {it.menu!.map((m) => (
                <button key={m.path} type="button" className="lf-dock__subitem" tabIndex={open ? 0 : -1} onClick={() => { setOpenSub(null); nav(m.path); }}>
                  <Icon name={m.icon} size={15} /><span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const groups: ('Assistant' | 'Modules' | 'Workspace')[] = ['Assistant', 'Modules', 'Workspace'];
  return (
    <nav ref={dockRef} className="lf-dock" aria-label="Modules" onMouseLeave={() => openLater(null, 220)}>
      <button type="button" className="lf-dock__brand" aria-label="Lepide home" data-tip={collapsed ? 'Lepide home' : undefined} onClick={() => nav('/')}>
        <BrandMark /><span><b>Lepide</b><small>Data Security Platform</small></span>
      </button>
      <div className="lf-dock__items">
        <button type="button" className="lf-dock__item" aria-current={current === 'home' ? 'page' : undefined} data-tip={collapsed ? 'Home' : undefined}
          onClick={() => nav('/')} onMouseEnter={() => openLater(null, 260)}>
          <span data-nav-icon><Icon name="home" size={19} /></span><span className="lf-dock__label">Home</span>
        </button>
        {groups.map((g) => (
          <div key={g} style={{ display: 'contents' }}>
            <p className="nav-label">{g}</p>
            {NAV.filter((n) => n.group === g).map(item)}
          </div>
        ))}
      </div>
      <div className="lf-dock__foot">
        <button type="button" className="lf-dock__item" aria-current={current === 'settings' ? 'page' : undefined} data-tip={collapsed ? 'Settings' : undefined}
          onClick={() => nav('/settings')}>
          <span data-nav-icon><ModuleIcon name="settings" size={19} /></span><span className="lf-dock__label">Settings</span>
        </button>
        <button type="button" className="lf-dock__item lf-dock__account" aria-haspopup="menu" aria-expanded={accountOpen} aria-label="Account"
          data-tip={collapsed ? user?.name : undefined} onClick={(e) => onAccount(e.currentTarget)}>
          <span className="lf-dock__avatar">{user?.initials}</span><span className="lf-dock__label">{user?.name}</span>
        </button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ Account menu (02 § 4, DLG-PLAT-02) */
export function AccountMenu({ anchor, side, onClose }: { anchor: HTMLElement; side: 'below' | 'right'; onClose: () => void }) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties>({ visibility: 'hidden' });
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect(); const m = ref.current!; const w = m.offsetWidth; const h = m.offsetHeight;
    setPos(side === 'right'
      ? { left: r.right + 12, top: Math.max(12, Math.min(r.bottom - h, innerHeight - h - 12)) }
      : { left: Math.max(12, r.right - w), top: r.bottom + 10 });
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('.umenu__item, [role=tab][aria-selected=true]')?.focus());
  }, [anchor, side]);
  useEffect(() => {
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); anchor.focus(); } };
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key); addEventListener('resize', onClose);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); removeEventListener('resize', onClose); };
  }, [anchor, onClose]);
  if (!user) return null;
  const items = () => Array.from(ref.current!.querySelectorAll<HTMLElement>('.umenu__item'));
  return createPortal(
    <div ref={ref} className={'umenu lf' + (side === 'right' ? ' umenu--right' : '')} role="menu" aria-label="Account" style={pos}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const xs = items(); const i = xs.indexOf(document.activeElement as HTMLElement); if (i < 0) return;
        e.preventDefault(); xs[(i + (e.key === 'ArrowDown' ? 1 : -1) + xs.length) % xs.length].focus();
      }}>
      <div className="umenu__head">
        <span className="umenu__av">{user.initials}</span>
        <div className="umenu__who"><b>{user.name}</b><small>{user.email}</small><span className="lf-chip lf-chip--brand">{user.roleLabel}</span></div>
      </div>
      <div className="umenu__sep" />
      <div className="umenu__theme">
        <span className="umenu__label" id="umenu-theme">Theme</span>
        <Dropdown size="sm" className="umenu__dd" value={theme} ariaLabelledby="umenu-theme" onChange={(v) => setTheme(v as Theme)}
          options={[{ value: 'light', label: 'Light theme' }, { value: 'dark', label: 'Dark theme' }, { value: 'hc', label: 'High contrast' }]} />
      </div>
      <div className="umenu__sep" />
      <button type="button" className="umenu__item" role="menuitem" onClick={() => { onClose(); nav('/'); }}><Icon name="home" size={15} /><span>Console home</span></button>
      <div className="umenu__sep" />
      <button type="button" className="umenu__item umenu__item--out" role="menuitem"
        onClick={() => { onClose(); signOut(); nav('/login', { replace: true, state: { reason: 'signed-out' } }); }}>
        <Icon name="logout" size={15} /><span>Sign out</span><kbd>{user.email.split('@')[1] ?? ''}</kbd>
      </button>
    </div>, document.body);
}

/* ------------------------------------------------------------------ Top bar (02 § 3) */
function TopBar({ onAccount, accountOpen }: { onAccount: (el: HTMLElement) => void; accountOpen: boolean }) {
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.current?.focus(); input.current?.select(); } };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);
  return (
    <header className="topbar">
      <a className="topbar__brand" href="/" aria-label="Lepide home" onClick={(e) => { e.preventDefault(); nav('/'); }}><BrandMark size={34} /><b>Lepide</b></a>
      <div className="topbar__right">
        {/* Global search is a design addition (D-03): behaviour pending, so it follows the placeholder convention. */}
        <label className="lf-field home-search">
          <span className="lf-input"><Icon name="search" />
            <input ref={input} type="search" value={q} placeholder="Search reports, folders, data sources" aria-label="Search the console"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) toast({ variant: 'info', title: 'Search', message: "Search isn't part of this prototype yet." }); }} />
            <kbd>{mac ? '⌘K' : 'Ctrl K'}</kbd></span>
        </label>
        <button type="button" className="hometop__user" aria-label="Account menu" aria-haspopup="menu" aria-expanded={accountOpen}
          onClick={(e) => onAccount(e.currentTarget)}><span className="hometop__avatar">{user?.initials}</span></button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ Console shell */
export function ConsoleShell({ children }: { children?: ReactNode }) {
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } });
  const [menu, setMenu] = useState<{ anchor: HTMLElement; side: 'below' | 'right' } | null>(null);
  const main = useRef<HTMLElement>(null);
  useEffect(() => { main.current?.scrollTo(0, 0); setMenu(null); }, [loc.pathname]);
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* ignore */ } return !c; });
  const openMenu = (side: 'below' | 'right') => (el: HTMLElement) => setMenu((m) => (m && m.anchor === el ? null : { anchor: el, side }));
  return (
    <div className="app lf">
      <section className={'view console' + (collapsed ? ' console--collapsed' : '')}>
        <div className="console__dock">
          <Sidebar collapsed={collapsed} onAccount={openMenu('right')} accountOpen={menu?.side === 'right'} />
          <button type="button" className="dock-toggle" aria-expanded={!collapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggle}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        </div>
        <div className="shell">
          <TopBar onAccount={openMenu('below')} accountOpen={menu?.side === 'below'} />
          <main className="main" ref={main}>{children ?? <Outlet />}</main>
        </div>
      </section>
      {menu && <AccountMenu anchor={menu.anchor} side={menu.side} onClose={() => setMenu(null)} />}
    </div>
  );
}

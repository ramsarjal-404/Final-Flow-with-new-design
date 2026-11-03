import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Banner, BrandMark, Icon, useToast } from '../ui';
import { useAuth } from '../app/auth';
import { mountLoginArt } from '../vendor/loginArt.js';

/* SCR-PLAT-01 Sign in, drawn as ui-design-system/04 § 1. Copy from modules/platform. */
export default function Login() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const state = (loc.state ?? {}) as { from?: string; reason?: string };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle');
  const [shake, setShake] = useState(0);
  const [notice, setNotice] = useState(state.reason === 'signed-out');
  const pwRef = useRef<HTMLInputElement>(null);
  const viewRef = useRef<HTMLElement>(null);

  useEffect(() => { if (viewRef.current) return mountLoginArt(viewRef.current); }, []);
  if (user && phase === 'idle') return <Navigate to={state.from || '/'} replace />;

  const typed = (fn: (v: string) => void) => (v: string) => { fn(v); setError(''); setNotice(false); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase !== 'idle') return;
    setPhase('loading');
    const res = await signIn(email, password);
    if (!res.ok) { setPhase('idle'); setError(res.message); setShake((n) => n + 1); if (!email.trim()) return; pwRef.current?.focus(); return; }
    setPhase('done');
    setTimeout(() => nav(state.from || '/', { replace: true }), 500);
  };

  return (
    <div className="app lf">
      <section className="view login-page" ref={viewRef}>
        <div className="stage">
          <div className="auth">
            <div className="card">
              <section className="screen active">
                <div className="logo"><BrandMark size={52} /></div>
                <p className="auth-eyebrow">Lepide · Data Security Platform</p>
                <h1>Sign in to the console</h1>
                {notice && <div className="notice"><Banner tone="info">You have been signed out.</Banner></div>}
                <form noValidate onSubmit={submit}>
                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <div className="input-icon">
                      <Icon name="mail" size={18} className="lead-ico" />
                      <input id="email" type="email" placeholder="name@company.com" autoComplete="username" value={email}
                        className={error && !email.trim() ? 'invalid' : ''} onChange={(e) => typed(setEmail)(e.target.value)} />
                    </div>
                  </div>
                  <div className="field">
                    <div className="row-label">
                      <label htmlFor="password">Password</label>
                      <a href="#" onClick={(e) => { e.preventDefault(); toast({ variant: 'info', title: 'Forgot password?', message: "Forgot password? isn't part of this prototype yet." }); }}>Forgot password?</a>
                    </div>
                    <div className="input-icon">
                      <Icon name="lock" size={18} className="lead-ico" />
                      <input ref={pwRef} id="password" type={show ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password"
                        value={password} className={error && email.trim() ? 'invalid' : ''} onChange={(e) => typed(setPassword)(e.target.value)} />
                      <button className="eye" type="button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
                        onClick={() => { setShow((s) => !s); pwRef.current?.focus(); }}><Icon name="eye" size={18} /></button>
                    </div>
                  </div>
                  <p className="err-line" role="alert">{error && <><Icon name="alert" size={14} />{error}</>}</p>
                  <button key={shake} type="submit" className={'btn' + (phase === 'loading' ? ' is-loading' : '') + (phase === 'done' ? ' is-done' : '') + (shake ? ' shake' : '')}
                    disabled={phase !== 'idle'} aria-busy={phase === 'loading'}>
                    <span className="btn__icon">{phase === 'loading' ? <span className="spinner" /> : phase === 'done'
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>}</span>
                    <span className="btn__label" aria-live="polite">Sign In</span>
                  </button>
                </form>
                <p className="foot">Need access? Ask an administrator.</p>
              </section>
            </div>
            <div className="auth__art">
              <div className="security-background"><canvas aria-hidden="true" /></div>
              <p className="art__hint" aria-hidden="true">Move through the data to scatter it &middot; click to jump ahead</p>
              <div className="art__copy is-out" id="artCopy" aria-live="polite"><p className="art__kicker" id="artKicker" /><h2 className="art__title" id="artTitle" /><p className="art__text" id="artText" /></div>
              <div className="art__nav" id="artNav" role="group" aria-label="How Lepide helps" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

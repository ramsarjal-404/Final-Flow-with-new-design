import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { BrandMark, Checkbox, Icon } from '@lepide/ds-react';

/* Sign in (DESIGN.md §4.2): the whole page, no console shell. A glass card split into the form and a static
   illustration panel. Uses the stylesheet's .login-page classes (there is no React sign-in component).
   Empty or malformed input shows an inline error under the field and shakes the submit button. */

const SLIDES = [
  { kicker: 'Lepide Detect', title: 'Spot unusual activity before it becomes a breach',
    text: 'Real-time alerts on mass deletions, permission changes and logons from unusual places.' },
  { kicker: 'Lepide Auditor', title: 'Know who changed what, where and when',
    text: 'Readable audit trails for Active Directory, file servers, Exchange Online and SQL Server.' },
  { kicker: 'Lepide Protect', title: 'Close open access to sensitive data',
    text: 'Find files shared with Everyone and remove excessive permissions in a few clicks.' },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [shake, setShake] = useState(false);
  const [slide, setSlide] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email address, like name@company.com.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (next.email || next.password) {
      setShake(true);
      (next.email ? emailRef : pwRef).current?.focus();
      return;
    }
    setStatus('loading');
    window.setTimeout(() => setStatus('done'), 1100);
  };

  const art = SLIDES[slide];

  return (
    <div className="app lf">
      <section className="view login-page">
        <div className="stage">
          <div className="auth">
            <div className="card">
              <div className="screen active">
                <div style={{ marginBottom: 'var(--s5)' }}><BrandMark size={52} /></div>
                <p className="auth-eyebrow">Lepide Data Security Platform</p>
                <h1>Sign in to your console</h1>
                <p className="auth-sub">Use your Lepide account or your corp.lepide.local credentials.</p>

                <form noValidate onSubmit={submit}>
                  <div className="field">
                    <label htmlFor="signin-email">Email</label>
                    <div className="input-icon">
                      <Icon name="mail" size={18} className="lead-ico" />
                      <input id="signin-email" ref={emailRef} type="email" autoComplete="username" placeholder="name@company.com"
                        value={email} className={errors.email ? 'invalid' : undefined}
                        aria-invalid={!!errors.email} aria-describedby={errors.email ? 'signin-email-err' : undefined}
                        onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }} />
                    </div>
                    {errors.email && <p className="err-line" id="signin-email-err" role="alert"><Icon name="alert" size={14} />{errors.email}</p>}
                  </div>

                  <div className="field">
                    <div className="row-label">
                      <label htmlFor="signin-password">Password</label>
                      <a href="/forgot-password">Forgot password?</a>
                    </div>
                    <div className="input-icon">
                      <Icon name="lock" size={18} className="lead-ico" />
                      <input id="signin-password" ref={pwRef} type={showPw ? 'text' : 'password'} autoComplete="current-password"
                        placeholder="Your password" value={password} className={errors.password ? 'invalid' : undefined}
                        aria-invalid={!!errors.password} aria-describedby={errors.password ? 'signin-password-err' : undefined}
                        onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }} />
                      <button type="button" className="eye" aria-pressed={showPw} aria-label={showPw ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPw((v) => !v)}>
                        <Icon name="eye" size={18} />
                      </button>
                    </div>
                    {errors.password && <p className="err-line" id="signin-password-err" role="alert"><Icon name="alert" size={14} />{errors.password}</p>}
                  </div>

                  <Checkbox label="Keep me signed in" checked={keep} onChange={setKeep} />

                  <button type="submit" aria-busy={status === 'loading' || undefined}
                    className={'btn' + (status === 'loading' ? ' is-loading' : '') + (status === 'done' ? ' is-done' : '') + (shake ? ' shake' : '')}
                    onAnimationEnd={() => setShake(false)}>
                    {status === 'loading' ? <span className="spinner" aria-hidden="true" /> : (
                      <span className="btn__icon"><Icon name={status === 'done' ? 'check' : 'arrow'} size={18} /></span>
                    )}
                    <span>{status === 'loading' ? 'Signing in…' : status === 'done' ? 'Signed in' : 'Sign in'}</span>
                  </button>
                </form>

                <p className="foot">New to Lepide? <a href="/request-access">Request access</a></p>
              </div>
            </div>

            <div className="auth__art">
              <div className="security-background" aria-hidden="true">
                <svg viewBox="0 0 600 640" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
                  <circle cx="300" cy="250" r="210" fill="none" stroke="var(--brand-100)" strokeWidth="1.5" strokeDasharray="2 6" />
                  <circle cx="300" cy="250" r="160" fill="none" stroke="var(--brand-100)" strokeWidth="1.5" />
                  <circle cx="300" cy="250" r="110" fill="none" stroke="var(--brand-200)" strokeWidth="1.5" />
                  <circle cx="300" cy="250" r="52" fill="var(--surface)" stroke="var(--brand-100)" strokeWidth="1.5" />
                  <g transform="translate(264 214) scale(3)" fill="none" stroke="var(--brand)" strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path vectorEffect="non-scaling-stroke" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                  </g>
                  <g stroke="var(--surface)" strokeWidth="3">
                    <circle cx="395" cy="195" r="8" fill="var(--brand)" />
                    <circle cx="230" cy="335" r="6" fill="var(--c4)" />
                    <circle cx="150" cy="305" r="7" fill="var(--c2)" />
                    <circle cx="380" cy="111" r="6" fill="var(--c6)" />
                    <circle cx="120" cy="142" r="5" fill="var(--c3)" />
                    <circle cx="480" cy="358" r="7" fill="var(--c5)" />
                  </g>
                </svg>
              </div>

              <div className="art__copy" aria-live="polite">
                <p className="art__kicker">{art.kicker}</p>
                <h2 className="art__title">{art.title}</h2>
                <p className="art__text">{art.text}</p>
              </div>

              <div className="art__nav" role="group" aria-label="Highlights">
                {SLIDES.map((s, i) => (
                  <button key={s.kicker} type="button" aria-label={`Show highlight ${i + 1} of ${SLIDES.length}: ${s.kicker}`}
                    aria-current={i === slide ? 'true' : undefined} onClick={() => setSlide(i)}>
                    <span style={{ '--p': i === slide ? 1 : 0 } as CSSProperties} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

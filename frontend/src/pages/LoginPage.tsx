import { useState, Fragment, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
import { Logo, Button, Input, Checkbox, AvatarGroup } from '../components/ui';

type AuthMode = 'signin' | 'signup';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

interface LoginPageProps {
  onSignInSuccess?: (payload: { email: string; remember: boolean; accessToken: string; refreshToken: string }) => void;
}

/* ── Helpers ── */
function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function validatePw(v: string) {
  if (v.length < 8) return 'At least 8 characters required';
  if (!/[A-Z]/.test(v)) return 'Must contain an uppercase letter';
  if (!/\d/.test(v)) return 'Must contain a number';
}

/* ─────────────────────────────────────────────────────
   LoginPage
   Ocean/teal gradient background → centred two-panel card
───────────────────────────────────────────────────── */
export default function LoginPage({ onSignInSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleCallbackRef = useRef<(r: { credential: string }) => void>(() => {});

  // Always point to the latest closure so the Google SDK calls fresh state
  googleCallbackRef.current = async (response: { credential: string }) => {
    setLoading(true);
    setErrors({});
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: response.credential }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail;
        const formError = Array.isArray(detail)
          ? detail.map((e: { msg: string }) => e.msg).join(', ')
          : detail || 'Google sign-in failed.';
        setErrors({ form: formError });
        return;
      }
      setSuccessMessage('Sign in successful.');
      onSignInSuccess?.({
        email: data.user?.email ?? email,
        remember,
        accessToken: data.tokens?.access_token ?? '',
        refreshToken: data.tokens?.refresh_token ?? '',
      });
    } catch {
      setErrors({ form: 'Cannot connect to backend. Ensure API is running on port 8000.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r) => googleCallbackRef.current(r),
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: googleBtnRef.current.offsetWidth || 352,
        text: 'continue_with',
      });
    };

    if (document.getElementById('gsi-script')) {
      init();
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.body.appendChild(script);
  }, []);

  const avatars = [
    { name: 'Sophie M' },
    { name: 'James K' },
    { name: 'Priya V' },
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    setSuccessMessage('');
    if (!email) next.email = 'Email is required';
    else if (!validateEmail(email)) next.email = 'Enter a valid email';
    if (!password) next.password = 'Password is required';
    else { const e = validatePw(password); if (e) next.password = e; }
    if (mode === 'signup') {
      if (!confirmPassword) next.confirmPassword = 'Please confirm your password';
      else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const endpoint = mode === 'signup' ? '/users' : '/auth/login';
      const body = { email, password };
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data?.detail;
        const formError = Array.isArray(detail)
          ? detail.map((e: { msg: string }) => e.msg).join(', ')
          : detail || 'Request failed. Please try again.';
        setErrors({ form: formError });
        return;
      }

      if (mode === 'signup') {
        setSuccessMessage('Sign up successful. You can sign in now.');
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
        setErrors({});
      } else {
        setSuccessMessage('Sign in successful.');
        onSignInSuccess?.({
          email: data.user?.email ?? email,
          remember,
          accessToken: data.tokens?.access_token ?? '',
          refreshToken: data.tokens?.refresh_token ?? '',
        });
      }
    } catch {
      setErrors({ form: 'Cannot connect to backend. Ensure API is running on port 8000.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'linear-gradient(160deg, #0B4F6C 0%, #0A3352 35%, #081E3F 65%, #050D24 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'var(--font-sans)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Water ripple texture blobs ── */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '55%', height: '70%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(13,209,204,0.08) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-8%', width: '60%', height: '65%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(91,138,255,0.10) 0%, transparent 65%)', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', top: '30%', left: '20%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(112,71,235,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* ── Main card ── */}
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          borderRadius: 'var(--radius-3xl)',
          overflow: 'hidden',
          display: 'flex',
          minHeight: 580,
          boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
          position: 'relative',
        }}
      >
        {/* ════ LEFT HALF — frosted glass ════ */}
        <div
          style={{
            flex: 1,
            padding: '40px 44px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'rgba(8, 30, 63, 0.55)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Logo */}
          <Logo size="md" />

          {/* Heading block */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, paddingTop: 40 }}>
            <h1
              style={{
                color: 'white',
                fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                fontWeight: 'var(--weight-extrabold)',
                letterSpacing: 'var(--tracking-tight)',
                lineHeight: 1.18,
                margin: 0,
              }}
            >
              Begin your next{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #A78BFA 0%, #60A5FA 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                extraordinary
              </span>{' '}
              journey.
            </h1>
            <p
              style={{
                color: 'rgba(255,255,255,0.62)',
                fontSize: 'var(--text-base)',
                lineHeight: 'var(--leading-relaxed)',
                maxWidth: 360,
                margin: 0,
              }}
            >
              Discover hand-curated destinations and travel experiences designed for the modern voyager.
            </p>
          </div>

          {/* Avatar group + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <AvatarGroup avatars={avatars} size="sm" max={3} />
            <div>
              <p style={{ color: 'white', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', margin: 0 }}>
                Joined by 20k+ travelers
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--text-xs)', margin: 0, marginTop: 2 }}>
                Exploring the world with Pathfinder
              </p>
            </div>
          </div>
        </div>

        {/* ════ RIGHT HALF — white panel ════ */}
        <div
          className="surface-light"
          style={{
            width: '100%',
            maxWidth: 440,
            flexShrink: 0,
            background: 'var(--color-bg-surface)',
            padding: '44px 44px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Heading */}
          <h2
            style={{
              color: 'var(--color-text-dark)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--weight-bold)',
              letterSpacing: 'var(--tracking-tight)',
              margin: '0 0 6px',
            }}
          >
            Welcome Back
          </h2>
          <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-sm)', margin: '0 0 28px' }}>
            {mode === 'signup' ? 'Create your account with email and password.' : 'Please enter your details to sign in.'}
          </p>

          {errors.form && (
            <p style={{ color: '#dc2626', fontSize: 'var(--text-sm)', margin: '0 0 14px' }}>{errors.form}</p>
          )}
          {successMessage && (
            <p style={{ color: '#16a34a', fontSize: 'var(--text-sm)', margin: '0 0 14px' }}>{successMessage}</p>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
            {/* Email */}
            <div>
              <Input
                label="Email Address"
                type="email"
                placeholder="voyager@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                error={errors.email}
                autoComplete="email"
                iconRight={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                }
              />
            </div>

            {/* Password row: label + forgot on same line */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}
                    className="hover:opacity-70"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                error={errors.password}
                autoComplete="current-password"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    setErrors(p => ({ ...p, confirmPassword: undefined }));
                  }}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Remember me */}
            <Checkbox
              label="Remember for 30 days"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />

            {/* Sign In */}
            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
              {mode === 'signup' ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          {/* ── Divider ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 4px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border, #e5e7eb)' }} />
            <span style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border, #e5e7eb)' }} />
          </div>

          {/* ── Google button ── */}
          <div ref={googleBtnRef} style={{ width: '100%', marginBottom: 4 }} />

          {/* Footer link */}
          <p style={{ textAlign: 'center', color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-sm)', marginTop: 24 }}>
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setPassword('');
                setConfirmPassword('');
                setErrors({});
                setSuccessMessage('');
              }}
              style={{ color: 'var(--color-primary)', fontWeight: 'var(--weight-semibold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}
              className="hover:opacity-70"
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up for free'}
            </button>
          </p>
        </div>
      </div>

      {/* ── Footer links ── */}
      <div style={{ marginTop: 28, display: 'flex', gap: 8, alignItems: 'center' }}>
        {['PRIVACY POLICY', 'TERMS OF SERVICE', 'HELP CENTER'].map((link, i) => (
          <Fragment key={link}>
            {i > 0 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 'var(--text-xs)' }}>·</span>}
            <button
              type="button"
              style={{ color: 'rgba(255,255,255,0.38)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', letterSpacing: 'var(--tracking-wide)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              className="hover:text-white"
            >
              {link}
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

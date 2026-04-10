import React, { useState, FormEvent } from 'react';
import { Logo, Button, Input, Checkbox, Divider, AvatarGroup } from '../components/ui';

/* ── Helpers ── */
function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function validatePw(v: string) {
  if (v.length < 8) return 'At least 8 characters required';
  if (!/[A-Z]/.test(v)) return 'Must contain an uppercase letter';
  if (!/\d/.test(v)) return 'Must contain a number';
}

/* ── Social button — rendered inside .surface-light ── */
function SocialBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        height: 44,
        borderRadius: 'var(--radius-lg)',
        background: 'transparent',
        border: '1.5px solid var(--color-border-medium)',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-medium)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'var(--transition-base)',
        fontFamily: 'var(--font-sans)',
      }}
      className="hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-glass)] hover:text-[var(--color-text-primary)]"
    >
      {icon}
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────────────────
   LoginPage
   Ocean/teal gradient background → centred two-panel card
───────────────────────────────────────────────────── */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const avatars = [
    { name: 'Sophie M' },
    { name: 'James K' },
    { name: 'Priya V' },
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email) next.email = 'Email is required';
    else if (!validateEmail(email)) next.email = 'Enter a valid email';
    if (!password) next.password = 'Password is required';
    else { const e = validatePw(password); if (e) next.password = e; }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 1600);
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
            Please enter your details to sign in.
          </p>

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
                <button
                  type="button"
                  style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}
                  className="hover:opacity-70"
                >
                  Forgot Password?
                </button>
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

            {/* Remember me */}
            <Checkbox
              label="Remember for 30 days"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />

            {/* Sign In */}
            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div style={{ margin: '20px 0' }}>
            <Divider label="Or continue with" />
          </div>

          {/* Social buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <SocialBtn
              label="Google"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              }
            />
            <SocialBtn
              label="Apple"
              icon={
                <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 312.8 10.7 128 46.4 62.9c19.2-35.6 56.4-57.3 97.7-57.3 34.4 0 63.4 20.6 87.4 50.1 22 27.5 40.9 65.4 62.3 65.4s40.9-22.6 73.1-50.1c32.2-27.5 70.4-42.8 109.2-42.8 58.6 0 105.2 31 133.6 87.5 10.2 20.9 17.2 44.5 17.2 71.3 0 62.9-43.8 114.2-108.2 153.9z"/>
                </svg>
              }
            />
          </div>

          {/* Footer link */}
          <p style={{ textAlign: 'center', color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-sm)', marginTop: 24 }}>
            Don't have an account?{' '}
            <button
              type="button"
              style={{ color: 'var(--color-primary)', fontWeight: 'var(--weight-semibold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}
              className="hover:opacity-70"
            >
              Sign up for free
            </button>
          </p>
        </div>
      </div>

      {/* ── Footer links ── */}
      <div style={{ marginTop: 28, display: 'flex', gap: 8, alignItems: 'center' }}>
        {['PRIVACY POLICY', 'TERMS OF SERVICE', 'HELP CENTER'].map((link, i) => (
          <React.Fragment key={link}>
            {i > 0 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 'var(--text-xs)' }}>·</span>}
            <button
              type="button"
              style={{ color: 'rgba(255,255,255,0.38)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', letterSpacing: 'var(--tracking-wide)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              className="hover:text-white"
            >
              {link}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

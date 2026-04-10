import React, { useState, FormEvent } from 'react';
import {
  Logo,
  Button,
  Input,
  Checkbox,
  Divider,
  StepIndicator,
  Badge,
} from '../components/ui';

/* ── Types ── */
type AuthMode = 'login' | 'register';

interface FormState {
  email: string;
  password: string;
  fullName: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  fullName?: string;
}

/* ── Helpers ── */
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): string | undefined {
  if (password.length < 8) return 'At least 8 characters required';
  if (!/[A-Z]/.test(password)) return 'Must contain an uppercase letter';
  if (!/\d/.test(password)) return 'Must contain a number';
  return undefined;
}

/* ── Social button ── */
interface SocialButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function SocialButton({ icon, label, onClick }: SocialButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        height: 44,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-glass)',
        border: '1px solid var(--color-border-medium)',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-medium)',
        cursor: 'pointer',
        transition: 'var(--transition-base)',
        fontFamily: 'var(--font-sans)',
      }}
      className="hover:bg-[var(--color-bg-glass-hover)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Decorative background blobs ── */
function BackgroundBlobs() {
  return (
    <div
      aria-hidden
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {/* Top-left purple blob */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          left: '-120px',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(112,71,235,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Bottom-right indigo blob */}
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          right: '-80px',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91,138,255,0.14) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Center accent */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 300,
          background: 'radial-gradient(ellipse, rgba(112,71,235,0.07) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
}

/* ── Feature pill ── */
function FeaturePill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 14px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-bg-glass)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-medium)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ color: 'var(--color-primary-light)', display: 'flex' }}>{icon}</span>
      {text}
    </div>
  );
}

/* ─────────────────────────────────────────────
   LoginPage
───────────────────────────────────────────── */
export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    fullName: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isRegister = mode === 'register';

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (isRegister && !form.fullName.trim()) {
      next.fullName = 'Full name is required';
    }
    if (!form.email.trim()) {
      next.email = 'Email is required';
    } else if (!validateEmail(form.email)) {
      next.email = 'Enter a valid email address';
    }
    if (!form.password) {
      next.password = 'Password is required';
    } else {
      const pwError = validatePassword(form.password);
      if (pwError) next.password = pwError;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    // Simulate async auth — wire to POST /api/v1/auth/login or /api/v1/users
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1800);
  };

  const steps = [
    { number: '01', label: 'Welcome' },
    { number: '02', label: 'Plan' },
    { number: '03', label: 'Confirm' },
  ];

  /* ── Success state ── */
  if (submitted) {
    return (
      <div
        style={{
          minHeight: '100svh',
          background: 'var(--color-bg-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <BackgroundBlobs />
        <div
          style={{
            position: 'relative',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            padding: '40px 32px',
            maxWidth: 400,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--radius-2xl)',
              background: 'var(--color-green-bg)',
              border: '1.5px solid var(--color-green-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <h1 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', margin: '0 0 8px' }}>
              Welcome{isRegister ? '' : ' back'}!
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', margin: 0 }}>
              {isRegister
                ? "Your account is ready. Let's plan your first trip."
                : "You're signed in. Redirecting to your trips..."}
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={() => setSubmitted(false)}>
            Start Planning
          </Button>
        </div>
      </div>
    );
  }

  /* ── Main layout ── */
  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'var(--color-bg-base)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <BackgroundBlobs />

      {/* ── Top nav strip ── */}
      <header
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid var(--color-border)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(8,8,26,0.6)',
        }}
      >
        <Logo size="sm" />
        <div className="hidden md:flex">
          <StepIndicator steps={steps} currentStep={0} />
        </div>
        <div style={{ minWidth: 140, display: 'flex', justifyContent: 'flex-end' }}>
          <Badge variant="curated" dot>AI-Powered</Badge>
        </div>
      </header>

      {/* ── Main content ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          position: 'relative',
        }}
      >
        <div style={{ width: '100%', maxWidth: 960, display: 'flex', gap: 64, alignItems: 'center', justifyContent: 'center' }}>

          {/* ── Left: Hero text (desktop only) ── */}
          <div
            className="hidden lg:flex flex-col gap-8"
            style={{ flex: 1, maxWidth: 420 }}
          >
            <div>
              <div style={{ marginBottom: 20 }}>
                <Badge variant="recommended" dot>New · AI Travel Agent</Badge>
              </div>
              <h1
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-4xl)',
                  fontWeight: 'var(--weight-extrabold)',
                  letterSpacing: 'var(--tracking-tight)',
                  lineHeight: 'var(--leading-tight)',
                  margin: '0 0 16px',
                }}
              >
                Plan your perfect trip with{' '}
                <span
                  style={{
                    background: 'var(--gradient-primary)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  AI precision
                </span>
              </h1>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-base)',
                  lineHeight: 'var(--leading-relaxed)',
                  margin: 0,
                }}
              >
                Pathfinder combines AI intelligence with real-time travel data to craft
                personalised itineraries, optimise routes, and adapt plans on the fly.
              </p>
            </div>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <FeaturePill
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>}
                text="Flight Optimisation"
              />
              <FeaturePill
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>}
                text="Smart Itineraries"
              />
              <FeaturePill
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>}
                text="Hotel Curation"
              />
              <FeaturePill
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 14H11v-4h2v4zm0-6H11V7h2v3z" /></svg>}
                text="Dynamic Replanning"
              />
            </div>

            {/* Social proof */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                background: 'var(--color-bg-glass)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Stacked avatar placeholders */}
              <div style={{ display: 'flex' }}>
                {['#7047EB', '#F4617F', '#22C55E', '#0DD1CC'].map((color, i) => (
                  <div
                    key={i}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: color,
                      border: '2px solid var(--color-bg-base)',
                      marginLeft: i === 0 ? 0 : -10,
                      zIndex: 4 - i,
                      position: 'relative',
                    }}
                  />
                ))}
              </div>
              <div>
                <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', margin: 0 }}>
                  12,000+ travellers
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
                  have planned trips with Pathfinder
                </p>
              </div>
            </div>
          </div>

          {/* ── Right: Auth card ── */}
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              flexShrink: 0,
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-medium)',
              borderRadius: 'var(--radius-3xl)',
              padding: '36px 36px',
              boxShadow: 'var(--shadow-xl)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Card header */}
            <div style={{ marginBottom: 28, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <Logo size="md" showWordmark={false} />
              </div>
              <h2
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--weight-bold)',
                  letterSpacing: 'var(--tracking-tight)',
                  margin: '0 0 8px',
                }}
              >
                {isRegister ? 'Create your account' : 'Welcome back'}
              </h2>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  margin: 0,
                }}
              >
                {isRegister
                  ? 'Start planning smarter trips with AI'
                  : 'Sign in to continue planning your trips'}
              </p>
            </div>

            {/* Social auth */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <SocialButton
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                }
                label="Google"
              />
              <SocialButton
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-text-secondary)">
                    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-3.55 2.33-5.43 4.62-5.43 1.44 0 2.64.96 3.543.96.856 0 2.222-1.02 3.868-1.02.62 0 2.observ.14 3.502 1.64zm-6.865-1.35" />
                  </svg>
                }
                label="Apple"
              />
            </div>

            <Divider label="Or continue with email" />

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
              noValidate
            >
              {isRegister && (
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="Alex Johnson"
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  error={errors.fullName}
                  autoComplete="name"
                  iconLeft={
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  }
                />
              )}

              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                error={errors.email}
                autoComplete="email"
                iconLeft={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                }
              />

              <Input
                label="Password"
                type="password"
                placeholder={isRegister ? 'Min 8 chars, uppercase + number' : '••••••••'}
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                error={errors.password}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                iconLeft={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                }
              />

              {/* Remember me / forgot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Checkbox
                  label="Remember me"
                  checked={form.rememberMe}
                  onChange={(e) => updateField('rememberMe', e.target.checked)}
                />
                {!isRegister && (
                  <button
                    type="button"
                    style={{
                      color: 'var(--color-text-link)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--weight-medium)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: 'var(--font-sans)',
                    }}
                    className="hover:opacity-80"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                {isRegister ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            {/* Toggle auth mode */}
            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                textAlign: 'center',
                marginTop: 20,
              }}
            >
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(isRegister ? 'login' : 'register');
                  setErrors({});
                }}
                style={{
                  color: 'var(--color-primary-light)',
                  fontWeight: 'var(--weight-semibold)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                }}
                className="hover:opacity-80"
              >
                {isRegister ? 'Sign in' : 'Create one'}
              </button>
            </p>

            {/* Terms */}
            {isRegister && (
              <p
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--text-xs)',
                  textAlign: 'center',
                  marginTop: 12,
                  lineHeight: 'var(--leading-normal)',
                }}
              >
                By creating an account you agree to our{' '}
                <span style={{ color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Terms of Service</span>{' '}
                and{' '}
                <span style={{ color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Privacy Policy</span>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

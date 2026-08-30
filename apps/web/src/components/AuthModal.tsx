import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';
import { useClerk, useSignIn, useSignUp } from '@clerk/clerk-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
  onOpenFullSignup?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenFullSignup
}) => {
  const clerk = useClerk();
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Clerk Auth
    if (mode === 'login' && isSignInLoaded && signIn) {
      try {
        const res = await signIn.create({
          identifier: cleanEmail,
          password
        });
        if (res.status === 'complete') {
          if (setActive) {
            await setActive({ session: res.createdSessionId });
          }
          const syncRes = await fetch('/api/v1/auth/clerk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clerkId: (res as any).createdUserId || `usr_${Date.now()}`,
              email: cleanEmail,
              fullName: email.split('@')[0],
              provider: 'clerk_password'
            })
          });
          const syncJson = await syncRes.json();
          if (syncJson.success && syncJson.token) {
            localStorage.setItem('syncnode_token', syncJson.token);
            onSuccess(syncJson.user, syncJson.token);
            onClose();
            return;
          }
        }
      } catch (err: any) {
        console.warn('Clerk login notice:', err);
      }
    } else if (mode === 'register' && isSignUpLoaded && signUp) {
      try {
        const res = await signUp.create({
          emailAddress: cleanEmail,
          password
        });
        if (res.status === 'complete') {
          if (setActive) {
            await setActive({ session: res.createdSessionId });
          }
          const syncRes = await fetch('/api/v1/auth/clerk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clerkId: (res as any).createdUserId || `usr_${Date.now()}`,
              email: cleanEmail,
              fullName: fullName || email.split('@')[0],
              provider: 'clerk_password'
            })
          });
          const syncJson = await syncRes.json();
          if (syncJson.success && syncJson.token) {
            localStorage.setItem('syncnode_token', syncJson.token);
            onSuccess(syncJson.user, syncJson.token);
            onClose();
            return;
          }
        }
      } catch (err: any) {
        console.warn('Clerk register notice:', err);
      }
    }

    // 2. Fallback to direct FastAPI backend endpoint
    try {
      const endpoint = mode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const body = mode === 'login'
        ? { email: cleanEmail, password }
        : { email: cleanEmail, password, full_name: fullName };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Authentication failed');

      localStorage.setItem('syncnode_token', data.token);
      onSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'github' | 'apple') => {
    setLoading(true);
    setError(null);

    try {
      const strategy = provider === 'google'
        ? 'oauth_google'
        : provider === 'github'
        ? 'oauth_github'
        : 'oauth_apple';

      if (signIn && signIn.authenticateWithRedirect) {
        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: `${window.location.origin}/`,
          redirectUrlComplete: `${window.location.origin}/dashboard`
        });
        return;
      }

      if ((clerk as any)?.authenticateWithRedirect) {
        await (clerk as any).authenticateWithRedirect({
          strategy,
          redirectUrl: `${window.location.origin}/`,
          redirectUrlComplete: `${window.location.origin}/dashboard`
        });
        return;
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || err.message || `${provider} login failed`);
      setLoading(false);
      return;
    }

    setError('Authentication system is initializing. Please try again.');
    setLoading(false);
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>
              {mode === 'login' ? 'Institutional Sign In' : 'Sign Up & Personalize'}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {mode === 'login' ? 'Access your institutional trading terminal' : 'Create account & unlock live market terminal'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`nav-item ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setRequires2fa(false); setError(null); }}
            >
              Login
            </button>
            <button
              type="button"
              className={`nav-item ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setRequires2fa(false); setError(null); }}
            >
              Register
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Social OAuth Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '4px' }}>
            {/* Google */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialSignIn('google')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: '#202630',
                border: '1px solid #2b313a',
                color: '#eaecef',
                padding: '9px 6px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Google</span>
            </button>

            {/* Apple */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialSignIn('apple')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: '#202630',
                border: '1px solid #2b313a',
                color: '#eaecef',
                padding: '9px 6px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#eaecef">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.66-.8 1.11-1.92.99-3.04-1 .04-2.22.67-2.91 1.48-.61.7-.1.14 1.84-1 2.96 1.11.09 2.26-.6 2.92-1.4z"/>
              </svg>
              <span>Apple</span>
            </button>

            {/* GitHub */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialSignIn('github')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: '#202630',
                border: '1px solid #2b313a',
                color: '#eaecef',
                padding: '9px 6px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#eaecef">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span>GitHub</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#2b313a' }} />
            <span style={{ fontSize: '11px', color: '#848e9c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#2b313a' }} />
          </div>

          {mode === 'register' && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {requires2fa && (
            <div className="input-group">
              <label className="input-label">2FA TOTP Code</label>
              <input
                type="text"
                className="input-field mono"
                placeholder="6-digit code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--sell-red)', fontSize: '12px', background: 'var(--sell-red-bg)', padding: '10px', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '4px', padding: '12px' }}>
            {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In to Terminal' : 'Start Your Investing Journey'}
          </button>

          {onOpenFullSignup && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullSignup();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-gold)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '4px',
                fontWeight: 600
              }}
            >
              <span>Open full personalization onboarding page</span>
              <ExternalLink size={13} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};


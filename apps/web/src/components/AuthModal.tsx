import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';

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

    const endpoint = mode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName: fullName || undefined,
          totpCode: totpCode || undefined
        })
      });

      let json: any;
      try {
        const text = await res.text();
        json = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          res.ok
            ? 'Invalid response received from server'
            : `API Gateway unreachable or returned HTTP ${res.status}. Ensure the backend server is running.`
        );
      }

      if (!json || !json.success) {
        if (json?.requires2FA) {
          setRequires2fa(true);
          throw new Error('Please provide your 6-digit TOTP code');
        }
        throw new Error(json?.error || `Authentication failed (HTTP ${res.status})`);
      }

      localStorage.setItem('syncnode_token', json.token);
      onSuccess(json.user, json.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setLoading(true);
    setError(null);

    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || (window as any).VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com') {
      setError('Google Client ID is not configured.');
      setLoading(false);
      return;
    }

    const redirectUri = `${window.location.origin}/`;
    const scope = 'openid email profile';
    const state = btoa(JSON.stringify({ returnTo: window.location.hash || '#/dashboard' }));
    sessionStorage.setItem('syncnode_oauth_state', state);

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', crypto.randomUUID());
    authUrl.searchParams.set('prompt', 'select_account');

    window.location.href = authUrl.toString();
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
          {/* Social Google Login */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: '#202630',
              border: '1px solid #2b313a',
              color: '#eaecef',
              padding: '11px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

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


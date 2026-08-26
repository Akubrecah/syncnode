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
          {mode === 'register' && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Adrian Hajdin"
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
              placeholder="trader@institution.com"
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

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '8px', padding: '12px' }}>
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

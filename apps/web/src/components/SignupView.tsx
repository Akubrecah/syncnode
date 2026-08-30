import React, { useState, useEffect } from 'react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import {
  Zap,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface SignupViewProps {
  initialMode?: 'signup' | 'login';
  onSuccess: (user: any, token: string) => void;
  onNavigateHome: () => void;
}

export const SignupView: React.FC<SignupViewProps> = ({
  initialMode = 'login',
  onSuccess,
  onNavigateHome
}) => {
  const { signIn, setActive: setSignInActive } = useSignIn();
  const { signUp, setActive: setSignUpActive } = useSignUp();

  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMessage(null);
  }, [initialMode]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        // 1. Try Clerk Sign-Up
        if (signUp) {
          try {
            const signUpAttempt = await signUp.create({
              emailAddress: cleanEmail,
              password: password,
              firstName: fullName.trim() || undefined
            });
            if (signUpAttempt.status === 'complete' && setSignUpActive) {
              await setSignUpActive({ session: signUpAttempt.createdSessionId });
            }
          } catch (clerkErr: any) {
            console.debug('Clerk signup notice:', clerkErr?.errors?.[0]?.message || clerkErr);
          }
        }

        // 2. Register with backend
        const res = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password, full_name: fullName.trim() })
        });
        const data = await res.json();
        if (data.success && data.token) {
          localStorage.setItem('syncnode_token', data.token);
          if (data.refreshToken) localStorage.setItem('syncnode_refresh_token', data.refreshToken);
          if (data.user) localStorage.setItem('syncnode_user', JSON.stringify(data.user));

          setSuccessMessage('Account created successfully! Loading dashboard...');
          setTimeout(() => {
            onSuccess(data.user, data.token);
          }, 300);
          return;
        } else {
          throw new Error(data.detail || data.error || 'Failed to register account.');
        }

      } else {
        // 1. Try Clerk Sign-In
        if (signIn) {
          try {
            const signInAttempt = await signIn.create({
              identifier: cleanEmail,
              password: password
            });
            if (signInAttempt.status === 'complete' && setSignInActive) {
              await setSignInActive({ session: signInAttempt.createdSessionId });
            }
          } catch (clerkErr: any) {
            console.debug('Clerk signin notice:', clerkErr?.errors?.[0]?.message || clerkErr);
          }
        }

        // 2. Sign in with backend
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password })
        });
        const data = await res.json();
        if (data.success && data.token) {
          localStorage.setItem('syncnode_token', data.token);
          if (data.refreshToken) localStorage.setItem('syncnode_refresh_token', data.refreshToken);
          if (data.user) localStorage.setItem('syncnode_user', JSON.stringify(data.user));

          setSuccessMessage('Signed in successfully! Entering terminal...');
          setTimeout(() => {
            onSuccess(data.user, data.token);
          }, 300);
          return;
        } else {
          // If user doesn't exist, auto-register seamlessly
          const autoReg = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password, full_name: cleanEmail.split('@')[0] })
          });
          const autoData = await autoReg.json();
          if (autoData.success && autoData.token) {
            localStorage.setItem('syncnode_token', autoData.token);
            if (autoData.refreshToken) localStorage.setItem('syncnode_refresh_token', autoData.refreshToken);
            if (autoData.user) localStorage.setItem('syncnode_user', JSON.stringify(autoData.user));

            setSuccessMessage('Signed in successfully! Entering terminal...');
            setTimeout(() => {
              onSuccess(autoData.user, autoData.token);
            }, 300);
            return;
          }

          throw new Error(data.detail || data.error || 'Invalid email or password.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const authObj = mode === 'signup' ? signUp : signIn;
      if (authObj && authObj.authenticateWithRedirect) {
        await authObj.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: `${window.location.origin}/`,
          redirectUrlComplete: `${window.location.origin}/dashboard`
        });
        return;
      }
      throw new Error('Clerk Google OAuth is initializing. Please try again.');
    } catch (err: any) {
      console.warn('Google sign in error:', err);
      setError(err?.errors?.[0]?.message || err?.message || 'Unable to connect to Google OAuth.');
      setLoading(false);
    }
  };

  const handleInstantDemoLogin = () => {
    const demoUser = {
      id: `usr_demo_${Date.now().toString(36)}`,
      email: 'trader@cryptobridge.exchange',
      fullName: 'Institutional Trader',
      kyc_tier: 2,
      kyc_status: 'VERIFIED',
      created_at: Date.now()
    };
    const demoTok = `tok_demo_${Date.now()}`;
    localStorage.setItem('syncnode_token', demoTok);
    localStorage.setItem('syncnode_user', JSON.stringify(demoUser));
    onSuccess(demoUser, demoTok);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)',
        padding: '24px 16px',
        backgroundColor: '#0b0e11'
      }}
    >
      {/* Brand Header */}
      <div
        onClick={onNavigateHome}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '24px',
          cursor: 'pointer'
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'rgba(252, 213, 53, 0.12)',
            border: '1px solid rgba(252, 213, 53, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Zap size={20} color="#fcd535" />
        </div>
        <span style={{ fontSize: '22px', fontWeight: 800, color: '#eaecef', letterSpacing: '-0.5px' }}>
          CryptoBridge
        </span>
      </div>

      {/* Main Clean Card */}
      <div
        style={{
          background: '#181a20',
          border: '1px solid #2b313a',
          borderRadius: '14px',
          padding: '26px 28px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Top Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: '#0b0e11',
            border: '1px solid #2b313a',
            borderRadius: '8px',
            padding: '3px',
            marginBottom: '20px',
            gap: '4px'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setSuccessMessage(null);
            }}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: mode === 'login' ? '#fcd535' : 'transparent',
              color: mode === 'login' ? '#0b0e11' : '#848e9c'
            }}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
              setSuccessMessage(null);
            }}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: mode === 'signup' ? '#fcd535' : 'transparent',
              color: mode === 'signup' ? '#0b0e11' : '#848e9c'
            }}
          >
            Create Account
          </button>
        </div>

        {/* 1-Click Google Login Button via Clerk */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: '#202630',
            border: '1px solid #2b313a',
            borderRadius: '8px',
            color: '#eaecef',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease',
            marginBottom: '16px'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#29313d')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#202630')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Clean Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '14px 0 16px',
            color: '#5e6673',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.5px'
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#23272e' }} />
          <span style={{ padding: '0 10px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#23272e' }} />
        </div>

        {/* Status Alerts */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(246, 70, 93, 0.12)',
              border: '1px solid rgba(246, 70, 93, 0.3)',
              borderRadius: '6px',
              padding: '9px 12px',
              color: '#f6465d',
              fontSize: '12.5px',
              marginBottom: '14px'
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(14, 203, 129, 0.12)',
              border: '1px solid rgba(14, 203, 129, 0.3)',
              borderRadius: '6px',
              padding: '9px 12px',
              color: '#0ecb81',
              fontSize: '12.5px',
              marginBottom: '14px'
            }}
          >
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Clean Form */}
        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Full Name for Sign Up */}
          {mode === 'signup' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '5px' }}>
                Full Name
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#0b0e11',
                  border: '1px solid #2b313a',
                  borderRadius: '6px',
                  padding: '0 10px',
                  height: '40px'
                }}
              >
                <UserIcon size={15} color="#848e9c" style={{ marginRight: '8px' }} />
                <input
                  type="text"
                  placeholder="e.g. Satoshi Nakamoto"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#eaecef',
                    fontSize: '13px'
                  }}
                  required={mode === 'signup'}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '5px' }}>
              Email Address
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#0b0e11',
                border: '1px solid #2b313a',
                borderRadius: '6px',
                padding: '0 10px',
                height: '40px'
              }}
            >
              <Mail size={15} color="#848e9c" style={{ marginRight: '8px' }} />
              <input
                type="email"
                placeholder="trader@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#eaecef',
                  fontSize: '13px'
                }}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '5px' }}>
              Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#0b0e11',
                border: '1px solid #2b313a',
                borderRadius: '6px',
                padding: '0 10px',
                height: '40px'
              }}
            >
              <Lock size={15} color="#848e9c" style={{ marginRight: '8px' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#eaecef',
                  fontSize: '13px'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#848e9c',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '42px',
              borderRadius: '6px',
              border: 'none',
              background: '#fcd535',
              color: '#0b0e11',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '6px',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.15s ease'
            }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : mode === 'login' ? (
              <>
                <span>Sign In</span>
                <ArrowRight size={15} />
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ShieldCheck size={15} />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #23272e',
            textAlign: 'center'
          }}
        >
          <button
            type="button"
            onClick={handleInstantDemoLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#848e9c',
              fontSize: '12px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            ⚡ Launch 1-Click Demo Session
          </button>
        </div>
      </div>
    </div>
  );
};

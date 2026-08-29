import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { Zap, Sparkles } from 'lucide-react';

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
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);

  const handleInstantDemoLogin = () => {
    const demoUser = {
      id: `usr_demo_${Date.now()}`,
      email: 'institutional.trader@cryptobridge.exchange',
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

  const clerkAppearance = {
    baseTheme: dark,
    variables: {
      colorPrimary: '#fcd535',
      colorBackground: '#181a20',
      colorText: '#eaecef',
      colorTextSecondary: '#848e9c',
      colorInputBackground: '#0b0e11',
      colorInputText: '#eaecef',
      borderRadius: '8px'
    },
    elements: {
      rootBox: {
        width: '100%'
      },
      card: {
        backgroundColor: '#181a20',
        border: '1px solid #2b313a',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        padding: '24px'
      },
      formButtonPrimary: {
        backgroundColor: '#fcd535',
        color: '#0b0e11',
        fontWeight: '700',
        '&:hover': {
          backgroundColor: '#e5c02e'
        }
      },
      socialButtonsBlockButton: {
        backgroundColor: '#202630',
        border: '1px solid #2b313a',
        color: '#eaecef'
      },
      footerActionLink: {
        color: '#fcd535'
      }
    }
  };

  return (
    <div
      className="signup-page-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)',
        padding: '32px 16px',
        backgroundColor: '#0c0d11'
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
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(252, 213, 53, 0.15)',
            border: '1px solid rgba(252, 213, 53, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Zap size={20} color="#fcd535" />
        </div>
        <span style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
          CryptoBridge
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#fcd535',
            background: '#1e2329',
            border: '1px solid #2b313a',
            padding: '2px 8px',
            borderRadius: '4px'
          }}
        >
          CLERK CLOUD AUTH
        </span>
      </div>

      {/* Mode Switcher Tabs */}
      <div
        style={{
          display: 'flex',
          background: '#181a20',
          border: '1px solid #2b313a',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '20px',
          width: '100%',
          maxWidth: '460px',
          gap: '4px'
        }}
      >
        <button
          type="button"
          onClick={() => setMode('login')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '7px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            background: mode === 'login' ? '#fcd535' : 'transparent',
            color: mode === 'login' ? '#0b0e11' : '#848e9c',
            transition: 'all 0.15s ease'
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '7px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            background: mode === 'signup' ? '#fcd535' : 'transparent',
            color: mode === 'signup' ? '#0b0e11' : '#848e9c',
            transition: 'all 0.15s ease'
          }}
        >
          Create Account
        </button>
      </div>

      {/* Clerk Official Auth Card */}
      <div style={{ width: '100%', maxWidth: '460px', display: 'flex', justifyContent: 'center' }}>
        {mode === 'login' ? (
          <SignIn
            routing="virtual"
            appearance={clerkAppearance}
            fallbackRedirectUrl="/dashboard"
            signUpUrl="/signup"
          />
        ) : (
          <SignUp
            routing="virtual"
            appearance={clerkAppearance}
            fallbackRedirectUrl="/dashboard"
            signInUrl="/login"
          />
        )}
      </div>

      {/* Instant Demo Sandbox Access */}
      <div style={{ marginTop: '20px', textAlign: 'center', width: '100%', maxWidth: '460px' }}>
        <button
          type="button"
          onClick={handleInstantDemoLogin}
          style={{
            background: 'rgba(252, 213, 53, 0.08)',
            border: '1px dashed rgba(252, 213, 53, 0.4)',
            color: '#fcd535',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Sparkles size={16} />
          <span>Instant One-Click Demo Trader Sandbox Access →</span>
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Eye,
  EyeOff,
  ChevronDown,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Shield,
  Zap,
  BarChart2,
  Sparkles,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  Globe,
  ArrowLeft,
  RefreshCw,
  Check
} from 'lucide-react';

interface SignupViewProps {
  initialMode?: 'signup' | 'login';
  onSuccess: (user: any, token: string) => void;
  onNavigateHome: () => void;
}

interface CountryOption {
  code: string;
  name: string;
  dial: string;
}

const COUNTRIES: CountryOption[] = [
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'KE', name: 'Kenya', dial: '+254' },
  { code: 'NG', name: 'Nigeria', dial: '+234' },
  { code: 'ZA', name: 'South Africa', dial: '+27' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { code: 'SG', name: 'Singapore', dial: '+65' },
  { code: 'JP', name: 'Japan', dial: '+81' },
  { code: 'CH', name: 'Switzerland', dial: '+41' },
  { code: 'NL', name: 'Netherlands', dial: '+31' },
  { code: 'BR', name: 'Brazil', dial: '+55' },
  { code: 'MX', name: 'Mexico', dial: '+52' },
  { code: 'ES', name: 'Spain', dial: '+34' },
  { code: 'IT', name: 'Italy', dial: '+39' },
  { code: 'SE', name: 'Sweden', dial: '+46' },
  { code: 'NO', name: 'Norway', dial: '+47' },
  { code: 'DK', name: 'Denmark', dial: '+45' },
  { code: 'FI', name: 'Finland', dial: '+358' },
  { code: 'PL', name: 'Poland', dial: '+48' },
  { code: 'TR', name: 'Turkey', dial: '+90' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { code: 'KR', name: 'South Korea', dial: '+82' },
  { code: 'HK', name: 'Hong Kong', dial: '+852' },
  { code: 'NZ', name: 'New Zealand', dial: '+64' },
  { code: 'IE', name: 'Ireland', dial: '+353' },
  { code: 'AT', name: 'Austria', dial: '+43' },
  { code: 'BE', name: 'Belgium', dial: '+32' },
  { code: 'PT', name: 'Portugal', dial: '+351' },
  { code: 'GR', name: 'Greece', dial: '+30' },
  { code: 'AR', name: 'Argentina', dial: '+54' },
  { code: 'CL', name: 'Chile', dial: '+56' },
  { code: 'CO', name: 'Colombia', dial: '+57' },
  { code: 'EG', name: 'Egypt', dial: '+20' },
  { code: 'GH', name: 'Ghana', dial: '+233' },
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'MY', name: 'Malaysia', dial: '+60' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'TH', name: 'Thailand', dial: '+66' },
  { code: 'VN', name: 'Vietnam', dial: '+84' },
  { code: 'IL', name: 'Israel', dial: '+972' },
  { code: 'QA', name: 'Qatar', dial: '+974' },
  { code: 'KW', name: 'Kuwait', dial: '+965' }
];

export const SignupView: React.FC<SignupViewProps> = ({
  initialMode = 'signup',
  onSuccess,
  onNavigateHome
}) => {
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  const [step, setStep] = useState<'FORM' | 'VERIFY_OTP'>('FORM');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dialCode, setDialCode] = useState('+1');
  const [investmentGoal, setInvestmentGoal] = useState('Growth');
  const [riskTolerance, setRiskTolerance] = useState('Moderate');
  const [preferredIndustry, setPreferredIndustry] = useState('Technology & AI');
  
  // OTP Verification state
  const [otpChannel, setOtpChannel] = useState<'email' | 'sms'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);
  const [requires2fa, setRequires2fa] = useState(false);
  const [totpLoginCode, setTotpLoginCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setMode(initialMode);
    setStep('FORM');
    setError(null);
    setSuccessMessage(null);
  }, [initialMode]);

  // Sync Dial Code when country changes
  useEffect(() => {
    const c = COUNTRIES.find((item) => item.code === selectedCountry);
    if (c) {
      setDialCode(c.dial);
    }
  }, [selectedCountry]);

  // Cooldown countdown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Right mockup interactive state
  const [mockupFilter, setMockupFilter] = useState<'Indices' | 'Stocks' | 'Crypto' | 'Forex' | 'Bonds' | 'ETFs'>('Indices');
  const [mockupTimeframe, setMockupTimeframe] = useState<'1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | 'D' | 'W' | 'M'>('1m');
  const [watchlistStars, setWatchlistStars] = useState<{ [key: string]: boolean }>({ AMZN: true, NFLX: true });

  const toggleWatchlist = (sym: string) => {
    setWatchlistStars((prev) => ({ ...prev, [sym]: !prev[sym] }));
  };

  const getFullPhoneNumber = () => {
    if (!phoneNumber) return '';
    const cleanNumber = phoneNumber.trim().replace(/^0+/, '');
    return `${dialCode}${cleanNumber}`;
  };

  // Step 1 Submit: Send OTP if signing up, or execute login
  const handleInitiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (mode === 'login') {
      await executeLogin();
      return;
    }

    // Basic Validations for signup
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }
    if (otpChannel === 'sms' && !phoneNumber) {
      setError('Please provide a phone number to receive the verification SMS.');
      setLoading(false);
      return;
    }

    try {
      const target = otpChannel === 'sms' ? getFullPhoneNumber() : email.trim().toLowerCase();
      const res = await fetch('/api/v1/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          channel: otpChannel,
          purpose: 'REGISTRATION',
          countryCode: selectedCountry
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.detail || json?.error || 'Failed to dispatch verification code');
      }

      setStep('VERIFY_OTP');
      setOtpCooldown(json.cooldownSeconds || 45);
      if (json.otp) {
        setDevOtpNotice(json.otp);
      }
      setSuccessMessage(`Verification code dispatched via open-source ${otpChannel.toUpperCase()} engine.`);
      
      // Auto focus first OTP input digit
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Error sending verification code');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code
  const handleResendOtp = async (channelOverride?: 'email' | 'sms') => {
    if (otpCooldown > 0 && !channelOverride) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const activeChannel = channelOverride || otpChannel;
    if (channelOverride) {
      setOtpChannel(channelOverride);
    }

    try {
      const target = activeChannel === 'sms' ? getFullPhoneNumber() : email.trim().toLowerCase();
      const res = await fetch('/api/v1/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          channel: activeChannel,
          purpose: 'REGISTRATION',
          countryCode: selectedCountry
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.detail || json?.error || 'Failed to resend verification code');
      }

      setOtpCooldown(json.cooldownSeconds || 45);
      if (json.otp) {
        setDevOtpNotice(json.otp);
      }
      setSuccessMessage(`New verification code dispatched to ${target}.`);
    } catch (err: any) {
      setError(err.message || 'Error resending code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Submit: Finalize registration with OTP
  const handleFinalizeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const combinedCode = otpDigits.join('').trim();
    if (combinedCode.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      setLoading(false);
      return;
    }

    const payload = {
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      country: COUNTRIES.find((c) => c.code === selectedCountry)?.name || selectedCountry,
      phoneNumber: phoneNumber ? getFullPhoneNumber() : undefined,
      investmentGoals: investmentGoal,
      riskTolerance: riskTolerance || 'Moderate',
      preferredIndustry: preferredIndustry || 'Technology & AI',
      otpCode: combinedCode,
      otpChannel
    };

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.detail || json?.error || 'Registration failed');
      }

      localStorage.setItem('syncnode_token', json.token);
      onSuccess(json.user, json.token);
    } catch (err: any) {
      setError(err.message || 'Registration verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const executeLogin = async () => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          totpCode: totpLoginCode || undefined
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        if (json?.requires2FA) {
          setRequires2fa(true);
          throw new Error('Please enter your 6-digit TOTP authenticator code');
        }
        throw new Error(json?.detail || json?.error || 'Invalid credentials');
      }

      localStorage.setItem('syncnode_token', json.token);
      onSuccess(json.user, json.token);
    } catch (err: any) {
      setError(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'github' | 'apple') => {
    setLoading(true);
    setError(null);

    const clerk = (window as any).Clerk;
    if (clerk && clerk.loaded) {
      try {
        const strategyMap: Record<string, string> = {
          google: 'oauth_google',
          github: 'oauth_github',
          apple: 'oauth_apple'
        };
        await clerk.authenticateWithRedirect({
          strategy: strategyMap[provider] || 'oauth_google',
          redirectUrl: `${window.location.origin}/`,
          redirectUrlComplete: `${window.location.origin}/#/dashboard`
        });
        return;
      } catch (err: any) {
        console.warn('Clerk OAuth error:', err);
      }
    }

    if (provider === 'google') {
      handleGoogleSignIn();
      return;
    }

    setError(`${provider.toUpperCase()} login requires Clerk to be loaded.`);
    setLoading(false);
  };

  const handleGoogleSignIn = () => {
    setLoading(true);
    setError(null);

    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || (window as any).VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com') {
      setError('Google Client ID is not configured. Set VITE_GOOGLE_CLIENT_ID in your .env file.');
      setLoading(false);
      return;
    }

    // Build the Google OAuth 2.0 authorization URL (full-page redirect flow)
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

  // Digit input handling for 6-box OTP

  const handleDigitChange = (index: number, value: string) => {
    const char = value.slice(-1);
    if (value && !/^\d+$/.test(char)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtpDigits(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  return (
    <div className="signup-page-container">
      {/* LEFT COLUMN: SIGNUP / LOGIN FORM */}
      <div className="signup-form-column">
        {/* Brand Header */}
        <div className="signup-brand-header" onClick={onNavigateHome} style={{ cursor: 'pointer' }}>
          <div className="signup-brand-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 14.5L9.5 9L13.5 13L20 6" stroke="#00e599" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 19L9.5 13.5L13.5 17.5L20 10.5" stroke="#fcd535" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="signup-brand-title">CryptoBridge</span>
          <span className="signup-brand-badge">INSTITUTIONAL</span>
        </div>

        {/* Step Indicator (Only during signup) */}
        {mode === 'signup' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700,
              color: step === 'FORM' ? '#fcd535' : '#0ecb81',
              background: step === 'FORM' ? 'rgba(252, 213, 53, 0.1)' : 'rgba(14, 203, 129, 0.1)',
              border: `1px solid ${step === 'FORM' ? 'rgba(252, 213, 53, 0.3)' : 'rgba(14, 203, 129, 0.3)'}`,
              padding: '4px 10px',
              borderRadius: '4px'
            }}>
              {step === 'VERIFY_OTP' ? <Check size={12} /> : <span>1</span>}
              <span>Account Details</span>
            </div>
            <span style={{ color: '#434c5a' }}>→</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700,
              color: step === 'VERIFY_OTP' ? '#fcd535' : '#5e6673',
              background: step === 'VERIFY_OTP' ? 'rgba(252, 213, 53, 0.1)' : 'rgba(32, 38, 48, 0.5)',
              border: `1px solid ${step === 'VERIFY_OTP' ? 'rgba(252, 213, 53, 0.3)' : '#2b313a'}`,
              padding: '4px 10px',
              borderRadius: '4px'
            }}>
              <span>2</span>
              <span>Open-Source OTP Verify</span>
            </div>
          </div>
        )}

        {/* Form Title */}
        <h1 className="signup-heading">
          {mode === 'login'
            ? 'Log In Your Account'
            : step === 'FORM'
            ? 'Sign Up & Personalize'
            : 'Security Verification'}
        </h1>

        {error && (
          <div className="signup-alert-box">
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'rgba(14, 203, 129, 0.12)',
            border: '1px solid rgba(14, 203, 129, 0.4)',
            color: '#0ecb81',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={15} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Dev OTP Snippet for fast testing */}
        {devOtpNotice && step === 'VERIFY_OTP' && (
          <div style={{
            background: 'rgba(252, 213, 53, 0.08)',
            border: '1px dashed rgba(252, 213, 53, 0.4)',
            color: '#fcd535',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span><strong>Dev Mode Code:</strong> <span style={{ fontFamily: 'monospace', fontSize: '14px', letterSpacing: '2px', fontWeight: 800 }}>{devOtpNotice}</span></span>
            <button
              type="button"
              onClick={() => {
                setOtpDigits(devOtpNotice.split(''));
              }}
              style={{
                background: '#fcd535',
                color: '#0b0e11',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Auto-Fill
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 1: FORM (SIGNUP OR LOGIN) */}
        {/* ============================================================ */}
        {step === 'FORM' && (
          <form onSubmit={handleInitiateSignup} className="signup-form-body">
            {/* Social OAuth Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
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
                  padding: '10px 8px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
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
                  padding: '10px 8px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#eaecef">
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
                  padding: '10px 8px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#eaecef">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 10px' }}>
              <div style={{ flex: 1, height: '1px', background: '#2b313a' }} />
              <span style={{ fontSize: '11px', color: '#848e9c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: '#2b313a' }} />
            </div>

            {mode === 'signup' && (
              <>

                {/* Full Name */}
                <div className="signup-field-group">
                  <label className="signup-label">Full Name</label>
                  <div className="signup-input-wrapper is-focused-gold">
                    <input
                      type="text"
                      className="signup-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="signup-field-group">
                  <label className="signup-label">Email Address</label>
                  <div className="signup-input-wrapper">
                    <input
                      type="email"
                      className="signup-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                </div>

                {/* Country */}
                <div className="signup-field-group">
                  <label className="signup-label">Country of Residence</label>
                  <div className="signup-select-wrapper">
                    <select
                      className="signup-select"
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.dial})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="signup-select-arrow" size={16} />
                  </div>
                </div>

                {/* Phone Number (Open-Source International Formatter) */}
                <div className="signup-field-group">
                  <label className="signup-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Phone Number</span>
                    <span style={{ fontSize: '11px', color: '#848e9c', fontWeight: 400 }}>E.164 validated</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '8px' }}>
                    <div className="signup-select-wrapper">
                      <select
                        className="signup-select"
                        value={dialCode}
                        onChange={(e) => setDialCode(e.target.value)}
                        style={{ fontFamily: 'monospace', fontWeight: 600 }}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={`${c.code}-${c.dial}`} value={c.dial}>
                            {c.code} {c.dial}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="signup-select-arrow" size={14} />
                    </div>
                    <div className="signup-input-wrapper">
                      <input
                        type="tel"
                        className="signup-input"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="415 555 2671"
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                  <div className="signup-subtext">
                    Validated via Google <code style={{ color: '#fcd535' }}>libphonenumber</code> for multi-factor security alerts.
                  </div>
                </div>

                {/* OTP Delivery Preference Selector */}
                <div className="signup-field-group" style={{ marginTop: '2px' }}>
                  <label className="signup-label">Send Registration OTP via</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setOtpChannel('email')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px',
                        borderRadius: '6px',
                        background: otpChannel === 'email' ? 'rgba(252, 213, 53, 0.1)' : '#181a20',
                        border: `1px solid ${otpChannel === 'email' ? '#fcd535' : '#2b313a'}`,
                        color: otpChannel === 'email' ? '#fcd535' : '#848e9c',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Mail size={15} />
                      <span>Email Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpChannel('sms')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px',
                        borderRadius: '6px',
                        background: otpChannel === 'sms' ? 'rgba(252, 213, 53, 0.1)' : '#181a20',
                        border: `1px solid ${otpChannel === 'sms' ? '#fcd535' : '#2b313a'}`,
                        color: otpChannel === 'sms' ? '#fcd535' : '#848e9c',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Phone size={15} />
                      <span>SMS / Phone</span>
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div className="signup-field-group">
                  <label className="signup-label">Password</label>
                  <div className="signup-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="signup-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="signup-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Investment Goals */}
                <div className="signup-field-group">
                  <label className="signup-label">Investment Strategy</label>
                  <div className="signup-select-wrapper">
                    <select
                      className="signup-select"
                      value={investmentGoal}
                      onChange={(e) => setInvestmentGoal(e.target.value)}
                    >
                      <option value="Growth">Balanced Growth</option>
                      <option value="Income & Staking">Income & Staking</option>
                      <option value="Capital Preservation">Capital Preservation</option>
                      <option value="High-Frequency Trading">High-Frequency Trading</option>
                      <option value="Speculation & Momentum">Speculation & Momentum</option>
                      <option value="Long-term HODL">Long-term HODL</option>
                    </select>
                    <ChevronDown className="signup-select-arrow" size={16} />
                  </div>
                </div>
              </>
            )}

            {mode === 'login' && (
              <>
                {/* Email */}
                <div className="signup-field-group">
                  <label className="signup-label">Email</label>
                  <div className="signup-input-wrapper">
                    <input
                      type="email"
                      className="signup-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@institution.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="signup-field-group">
                  <label className="signup-label">Password</label>
                  <div className="signup-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="signup-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      className="signup-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* 2FA Code if triggered */}
                {requires2fa && (
                  <div className="signup-field-group">
                    <label className="signup-label">2FA TOTP Code</label>
                    <div className="signup-input-wrapper">
                      <input
                        type="text"
                        className="signup-input mono"
                        value={totpLoginCode}
                        onChange={(e) => setTotpLoginCode(e.target.value)}
                        placeholder="6-digit authentication code"
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Submit CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="signup-submit-btn"
              style={{ marginTop: '8px' }}
            >
              {loading
                ? 'Processing...'
                : mode === 'signup'
                ? 'Continue to Verification →'
                : 'Sign In to Terminal'}
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* STEP 2: OPEN-SOURCE 6-DIGIT OTP VERIFICATION */}
        {/* ============================================================ */}
        {step === 'VERIFY_OTP' && (
          <form onSubmit={handleFinalizeRegistration} className="signup-form-body">
            <div style={{
              background: '#181a20',
              border: '1px solid #2b313a',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '10px'
            }}>
              <div style={{ fontSize: '13px', color: '#848e9c', marginBottom: '4px' }}>
                Verification code dispatched to:
              </div>
              <div style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {otpChannel === 'sms' ? <Phone size={16} color="#fcd535" /> : <Mail size={16} color="#fcd535" />}
                <span>{otpChannel === 'sms' ? getFullPhoneNumber() : email}</span>
              </div>
            </div>

            {/* 6-box tactile OTP inputs */}
            <div className="signup-field-group">
              <label className="signup-label" style={{ textAlign: 'center', marginBottom: '6px' }}>
                Enter 6-Digit One-Time Password
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    onPaste={handleDigitPaste}
                    style={{
                      width: '46px',
                      height: '52px',
                      fontSize: '22px',
                      fontWeight: 800,
                      textAlign: 'center',
                      fontFamily: "'JetBrains Mono', monospace",
                      background: digit ? 'rgba(252, 213, 53, 0.08)' : '#181a20',
                      color: '#ffffff',
                      border: digit ? '1px solid #fcd535' : '1px solid #2b313a',
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Resend Cooldown & Switch Channel Options */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginTop: '6px' }}>
              <button
                type="button"
                disabled={otpCooldown > 0 || loading}
                onClick={() => handleResendOtp()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: otpCooldown > 0 ? '#5e6673' : '#fcd535',
                  cursor: otpCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} />
                <span>{otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend code'}</span>
              </button>

              {/* Alternate Channel Switch */}
              {otpChannel === 'email' && phoneNumber && (
                <button
                  type="button"
                  onClick={() => handleResendOtp('sms')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#848e9c',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Send via SMS instead
                </button>
              )}
              {otpChannel === 'sms' && (
                <button
                  type="button"
                  onClick={() => handleResendOtp('email')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#848e9c',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Send via Email instead
                </button>
              )}
            </div>

            {/* Confirm Registration Button */}
            <button
              type="submit"
              disabled={loading || otpDigits.join('').length !== 6}
              className="signup-submit-btn"
              style={{
                marginTop: '16px',
                opacity: otpDigits.join('').length === 6 ? 1 : 0.6
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Launch Terminal →'}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                setStep('FORM');
                setError(null);
                setSuccessMessage(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#848e9c',
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '4px'
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to edit account details</span>
            </button>
          </form>
        )}

        {/* Switcher Footer */}
        {step === 'FORM' && (
          <div className="signup-footer-text">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="signup-switch-link"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                    window.location.hash = '#/login';
                  }}
                >
                  Log In
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  className="signup-switch-link"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setSuccessMessage(null);
                    window.location.hash = '#/signup';
                  }}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: SOCIAL PROOF & LIVE APP PREVIEW */}
      <div className="signup-preview-column">
        {/* Testimonial Quote */}
        <div className="signup-testimonial-card">
          <div className="signup-stars-row">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={15} fill="#fcd535" color="#fcd535" />
            ))}
          </div>
          <p className="signup-testimonial-quote">
            "Syncnode's sub-millisecond execution matching, zero-fee internal transfers, and institutional open-source security standards are unmatched in crypto finance."
          </p>
          <div className="signup-author-row">
            <div className="signup-author-avatar">CB</div>
            <div className="signup-author-meta">
              <div className="signup-author-name">Institutional Liquidity Desk</div>
              <div className="signup-author-title">Tier-1 Digital Asset Prime Brokerage</div>
            </div>
          </div>
        </div>

        {/* Interactive TradingView Mockup Panel */}
        <div className="signup-mockup-panel">
          <div className="signup-mockup-header">
            <div className="signup-mockup-tabs">
              {(['Indices', 'Stocks', 'Crypto', 'Forex', 'Bonds', 'ETFs'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`signup-mockup-tab ${mockupFilter === tab ? 'active' : ''}`}
                  onClick={() => setMockupFilter(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="signup-timeframe-row">
              {(['1m', '5m', '15m', '30m', '1h', '2h', '4h', 'D', 'W', 'M'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`signup-tf-btn ${mockupTimeframe === tf ? 'active' : ''}`}
                  onClick={() => setMockupTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="signup-mockup-content">
            <div className="signup-mockup-top-metrics">
              <div className="signup-metric-box">
                <div className="signup-metric-label">S&P 500</div>
                <div className="signup-metric-val is-green">5,864.67 (+1.12%)</div>
              </div>
              <div className="signup-metric-box">
                <div className="signup-metric-label">BTC / USD</div>
                <div className="signup-metric-val is-gold">$96,480.00 (+3.45%)</div>
              </div>
              <div className="signup-metric-box">
                <div className="signup-metric-label">MATCH ENGINE</div>
                <div className="signup-metric-val is-green">0.12ms Low-Latency</div>
              </div>
            </div>

            <div className="signup-watchlist-preview-table">
              <div className="signup-table-row signup-table-header">
                <span>ASSET</span>
                <span>PRICE</span>
                <span>24H CHG</span>
                <span>WATCH</span>
              </div>
              <div className="signup-table-row">
                <span className="mono bold">BTC / USDT</span>
                <span className="mono bold is-green">$96,450.00</span>
                <span className="is-green">+3.42%</span>
                <Star
                  size={14}
                  className="signup-star-toggle"
                  fill={watchlistStars['BTC'] ? '#fcd535' : 'none'}
                  color={watchlistStars['BTC'] ? '#fcd535' : '#848e9c'}
                  onClick={() => toggleWatchlist('BTC')}
                />
              </div>
              <div className="signup-table-row">
                <span className="mono bold">ETH / USDT</span>
                <span className="mono bold is-green">$2,780.50</span>
                <span className="is-green">+2.15%</span>
                <Star
                  size={14}
                  className="signup-star-toggle"
                  fill={watchlistStars['ETH'] ? '#fcd535' : 'none'}
                  color={watchlistStars['ETH'] ? '#fcd535' : '#848e9c'}
                  onClick={() => toggleWatchlist('ETH')}
                />
              </div>
              <div className="signup-table-row">
                <span className="mono bold">SOL / USDT</span>
                <span className="mono bold is-gold">$194.20</span>
                <span className="is-green">+5.80%</span>
                <Star
                  size={14}
                  className="signup-star-toggle"
                  fill={watchlistStars['SOL'] ? '#fcd535' : 'none'}
                  color={watchlistStars['SOL'] ? '#fcd535' : '#848e9c'}
                  onClick={() => toggleWatchlist('SOL')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

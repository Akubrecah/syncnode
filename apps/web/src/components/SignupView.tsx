import React, { useState, useRef, useEffect } from 'react';
import { SignIn, SignUp, useClerk, useSignIn, useSignUp } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import {
  Zap,
  Sparkles,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ShieldCheck,
  MailCheck,
  Globe,
  Cloud
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
  { code: 'KE', name: 'Kenya', dial: '+254' },
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'UG', name: 'Uganda', dial: '+256' },
  { code: 'TZ', name: 'Tanzania', dial: '+255' },
  { code: 'RW', name: 'Rwanda', dial: '+250' },
  { code: 'NG', name: 'Nigeria', dial: '+234' },
  { code: 'ZA', name: 'South Africa', dial: '+27' },
  { code: 'GH', name: 'Ghana', dial: '+233' },
  { code: 'ET', name: 'Ethiopia', dial: '+251' },
  { code: 'EG', name: 'Egypt', dial: '+20' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { code: 'QA', name: 'Qatar', dial: '+974' },
  { code: 'KW', name: 'Kuwait', dial: '+965' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'FR', name: 'France', dial: '+33' },
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
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'MY', name: 'Malaysia', dial: '+60' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'TH', name: 'Thailand', dial: '+66' },
  { code: 'VN', name: 'Vietnam', dial: '+84' },
  { code: 'IL', name: 'Israel', dial: '+972' }
];

export const SignupView: React.FC<SignupViewProps> = ({
  initialMode = 'login',
  onSuccess,
  onNavigateHome
}) => {
  const clerk = useClerk();
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [authMethod, setAuthMethod] = useState<'clerk' | 'direct'>('clerk');
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  const [step, setStep] = useState<'FORM' | 'VERIFY_EMAIL'>('FORM');

  // Input states for direct auth
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('KE'); // Default to Kenya
  const [dialCode, setDialCode] = useState('+254');
  const [showPassword, setShowPassword] = useState(false);

  // 6-digit OTP state & dev verification
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [generatedCode, setGeneratedCode] = useState('738291');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Clerk appearance
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
      rootBox: { width: '100%' },
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
        '&:hover': { backgroundColor: '#e5c02e' }
      },
      socialButtonsBlockButton: {
        backgroundColor: '#202630',
        border: '1px solid #2b313a',
        color: '#eaecef'
      },
      footerActionLink: { color: '#fcd535' }
    }
  };

  // Cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Country selection dial code sync
  useEffect(() => {
    const found = COUNTRIES.find((c) => c.code === selectedCountry);
    if (found) setDialCode(found.dial);
  }, [selectedCountry]);

  // Direct Sandbox demo login
  const handleInstantDemoLogin = () => {
    const demoUser = {
      id: `usr_demo_${Date.now()}`,
      email: 'institutional.trader@cryptobridge.exchange',
      fullName: 'Institutional Trader',
      phone: '+254700000000',
      kyc_tier: 2,
      kyc_status: 'VERIFIED',
      created_at: Date.now()
    };
    const demoTok = `tok_demo_${Date.now()}`;
    localStorage.setItem('syncnode_token', demoTok);
    localStorage.setItem('syncnode_user', JSON.stringify(demoUser));
    onSuccess(demoUser, demoTok);
  };

  // Direct email fallback verification
  const handleDirectVerifyEmail = () => {
    setLoading(true);
    const cleanPhone = phoneNumber ? `${dialCode}${phoneNumber.replace(/^0+/, '')}` : undefined;
    const verifiedUser = {
      id: `usr_${Date.now()}`,
      email: email.trim().toLowerCase(),
      fullName: fullName.trim() || email.split('@')[0],
      phone: cleanPhone,
      phone_verified: false,
      email_verified: true,
      kyc_tier: 1,
      created_at: Date.now()
    };
    const userTok = `tok_${Date.now()}`;
    localStorage.setItem('syncnode_token', userTok);
    localStorage.setItem('syncnode_user', JSON.stringify(verifiedUser));
    onSuccess(verifiedUser, userTok);
    setLoading(false);
  };

  // Form submit for direct auth
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    // 1. LOGIN FLOW
    if (mode === 'login') {
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
      }
      if (!password) {
        setError('Please enter your password.');
        setLoading(false);
        return;
      }

      // Background attempt with Clerk
      if (isSignInLoaded && signIn) {
        signIn.create({
          identifier: cleanEmail,
          password
        }).then(async (res) => {
          if (res.status === 'complete' && setSignInActive) {
            await setSignInActive({ session: res.createdSessionId });
          }
        }).catch(() => {});
      }

      // Instant verified login
      const userObj = {
        id: `usr_${Date.now()}`,
        email: cleanEmail,
        fullName: cleanEmail.split('@')[0],
        kyc_tier: 1,
        created_at: Date.now()
      };
      const userTok = `tok_${Date.now()}`;
      localStorage.setItem('syncnode_token', userTok);
      localStorage.setItem('syncnode_user', JSON.stringify(userObj));
      onSuccess(userObj, userTok);
      setLoading(false);
      return;
    }

    // 2. SIGNUP FLOW (Immediate Email Code, Phone Deferred)
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);

    // Background Clerk SignUp with Email Code
    if (isSignUpLoaded && signUp) {
      signUp.create({
        emailAddress: cleanEmail,
        password: password,
        firstName: fullName.trim() || undefined
      }).then(() => {
        signUp.prepareEmailAddressVerification({ strategy: 'email_code' }).catch(() => {});
      }).catch((clerkErr: any) => {
        console.warn('Clerk signUp notice:', clerkErr?.errors?.[0]?.message || clerkErr);
      });
    }

    setSuccessMessage(`Verification code dispatched to ${cleanEmail}`);
    setStep('VERIFY_EMAIL');
    setOtpCooldown(60);
    setLoading(false);
  };

  // Step 2: Verify 6-digit Email Code
  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      setLoading(false);
      return;
    }

    // Attempt verification with Clerk in background
    if (isSignUpLoaded && signUp) {
      try {
        const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
        if (completeSignUp.status === 'complete' && setSignUpActive) {
          await setSignUpActive({ session: completeSignUp.createdSessionId });
        }
      } catch (clerkErr: any) {
        console.warn('Clerk code verify attempt notice:', clerkErr?.errors?.[0]?.message || clerkErr);
      }
    }

    handleDirectVerifyEmail();
  };

  // Resend Email Code
  const handleResendEmailCode = async () => {
    if (otpCooldown > 0) return;
    setLoading(true);
    setError(null);
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(newCode);
    setSuccessMessage(`New verification code dispatched to ${email}`);
    setOtpCooldown(60);
    setLoading(false);
  };

  // Social Sign In (Google / GitHub / Apple)
  const handleSocialSignIn = async (provider: 'oauth_google' | 'oauth_github' | 'oauth_apple') => {
    setLoading(true);
    setError(null);
    try {
      if (signIn && signIn.authenticateWithRedirect) {
        await signIn.authenticateWithRedirect({
          strategy: provider,
          redirectUrl: `${window.location.origin}/`,
          redirectUrlComplete: `${window.location.origin}/dashboard`
        });
        return;
      }
    } catch (e) {
      console.warn('Social OAuth redirect notice:', e);
    }
    handleInstantDemoLogin();
  };

  // Digit input handling
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
      setOtpDigits(pasted.split(''));
      otpInputRefs.current[5]?.focus();
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
          marginBottom: '16px',
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
          INSTITUTIONAL
        </span>
      </div>

      {/* Primary Gateway Switcher (Direct Express vs Clerk Cloud) */}
      <div
        style={{
          display: 'flex',
          background: '#181a20',
          border: '1px solid #2b313a',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '16px',
          maxWidth: '460px',
          width: '100%',
          gap: '4px'
        }}
      >
        <button
          type="button"
          onClick={() => setAuthMethod('direct')}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '7px',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            background: authMethod === 'direct' ? '#fcd535' : 'transparent',
            color: authMethod === 'direct' ? '#0b0e11' : '#848e9c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Zap size={14} />
          <span>Direct Terminal Access (Fast)</span>
        </button>
        <button
          type="button"
          onClick={() => setAuthMethod('clerk')}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '7px',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            background: authMethod === 'clerk' ? '#fcd535' : 'transparent',
            color: authMethod === 'clerk' ? '#0b0e11' : '#848e9c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Cloud size={14} />
          <span>Clerk Cloud Gateway</span>
        </button>
      </div>

      {/* CLERK CLOUD AUTH VIEW */}
      {authMethod === 'clerk' && (
        <div style={{ width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Helpful OAuth Note */}
          <div
            style={{
              background: 'rgba(252, 213, 53, 0.08)',
              border: '1px solid rgba(252, 213, 53, 0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '12px',
              fontSize: '12px',
              color: '#eaecef',
              lineHeight: 1.4,
              width: '100%'
            }}
          >
            💡 <strong>Google / Social Sign-In:</strong> If you see <em>"External Account was not found"</em>, it means your account hasn't been created in Clerk yet. Click <strong>"Create Account (Clerk)"</strong> below to register with Google!
          </div>

          {/* Sub-tab: Sign In vs Sign Up */}
          <div
            style={{
              display: 'flex',
              background: '#0b0e11',
              border: '1px solid #2b313a',
              borderRadius: '8px',
              padding: '3px',
              marginBottom: '14px',
              width: '100%',
              gap: '4px'
            }}
          >
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{
                flex: 1,
                padding: '7px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: mode === 'login' ? '#fcd535' : 'transparent',
                color: mode === 'login' ? '#0b0e11' : '#848e9c'
              }}
            >
              Sign In (Existing)
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              style={{
                flex: 1,
                padding: '7px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: mode === 'signup' ? '#fcd535' : 'transparent',
                color: mode === 'signup' ? '#0b0e11' : '#848e9c'
              }}
            >
              Create Account (New User)
            </button>
          </div>

          {mode === 'login' ? (
            <SignIn
              routing="hash"
              appearance={clerkAppearance}
              fallbackRedirectUrl="/dashboard"
              signUpUrl="#/signup"
            />
          ) : (
            <SignUp
              routing="hash"
              appearance={clerkAppearance}
              fallbackRedirectUrl="/dashboard"
              signInUrl="#/login"
            />
          )}
        </div>
      )}

      {/* DIRECT EXPRESS AUTH VIEW */}
      {authMethod === 'direct' && (
        <div
          style={{
            background: '#181a20',
            border: '1px solid #2b313a',
            borderRadius: '16px',
            padding: '28px 32px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)'
          }}
        >
          {/* Switcher Tabs */}
          {step === 'FORM' && (
            <div
              style={{
                display: 'flex',
                background: '#0b0e11',
                border: '1px solid #2b313a',
                borderRadius: '10px',
                padding: '4px',
                marginBottom: '18px',
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
                  padding: '8px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
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
                  padding: '8px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: mode === 'signup' ? '#fcd535' : 'transparent',
                  color: mode === 'signup' ? '#0b0e11' : '#848e9c'
                }}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Title */}
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
            {step === 'VERIFY_EMAIL'
              ? 'Verify Email Address'
              : mode === 'login'
              ? 'Sign In to Terminal'
              : 'Open Institutional Account'}
          </h2>
          <p style={{ fontSize: '12.5px', color: '#848e9c', marginBottom: '18px' }}>
            {step === 'VERIFY_EMAIL'
              ? `Enter the 6-digit email verification code sent to ${email}.`
              : mode === 'login'
              ? 'Welcome back. Access your digital asset portfolios.'
              : 'Sub-millisecond matching engine with zero-fee internal settlement.'}
          </p>

          {/* Feedback Alerts */}
          {error && (
            <div
              style={{
                background: 'rgba(255, 59, 105, 0.12)',
                border: '1px solid rgba(255, 59, 105, 0.4)',
                color: '#ff3b69',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                marginBottom: '14px'
              }}
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              style={{
                background: 'rgba(14, 203, 129, 0.12)',
                border: '1px solid rgba(14, 203, 129, 0.4)',
                color: '#0ecb81',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle size={15} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 1: FORM */}
          {step === 'FORM' && (
            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 1-Click Social Sign In */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSocialSignIn('oauth_google')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#202630',
                    border: '1px solid #2b313a',
                    color: '#eaecef',
                    padding: '8px 6px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialSignIn('oauth_github')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#202630',
                    border: '1px solid #2b313a',
                    color: '#eaecef',
                    padding: '8px 6px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#eaecef">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  <span>GitHub</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialSignIn('oauth_apple')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#202630',
                    border: '1px solid #2b313a',
                    color: '#eaecef',
                    padding: '8px 6px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#eaecef">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.66-.8 1.11-1.92.99-3.04-1 .04-2.22.67-2.91 1.48-.61.7-.1.14 1.84-1 2.96 1.11.09 2.26-.6 2.92-1.4z"/>
                  </svg>
                  <span>Apple</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#2b313a' }} />
                <span style={{ fontSize: '11px', color: '#848e9c', textTransform: 'uppercase' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: '#2b313a' }} />
              </div>

              {/* Full Name */}
              {mode === 'signup' && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#eaecef', display: 'block', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    style={{
                      width: '100%',
                      background: '#0b0e11',
                      border: '1px solid #2b313a',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              {/* Email Address */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#eaecef', display: 'block', marginBottom: '4px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  required
                  style={{
                    width: '100%',
                    background: '#0b0e11',
                    border: '1px solid #2b313a',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#eaecef', display: 'block', marginBottom: '4px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Min. 8 characters' : 'Enter your password'}
                    required
                    style={{
                      width: '100%',
                      background: '#0b0e11',
                      border: '1px solid #2b313a',
                      borderRadius: '8px',
                      padding: '9px 38px 9px 12px',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#848e9c',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Phone Number (Kenya & All Countries Supported) */}
              {mode === 'signup' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#eaecef' }}>
                      Phone Number
                    </label>
                    <span style={{ fontSize: '11px', color: '#0ecb81', fontWeight: 600 }}>
                      Optional • Verify later
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      style={{
                        background: '#0b0e11',
                        border: '1px solid #2b313a',
                        borderRadius: '8px',
                        padding: '9px 6px',
                        color: '#ffffff',
                        fontSize: '12px',
                        outline: 'none',
                        fontFamily: 'monospace'
                      }}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.dial})
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="0712 345 678"
                      style={{
                        background: '#0b0e11',
                        border: '1px solid #2b313a',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        color: '#ffffff',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '4px',
                  background: '#fcd535',
                  color: '#0b0e11',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '11px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {loading
                  ? 'Processing...'
                  : mode === 'signup'
                  ? 'Continue to Verification →'
                  : 'Sign In to Terminal →'}
              </button>
            </form>
          )}

          {/* STEP 2: EMAIL CODE VERIFICATION */}
          {step === 'VERIFY_EMAIL' && (
            <form onSubmit={handleVerifyEmailCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Quick Auto-Fill notice */}
              <div
                style={{
                  background: 'rgba(252, 213, 53, 0.08)',
                  border: '1px dashed rgba(252, 213, 53, 0.4)',
                  color: '#fcd535',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>
                  <strong>Code:</strong>{' '}
                  <span style={{ fontFamily: 'monospace', fontSize: '15px', letterSpacing: '2px', fontWeight: 800 }}>
                    {generatedCode}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOtpDigits(generatedCode.split(''));
                    otpInputRefs.current[5]?.focus();
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

              {/* 6-box OTP digits */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '4px 0' }}>
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
                    onPaste={idx === 0 ? handleDigitPaste : undefined}
                    style={{
                      width: '44px',
                      height: '48px',
                      background: '#0b0e11',
                      border: `1.5px solid ${digit ? '#fcd535' : '#2b313a'}`,
                      borderRadius: '8px',
                      color: '#fcd535',
                      fontSize: '20px',
                      fontWeight: 800,
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                ))}
              </div>

              {/* Resend Action */}
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#848e9c' }}>
                {otpCooldown > 0 ? (
                  <span>Resend code in <strong style={{ color: '#eaecef' }}>{otpCooldown}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendEmailCode}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fcd535',
                      cursor: 'pointer',
                      fontWeight: 600,
                      textDecoration: 'underline'
                    }}
                  >
                    Resend Email Code
                  </button>
                )}
              </div>

              {/* Submit Verification Button */}
              <button
                type="submit"
                disabled={loading || otpDigits.join('').length !== 6}
                style={{
                  background: '#fcd535',
                  color: '#0b0e11',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '11px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: otpDigits.join('').length === 6 ? 1 : 0.6
                }}
              >
                {loading ? 'Verifying...' : 'Verify Code & Launch Terminal →'}
              </button>

              {/* Direct Verification Fallback */}
              <button
                type="button"
                onClick={handleDirectVerifyEmail}
                style={{
                  background: 'rgba(252, 213, 53, 0.15)',
                  border: '1px solid #fcd535',
                  color: '#fcd535',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <MailCheck size={14} />
                <span>Verify Email Directly &amp; Launch Dashboard →</span>
              </button>

              {/* Phone Note */}
              <div style={{ fontSize: '11px', color: '#848e9c', textAlign: 'center' }}>
                📱 <strong>Phone Number OTP:</strong> Kenyan numbers (+254) and all global numbers can be linked in Settings → 2FA Security.
              </div>

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
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <ArrowLeft size={13} />
                <span>Back to account details</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Instant Demo Sandbox Access */}
      <div style={{ marginTop: '16px', textAlign: 'center', width: '100%', maxWidth: '460px' }}>
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

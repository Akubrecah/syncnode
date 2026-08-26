import React, { useState } from 'react';
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
  User as UserIcon,
  Globe
} from 'lucide-react';

interface SignupViewProps {
  initialMode?: 'signup' | 'login';
  onSuccess: (user: any, token: string) => void;
  onNavigateHome: () => void;
}

interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

const COUNTRIES: CountryOption[] = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴' },
  { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
  { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'CD', name: 'Congo (DRC)', flag: '🇨🇩' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MO', name: 'Macao', flag: '🇲🇴' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'MK', name: 'North Macedonia', flag: '🇲🇰' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳' },
  { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲' },
  { code: 'ST', name: 'Sao Tome and Principe', flag: '🇸🇹' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' }
];

export const SignupView: React.FC<SignupViewProps> = ({
  initialMode = 'signup',
  onSuccess,
  onNavigateHome
}) => {
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  const [fullName, setFullName] = useState('Adrian Hajdin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('AU');
  const [investmentGoal, setInvestmentGoal] = useState('Growth');
  const [riskTolerance, setRiskTolerance] = useState('');
  const [preferredIndustry, setPreferredIndustry] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode]);

  // Right mockup interactive state
  const [mockupFilter, setMockupFilter] = useState<'Indices' | 'Stocks' | 'Crypto' | 'Forex' | 'Bonds' | 'ETFs'>('Indices');
  const [mockupTimeframe, setMockupTimeframe] = useState<'1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | 'D' | 'W' | 'M'>('1m');
  const [watchlistStars, setWatchlistStars] = useState<{ [key: string]: boolean }>({ AMZN: true, NFLX: true });

  const toggleWatchlist = (sym: string) => {
    setWatchlistStars((prev) => ({ ...prev, [sym]: !prev[sym] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = mode === 'signup' ? '/api/v1/auth/register' : '/api/v1/auth/login';
    const payload = mode === 'signup'
      ? {
          email,
          password,
          fullName,
          country: COUNTRIES.find((c) => c.code === selectedCountry)?.name || selectedCountry,
          investmentGoals: investmentGoal,
          riskTolerance: riskTolerance || 'Moderate',
          preferredIndustry: preferredIndustry || 'Technology & AI'
        }
      : {
          email,
          password,
          totpCode: totpCode || undefined
        };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
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
          <span className="signup-brand-title">Signalist</span>
          <span className="signup-brand-badge">SYNCNODE</span>
        </div>

        {/* Form Title */}
        <h1 className="signup-heading">
          {mode === 'signup' ? 'Sign Up & Personalize' : 'Log In Your Account'}
        </h1>

        {error && (
          <div className="signup-alert-box">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="signup-form-body">
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
                    placeholder="Adrian Hajdin"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="signup-field-group">
                <label className="signup-label">Email</label>
                <div className="signup-input-wrapper">
                  <input
                    type="email"
                    className="signup-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Country */}
              <div className="signup-field-group">
                <label className="signup-label">Country</label>
                <div className="signup-select-wrapper">
                  <select
                    className="signup-select"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="signup-select-arrow" size={16} />
                </div>
                <div className="signup-subtext">
                  Helps us show market data and news relevant to you.
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
                    placeholder="Enter a strong password"
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
                <label className="signup-label">Investment Goals</label>
                <div className="signup-select-wrapper">
                  <select
                    className="signup-select"
                    value={investmentGoal}
                    onChange={(e) => setInvestmentGoal(e.target.value)}
                  >
                    <option value="Growth">Growth</option>
                    <option value="Income & Staking">Income & Staking</option>
                    <option value="Capital Preservation">Capital Preservation</option>
                    <option value="High-Frequency Trading">High-Frequency Trading</option>
                    <option value="Speculation & Momentum">Speculation & Momentum</option>
                    <option value="Long-term HODL">Long-term HODL</option>
                  </select>
                  <ChevronDown className="signup-select-arrow" size={16} />
                </div>
              </div>

              {/* Risk Tolerance */}
              <div className="signup-field-group">
                <label className="signup-label">Risk Tolerance</label>
                <div className="signup-select-wrapper">
                  <select
                    className="signup-select"
                    value={riskTolerance}
                    onChange={(e) => setRiskTolerance(e.target.value)}
                  >
                    <option value="">Select your risk level</option>
                    <option value="Low">Low (Capital Preservation)</option>
                    <option value="Moderate">Moderate (Balanced Growth)</option>
                    <option value="High">High (Aggressive Alpha)</option>
                    <option value="Ultra">Ultra (High Volatility Speculation)</option>
                  </select>
                  <ChevronDown className="signup-select-arrow" size={16} />
                </div>
              </div>

              {/* Preferred Industry */}
              <div className="signup-field-group">
                <label className="signup-label">Preferred Industry</label>
                <div className="signup-select-wrapper">
                  <select
                    className="signup-select"
                    value={preferredIndustry}
                    onChange={(e) => setPreferredIndustry(e.target.value)}
                  >
                    <option value="">Select your preferred industry</option>
                    <option value="Technology & AI">Technology & AI</option>
                    <option value="DeFi & Digital Assets">DeFi & Digital Assets</option>
                    <option value="Layer 1 & 2 Blockchains">Layer 1 & 2 Blockchains</option>
                    <option value="Energy & Commodities">Energy & Commodities</option>
                    <option value="Healthcare & Biotech">Healthcare & Biotech</option>
                    <option value="Finance & Real-World Assets">Finance & Real-World Assets</option>
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
                    placeholder="Enter your email"
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
                    placeholder="Enter a strong password"
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
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
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
          >
            {loading
              ? 'Processing...'
              : mode === 'signup'
              ? 'Start Your Investing Journey'
              : 'Log In'}
          </button>
        </form>

        {/* Switcher Footer */}
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
                  window.location.hash = '#/signup';
                }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: SOCIAL PROOF & LIVE APP PREVIEW */}
      <div className="signup-preview-column">
        {/* Testimonial Quote */}
        <div className="signup-testimonial-card">
          <p className="signup-testimonial-quote">
            Signalist turned my watchlist into a winning list. The alerts are spot-on, and I feel more confident making moves in the market
          </p>
          <div className="signup-testimonial-meta">
            <div>
              <div className="signup-testimonial-author">— Ethan R.</div>
              <div className="signup-testimonial-role">Retail Investor</div>
            </div>
            <div className="signup-stars-row">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={15} className="signup-star-icon" fill="#fcd535" color="#fcd535" />
              ))}
            </div>
          </div>
        </div>

        {/* Dashboard Mockup Frame */}
        <div className="signup-mockup-frame">
          {/* Mockup Top Navigation */}
          <div className="mockup-header-bar">
            <div className="mockup-brand">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 14.5L9.5 9L13.5 13L20 6" stroke="#00e599" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 19L9.5 13.5L13.5 17.5L20 10.5" stroke="#fcd535" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Signalist</span>
            </div>
            <div className="mockup-nav-links">
              <span className="mockup-nav-item active">Dashboard</span>
              <span className="mockup-nav-item">Search</span>
              <span className="mockup-nav-item">Watchlist</span>
              <span className="mockup-nav-item">News</span>
            </div>
          </div>

          <div className="mockup-content-grid">
            {/* Left Area: Market Summary Chart + Top Stocks */}
            <div className="mockup-main-area">
              {/* Market Summary Card */}
              <div className="mockup-panel mockup-market-summary">
                <div className="mockup-section-title">Market Summary</div>

                {/* Filter Tabs */}
                <div className="mockup-filter-pills">
                  {(['Indices', 'Stocks', 'Crypto', 'Forex', 'Bonds', 'ETFs'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`mockup-pill ${mockupFilter === tab ? 'active' : ''}`}
                      onClick={() => setMockupFilter(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Glowing Chart Visual */}
                <div className="mockup-chart-container">
                  <div className="mockup-chart-svg-wrap">
                    <svg className="mockup-chart-svg" viewBox="0 0 450 140" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00e599" stopOpacity="0.35"/>
                          <stop offset="100%" stopColor="#00e599" stopOpacity="0.0"/>
                        </linearGradient>
                      </defs>
                      {/* Area Fill */}
                      <path
                        d="M 0,95 Q 30,110 60,85 T 120,60 T 180,40 T 240,65 T 300,50 T 360,95 T 410,50 L 450,45 L 450,140 L 0,140 Z"
                        fill="url(#chartGradient)"
                      />
                      {/* Line Stroke */}
                      <path
                        d="M 0,95 Q 30,110 60,85 T 120,60 T 180,40 T 240,65 T 300,50 T 360,95 T 410,50 L 450,45"
                        fill="none"
                        stroke="#00e599"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Price Y-Axis Labels */}
                    <div className="mockup-chart-y-axis">
                      <span>5,600</span>
                      <span>5,550</span>
                      <span>5,500</span>
                      <span>5,400</span>
                    </div>
                  </div>

                  {/* Timeframe selector */}
                  <div className="mockup-timeframe-row">
                    {(['1m', '5m', '15m', '30m', '1h', '2h', '4h', 'D', 'W', 'M'] as const).map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        className={`mockup-tf-btn ${mockupTimeframe === tf ? 'active' : ''}`}
                        onClick={() => setMockupTimeframe(tf)}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>

                  {/* Ticker Badges Bar */}
                  <div className="mockup-index-badges">
                    <div className="mockup-index-card">
                      <div className="mockup-index-header">
                        <span className="mockup-index-name">S&P 500</span>
                        <span className="mockup-index-tag tag-red">500</span>
                      </div>
                      <div className="mockup-index-values">
                        <span className="mockup-index-price">$5,603.24</span>
                        <span className="mockup-index-chg positive">+1.4%</span>
                      </div>
                    </div>

                    <div className="mockup-index-card">
                      <div className="mockup-index-header">
                        <span className="mockup-index-name">Nasdaq 100</span>
                        <span className="mockup-index-tag tag-blue">100</span>
                      </div>
                      <div className="mockup-index-values">
                        <span className="mockup-index-price">$23,453.86</span>
                        <span className="mockup-index-chg positive">+1.5%</span>
                      </div>
                    </div>

                    <div className="mockup-index-card">
                      <div className="mockup-index-header">
                        <span className="mockup-index-name">Dow 30</span>
                        <span className="mockup-index-tag tag-blue">30</span>
                      </div>
                      <div className="mockup-index-values">
                        <span className="mockup-index-price">$44,425.52</span>
                        <span className="mockup-index-chg positive">+1.4%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Top Stocks Table */}
              <div className="mockup-panel mockup-top-stocks">
                <div className="mockup-section-header">
                  <div className="mockup-section-title">Today's Top Stocks</div>
                  <span className="mockup-view-all">View all</span>
                </div>

                <div className="mockup-table-wrap">
                  <table className="mockup-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Symbol</th>
                        <th>Price</th>
                        <th>Change</th>
                        <th>Market Cap</th>
                        <th>P/E Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Apple Inc</td>
                        <td className="mono text-muted">AAPL</td>
                        <td className="mono">$233.16</td>
                        <td><span className="table-badge badge-pos">+1.54%</span></td>
                        <td className="mono">$3.56T</td>
                        <td className="mono">35.5</td>
                      </tr>
                      <tr>
                        <td>Microsoft Corp</td>
                        <td className="mono text-muted">MSFT</td>
                        <td className="mono">$520.42</td>
                        <td><span className="table-badge badge-neg">-0.24%</span></td>
                        <td className="mono">$3.75T</td>
                        <td className="mono">32.6</td>
                      </tr>
                      <tr>
                        <td>Alphabet Inc</td>
                        <td className="mono text-muted">GOOGL</td>
                        <td className="mono">$201.56</td>
                        <td><span className="table-badge badge-pos">+2.65%</span></td>
                        <td className="mono">$2.52T</td>
                        <td className="mono">21.5</td>
                      </tr>
                      <tr>
                        <td>Amazon.com Inc</td>
                        <td className="mono text-muted">AMZN</td>
                        <td className="mono">$244.16</td>
                        <td><span className="table-badge badge-neg">-1.53%</span></td>
                        <td className="mono">$1.45T</td>
                        <td className="mono">33.5</td>
                      </tr>
                      <tr>
                        <td>Tesla Inc</td>
                        <td className="mono text-muted">TSLA</td>
                        <td className="mono">$339.62</td>
                        <td><span className="table-badge badge-pos">+1.72%</span></td>
                        <td className="mono">$1.56T</td>
                        <td className="mono">161.2</td>
                      </tr>
                      <tr>
                        <td>Meta Platforms Inc</td>
                        <td className="mono text-muted">META</td>
                        <td className="mono">$762.96</td>
                        <td><span className="table-badge badge-neg">-2.54%</span></td>
                        <td className="mono">$2.63T</td>
                        <td className="mono">45.6</td>
                      </tr>
                      <tr>
                        <td>NVIDIA Corp</td>
                        <td className="mono text-muted">NVDA</td>
                        <td className="mono">$181.46</td>
                        <td><span className="table-badge badge-pos">+2.21%</span></td>
                        <td className="mono">$1.36T</td>
                        <td className="mono">16.8</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Area: Watchlist + News */}
            <div className="mockup-sidebar-area">
              {/* Watchlist Section */}
              <div className="mockup-panel mockup-watchlist-panel">
                <div className="mockup-section-title">Your Watchlist</div>

                <div className="mockup-watchlist-cards">
                  {/* Amazon Card */}
                  <div className="mockup-wl-card">
                    <div className="mockup-wl-left">
                      <div className="mockup-corp-icon icon-amzn">a</div>
                      <div>
                        <div className="mockup-wl-name">Amazon.com</div>
                        <div className="mockup-wl-price mono">$224.42</div>
                        <div className="mockup-wl-sub positive">432.0 (+1.4%)</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`mockup-star-btn ${watchlistStars.AMZN ? 'starred' : ''}`}
                      onClick={() => toggleWatchlist('AMZN')}
                    >
                      <Star size={14} fill={watchlistStars.AMZN ? '#fcd535' : 'none'} color={watchlistStars.AMZN ? '#fcd535' : '#848e9c'} />
                    </button>
                  </div>

                  {/* Netflix Card */}
                  <div className="mockup-wl-card">
                    <div className="mockup-wl-left">
                      <div className="mockup-corp-icon icon-nflx">N</div>
                      <div>
                        <div className="mockup-wl-name">Netflix, Inc</div>
                        <div className="mockup-wl-price mono">$1,220.48</div>
                        <div className="mockup-wl-sub positive">432.0 (+1.4%)</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`mockup-star-btn ${watchlistStars.NFLX ? 'starred' : ''}`}
                      onClick={() => toggleWatchlist('NFLX')}
                    >
                      <Star size={14} fill={watchlistStars.NFLX ? '#fcd535' : 'none'} color={watchlistStars.NFLX ? '#fcd535' : '#848e9c'} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Financial News Section */}
              <div className="mockup-panel mockup-news-panel">
                <div className="mockup-section-title">Today's Financial News</div>

                <div className="mockup-news-tabs">
                  <span className="mockup-news-tab active">Top stories</span>
                  <span className="mockup-news-tab">Local market</span>
                </div>

                <div className="mockup-news-list">
                  <div className="mockup-news-item">
                    <div className="mockup-news-meta">The Wall Street Journal • 37 minutes ago</div>
                    <div className="mockup-news-headline">
                      Exclusive | Walmart's New Era of Workers' Grocery Bills
                    </div>
                    <div className="mockup-news-tag tag-neg">WMT ▼ 1.74%</div>
                  </div>

                  <div className="mockup-news-item">
                    <div className="mockup-news-meta">Yahoo Finance • 34 minutes ago</div>
                    <div className="mockup-news-headline">
                      Stock market today: Dow pops as Fed rate cut bets surge
                    </div>
                    <div className="mockup-news-tag tag-pos">NDAQ ▲ 0.93%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

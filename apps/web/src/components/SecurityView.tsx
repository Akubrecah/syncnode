import React, { useState } from 'react';
import { ShieldCheck, Key, UserCheck, Lock, CheckCircle2 } from 'lucide-react';

interface SecurityViewProps {
  user: any;
  onRefreshUser: () => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({ user, onRefreshUser }) => {
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // KYC State
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('1990-01-01');
  const [country, setCountry] = useState('United States');
  const [idNumber, setIdNumber] = useState('');
  const [kycMsg, setKycMsg] = useState<string | null>(null);

  const handleStartTotp = async () => {
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/auth/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setTotpSecret(json.secret);
        setOtpauthUrl(json.otpauthUrl);
      }
    } catch (e) {}
  };

  const handleEnableTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setMsg({ type: 'success', text: 'Two-Factor Authentication (2FA) is now active!' });
      setTotpSecret(null);
      onRefreshUser();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/kyc/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName,
          dateOfBirth: dob,
          country,
          idNumber,
          idDocumentType: 'PASSPORT'
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setKycMsg('KYC documents submitted! Pending compliance team review.');
      onRefreshUser();
    } catch (err: any) {
      setKycMsg(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Security Header Banner */}
      <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '16px', padding: '28px 32px' }}>
        <div className="bn-tag-yellow" style={{ marginBottom: '10px' }}>SECURITY & COMPLIANCE</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
          Account Security & Identity Verification
        </h1>
        <p style={{ color: '#848e9c', fontSize: '14px' }}>
          Configure RFC 6238 multi-factor authentication, generate scoped institutional API keys, and manage AML verification.
        </p>
      </div>

      {/* 2FA TOTP Card */}
      <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '16px', padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={26} style={{ color: '#fcd535' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>Two-Factor Authentication (TOTP)</h2>
          </div>
          <span className={`badge ${user?.isTotpEnabled ? 'badge-green' : 'badge-amber'}`}>
            {user?.isTotpEnabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>

        <p style={{ color: '#848e9c', fontSize: '14px', marginBottom: '20px' }}>
          Protect your withdrawals and administrative actions using Google Authenticator, YubiKey, or 1Password.
        </p>

        {!user?.isTotpEnabled && !totpSecret && (
          <button className="bn-btn-yellow" onClick={handleStartTotp}>
            Setup Authenticator App
          </button>
        )}

        {totpSecret && (
          <form onSubmit={handleEnableTotp} style={{ background: '#181a20', padding: '20px', borderRadius: '10px', marginTop: '16px', border: '1px solid #2b313a' }}>
            <div style={{ fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>MANUAL SETUP SECRET:</div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: '#fcd535', marginBottom: '18px' }}>
              {totpSecret}
            </div>

            <div className="input-group" style={{ maxWidth: '320px' }}>
              <label className="input-label">Enter 6-digit Code from Authenticator</label>
              <input
                type="text"
                className="input-field"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>

            <button type="submit" className="bn-btn-yellow" style={{ marginTop: '12px' }}>
              Verify & Activate 2FA
            </button>
          </form>
        )}

        {msg && (
          <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: msg.type === 'success' ? 'rgba(14, 203, 129, 0.15)' : 'rgba(246, 70, 93, 0.15)', color: msg.type === 'success' ? '#0ecb81' : '#f6465d', border: `1px solid ${msg.type === 'success' ? '#0ecb81' : '#f6465d'}` }}>
            {msg.text}
          </div>
        )}
      </div>

      {/* KYC Verification Card */}
      <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '16px', padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <UserCheck size={26} style={{ color: '#0ecb81' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>Identity Verification (KYC / AML)</h2>
          </div>
          <span className="badge badge-cyan">{user?.kycTier || 'TIER_0'}</span>
        </div>

        <p style={{ color: '#848e9c', fontSize: '14px', marginBottom: '20px' }}>
          Verify your identity to increase withdrawal velocity limits up to $100,000/day.
        </p>

        <form onSubmit={handleSubmitKyc} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="input-group">
            <label className="input-label">Full Legal Name</label>
            <input
              type="text"
              className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Satoshi Nakamoto"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Country of Residence</label>
            <input
              type="text"
              className="input-field"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Date of Birth</label>
            <input
              type="date"
              className="input-field"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Passport / National ID Number</label>
            <input
              type="text"
              className="input-field"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="e.g. A12345678"
              required
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            {kycMsg && <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--buy-green)' }}>{kycMsg}</div>}
            <button type="submit" className="btn btn-primary">
              Submit KYC Documents
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

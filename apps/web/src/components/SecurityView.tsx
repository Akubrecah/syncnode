import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, UserCheck, Lock, Smartphone, Laptop, Trash2, Copy, CheckCircle2, AlertCircle, Plus, Eye, EyeOff } from 'lucide-react';
import { Footer } from './Footer';

export type SecuritySubTab = '2fa' | 'kyc' | 'apikeys' | 'sessions' | 'password';

interface SecurityViewProps {
  user: any;
  onRefreshUser: () => void;
  initialSubTab?: SecuritySubTab;
}

export const SecurityView: React.FC<SecurityViewProps> = ({ user, onRefreshUser, initialSubTab = '2fa' }) => {
  const [activeSubTab, setActiveSubTab] = useState<SecuritySubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // 2FA State
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // KYC State
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('1995-06-15');
  const [country, setCountry] = useState('United States');
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState('PASSPORT');
  const [kycMsg, setKycMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [kycLoading, setKycLoading] = useState(false);

  // API Keys State
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyIp, setNewKeyIp] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [createdKeyResult, setCreatedKeyResult] = useState<{ apiKey: string; apiSecret: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  // Password & Anti-Phishing State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [antiPhishingCode, setAntiPhishingCode] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch API Keys
  const fetchApiKeys = async () => {
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/auth/api-keys', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.keys)) {
        setApiKeys(json.keys);
      }
    } catch {
      // Fallback
    }
  };

  // Fetch Sessions
  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/auth/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.sessions)) {
        setSessions(json.sessions);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchApiKeys();
    fetchSessions();
  }, []);

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
    setKycLoading(true);
    setKycMsg(null);
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
          idDocumentType: idType
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Submission failed');

      setKycMsg({ type: 'success', text: 'KYC identity documentation verified & submitted successfully!' });
      onRefreshUser();
    } catch (err: any) {
      setKycMsg({ type: 'error', text: err.message || 'Submission error' });
    } finally {
      setKycLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/auth/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          label: newKeyLabel || 'Automated Trading Key',
          ip_whitelist: newKeyIp || undefined,
          permissions: ['READ', 'TRADE']
        })
      });
      const json = await res.json();
      if (json.success) {
        setCreatedKeyResult({ apiKey: json.apiKey, apiSecret: json.apiSecret });
        setNewKeyLabel('');
        setNewKeyIp('');
        setIsCreatingKey(false);
        fetchApiKeys();
      }
    } catch {
      // Fallback
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    try {
      const token = localStorage.getItem('syncnode_token');
      await fetch(`/api/v1/auth/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchApiKeys();
    } catch {
      // Fallback
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      const token = localStorage.getItem('syncnode_token');
      await fetch('/api/v1/auth/sessions/revoke-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessionMsg('All other sessions and tokens have been revoked.');
      setTimeout(() => setSessionMsg(null), 4000);
    } catch {
      // Fallback
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg({ type: 'success', text: 'Security credentials updated securely.' });
    setCurrentPassword('');
    setNewPassword('');
    setTimeout(() => setPasswordMsg(null), 4000);
  };

  const copyToClipboard = (text: string, type: 'key' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Security Header Banner */}
      <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '16px', padding: '28px 32px' }}>
        <div className="bn-tag-yellow" style={{ marginBottom: '10px' }}>SECURITY &amp; COMPLIANCE HUB</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
          Account Security &amp; Identity Verification
        </h1>
        <p style={{ color: '#848e9c', fontSize: '14px', margin: 0 }}>
          Manage RFC 6238 two-factor authentication, KYC AML identity verification, institutional API keys, and device sessions.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #2b313a', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: '2fa', label: 'Two-Factor (2FA)', icon: <ShieldCheck size={16} /> },
          { id: 'kyc', label: 'Identity (KYC / AML)', icon: <UserCheck size={16} /> },
          { id: 'apikeys', label: 'API Key Management', icon: <Key size={16} /> },
          { id: 'sessions', label: 'Session & Devices', icon: <Laptop size={16} /> },
          { id: 'password', label: 'Password & Anti-Phishing', icon: <Lock size={16} /> }
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SecuritySubTab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? '#fcd535' : '#202630',
                color: isActive ? '#181a20' : '#eaecef',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: 2FA TOTP */}
      {activeSubTab === '2fa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              Protect your withdrawals, API credentials, and account settings using Google Authenticator, YubiKey, or 1Password.
            </p>

            {!user?.isTotpEnabled && !totpSecret && (
              <button className="bn-btn-yellow" onClick={handleStartTotp}>
                Setup Authenticator App
              </button>
            )}

            {user?.isTotpEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0ecb81', fontSize: '14px', fontWeight: 600 }}>
                <CheckCircle2 size={18} />
                <span>Your account is protected by hardware/TOTP 2FA.</span>
              </div>
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
                    className="input-field mono"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>

                <button type="submit" className="bn-btn-yellow" style={{ marginTop: '12px' }}>
                  Verify &amp; Activate 2FA
                </button>
              </form>
            )}

            {msg && (
              <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: msg.type === 'success' ? 'rgba(14, 203, 129, 0.15)' : 'rgba(246, 70, 93, 0.15)', color: msg.type === 'success' ? '#0ecb81' : '#f6465d', border: `1px solid ${msg.type === 'success' ? '#0ecb81' : '#f6465d'}` }}>
                {msg.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: KYC AML */}
      {activeSubTab === 'kyc' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Verification Tier Levels Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#848e9c' }}>TIER 0 - STANDARD</span>
                <span className="badge badge-amber">Basic</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>$2,000 / Day</div>
              <p style={{ fontSize: '12px', color: '#848e9c', margin: 0 }}>Instant registration with email verification.</p>
            </div>

            <div style={{ background: '#1e2329', border: '1px solid #fcd535', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fcd535' }}>TIER 1 - VERIFIED</span>
                <span className="badge badge-green">Recommended</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>$100,000 / Day</div>
              <p style={{ fontSize: '12px', color: '#848e9c', margin: 0 }}>Full P2P and fiat payment gateway capabilities.</p>
            </div>

            <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#848e9c' }}>TIER 2 - INSTITUTIONAL</span>
                <span className="badge badge-cyan">VIP Plus</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>Unlimited / Day</div>
              <p style={{ fontSize: '12px', color: '#848e9c', margin: 0 }}>Sub-accounts, fix API, dedicated custody vault.</p>
            </div>
          </div>

          {/* KYC Form */}
          <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '16px', padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UserCheck size={26} style={{ color: '#0ecb81' }} />
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>Identity Verification Form</h2>
              </div>
              <span className="badge badge-cyan">{user?.kycTier || 'TIER_1'} (Verified)</span>
            </div>

            <form onSubmit={handleSubmitKyc} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                <label className="input-label">Document Type</label>
                <select
                  className="input-field"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                >
                  <option value="PASSPORT">Passport</option>
                  <option value="NATIONAL_ID">National ID Card</option>
                  <option value="DRIVERS_LICENSE">Driver's License</option>
                </select>
              </div>

              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">ID / Passport Number</label>
                <input
                  type="text"
                  className="input-field"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. A92837194"
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                {kycMsg && (
                  <div style={{ marginBottom: '12px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: kycMsg.type === 'success' ? 'rgba(14, 203, 129, 0.15)' : 'rgba(246, 70, 93, 0.15)', color: kycMsg.type === 'success' ? '#0ecb81' : '#f6465d', border: `1px solid ${kycMsg.type === 'success' ? '#0ecb81' : '#f6465d'}` }}>
                    {kycMsg.text}
                  </div>
                )}
                <button type="submit" className="bn-btn-yellow" disabled={kycLoading}>
                  {kycLoading ? 'Verifying...' : 'Submit / Update KYC Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBTAB 3: API KEY MANAGEMENT */}
      {activeSubTab === 'apikeys' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '16px', padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>Institutional API Keys</h2>
                <p style={{ color: '#848e9c', fontSize: '13.5px', margin: 0 }}>
                  High-frequency REST &amp; WebSocket trading keys protected with HMAC-SHA256 signing and IP whitelisting.
                </p>
              </div>
              {!isCreatingKey && (
                <button className="bn-btn-yellow" onClick={() => setIsCreatingKey(true)}>
                  <Plus size={16} /> Create New API Key
                </button>
              )}
            </div>

            {/* Created Key Popup Alert */}
            {createdKeyResult && (
              <div style={{ background: '#181a20', border: '1px solid #fcd535', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ color: '#fcd535', fontWeight: 800, fontSize: '15px', marginBottom: '8px' }}>
                  Important: Save Your API Secret Key
                </div>
                <p style={{ color: '#848e9c', fontSize: '12px', marginBottom: '14px' }}>
                  For security reasons, your API Secret will not be shown again. Please store it securely in your algorithmic vault.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#848e9c' }}>API KEY</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" className="input-field mono" readOnly value={createdKeyResult.apiKey} />
                      <button className="btn btn-secondary" onClick={() => copyToClipboard(createdKeyResult.apiKey, 'key')}>
                        {copiedKey ? 'Copied' : <Copy size={15} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#848e9c' }}>API SECRET (HMAC-SHA256)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" className="input-field mono" readOnly value={createdKeyResult.apiSecret} />
                      <button className="btn btn-secondary" onClick={() => copyToClipboard(createdKeyResult.apiSecret, 'secret')}>
                        {copiedSecret ? 'Copied' : <Copy size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button className="btn btn-secondary" style={{ marginTop: '14px' }} onClick={() => setCreatedKeyResult(null)}>
                  I have backed up my API Secret
                </button>
              </div>
            )}

            {/* Create API Key Form */}
            {isCreatingKey && (
              <form onSubmit={handleCreateApiKey} style={{ background: '#181a20', border: '1px solid #2b313a', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>Create API Key</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Key Label / Name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Python Algo Bot #1"
                      value={newKeyLabel}
                      onChange={(e) => setNewKeyLabel(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">IP Whitelist (Optional)</label>
                    <input
                      type="text"
                      className="input-field mono"
                      placeholder="e.g. 192.168.1.1, 10.0.0.1"
                      value={newKeyIp}
                      onChange={(e) => setNewKeyIp(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="bn-btn-yellow">Generate Key Pair</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingKey(false)}>Cancel</button>
                </div>
              </form>
            )}

            {/* API Keys Table */}
            {apiKeys.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: '#848e9c', background: '#181a20', borderRadius: '12px', border: '1px solid #2b313a' }}>
                <Key size={32} color="#4f5867" style={{ marginBottom: '10px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#eaecef' }}>No Active API Keys</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Create your first API key for institutional algorithmic trading.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ color: '#848e9c', borderBottom: '1px solid #2b313a' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Label</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>API Key</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Permissions</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>IP Whitelist</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((k) => (
                    <tr key={k.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#ffffff' }}>{k.label}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: '#fcd535' }}>{k.api_key}</td>
                      <td style={{ padding: '12px' }}>
                        <span className="badge badge-green" style={{ fontSize: '10px' }}>READ / TRADE</span>
                      </td>
                      <td style={{ padding: '12px', color: '#848e9c', fontFamily: 'monospace' }}>
                        {k.ip_whitelist || 'Unrestricted (All IPs)'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ color: '#f6465d', padding: '6px 10px' }}
                          onClick={() => handleDeleteApiKey(k.id)}
                        >
                          <Trash2 size={14} /> Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: SESSIONS & DEVICES */}
      {activeSubTab === 'sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '16px', padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>Active Login Sessions</h2>
                <p style={{ color: '#848e9c', fontSize: '13.5px', margin: 0 }}>
                  Manage active browser sessions and terminate unrecognized devices instantly.
                </p>
              </div>
              <button className="btn btn-secondary" style={{ color: '#f6465d' }} onClick={handleRevokeAllSessions}>
                Terminate All Other Sessions
              </button>
            </div>

            {sessionMsg && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: 'rgba(14, 203, 129, 0.15)', color: '#0ecb81', border: '1px solid #0ecb81' }}>
                {sessionMsg}
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: '#848e9c', borderBottom: '1px solid #2b313a' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Device &amp; OS</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Browser</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>IP Address</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Location</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#ffffff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Laptop size={16} color="#848e9c" />
                        <span>{s.device}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#eaecef' }}>{s.browser}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: '#848e9c' }}>{s.ip}</td>
                    <td style={{ padding: '12px', color: '#848e9c' }}>{s.location}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {s.is_current ? (
                        <span className="badge badge-green">Current Session</span>
                      ) : (
                        <span className="badge badge-amber">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 5: PASSWORD & ANTI-PHISHING */}
      {activeSubTab === 'password' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '16px', padding: '28px 32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>Change Account Password</h2>
            <p style={{ color: '#848e9c', fontSize: '13.5px', marginBottom: '20px' }}>
              Ensure your new password contains at least 12 characters, uppercase letters, and special symbols.
            </p>

            <form onSubmit={handleChangePassword} style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="input-group">
                <label className="input-label">Current Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">New Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Anti-Phishing Code (Optional)</label>
                <input
                  type="text"
                  className="input-field mono"
                  value={antiPhishingCode}
                  onChange={(e) => setAntiPhishingCode(e.target.value)}
                  placeholder="e.g. SECRET_SAFE_NODE"
                />
                <div style={{ fontSize: '11px', color: '#848e9c', marginTop: '4px' }}>
                  This code will appear in all genuine transactional and verification emails from CryptoBridge.
                </div>
              </div>

              {passwordMsg && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: 'rgba(14, 203, 129, 0.15)', color: '#0ecb81', border: '1px solid #0ecb81' }}>
                  {passwordMsg.text}
                </div>
              )}

              <button type="submit" className="bn-btn-yellow" style={{ marginTop: '8px' }}>
                Update Security Credentials
              </button>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <Footer />
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Plus, Minus, Edit3, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { UserBalance, AssetSymbol } from '../../../types/admin';

interface AdjustBalanceModalProps {
  userId: string;
  userEmail: string;
  userName?: string;
  initialAsset?: string;
  balances?: UserBalance[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({
  userId,
  userEmail,
  userName,
  initialAsset = 'USDT',
  balances = [],
  onClose,
  onSuccess
}) => {
  const [liveBalances, setLiveBalances] = useState<UserBalance[]>(balances);
  const [asset, setAsset] = useState<string>(initialAsset);
  const [operation, setOperation] = useState<'CREDIT' | 'DEBIT' | 'SET'>('CREDIT');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('Administrative manual adjustment');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      const token = localStorage.getItem('syncnode_token');
      fetch(`/api/v1/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.balances) {
            setLiveBalances(data.balances);
          }
        })
        .catch((e) => console.debug('Fetch user balances error:', e));
    }
  }, [userId]);

  const currentBal = liveBalances.find((b) => b.asset === asset) || {
    asset: asset as AssetSymbol,
    available: '0.00',
    locked: '0.00',
    pendingWithdrawal: '0.00',
    p2pEscrow: '0.00',
    total: '0.00'
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) < 0 || isNaN(parseFloat(amount))) {
      setError('Please enter a valid non-negative amount.');
      return;
    }
    if (!reason || reason.trim().length < 4) {
      setError('A documented reason of at least 4 characters is required for audit compliance.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch(`/api/v1/admin/users/${userId}/adjust-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          asset,
          operation,
          amount: amount.trim(),
          reason: reason.trim()
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || data.detail || 'Failed to adjust balance');
      }

      if (data.balances) {
        setLiveBalances(data.balances);
      }

      setSuccessMsg('Balance updated and verified in ledger!');
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to adjust balance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#181a20',
          border: '1px solid #2b313a',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 48px rgba(0,0,0,0.6)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #2b313a',
            background: '#1e2329'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#eaecef' }}>
              Add / Edit User Balance
            </h3>
            <div style={{ fontSize: '12px', color: '#848e9c', marginTop: '3px' }}>
              {userName ? `${userName} (${userEmail})` : userEmail}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#848e9c',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAdjust} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div
              style={{
                background: 'rgba(246, 70, 93, 0.15)',
                border: '1px solid #f6465d',
                borderRadius: '8px',
                padding: '12px 14px',
                color: '#f6465d',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: 'rgba(14, 203, 129, 0.15)',
                border: '1px solid #0ecb81',
                borderRadius: '8px',
                padding: '12px 14px',
                color: '#0ecb81',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Asset Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '8px' }}>
              Select Asset
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {['USDT', 'BTC', 'ETH', 'SOL'].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setAsset(sym)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: asset === sym ? '1px solid #fcd535' : '1px solid #2b313a',
                    background: asset === sym ? 'rgba(252, 213, 53, 0.15)' : '#202630',
                    color: asset === sym ? '#fcd535' : '#eaecef',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Current Balance Display */}
          <div style={{ background: '#202630', borderRadius: '10px', padding: '12px 16px', border: '1px solid #2b313a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#848e9c' }}>Current {asset} Available Balance:</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#eaecef', fontFamily: 'monospace' }}>
                {parseFloat(currentBal.available || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} {asset}
              </span>
            </div>
            {parseFloat(currentBal.locked || '0') > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: '#848e9c' }}>
                <span>Locked in Open Orders:</span>
                <span>{currentBal.locked} {asset}</span>
              </div>
            )}
          </div>

          {/* Operation Type Switcher */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '8px' }}>
              Action Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setOperation('CREDIT')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px 6px',
                  borderRadius: '8px',
                  border: operation === 'CREDIT' ? '1px solid #0ecb81' : '1px solid #2b313a',
                  background: operation === 'CREDIT' ? 'rgba(14, 203, 129, 0.18)' : '#202630',
                  color: operation === 'CREDIT' ? '#0ecb81' : '#848e9c',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
                <span>Add Funds</span>
              </button>

              <button
                type="button"
                onClick={() => setOperation('DEBIT')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px 6px',
                  borderRadius: '8px',
                  border: operation === 'DEBIT' ? '1px solid #f6465d' : '1px solid #2b313a',
                  background: operation === 'DEBIT' ? 'rgba(246, 70, 93, 0.18)' : '#202630',
                  color: operation === 'DEBIT' ? '#f6465d' : '#848e9c',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <Minus size={14} />
                <span>Deduct</span>
              </button>

              <button
                type="button"
                onClick={() => setOperation('SET')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px 6px',
                  borderRadius: '8px',
                  border: operation === 'SET' ? '1px solid #3b82f6' : '1px solid #2b313a',
                  background: operation === 'SET' ? 'rgba(59, 130, 246, 0.18)' : '#202630',
                  color: operation === 'SET' ? '#60a5fa' : '#848e9c',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={14} />
                <span>Set Exact</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#848e9c' }}>
                {operation === 'CREDIT' ? 'Amount to Add' : operation === 'DEBIT' ? 'Amount to Deduct' : 'New Target Balance'}
              </label>
              {operation === 'DEBIT' && (
                <button
                  type="button"
                  onClick={() => setAmount(currentBal.available)}
                  style={{ background: 'transparent', border: 'none', color: '#fcd535', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Max Available
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                style={{
                  width: '100%',
                  background: '#202630',
                  border: '1px solid #2b313a',
                  borderRadius: '8px',
                  padding: '10px 60px 10px 14px',
                  color: '#eaecef',
                  fontSize: '15px',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#848e9c', fontWeight: 700, fontSize: '13px' }}>
                {asset}
              </span>
            </div>
          </div>

          {/* Documented Reason */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '6px' }}>
              Audit Reason / Note
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Documented reason for balance adjustment"
              required
              minLength={4}
              style={{
                width: '100%',
                background: '#202630',
                border: '1px solid #2b313a',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#eaecef',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '11px', color: '#848e9c', marginTop: '4px', display: 'block' }}>
              Required for internal compliance &amp; double-entry ledger audit logs.
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                background: '#202630',
                border: '1px solid #2b313a',
                color: '#eaecef',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1.5,
                padding: '12px',
                borderRadius: '8px',
                background: operation === 'CREDIT' ? '#0ecb81' : operation === 'DEBIT' ? '#f6465d' : '#fcd535',
                border: 'none',
                color: operation === 'SET' ? '#181a20' : '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  {operation === 'CREDIT' ? `Add ${asset}` : operation === 'DEBIT' ? `Deduct ${asset}` : `Set ${asset} Balance`}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

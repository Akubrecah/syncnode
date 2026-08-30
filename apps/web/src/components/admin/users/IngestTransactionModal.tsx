import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { AdminUser } from '../../../types/admin';

interface IngestTransactionModalProps {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}

export const IngestTransactionModal: React.FC<IngestTransactionModalProps> = ({
  user,
  onClose,
  onSuccess
}) => {
  const [type, setType] = useState<string>('DEPOSIT');
  const [asset, setAsset] = useState<string>('USDT');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('Direct administrative payment ingestion');
  const [txHash, setTxHash] = useState<string>('');
  const [status, setStatus] = useState<string>('COMPLETED');
  const [creditBalance, setCreditBalance] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch(`/api/v1/admin/users/${user.id}/ingest-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          asset,
          amount: amount.trim(),
          note: note.trim() || undefined,
          tx_hash: txHash.trim() || undefined,
          status,
          credit_balance: creditBalance
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to ingest transaction record');
      }

      setSuccessMsg(`Successfully ingested ${type} record for ${user.email}!`);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Ingestion failed');
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
          maxWidth: '500px',
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
              Ingest User Payment &amp; Transaction
            </h3>
            <div style={{ fontSize: '12px', color: '#848e9c', marginTop: '3px' }}>
              Target: {user.fullName ? `${user.fullName} (${user.email})` : user.email}
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
        <form onSubmit={handleIngest} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ background: 'rgba(246, 70, 93, 0.15)', border: '1px solid #f6465d', borderRadius: '8px', padding: '12px 14px', color: '#f6465d', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ background: 'rgba(14, 203, 129, 0.15)', border: '1px solid #0ecb81', borderRadius: '8px', padding: '12px 14px', color: '#0ecb81', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '6px' }}>
                Transaction Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: '#202630', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px', outline: 'none' }}
              >
                <option value="DEPOSIT">Direct Deposit</option>
                <option value="INSTANT_PAY">CryptoBridge Instant Pay</option>
                <option value="INVESTMENT_PAYOUT">Investment ROI Yield</option>
                <option value="BONUS">Promotional Bonus</option>
                <option value="REBATE">Trading Fee Rebate</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '6px' }}>
                Asset
              </label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: '#202630', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px', outline: 'none' }}
              >
                <option value="USDT">USDT</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="BNB">BNB</option>
                <option value="SOL">SOL</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '6px' }}>
              Amount
            </label>
            <input
              type="number"
              step="any"
              min="0.00000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10000.00"
              required
              style={{ width: '100%', background: '#202630', border: '1px solid #2b313a', borderRadius: '8px', padding: '10px 14px', color: '#eaecef', fontSize: '15px', fontFamily: 'monospace', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '6px' }}>
              Transaction Hash / Ref (Optional)
            </label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x... or leave empty to auto-generate"
              className="mono"
              style={{ width: '100%', background: '#202630', border: '1px solid #2b313a', borderRadius: '8px', padding: '10px 14px', color: '#eaecef', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '6px' }}>
              Note / Reference
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Payment description or order note"
              style={{ width: '100%', background: '#202630', border: '1px solid #2b313a', borderRadius: '8px', padding: '10px 14px', color: '#eaecef', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ background: '#202630', borderRadius: '8px', padding: '12px 14px', border: '1px solid #2b313a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#eaecef' }}>Credit User Available Balance</div>
              <div style={{ fontSize: '11px', color: '#848e9c' }}>Immediately adds amount to user wallet balance</div>
            </div>
            <input
              type="checkbox"
              checked={creditBalance}
              onChange={(e) => setCreditBalance(e.target.checked)}
              style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#202630', border: '1px solid #2b313a', color: '#eaecef', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1.5, padding: '12px', borderRadius: '8px', background: '#fcd535', border: 'none', color: '#181a20', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="spin" />
                  <span>Ingesting Record...</span>
                </>
              ) : (
                <span>Ingest Transaction</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

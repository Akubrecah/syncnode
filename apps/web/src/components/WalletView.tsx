import React, { useState } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, ShieldCheck, RefreshCw, QrCode } from 'lucide-react';

interface WalletViewProps {
  balances: any[];
  onRefresh: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ balances, onRefresh }) => {
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [activeModal, setActiveModal] = useState<'none' | 'deposit' | 'withdraw'>('none');
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [destAddress, setDestAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({
    USDT: 1,
    USDC: 1,
    FDUSD: 1
  });

  React.useEffect(() => {
    const fetchLiveRates = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const map: Record<string, number> = { USDT: 1, USDC: 1, FDUSD: 1 };
            data.forEach((item: { symbol: string; price: string }) => {
              if (item.symbol.endsWith('USDT')) {
                map[item.symbol.replace('USDT', '')] = parseFloat(item.price) || 0;
              }
            });
            setLivePrices(map);
          }
        }
      } catch {
        // Fallback gracefully
      }
    };
    fetchLiveRates();
    const interval = setInterval(fetchLiveRates, 10000);
    return () => clearInterval(interval);
  }, []);

  // HIGH-002: Only show faucet tools in dev / local environment
  const isDevEnvironment = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.port === '3000' ||
    window.location.port === '5173'
  );

  const fetchDepositAddress = async (asset: string) => {
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch(`/api/v1/wallet/deposit-address?asset=${asset}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setDepositAddress(json.address);
      }
    } catch (e: any) {
      console.warn('Failed to fetch deposit address:', e?.message || e);
    }
  };

  const handleOpenDeposit = (asset: string) => {
    setSelectedAsset(asset);
    setActiveModal('deposit');
    setStatusMsg(null);
    fetchDepositAddress(asset);
  };

  const handleOpenWithdraw = (asset: string) => {
    setSelectedAsset(asset);
    setActiveModal('withdraw');
    setStatusMsg(null);
    setDestAddress('');
    setWithdrawAmount('');
    setTotpCode('');
  };

  const handleExecuteWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          asset: selectedAsset,
          destinationAddress: destAddress,
          amount: withdrawAmount,
          totpCode: totpCode || undefined
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Withdrawal failed');

      setStatusMsg({ type: 'success', text: `Withdrawal of ${withdrawAmount} ${selectedAsset} confirmed! TX: ${json.withdrawal.txHash || 'Pending'}` });
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Devnet Faucet top-up trigger for test environments (HIGH-002)
  const handleTestDepositFaucet = async (asset: string) => {
    try {
      setLoading(true);
      setStatusMsg(null);
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/wallet/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ asset })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Faucet request failed');

      setStatusMsg({ type: 'success', text: json.message || `Deposited test ${asset} successfully!` });
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const totalEstimatedUsd = balances
    .reduce((acc, b) => {
      const total = parseFloat(b.total) || 0;
      const rate = livePrices[b.asset] ?? (b.asset === 'USDT' || b.asset === 'USDC' || b.asset === 'FDUSD' ? 1 : 0);
      return acc + total * rate;
    }, 0)
    .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px', width: '100%' }}>
      {/* Portfolio Header Banner */}
      <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '16px', padding: '28px 32px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div className="bn-tag-yellow" style={{ marginBottom: '10px' }}>INSTITUTIONAL ASSET CUSTODY</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
            Estimated Balance: <span className="mono" style={{ color: '#fcd535' }}>${totalEstimatedUsd} USD</span>
          </h1>
          <p style={{ color: '#848e9c', fontSize: '14px' }}>
            Segregated cryptographic vaults backed 1:1 by on-chain Proof of Reserves & $1B SAFU Fund.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {isDevEnvironment && (
            <button className="bn-btn-yellow" onClick={() => handleTestDepositFaucet('USDT')} disabled={loading}>
              + Quick Faucet Deposit
            </button>
          )}
          <button className="btn btn-secondary" onClick={onRefresh}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Balances Table */}
      <div className="bn-table-wrapper" style={{ marginBottom: '32px' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #2b313a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#ffffff' }}>Spot & Escrow Balances</span>
          <span className="badge badge-green">100% Solvency Audited</span>
        </div>
        <table className="bn-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Available Balance</th>
              <th>In Orders (Locked)</th>
              <th>In P2P Escrow</th>
              <th>Total Balance</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody className="mono">
            {balances.map((b) => (
              <tr key={b.asset}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="bn-coin-avatar" style={{ width: '28px', height: '28px', fontSize: '10px' }}>
                      {b.asset.slice(0, 3)}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>{b.asset}</span>
                    </div>
                  </div>
                </td>
                <td style={{ color: '#0ecb81', fontWeight: 700 }}>{b.available}</td>
                <td style={{ color: '#fcd535' }}>{b.locked}</td>
                <td style={{ color: '#848e9c' }}>{b.p2pEscrow || '0.00'}</td>
                <td style={{ fontWeight: 800, color: '#ffffff' }}>{b.total}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', marginRight: '8px', fontSize: '12px' }}
                    onClick={() => handleOpenDeposit(b.asset)}
                  >
                    <ArrowDownCircle size={14} style={{ color: '#0ecb81' }} /> Deposit
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', marginRight: '8px', fontSize: '12px' }}
                    onClick={() => handleOpenWithdraw(b.asset)}
                  >
                    <ArrowUpCircle size={14} style={{ color: '#f6465d' }} /> Withdraw
                  </button>
                  {isDevEnvironment && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', color: '#fcd535' }}
                      onClick={() => handleTestDepositFaucet(b.asset)}
                      disabled={loading}
                      title="Instant devnet test deposit"
                    >
                      Faucet +
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {statusMsg && (
        <div style={{ padding: '14px 20px', borderRadius: '8px', fontSize: '13px', background: statusMsg.type === 'success' ? 'rgba(14, 203, 129, 0.15)' : 'rgba(246, 70, 93, 0.15)', color: statusMsg.type === 'success' ? '#0ecb81' : '#f6465d', border: `1px solid ${statusMsg.type === 'success' ? '#0ecb81' : '#f6465d'}` }}>
          {statusMsg.text}
        </div>
      )}

      {/* Deposit Modal */}
      {activeModal === 'deposit' && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>Deposit {selectedAsset}</h2>
              <button className="btn-close" onClick={() => setActiveModal('none')}>✕</button>
            </div>

            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ background: '#ffffff', padding: '16px', display: 'inline-block', borderRadius: '12px', marginBottom: '16px' }}>
                <QrCode size={160} color="#181a20" />
              </div>

              <div className="input-group" style={{ textAlign: 'left' }}>
                <label className="input-label">Your Dedicated Deposit Address</label>
                <input
                  type="text"
                  className="input-field mono"
                  readOnly
                  value={depositAddress || 'Generating secure vault address...'}
                  style={{ fontSize: '12px', background: '#181a20', color: '#fcd535' }}
                />
              </div>

              <p style={{ fontSize: '12px', color: '#848e9c', marginTop: '12px', lineHeight: 1.5 }}>
                Send only <strong>{selectedAsset}</strong> to this address. Credits automatically after required network confirmations.
              </p>
            </div>

            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={() => setActiveModal('none')}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {activeModal === 'withdraw' && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>Withdraw {selectedAsset}</h2>
              <button className="btn-close" onClick={() => setActiveModal('none')}>✕</button>
            </div>

            <form onSubmit={handleExecuteWithdraw}>
              <div className="input-group">
                <label className="input-label">Destination Address</label>
                <input
                  type="text"
                  className="input-field mono"
                  placeholder={`Enter ${selectedAsset} address`}
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Withdraw Amount</label>
                <input
                  type="number"
                  step="any"
                  className="input-field mono"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">2FA Authenticator Code (Optional if not enabled)</label>
                <input
                  type="text"
                  className="input-field mono"
                  placeholder="6-digit code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  maxLength={6}
                />
              </div>

              <button
                type="submit"
                className="btn btn-sell"
                style={{ width: '100%', marginTop: '16px', padding: '12px' }}
                disabled={loading}
              >
                {loading ? 'Processing Withdrawal...' : `Confirm Withdraw ${selectedAsset}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

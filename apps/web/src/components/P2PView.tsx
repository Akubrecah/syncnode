import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, MessageSquare, ArrowRight } from 'lucide-react';

interface P2PViewProps {
  user: any;
  onOpenAuth: () => void;
}

export const P2PView: React.FC<P2PViewProps> = ({ user, onOpenAuth }) => {
  const [ads, setAds] = useState<any[]>([]);
  const [myTrades, setMyTrades] = useState<any[]>([]);
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
  const [isCreateAdOpen, setIsCreateAdOpen] = useState(false);
  const [cryptoAmount, setCryptoAmount] = useState('100');
  const [activeTrade, setActiveTrade] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Create Ad Form State
  const [newAdType, setNewAdType] = useState<'BUY' | 'SELL'>('SELL');
  const [newAdAsset, setNewAdAsset] = useState('USDT');
  const [newAdPrice, setNewAdPrice] = useState('1.00');
  const [newAdTotal, setNewAdTotal] = useState('1000');
  const [newAdMin, setNewAdMin] = useState('50');
  const [newAdMax, setNewAdMax] = useState('1000');
  const [newAdPayment, setNewAdPayment] = useState('Bank Wire, Revolut');

  const fetchAds = async () => {
    try {
      const res = await fetch('/api/v1/p2p/ads');
      const json = await res.json();
      if (json.success) setAds(json.ads);
    } catch (e) {}
  };

  const fetchMyTrades = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/p2p/trades/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setMyTrades(json.trades);
        const open = json.trades.find((t: any) => ['ESCROW_LOCKED', 'FIAT_MARKED_PAID'].includes(t.status));
        if (open && !activeTrade) setActiveTrade(open);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchAds();
    fetchMyTrades();
    const timer = setInterval(() => {
      fetchAds();
      fetchMyTrades();
    }, 2000);
    return () => clearInterval(timer);
  }, [user?.id]);

  const handleInitiateTrade = async (ad: any) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setSelectedAd(ad);
  };

  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/p2p/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adId: selectedAd.id,
          cryptoAmount,
          paymentMethod: selectedAd.paymentMethods[0] || 'Bank Wire'
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'P2P order failed');

      setActiveTrade(json.trade);
      setSelectedAd(null);
      fetchMyTrades();
      fetchAds();
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/p2p/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: newAdType,
          asset: newAdAsset,
          fiatCurrency: 'USD',
          price: newAdPrice,
          totalCryptoAmount: newAdTotal,
          minFiatLimit: newAdMin,
          maxFiatLimit: newAdMax,
          paymentMethods: newAdPayment.split(',').map((p) => p.trim())
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to post advertisement');

      setIsCreateAdOpen(false);
      fetchAds();
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (tradeId: string) => {
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch(`/api/v1/p2p/trades/${tradeId}/mark-paid`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setActiveTrade(json.trade);
        fetchMyTrades();
      }
    } catch (e) {}
  };

  const handleRelease = async (tradeId: string) => {
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch(`/api/v1/p2p/trades/${tradeId}/release`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setActiveTrade(json.trade);
        fetchMyTrades();
      }
    } catch (e) {}
  };

  const handleCancelTrade = async (tradeId: string) => {
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch(`/api/v1/p2p/trades/${tradeId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setActiveTrade(null);
        fetchMyTrades();
        fetchAds();
      }
    } catch (e) {}
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px', width: '100%' }}>
      {/* P2P Header Banner */}
      <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '16px', padding: '28px 32px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div className="bn-tag-yellow" style={{ marginBottom: '10px' }}>ZERO-FEE P2P ESCROW</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
            P2P Fiat & Crypto Marketplace
          </h1>
          <p style={{ color: '#848e9c', fontSize: '14px' }}>
            Trade cryptocurrencies directly with verified institutional merchants across 100+ local payment methods.
          </p>
        </div>
        <button className="bn-btn-yellow" onClick={() => user ? setIsCreateAdOpen(true) : onOpenAuth()}>
          + Post P2P Advertisement
        </button>
      </div>

      {activeTrade && (
        <div style={{ background: '#1e2329', border: '1px solid #fcd535', padding: '24px 28px', borderRadius: '16px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>Active Escrow Order #{activeTrade.id}</h3>
            <span className="badge badge-yellow">{activeTrade.status}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', fontSize: '14px', marginBottom: '20px' }} className="mono">
            <div>
              <span style={{ color: '#848e9c' }}>Asset: </span>
              <strong style={{ color: '#ffffff' }}>{activeTrade.cryptoAmount} {activeTrade.asset}</strong>
            </div>
            <div>
              <span style={{ color: '#848e9c' }}>Fiat Amount: </span>
              <strong style={{ color: '#0ecb81' }}>${activeTrade.fiatAmount} {activeTrade.fiatCurrency}</strong>
            </div>
            <div>
              <span style={{ color: '#848e9c' }}>Price: </span>
              <strong style={{ color: '#fcd535' }}>${activeTrade.price}</strong>
            </div>
            <div>
              <span style={{ color: '#848e9c' }}>Payment: </span>
              <strong style={{ color: '#ffffff' }}>{activeTrade.paymentMethod}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {activeTrade.status === 'ESCROW_LOCKED' && activeTrade.buyerUserId === user?.id && (
              <>
                <button className="bn-btn-yellow" onClick={() => handleMarkPaid(activeTrade.id)}>
                  I Have Transferred the Fiat Funds
                </button>
                <button className="btn btn-secondary" onClick={() => handleCancelTrade(activeTrade.id)}>
                  Cancel Trade
                </button>
              </>
            )}
            {activeTrade.status === 'FIAT_MARKED_PAID' && (
              <button className="btn btn-buy" onClick={() => handleRelease(activeTrade.id)}>
                Confirm Fiat Receipt & Release Crypto Escrow
              </button>
            )}
            {activeTrade.status === 'RELEASED' && (
              <span style={{ color: '#0ecb81', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <CheckCircle size={18} /> Escrow Released & Credited Successfully
              </span>
            )}
          </div>
        </div>
      )}

      {/* Ads Table */}
      <div className="bn-table-wrapper" style={{ marginBottom: '32px' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #2b313a', fontWeight: 700, fontSize: '16px', color: '#ffffff' }}>
          Live Market Advertisements
        </div>
        <table className="bn-table">
          <thead>
            <tr>
              <th>Merchant</th>
              <th>Price</th>
              <th>Available / Limits</th>
              <th>Payment Methods</th>
              <th style={{ textAlign: 'right' }}>Trade</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <tr key={ad.id}>
                <td>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff' }}>{ad.merchantName}</div>
                  <div style={{ fontSize: '12px', color: '#848e9c' }}>{ad.terms}</div>
                </td>
                <td className="mono">
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#0ecb81' }}>
                    ${ad.price}
                  </span>
                  <span style={{ fontSize: '12px', color: '#848e9c' }}> {ad.fiatCurrency}</span>
                </td>
                <td className="mono">
                  <div>Avail: <strong style={{ color: '#ffffff' }}>{ad.availableCryptoAmount} {ad.asset}</strong></div>
                  <div style={{ fontSize: '12px', color: '#848e9c' }}>Limit: ${ad.minFiatLimit} - ${ad.maxFiatLimit}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {ad.paymentMethods.map((pm: string) => (
                      <span key={pm} className="badge badge-yellow" style={{ fontSize: '10px' }}>
                        {pm}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-buy" onClick={() => handleInitiateTrade(ad)}>
                    Buy {ad.asset}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User's P2P Trade History */}
      {user && (
        <div className="bn-table-wrapper">
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #2b313a', fontWeight: 700, fontSize: '16px', color: '#ffffff' }}>
            My P2P Escrow Trades ({myTrades.length})
          </div>
          <table className="bn-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Asset Amount</th>
                <th>Fiat Total</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody className="mono">
              {myTrades.map((t) => (
                <tr key={t.id}>
                  <td style={{ color: '#fcd535' }}>{t.id}</td>
                  <td style={{ fontWeight: 700, color: '#ffffff' }}>{t.cryptoAmount} {t.asset}</td>
                  <td style={{ color: '#0ecb81' }}>${t.fiatAmount} {t.fiatCurrency}</td>
                  <td style={{ color: '#848e9c' }}>{t.paymentMethod}</td>
                  <td>
                    <span className={`badge ${t.status === 'RELEASED' ? 'badge-green' : t.status === 'CANCELLED' ? 'badge-amber' : 'badge-yellow'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {t.status === 'ESCROW_LOCKED' && t.buyerUserId === user?.id && (
                      <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleMarkPaid(t.id)}>
                        Mark Paid
                      </button>
                    )}
                    {t.status === 'FIAT_MARKED_PAID' && (
                      <button className="btn btn-buy" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleRelease(t.id)}>
                        Release
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {myTrades.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#848e9c' }}>
                    No P2P trades recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Trade Modal */}
      {selectedAd && (
        <div className="modal-overlay" onClick={() => setSelectedAd(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
              Buy {selectedAd.asset} with {selectedAd.fiatCurrency}
            </h2>
            <form onSubmit={handleExecuteTrade} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="input-group">
                <label className="input-label">Quantity to Buy ({selectedAd.asset})</label>
                <input
                  type="text"
                  className="input-field"
                  value={cryptoAmount}
                  onChange={(e) => setCryptoAmount(e.target.value)}
                  required
                />
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', fontSize: '13px' }} className="mono">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Fiat to Pay:</span>
                  <strong>${(parseFloat(cryptoAmount || '0') * parseFloat(selectedAd.price)).toFixed(2)} {selectedAd.fiatCurrency}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Escrow Lock Status:</span>
                  <span style={{ color: 'var(--buy-green)' }}>Immediate Cryptographic Lock</span>
                </div>
              </div>

              {msg && <div style={{ color: 'var(--sell-red)', fontSize: '12px' }}>{msg}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedAd(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn btn-buy">
                  {loading ? 'Locking Escrow...' : 'Confirm Escrow Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Ad Modal */}
      {isCreateAdOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateAdOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
              Post P2P Advertisement
            </h2>
            <form onSubmit={handleCreateAd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                  <label className="input-label">I Want To</label>
                  <select
                    className="input-field"
                    value={newAdType}
                    onChange={(e: any) => setNewAdType(e.target.value)}
                  >
                    <option value="SELL">Sell Crypto</option>
                    <option value="BUY">Buy Crypto</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Asset</label>
                  <select
                    className="input-field"
                    value={newAdAsset}
                    onChange={(e) => setNewAdAsset(e.target.value)}
                  >
                    <option value="USDT">USDT</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="SOL">SOL</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                  <label className="input-label">Unit Price (USD)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newAdPrice}
                    onChange={(e) => setNewAdPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Total Crypto Amount</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newAdTotal}
                    onChange={(e) => setNewAdTotal(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                  <label className="input-label">Min Limit ($)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newAdMin}
                    onChange={(e) => setNewAdMin(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Max Limit ($)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newAdMax}
                    onChange={(e) => setNewAdMax(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Payment Methods (comma separated)</label>
                <input
                  type="text"
                  className="input-field"
                  value={newAdPayment}
                  onChange={(e) => setNewAdPayment(e.target.value)}
                  required
                />
              </div>

              {msg && <div style={{ color: 'var(--sell-red)', fontSize: '12px' }}>{msg}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateAdOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Posting...' : 'Publish Advertisement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

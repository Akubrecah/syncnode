import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, ShieldCheck, Zap, DollarSign, Clock, ArrowRight,
  CheckCircle2, AlertCircle, RefreshCw, Award, Lock, Sparkles, ChevronRight, Coins
} from 'lucide-react';
import { Footer } from './Footer';

interface InvestmentPlan {
  id: string;
  name: string;
  badge: string;
  min_deposit_usd: string;
  max_deposit_usd: string;
  return_rate_percent: string;
  duration_days: number;
  daily_yield_percent: string;
  description: string;
  is_active: boolean;
  total_staked_usd: string;
  investors_count: number;
}

interface UserInvestment {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  badge?: string;
  invested_amount_usd: string;
  expected_return_usd: string;
  daily_yield_usd: string;
  accrued_profit_usd: string;
  progress_percent?: number;
  days_remaining?: number;
  status: string;
  duration_days: number;
  created_at: number;
  end_at: number;
}

interface InvestmentViewProps {
  user: any;
  balances?: any[];
  onOpenAuth?: () => void;
  onNavigateToWallet?: () => void;
}

export const InvestmentView: React.FC<InvestmentViewProps> = ({
  user,
  balances = [],
  onOpenAuth,
  onNavigateToWallet
}) => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [myInvestments, setMyInvestments] = useState<UserInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(10000);

  // Modal State
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [investAmount, setInvestAmount] = useState<string>('10000');
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [subscribeSuccess, setSubscribeSuccess] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // USDT Available Balance
  const usdtBal = useMemo(() => {
    const found = balances.find((b: any) => b.asset === 'USDT');
    return found ? parseFloat(found.available || '0') : 0;
  }, [balances]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('syncnode_token');

      // Fetch Plans
      const plansRes = await fetch('/api/v1/invest/plans');
      const plansData = await plansRes.json();
      if (plansData.success) {
        setPlans(plansData.plans);
      }

      // Fetch User Investments if logged in
      if (token) {
        const myRes = await fetch('/api/v1/invest/my-investments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const myData = await myRes.json();
        if (myData.success) {
          setMyInvestments(myData.investments);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load investment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Determine active plan based on calculator amount
  const matchedPlan = useMemo(() => {
    if (!plans.length) return null;
    const found = plans.find(
      (p) => calcAmount >= parseFloat(p.min_deposit_usd) && calcAmount <= parseFloat(p.max_deposit_usd)
    );
    return found || plans[0];
  }, [plans, calcAmount]);

  const calcReturn = useMemo(() => {
    if (!matchedPlan) return { total: 0, profit: 0, daily: 0 };
    const roiMultiplier = parseFloat(matchedPlan.return_rate_percent) / 100;
    const total = calcAmount * roiMultiplier;
    const profit = total - calcAmount;
    const daily = total / matchedPlan.duration_days;
    return { total, profit, daily };
  }, [matchedPlan, calcAmount]);

  const handleOpenSubscribe = (plan: InvestmentPlan) => {
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    setSelectedPlan(plan);
    setInvestAmount(plan.min_deposit_usd);
    setSubscribeError(null);
    setSubscribeSuccess(null);
  };

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    const amt = parseFloat(investAmount);
    if (isNaN(amt) || amt < parseFloat(selectedPlan.min_deposit_usd)) {
      setSubscribeError(`Minimum investment is $${selectedPlan.min_deposit_usd} USDT`);
      return;
    }
    if (amt > parseFloat(selectedPlan.max_deposit_usd)) {
      setSubscribeError(`Maximum investment is $${selectedPlan.max_deposit_usd} USDT`);
      return;
    }
    if (amt > usdtBal) {
      setSubscribeError(`Insufficient USDT balance. Available: ${usdtBal.toFixed(2)} USDT`);
      return;
    }

    setIsSubscribing(true);
    setSubscribeError(null);

    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/invest/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          amount: investAmount.trim()
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setSubscribeSuccess(`Subscribed $${investAmount} USDT to ${selectedPlan.name}!`);
      setTimeout(() => {
        setSelectedPlan(null);
        fetchData();
      }, 1500);
    } catch (err: any) {
      setSubscribeError(err.message || 'Subscription failed');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleClaimYield = async (investmentId: string) => {
    setClaimingId(investmentId);
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/invest/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ investment_id: investmentId })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to claim yield');
      }

      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to claim');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="investment-page" style={{ background: '#0b0e11', minHeight: '100vh', color: '#eaecef', paddingBottom: '60px' }}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(180deg, #181a20 0%, #0b0e11 100%)',
        borderBottom: '1px solid #2b313a',
        padding: '50px 24px 40px'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(252, 213, 53, 0.12)', border: '1px solid rgba(252, 213, 53, 0.3)', borderRadius: '20px', padding: '6px 14px', marginBottom: '16px' }}>
            <Sparkles size={14} color="#fcd535" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fcd535' }}>Binance Institutional Yield &amp; Fixed Growth</span>
          </div>

          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 12px', color: '#eaecef' }}>
            High-Yield Crypto Staking &amp; Capital Growth
          </h1>
          <p style={{ fontSize: '16px', color: '#848e9c', maxWidth: '720px', margin: '0 0 28px', lineHeight: 1.6 }}>
            Earn algorithmic compounding returns backed by institutional market-making vaults. Lock USDT or Crypto to generate up to <strong>300% ROI</strong> with daily automated payouts.
          </p>

          {/* Key Metric Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '16px' }}>
            <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '12px', padding: '18px 20px' }}>
              <div style={{ fontSize: '12px', color: '#848e9c', marginBottom: '4px' }}>Peak Projected Return</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#0ecb81' }}>Up to 300%</div>
              <div style={{ fontSize: '11px', color: '#848e9c', marginTop: '2px' }}>e.g. $10k deposit → $25k return</div>
            </div>

            <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '12px', padding: '18px 20px' }}>
              <div style={{ fontSize: '12px', color: '#848e9c', marginBottom: '4px' }}>Total Capital Staked</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#fcd535' }}>$5,883,800.00</div>
              <div style={{ fontSize: '11px', color: '#848e9c', marginTop: '2px' }}>Across 186 Active Institutional Nodes</div>
            </div>

            <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '12px', padding: '18px 20px' }}>
              <div style={{ fontSize: '12px', color: '#848e9c', marginBottom: '4px' }}>Payout Frequency</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#eaecef' }}>Daily Automated</div>
              <div style={{ fontSize: '11px', color: '#848e9c', marginTop: '2px' }}>Direct to user available wallet</div>
            </div>

            <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '12px', padding: '18px 20px' }}>
              <div style={{ fontSize: '12px', color: '#848e9c', marginBottom: '4px' }}>Security &amp; Solvency</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#0ecb81' }}>100% PoR Backed</div>
              <div style={{ fontSize: '11px', color: '#848e9c', marginTop: '2px' }}>Verified double-entry reserves</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '30px auto 0', padding: '0 24px' }}>
        {/* Interactive Profit Calculator */}
        <div style={{
          background: '#181a20',
          border: '1px solid #2b313a',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '40px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', color: '#eaecef' }}>
                Interactive Return &amp; Yield Calculator
              </h2>
              <p style={{ fontSize: '13px', color: '#848e9c', margin: 0 }}>
                Adjust deposit amount to forecast maturity return and daily automated payouts.
              </p>
            </div>
            {matchedPlan && (
              <span style={{ background: 'rgba(252, 213, 53, 0.15)', color: '#fcd535', border: '1px solid rgba(252, 213, 53, 0.3)', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
                Selected Tier: {matchedPlan.name} ({matchedPlan.return_rate_percent}% ROI)
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '24px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#848e9c' }}>Deposit Capital:</span>
                <span style={{ fontWeight: 800, color: '#fcd535', fontSize: '18px', fontFamily: 'monospace' }}>
                  ${calcAmount.toLocaleString('en-US')} USD
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="500"
                max="100000"
                step="500"
                value={calcAmount}
                onChange={(e) => setCalcAmount(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#fcd535',
                  cursor: 'pointer',
                  height: '6px',
                  borderRadius: '4px',
                  background: '#2b313a'
                }}
              />

              {/* Quick Amount Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                {[1000, 2500, 5000, 10000, 25000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCalcAmount(amt)}
                    style={{
                      background: calcAmount === amt ? '#fcd535' : '#202630',
                      color: calcAmount === amt ? '#181a20' : '#eaecef',
                      fontWeight: 700,
                      border: '1px solid #2b313a',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    ${amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Projected Result Card */}
            <div style={{
              background: '#202630',
              border: '1px solid rgba(14, 203, 129, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#848e9c', marginBottom: '2px' }}>Total Projected Payout</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#0ecb81', fontFamily: 'monospace' }}>
                  ${calcReturn.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '11px', color: '#0ecb81', marginTop: '2px' }}>
                  +${calcReturn.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })} Net Profit
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#848e9c', marginBottom: '2px' }}>Daily Accrual Yield</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#fcd535', fontFamily: 'monospace' }}>
                  +${calcReturn.daily.toLocaleString('en-US', { minimumFractionDigits: 2 })} / day
                </div>
                <div style={{ fontSize: '11px', color: '#848e9c', marginTop: '2px' }}>
                  Duration: {matchedPlan?.duration_days || 30} Days
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => matchedPlan && handleOpenSubscribe(matchedPlan)}
                  style={{
                    width: '100%',
                    background: '#fcd535',
                    color: '#181a20',
                    fontWeight: 800,
                    fontSize: '14px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>Invest ${calcAmount.toLocaleString()} USD in {matchedPlan?.name}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* User Active Investments Section */}
        {user && myInvestments.length > 0 && (
          <div style={{
            background: '#181a20',
            border: '1px solid #2b313a',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '40px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#eaecef' }}>
                  My Active Investments ({myInvestments.length})
                </h3>
                <div style={{ fontSize: '12px', color: '#848e9c', marginTop: '2px' }}>
                  Realtime yield accrual counter and maturity status
                </div>
              </div>
              <button
                onClick={fetchData}
                style={{ background: 'transparent', border: '1px solid #2b313a', color: '#848e9c', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            <div className="bn-table-wrapper">
              <table className="bn-table">
                <thead>
                  <tr>
                    <th>Plan Name</th>
                    <th>Invested Capital</th>
                    <th>Target Return</th>
                    <th>Accrued Yield</th>
                    <th>Duration Progress</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myInvestments.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <strong style={{ color: '#eaecef' }}>{inv.plan_name}</strong>
                        <div style={{ fontSize: '11px', color: '#848e9c' }}>{inv.id}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#eaecef' }}>${inv.invested_amount_usd} USDT</td>
                      <td style={{ fontWeight: 700, color: '#0ecb81' }}>${inv.expected_return_usd} USDT</td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#0ecb81', fontFamily: 'monospace' }}>
                          +${inv.accrued_profit_usd}
                        </span>
                        <div style={{ fontSize: '10px', color: '#848e9c' }}>~${inv.daily_yield_usd}/day</div>
                      </td>
                      <td style={{ minWidth: '160px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                          <span>{inv.progress_percent ?? 0}%</span>
                          <span>{inv.days_remaining ?? 0} days left</span>
                        </div>
                        <div style={{ height: '6px', background: '#2b313a', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, inv.progress_percent ?? 0)}%`,
                              height: '100%',
                              background: '#0ecb81',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        <span className={`admin-status-pill ${inv.status === 'ACTIVE' ? 'healthy' : 'warning'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {inv.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleClaimYield(inv.id)}
                            disabled={claimingId === inv.id}
                            style={{
                              background: '#0ecb81',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              opacity: claimingId === inv.id ? 0.6 : 1
                            }}
                          >
                            {claimingId === inv.id ? 'Claiming...' : 'Claim Yield'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Investment Plans Showcase Grid */}
        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 20px', color: '#eaecef' }}>
          Available Investment &amp; Staking Tiers
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', marginBottom: '60px' }}>
          {plans.map((p) => (
            <div
              key={p.id}
              style={{
                background: '#181a20',
                border: p.badge === 'VIP CHOICE' ? '2px solid #fcd535' : '1px solid #2b313a',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'transform 0.2s',
                boxShadow: p.badge === 'VIP CHOICE' ? '0 10px 30px rgba(252, 213, 53, 0.1)' : 'none'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{
                    background: p.badge === 'VIP CHOICE' ? '#fcd535' : 'rgba(255, 255, 255, 0.08)',
                    color: p.badge === 'VIP CHOICE' ? '#181a20' : '#fcd535',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {p.badge}
                  </span>
                  <span style={{ fontSize: '12px', color: '#848e9c' }}>{p.duration_days} Days Lock</span>
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#eaecef', margin: '0 0 6px' }}>
                  {p.name}
                </h3>
                <p style={{ fontSize: '13px', color: '#848e9c', margin: '0 0 20px', lineHeight: 1.5 }}>
                  {p.description}
                </p>

                {/* Big ROI Display */}
                <div style={{
                  background: '#202630',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  border: '1px solid #2b313a'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#848e9c' }}>Total Return (ROI)</span>
                    <span style={{ fontSize: '26px', fontWeight: 900, color: '#0ecb81', fontFamily: 'monospace' }}>
                      {p.return_rate_percent}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: '#848e9c' }}>Daily Yield:</span>
                    <span style={{ fontWeight: 700, color: '#fcd535' }}>~{p.daily_yield_percent}% / day</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#848e9c' }}>Deposit Limits:</span>
                    <span style={{ fontWeight: 600, color: '#eaecef' }}>${p.min_deposit_usd} - ${p.max_deposit_usd}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#848e9c', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="#0ecb81" />
                    <span>Instant daily compounding payouts</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="#0ecb81" />
                    <span>Zero management or liquidation fees</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="#0ecb81" />
                    <span>Principal returned at maturity</span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => handleOpenSubscribe(p)}
                style={{
                  width: '100%',
                  background: p.badge === 'VIP CHOICE' ? '#fcd535' : '#202630',
                  color: p.badge === 'VIP CHOICE' ? '#181a20' : '#fcd535',
                  border: p.badge === 'VIP CHOICE' ? 'none' : '1px solid rgba(252, 213, 53, 0.4)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Subscribe to {p.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Subscribe Modal */}
      {selectedPlan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          padding: '16px'
        }}>
          <div style={{
            background: '#1e2329',
            border: '1px solid #2b313a',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#eaecef', margin: '0 0 6px' }}>
              Subscribe to {selectedPlan.name}
            </h3>
            <p style={{ fontSize: '13px', color: '#848e9c', margin: '0 0 20px' }}>
              Target Return: <strong style={{ color: '#0ecb81' }}>{selectedPlan.return_rate_percent}% ROI</strong> over {selectedPlan.duration_days} Days.
            </p>

            {subscribeError && (
              <div style={{ background: 'rgba(246, 70, 93, 0.15)', border: '1px solid #f6465d', borderRadius: '8px', padding: '10px 14px', color: '#f6465d', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{subscribeError}</span>
              </div>
            )}

            {subscribeSuccess && (
              <div style={{ background: 'rgba(14, 203, 129, 0.15)', border: '1px solid #0ecb81', borderRadius: '8px', padding: '10px 14px', color: '#0ecb81', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>{subscribeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubscribeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                  <span style={{ color: '#848e9c' }}>Investment Amount (USDT)</span>
                  <span style={{ color: '#848e9c' }}>
                    Available: <strong style={{ color: '#fcd535' }}>{usdtBal.toFixed(2)} USDT</strong>
                  </span>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="any"
                    min={selectedPlan.min_deposit_usd}
                    max={selectedPlan.max_deposit_usd}
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: '#181a20',
                      border: '1px solid #2b313a',
                      borderRadius: '8px',
                      padding: '12px 60px 12px 14px',
                      color: '#eaecef',
                      fontSize: '16px',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#848e9c' }}>
                    USDT
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: '#848e9c', marginTop: '6px' }}>
                  Allowed range: ${selectedPlan.min_deposit_usd} – ${selectedPlan.max_deposit_usd} USDT
                </div>
              </div>

              {/* Yield Summary */}
              <div style={{ background: '#181a20', borderRadius: '10px', padding: '14px', border: '1px solid #2b313a', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#848e9c' }}>Total Maturity Return:</span>
                  <span style={{ fontWeight: 800, color: '#0ecb81', fontFamily: 'monospace' }}>
                    ${((parseFloat(investAmount) || 0) * (parseFloat(selectedPlan.return_rate_percent) / 100)).toFixed(2)} USDT
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#848e9c' }}>Estimated Daily Yield:</span>
                  <span style={{ fontWeight: 700, color: '#fcd535', fontFamily: 'monospace' }}>
                    ${(((parseFloat(investAmount) || 0) * (parseFloat(selectedPlan.return_rate_percent) / 100)) / selectedPlan.duration_days).toFixed(2)} / day
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#848e9c' }}>Maturity Duration:</span>
                  <span style={{ color: '#eaecef' }}>{selectedPlan.duration_days} Days</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedPlan(null)}
                  disabled={isSubscribing}
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubscribing}
                  style={{ flex: 1.5, background: '#fcd535', color: '#181a20', fontWeight: 800, border: 'none', padding: '12px' }}
                >
                  {isSubscribing ? 'Confirming...' : 'Confirm Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

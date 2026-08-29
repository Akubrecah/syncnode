import React, { useState } from 'react';
import { RefreshCw, Plus, Edit2, TrendingUp, Users, DollarSign, Award, Clock } from 'lucide-react';
import { useAdminQuery, useAdminMutation } from '../../../hooks/useAdminApi';
import {
  AdminSectionHeader, AdminDataState, ToastBar, AdminToast
} from '../shared/AdminPrimitives';
import { formatDateTime } from '../../../utils/adminHelpers';

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
  invested_amount_usd: string;
  expected_return_usd: string;
  daily_yield_usd: string;
  accrued_profit_usd: string;
  status: string;
  duration_days: number;
  created_at: number;
  end_at: number;
}

interface PlansResponse {
  success: boolean;
  plans: InvestmentPlan[];
}

interface UserInvestmentsResponse {
  success: boolean;
  investments: UserInvestment[];
}

export const InvestmentAdmin: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'subscriptions'>('plans');
  const [toast, setToast] = useState<AdminToast | null>(null);

  const plansQuery = useAdminQuery<PlansResponse>('/api/v1/admin/invest/plans', {
    refreshInterval: 10000
  });

  const subsQuery = useAdminQuery<UserInvestmentsResponse>('/api/v1/admin/invest/user-investments', {
    refreshInterval: 10000
  });

  const savePlanMutation = useAdminMutation<Partial<InvestmentPlan>, unknown>(
    () => '/api/v1/admin/invest/plans',
    'POST'
  );

  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [formName, setFormName] = useState('');
  const [formBadge, setFormBadge] = useState('HOT');
  const [formMin, setFormMin] = useState('10000.00');
  const [formMax, setFormMax] = useState('49999.00');
  const [formRoi, setFormRoi] = useState('250');
  const [formDays, setFormDays] = useState(30);
  const [formDailyYield, setFormDailyYield] = useState('8.33');
  const [formDesc, setFormDesc] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const plans = plansQuery.data?.plans || [];
  const investments = subsQuery.data?.investments || [];

  const handleOpenEdit = (plan?: InvestmentPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormName(plan.name);
      setFormBadge(plan.badge);
      setFormMin(plan.min_deposit_usd);
      setFormMax(plan.max_deposit_usd);
      setFormRoi(plan.return_rate_percent);
      setFormDays(plan.duration_days);
      setFormDailyYield(plan.daily_yield_percent);
      setFormDesc(plan.description);
      setFormIsActive(plan.is_active);
    } else {
      setEditingPlan({
        id: '',
        name: '',
        badge: 'HOT',
        min_deposit_usd: '10000.00',
        max_deposit_usd: '49999.00',
        return_rate_percent: '250',
        duration_days: 30,
        daily_yield_percent: '8.33',
        description: '',
        is_active: true,
        total_staked_usd: '0.00',
        investors_count: 0
      });
      setFormName('Whale Capital Strategy');
      setFormBadge('VIP CHOICE');
      setFormMin('10000.00');
      setFormMax('49999.00');
      setFormRoi('250');
      setFormDays(30);
      setFormDailyYield('8.33');
      setFormDesc('High yield 250% 30-day liquidity fund (e.g. $10,000 -> $25,000).');
      setFormIsActive(true);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setToast({ kind: 'failed', message: 'Plan name is required' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await savePlanMutation.execute({
        id: editingPlan?.id || undefined,
        name: formName.trim(),
        badge: formBadge,
        min_deposit_usd: formMin,
        max_deposit_usd: formMax,
        return_rate_percent: formRoi,
        duration_days: Number(formDays),
        daily_yield_percent: formDailyYield,
        description: formDesc.trim(),
        is_active: formIsActive
      });
      if (res !== null) {
        setToast({ kind: 'success', message: `Investment plan '${formName}' saved successfully.` });
        setEditingPlan(null);
        plansQuery.refresh();
      } else {
        setToast({ kind: 'failed', message: savePlanMutation.error || 'Failed to save plan' });
      }
    } catch (err: any) {
      setToast({ kind: 'failed', message: err.message || 'Save error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="High-Yield Investment & Earn Management"
        subtitle="Configure high-ROI investment plans and monitor user capital allocations"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => { plansQuery.refresh(); subsQuery.refresh(); }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={() => handleOpenEdit()} style={{ background: '#fcd535', color: '#181a20', fontWeight: 700 }}>
              <Plus size={14} /> Create Plan
            </button>
          </div>
        }
      />

      <ToastBar toast={toast} onDismiss={() => setToast(null)} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #2b313a', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveSubTab('plans')}
          style={{
            background: activeSubTab === 'plans' ? '#fcd535' : 'transparent',
            color: activeSubTab === 'plans' ? '#181a20' : '#848e9c',
            fontWeight: activeSubTab === 'plans' ? 700 : 500,
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Investment Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveSubTab('subscriptions')}
          style={{
            background: activeSubTab === 'subscriptions' ? '#fcd535' : 'transparent',
            color: activeSubTab === 'subscriptions' ? '#181a20' : '#848e9c',
            fontWeight: activeSubTab === 'subscriptions' ? 700 : 500,
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          User Subscriptions ({investments.length})
        </button>
      </div>

      {activeSubTab === 'plans' ? (
        <AdminDataState
          status={plansQuery.status}
          error={plansQuery.error}
          isForbidden={plansQuery.isForbidden}
          isEmpty={plans.length === 0}
          emptyMessage="No investment plans created yet."
          onRetry={plansQuery.refresh}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {plans.map((p) => (
              <div
                key={p.id}
                style={{
                  background: '#1e2329',
                  border: '1px solid #2b313a',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{
                        background: 'rgba(252, 213, 53, 0.15)',
                        color: '#fcd535',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {p.badge || 'POPULAR'}
                      </span>
                      <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#eaecef', margin: '8px 0 4px' }}>
                        {p.name}
                      </h4>
                    </div>
                    <span className={`admin-status-pill ${p.is_active ? 'healthy' : 'critical'}`}>
                      {p.is_active ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: '#848e9c', margin: '0 0 16px' }}>{p.description}</p>

                  <div style={{
                    background: '#14171a',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>Total Return (ROI)</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#0ecb81' }}>{p.return_rate_percent}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>Duration</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#eaecef' }}>{p.duration_days} Days</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>Min - Max Deposit</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#eaecef' }}>${p.min_deposit_usd} - ${p.max_deposit_usd}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>Daily Yield</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#fcd535' }}>~{p.daily_yield_percent}% / day</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#848e9c', marginBottom: '12px' }}>
                    <span>Total Staked: <strong style={{ color: '#eaecef' }}>${p.total_staked_usd}</strong></span>
                    <span>Investors: <strong style={{ color: '#eaecef' }}>{p.investors_count}</strong></span>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => handleOpenEdit(p)}
                >
                  <Edit2 size={13} style={{ marginRight: 6 }} /> Edit Plan Parameters
                </button>
              </div>
            ))}
          </div>
        </AdminDataState>
      ) : (
        <AdminDataState
          status={subsQuery.status}
          error={subsQuery.error}
          isForbidden={subsQuery.isForbidden}
          isEmpty={investments.length === 0}
          emptyMessage="No active user investments found."
          onRetry={subsQuery.refresh}
        >
          <div className="bn-table-wrapper">
            <table className="bn-table admin-users-table">
              <thead>
                <tr>
                  <th>Investment ID</th>
                  <th>User ID</th>
                  <th>Plan Name</th>
                  <th>Invested USD</th>
                  <th>Target Maturity</th>
                  <th>Accrued Yield</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Matures On</th>
                </tr>
              </thead>
              <tbody>
                {investments.map((inv) => (
                  <tr key={inv.id}>
                    <td className="mono">{inv.id}</td>
                    <td>{inv.user_id}</td>
                    <td><strong style={{ color: '#fcd535' }}>{inv.plan_name}</strong></td>
                    <td style={{ fontWeight: 700, color: '#eaecef' }}>${inv.invested_amount_usd}</td>
                    <td style={{ fontWeight: 700, color: '#0ecb81' }}>${inv.expected_return_usd}</td>
                    <td style={{ color: '#0ecb81' }}>${inv.accrued_profit_usd}</td>
                    <td>
                      <span className={`admin-status-pill ${inv.status === 'ACTIVE' ? 'healthy' : 'warning'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="admin-muted-cell">{formatDateTime(inv.created_at)}</td>
                    <td className="admin-muted-cell">{formatDateTime(inv.end_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminDataState>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
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
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#1e2329',
            border: '1px solid #2b313a',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '560px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#eaecef', margin: '0 0 16px' }}>
              {editingPlan.id ? `Edit ${editingPlan.name}` : 'Create High-Yield Plan'}
            </h3>

            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Plan Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Badge</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Total Return (ROI %)</label>
                  <input
                    type="text"
                    value={formRoi}
                    onChange={(e) => setFormRoi(e.target.value)}
                    placeholder="e.g. 250"
                    required
                    style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Duration (Days)</label>
                  <input
                    type="number"
                    value={formDays}
                    onChange={(e) => setFormDays(Number(e.target.value))}
                    min={1}
                    required
                    style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Daily Yield (%)</label>
                  <input
                    type="text"
                    value={formDailyYield}
                    onChange={(e) => setFormDailyYield(e.target.value)}
                    placeholder="e.g. 8.33"
                    style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Min Deposit ($ USD)</label>
                  <input
                    type="text"
                    value={formMin}
                    onChange={(e) => setFormMin(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Max Deposit ($ USD)</label>
                  <input
                    type="text"
                    value={formMax}
                    onChange={(e) => setFormMax(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                />
                <label htmlFor="isActiveCheck" style={{ fontSize: '13px', color: '#eaecef', cursor: 'pointer' }}>
                  Enable Plan for User Subscriptions
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingPlan(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ background: '#fcd535', color: '#181a20', fontWeight: 700 }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

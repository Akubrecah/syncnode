import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAdminQuery, useAdminMutation } from '../../../hooks/useAdminApi';
import {
  AdminSectionHeader, AdminDataState, ConfirmActionModal,
  ConfirmActionConfig, ToastBar, AdminToast
} from '../shared/AdminPrimitives';
import { RiskAlerts } from './RiskAlerts';
import { CircuitBreakersState } from '../../../types/admin';
import { formatDateTime } from '../../../utils/adminHelpers';

interface CBResponse { success: boolean; circuitBreakers: CircuitBreakersState }

const MARKETS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ETH/BTC'];

/**
 * Emergency circuit breakers. Every mutation opens an explicit confirmation
 * modal; halts additionally require a documented reason which the backend
 * writes to the immutable audit trail.
 */
export const CircuitBreakersPanel: React.FC = () => {
  const query = useAdminQuery<CBResponse>('/api/v1/admin/circuit-breakers', { refreshInterval: 5000 });
  const [confirm, setConfirm] = useState<ConfirmActionConfig | null>(null);
  const [toast, setToast] = useState<AdminToast | null>(null);

  const globalHalt = useAdminMutation<{ halt: boolean }, unknown>('/api/v1/admin/circuit-breakers/global-halt');
  const marketHalt = useAdminMutation<{ symbol: string; halt: boolean }, unknown>('/api/v1/admin/circuit-breakers/market-halt');
  const withdrawalPause = useAdminMutation<{ pause: boolean }, unknown>('/api/v1/admin/circuit-breakers/withdrawals-pause');
  const depositPause = useAdminMutation<{ pause: boolean }, unknown>('/api/v1/admin/circuit-breakers/deposits-pause');
  const maintenance = useAdminMutation<{ enabled: boolean }, unknown>('/api/v1/admin/circuit-breakers/maintenance');

  const cb = query.data?.circuitBreakers;

  const runConfirmed = async (
    config: Omit<ConfirmActionConfig, 'onConfirm' | 'onClose'> & { requireReason?: boolean },
    action: (payload: Record<string, unknown>) => Promise<void>,
    successMessage: string
  ) => {
    setConfirm({
      ...config,
      onConfirm: async (payload) => {
        await action(payload);
        setToast({ kind: 'success', message: successMessage });
        query.refresh();
      },
      onClose: () => setConfirm(null)
    });
  };

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="Emergency Circuit Breakers"
        subtitle="Exchange-wide kill switches. Every activation requires explicit confirmation and a documented reason."
        actions={
          <button className="btn btn-secondary" onClick={query.refresh} disabled={query.status === 'LOADING'}>
            <RefreshCw size={14} /> Refresh state
          </button>
        }
      />

      <ToastBar toast={toast} onDismiss={() => setToast(null)} />

      <AdminDataState status={query.status} error={query.error} isForbidden={query.isForbidden} isEmpty={!cb} emptyMessage="Circuit breaker state unavailable." onRetry={query.refresh}>
        {cb && (
          <>
            <div className="admin-card">
              <h3>Global Controls</h3>
              <p className="admin-card-sub">Last synced {formatDateTime(query.lastUpdatedAt)}</p>
              <div className="admin-breaker-grid">
                <div className={`admin-breaker-card ${cb.isGlobalTradingHalted ? 'engaged' : ''}`}>
                  <div className="admin-breaker-head">
                    <strong>Global Trading Halt</strong>
                    <span className={`admin-status-pill ${cb.isGlobalTradingHalted ? 'critical' : 'healthy'}`}>
                      {cb.isGlobalTradingHalted ? 'ENGAGED' : 'CLEAR'}
                    </span>
                  </div>
                  <small>Freezes order placement across every market via the risk engine.</small>
                  <button
                    className={`btn ${cb.isGlobalTradingHalted ? 'btn-buy' : 'btn-sell'}`}
                    onClick={() =>
                      cb.isGlobalTradingHalted
                        ? runConfirmed(
                            { title: 'Resume Global Trading', description: 'Lift the exchange-wide trading halt. All markets resume order acceptance immediately.', confirmLabel: 'Resume Trading', danger: false, requireReason: true },
                            async (p) => { await globalHalt.execute({ halt: false, ...p }); },
                            'Global trading resumed'
                          )
                        : runConfirmed(
                            { title: 'Engage Global Trading Halt', description: 'This immediately freezes ALL order placement exchange-wide. The action is recorded in the audit trail with your identity.', confirmLabel: 'HALT ALL TRADING', danger: true, requireReason: true },
                            async (p) => { await globalHalt.execute({ halt: true, ...p }); },
                            'GLOBAL TRADING HALT ENGAGED'
                          )
                    }
                  >
                    {cb.isGlobalTradingHalted ? 'Resume Global Trading' : 'Trigger Global Halt'}
                  </button>
                </div>

                <div className={`admin-breaker-card ${cb.isWithdrawalsPaused ? 'engaged' : ''}`}>
                  <div className="admin-breaker-head">
                    <strong>Withdrawal Pause</strong>
                    <span className={`admin-status-pill ${cb.isWithdrawalsPaused ? 'critical' : 'healthy'}`}>
                      {cb.isWithdrawalsPaused ? 'PAUSED' : 'ACTIVE'}
                    </span>
                  </div>
                  <small>Blocks all new crypto withdrawal requests exchange-wide.</small>
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      runConfirmed(
                        {
                          title: cb.isWithdrawalsPaused ? 'Resume Withdrawals' : 'Pause All Withdrawals',
                          description: cb.isWithdrawalsPaused
                            ? 'Withdrawal processing will be re-enabled for all users.'
                            : 'All new withdrawal requests will be rejected while paused.',
                          danger: true,
                          requireReason: true,
                          confirmLabel: cb.isWithdrawalsPaused ? 'Resume Withdrawals' : 'Pause Withdrawals'
                        },
                        async (p) => { await withdrawalPause.execute({ pause: !cb.isWithdrawalsPaused, ...p }); },
                        cb.isWithdrawalsPaused ? 'Withdrawals resumed' : 'Withdrawals paused'
                      )
                    }
                  >
                    {cb.isWithdrawalsPaused ? 'Resume Withdrawals' : 'Pause Withdrawals'}
                  </button>
                </div>

                <div className={`admin-breaker-card ${cb.isDepositsPaused ? 'engaged' : ''}`}>
                  <div className="admin-breaker-head">
                    <strong>Deposit Pause</strong>
                    <span className={`admin-status-pill ${cb.isDepositsPaused ? 'warning' : 'healthy'}`}>
                      {cb.isDepositsPaused ? 'PAUSED' : 'ACTIVE'}
                    </span>
                  </div>
                  <small>Blocks ingestion and crediting of new blockchain deposits.</small>
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      runConfirmed(
                        {
                          title: cb.isDepositsPaused ? 'Resume Deposits' : 'Pause All Deposits',
                          description: cb.isDepositsPaused
                            ? 'Deposit ingestion will be re-enabled for all assets.'
                            : 'New deposit detection and crediting will be suspended.',
                          danger: true,
                          requireReason: true,
                          confirmLabel: cb.isDepositsPaused ? 'Resume Deposits' : 'Pause Deposits'
                        },
                        async (p) => { await depositPause.execute({ pause: !cb.isDepositsPaused, ...p }); },
                        cb.isDepositsPaused ? 'Deposits resumed' : 'Deposits paused'
                      )
                    }
                  >
                    {cb.isDepositsPaused ? 'Resume Deposits' : 'Pause Deposits'}
                  </button>
                </div>

                <div className={`admin-breaker-card ${cb.emergencyMaintenance ? 'engaged' : ''}`}>
                  <div className="admin-breaker-head">
                    <strong>Emergency Maintenance</strong>
                    <span className={`admin-status-pill ${cb.emergencyMaintenance ? 'warning' : 'healthy'}`}>
                      {cb.emergencyMaintenance ? 'ENABLED' : 'OFF'}
                    </span>
                  </div>
                  <small>Flags the platform as under emergency maintenance. SUPER_ADMIN only.</small>
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      runConfirmed(
                        {
                          title: cb.emergencyMaintenance ? 'Disable Maintenance Mode' : 'Enable Emergency Maintenance',
                          description: cb.emergencyMaintenance
                            ? 'Clear the emergency maintenance flag.'
                            : 'Mark the platform as under emergency maintenance.',
                          requireReason: true,
                          confirmLabel: cb.emergencyMaintenance ? 'Disable' : 'Enable'
                        },
                        async (p) => { await maintenance.execute({ enabled: !cb.emergencyMaintenance, ...p }); },
                        'Maintenance flag updated'
                      )
                    }
                  >
                    {cb.emergencyMaintenance ? 'Disable Maintenance' : 'Enable Maintenance'}
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-card">
              <h3>Per-Market Halts</h3>
              <div className="admin-market-halt-grid">
                {MARKETS.map((sym) => {
                  const halted = Boolean(cb.haltedMarkets?.[sym]);
                  return (
                    <div key={sym} className={`admin-breaker-card slim ${halted ? 'engaged' : ''}`}>
                      <div className="admin-breaker-head">
                        <strong className="mono">{sym}</strong>
                        <span className={`admin-status-pill ${halted ? 'warning' : 'healthy'}`}>
                          {halted ? 'HALTED' : 'TRADING'}
                        </span>
                      </div>
                      <button
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                        onClick={() =>
                          runConfirmed(
                            {
                              title: halted ? `Resume ${sym}` : `Halt ${sym}`,
                              description: halted
                                ? `${sym} will immediately accept new orders again.`
                                : `${sym} order placement will freeze instantly. Open orders remain on the book.`,
                              requireReason: true,
                              confirmLabel: halted ? `Resume ${sym}` : `Halt ${sym}`,
                              danger: true
                            },
                            async (p) => { await marketHalt.execute({ symbol: sym, halt: !halted, ...p }); },
                            `${sym} ${halted ? 'resumed' : 'halted'}`
                          )
                        }
                      >
                        {halted ? `Resume ${sym}` : `Halt ${sym}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <RiskAlerts circuitBreakers={cb} />
          </>
        )}
      </AdminDataState>

      {confirm && <ConfirmActionModal {...confirm} />}
    </div>
  );
};

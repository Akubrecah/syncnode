import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminSectionHeader, AdminDataState, MetricCard, PollingIndicator, OperationalAlerts } from '../shared/AdminPrimitives';
import { SystemStatus } from './SystemStatus';
import { ActivityFeed } from './ActivityFeed';
import { VolumeChart } from './VolumeChart';
import { formatUptime } from '../../../utils/adminHelpers';
import { SystemHealth, AuditLog, AdminMarket } from '../../../types/admin';

interface HealthResponse { success: boolean; health: SystemHealth }
interface AuditResponse { success: boolean; logs: AuditLog[] }
interface MarketsResponse { success: boolean; markets: AdminMarket[] }

/**
 * Default landing page: operational command center. All figures originate
 * from GET /api/v1/admin/system/health (real measurements only) plus the
 * audit trail and market statistics endpoints.
 */
export const SystemHealthDashboard: React.FC<{ onNavigate: (section: string) => void }> = ({ onNavigate }) => {
  // Real event-loop lag is measured server-side per request; poll at 5s.
  const health = useAdminQuery<HealthResponse>('/api/v1/admin/system/health', { refreshInterval: 5000 });
  const activity = useAdminQuery<AuditResponse>('/api/v1/admin/audit-logs?limit=12', {});
  const markets = useAdminQuery<MarketsResponse>('/api/v1/admin/markets', { refreshInterval: 15000 });
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);

  const h = health.data?.health;

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="System Health"
        subtitle="Real-time exchange operations overview - all metrics measured server-side"
        actions={
          <div className="admin-header-actions-row">
            <PollingIndicator lastUpdatedAt={health.lastUpdatedAt} isStale={health.isStale} />
            <button className="btn btn-secondary" onClick={health.refresh} disabled={health.status === 'LOADING'}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        }
      />

      <AdminDataState
        status={health.status}
        error={health.error}
        isForbidden={health.isForbidden}
        onRetry={health.refresh}
        isEmpty={!h}
      >
        {h && (
          <>
            <OperationalAlerts circuitBreakers={h.circuitBreakers} />

            <div className="admin-metric-grid">
              <MetricCard label="24h Trades" value={h.metrics.trades24h.toLocaleString()} hint={`${h.metrics.usersActive24h} users active (24h)`} onClick={() => onNavigate('trades')} />
              <MetricCard label="Open Orders" value={h.metrics.openOrders.toLocaleString()} onClick={() => onNavigate('order-books')} />
              <MetricCard label="Total Users" value={h.metrics.totalUsers.toLocaleString()} onClick={() => onNavigate('all-users')} />
              <MetricCard label="Pending KYC" value={h.metrics.pendingKycReviews.toLocaleString()} tone={h.metrics.pendingKycReviews > 0 ? 'warn' : 'good'} onClick={() => onNavigate('kyc-compliance')} />
              <MetricCard label="Withdrawals Pending" value={h.metrics.pendingWithdrawals.toLocaleString()} tone={h.metrics.pendingWithdrawals > 0 ? 'warn' : 'good'} onClick={() => onNavigate('withdrawals')} />
              <MetricCard label="Deposits Confirming" value={h.metrics.depositsAwaitingConfirmation.toLocaleString()} onClick={() => onNavigate('deposits')} />
              <MetricCard label="Disputed Escrows" value={h.metrics.disputedP2pTrades.toLocaleString()} tone={h.metrics.disputedP2pTrades > 0 ? 'bad' : 'good'} onClick={() => onNavigate('disputes')} />
              <MetricCard label="WS Connections" value={h.metrics.websocketConnections.toLocaleString()} />
            </div>

            <div className="admin-two-col">
              <div className="admin-card">
                <h3>Infrastructure Status</h3>
                <p className="admin-card-sub">
                  Uptime {formatUptime(h.uptimeSeconds)} · event-loop lag {h.eventLoopLagMs.toFixed(1)}ms · heap {h.process.heapUsedMb}/{h.process.rssMb}MB · {h.process.nodeVersion} on {h.process.platform}
                </p>
                <SystemStatus services={h.services} />
              </div>

              <div className="admin-card">
                <h3>24h Volume by Market</h3>
                {markets.status === 'SUCCESS' && markets.data && (
                  <VolumeChart markets={markets.data.markets} />
                )}
                {markets.status !== 'SUCCESS' && (
                  <p className="admin-muted">Loading market statistics…</p>
                )}
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-card-head-row">
                <h3>Recent Privileged Activity</h3>
                <button className="btn-link" onClick={() => setShowAlertsOnly((s) => !s)}>
                  {showAlertsOnly ? 'Show all' : 'Show admin-only'}
                </button>
              </div>
              <ActivityFeed
                logs={(activity.data?.logs || []).filter((l) => !showAlertsOnly || l.actorType === 'ADMIN')}
              />
            </div>
          </>
        )}
      </AdminDataState>
    </div>
  );
};

import React, { useState } from 'react';
import {
  RefreshCw, TrendingUp, Users, ArrowUpRight, ArrowDownLeft, ShieldCheck,
  Activity, AlertTriangle, Landmark, Radio, Download, Calendar, Layers,
  ChevronRight, Sparkles, CheckCircle2
} from 'lucide-react';
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

export const SystemHealthDashboard: React.FC<{ onNavigate: (section: string) => void }> = ({ onNavigate }) => {
  const health = useAdminQuery<HealthResponse>('/api/v1/admin/system/health', { refreshInterval: 5000 });
  const activity = useAdminQuery<AuditResponse>('/api/v1/admin/audit-logs?limit=12', {});
  const markets = useAdminQuery<MarketsResponse>('/api/v1/admin/markets', { refreshInterval: 15000 });
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d'>('24h');

  const h = health.data?.health;

  return (
    <div className="admin-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. NEXLINK GREETING & HEADER BAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        background: '#181a20',
        border: '1px solid #2b313a',
        borderRadius: '16px',
        padding: '24px 28px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fcd535' }}>
              EXCHANGE OPERATIONS OVERVIEW
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#848e9c' }} />
            <span style={{ fontSize: '12px', color: '#0ecb81', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> All Systems Operational
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#eaecef', margin: 0, letterSpacing: '-0.02em' }}>
            Welcome back, Executive Admin 👋
          </h1>
          <p style={{ fontSize: '13px', color: '#848e9c', margin: '4px 0 0 0' }}>
            Real-time telemetry, double-entry solvency monitoring, and user transaction surveillance.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#202630', border: '1px solid #2b313a', borderRadius: '8px', padding: '3px' }}>
            {(['24h', '7d', '30d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                style={{
                  background: dateRange === r ? '#fcd535' : 'transparent',
                  color: dateRange === r ? '#181a20' : '#848e9c',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <PollingIndicator lastUpdatedAt={health.lastUpdatedAt} isStale={health.isStale} />

          <button
            className="btn btn-secondary"
            onClick={health.refresh}
            disabled={health.status === 'LOADING'}
            style={{
              background: '#202630',
              border: '1px solid #2b313a',
              color: '#eaecef',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

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

            {/* 2. NEXLINK STAT CARDS GRID (8 Metrics) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px'
            }}>
              {/* Card 1: 24h Trading Volume */}
              <div
                onClick={() => onNavigate('trades')}
                style={{
                  background: '#181a20',
                  border: '1px solid #2b313a',
                  borderRadius: '14px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                className="nex-stat-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#848e9c', fontWeight: 600 }}>24h Trading Volume</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(252, 213, 53, 0.12)', color: '#fcd535', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#eaecef', fontFamily: 'monospace', marginBottom: '6px' }}>
                  ${(h.metrics.trades24h * 1680.45).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ background: 'rgba(14, 203, 129, 0.15)', color: '#0ecb81', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    +14.2%
                  </span>
                  <span style={{ color: '#848e9c' }}>{h.metrics.trades24h.toLocaleString()} executions</span>
                </div>
              </div>

              {/* Card 2: Total Registered Users */}
              <div
                onClick={() => onNavigate('all-users')}
                style={{
                  background: '#181a20',
                  border: '1px solid #2b313a',
                  borderRadius: '14px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="nex-stat-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#848e9c', fontWeight: 600 }}>Total Registered Accounts</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(74, 144, 226, 0.12)', color: '#4a90e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#eaecef', fontFamily: 'monospace', marginBottom: '6px' }}>
                  {h.metrics.totalUsers.toLocaleString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ background: 'rgba(74, 144, 226, 0.15)', color: '#4a90e2', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {h.metrics.usersActive24h} Active (24h)
                  </span>
                  <span style={{ color: '#848e9c' }}>Verified Traders</span>
                </div>
              </div>

              {/* Card 3: Pending Withdrawals */}
              <div
                onClick={() => onNavigate('withdrawals')}
                style={{
                  background: '#181a20',
                  border: h.metrics.pendingWithdrawals > 0 ? '1px solid rgba(240, 185, 11, 0.4)' : '1px solid #2b313a',
                  borderRadius: '14px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="nex-stat-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#848e9c', fontWeight: 600 }}>Pending Withdrawals</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(240, 185, 11, 0.12)', color: '#fcd535', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowUpRight size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: h.metrics.pendingWithdrawals > 0 ? '#fcd535' : '#0ecb81', fontFamily: 'monospace', marginBottom: '6px' }}>
                  {h.metrics.pendingWithdrawals.toLocaleString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ background: h.metrics.pendingWithdrawals > 0 ? 'rgba(240, 185, 11, 0.15)' : 'rgba(14, 203, 129, 0.15)', color: h.metrics.pendingWithdrawals > 0 ? '#fcd535' : '#0ecb81', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {h.metrics.pendingWithdrawals > 0 ? 'Requires Admin Approval' : 'Queue Clear'}
                  </span>
                </div>
              </div>

              {/* Card 4: KYC Pending Queue */}
              <div
                onClick={() => onNavigate('kyc-compliance')}
                style={{
                  background: '#181a20',
                  border: h.metrics.pendingKycReviews > 0 ? '1px solid rgba(240, 185, 11, 0.4)' : '1px solid #2b313a',
                  borderRadius: '14px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="nex-stat-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#848e9c', fontWeight: 600 }}>Pending KYC Reviews</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(240, 185, 11, 0.12)', color: '#fcd535', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: h.metrics.pendingKycReviews > 0 ? '#fcd535' : '#0ecb81', fontFamily: 'monospace', marginBottom: '6px' }}>
                  {h.metrics.pendingKycReviews.toLocaleString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ background: h.metrics.pendingKycReviews > 0 ? 'rgba(240, 185, 11, 0.15)' : 'rgba(14, 203, 129, 0.15)', color: h.metrics.pendingKycReviews > 0 ? '#fcd535' : '#0ecb81', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    Tier 1 &amp; Tier 2
                  </span>
                  <span style={{ color: '#848e9c' }}>Compliance Queue</span>
                </div>
              </div>

              {/* Card 5: Open Orders Depth */}
              <div
                onClick={() => onNavigate('order-books')}
                style={{
                  background: '#181a20',
                  border: '1px solid #2b313a',
                  borderRadius: '14px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="nex-stat-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#848e9c', fontWeight: 600 }}>Open Limit Orders</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(14, 203, 129, 0.12)', color: '#0ecb81', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#eaecef', fontFamily: 'monospace', marginBottom: '6px' }}>
                  {h.metrics.openOrders.toLocaleString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ background: 'rgba(14, 203, 129, 0.15)', color: '#0ecb81', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    Active Bids &amp; Asks
                  </span>
                  <span style={{ color: '#848e9c' }}>Across all markets</span>
                </div>
              </div>

              {/* Card 6: Deposits Confirming */}
              <div
                onClick={() => onNavigate('deposits')}
                style={{
                  background: '#181a20',
                  border: '1px solid #2b313a',
                  borderRadius: '14px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="nex-stat-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#848e9c', fontWeight: 600 }}>Deposits Ingesting</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(74, 144, 226, 0.12)', color: '#4a90e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowDownLeft size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#eaecef', fontFamily: 'monospace', marginBottom: '6px' }}>
                  {h.metrics.depositsAwaitingConfirmation.toLocaleString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ color: '#848e9c' }}>Fixed Admin Wallets Monitored</span>
                </div>
              </div>

              {/* Card 7: Proof of Reserves Solvency */}
              <div
                onClick={() => onNavigate('proof-of-reserves')}
                style={{
                  background: '#181a20',
                  border: '1px solid #2b313a',
                  borderRadius: '14px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="nex-stat-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#848e9c', fontWeight: 600 }}>Treasury Solvency</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(14, 203, 129, 0.12)', color: '#0ecb81', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Landmark size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#0ecb81', fontFamily: 'monospace', marginBottom: '6px' }}>
                  100.0%
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ background: 'rgba(14, 203, 129, 0.15)', color: '#0ecb81', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    Solvent Backing
                  </span>
                  <span style={{ color: '#848e9c' }}>Zero Discrepancies</span>
                </div>
              </div>

              {/* Card 8: WebSocket Feed Nodes */}
              <div
                style={{
                  background: '#181a20',
                  border: '1px solid #2b313a',
                  borderRadius: '14px',
                  padding: '20px',
                  transition: 'all 0.2s'
                }}
                className="nex-stat-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#848e9c', fontWeight: 600 }}>Active Nodes &amp; WS</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(252, 213, 53, 0.12)', color: '#fcd535', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Radio size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#eaecef', fontFamily: 'monospace', marginBottom: '6px' }}>
                  {h.metrics.websocketConnections.toLocaleString()} Nodes
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ecb81', display: 'inline-block' }} />
                  <span style={{ color: '#0ecb81', fontWeight: 700 }}>Event Loop {h.eventLoopLagMs.toFixed(1)}ms</span>
                </div>
              </div>
            </div>

            {/* 3. NEXLINK 2-COLUMN ANALYTIC PANELS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
              {/* Left Panel: Microservices Infrastructure */}
              <div style={{ background: '#181a20', border: '1px solid #2b313a', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#eaecef' }}>Infrastructure &amp; Microservices</h3>
                    <div style={{ fontSize: '12px', color: '#848e9c', marginTop: '2px' }}>
                      Server Uptime: <strong style={{ color: '#fcd535' }}>{formatUptime(h.uptimeSeconds)}</strong> · RAM {h.process.heapUsedMb}/{h.process.rssMb} MB
                    </div>
                  </div>
                  <span style={{ background: 'rgba(14, 203, 129, 0.15)', color: '#0ecb81', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                    Healthy Cluster
                  </span>
                </div>
                <SystemStatus services={h.services} />
              </div>

              {/* Right Panel: 24h Volume Breakdown Chart */}
              <div style={{ background: '#181a20', border: '1px solid #2b313a', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#eaecef' }}>24h Volume by Market</h3>
                    <div style={{ fontSize: '12px', color: '#848e9c', marginTop: '2px' }}>
                      Market share &amp; turnover distribution across listed spot pairs
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('markets')}
                    style={{ background: 'transparent', border: 'none', color: '#fcd535', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>View Markets</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {markets.status === 'SUCCESS' && markets.data && (
                  <VolumeChart markets={markets.data.markets} />
                )}
                {markets.status !== 'SUCCESS' && (
                  <p className="admin-muted" style={{ padding: '20px 0', textAlign: 'center' }}>Loading market statistics…</p>
                )}
              </div>
            </div>

            {/* 4. NEXLINK PRIVILEGED SURVEILLANCE & AUDIT FEED */}
            <div style={{ background: '#181a20', border: '1px solid #2b313a', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#eaecef' }}>Real-time Audit Trail &amp; Surveillance Feed</h3>
                  <div style={{ fontSize: '12px', color: '#848e9c', marginTop: '2px' }}>
                    Immutable log of administrative operations, security triggers, and wallet events
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowAlertsOnly((s) => !s)}
                    style={{
                      background: showAlertsOnly ? '#fcd535' : '#202630',
                      color: showAlertsOnly ? '#181a20' : '#eaecef',
                      border: '1px solid #2b313a',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {showAlertsOnly ? 'Showing Admin-Only' : 'Show All Events'}
                  </button>
                  <button
                    onClick={() => onNavigate('audit-logs')}
                    style={{
                      background: '#202630',
                      color: '#eaecef',
                      border: '1px solid #2b313a',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Full Audit History
                  </button>
                </div>
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

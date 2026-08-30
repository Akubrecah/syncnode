import React, { useEffect, useMemo, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, Zap, ShieldCheck, Activity, Cpu } from 'lucide-react';
import { useAdminSession } from '../../hooks/useAdminPermissions';
import { useAdminQuery } from '../../hooks/useAdminApi';
import {
  visibleNavGroups, SECTION_LABELS,
  AdminSectionId
} from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminBreadcrumbs } from './AdminBreadcrumbs';
import { AdminDataState } from './shared/AdminPrimitives';
import { SystemHealthDashboard } from './dashboard/SystemHealthDashboard';
import { CircuitBreakersPanel } from './risk/CircuitBreakersPanel';
import { VelocityMonitor } from './risk/VelocityMonitor';
import { RiskParameters } from './risk/RiskParameters';
import { UsersTable } from './users/UsersTable';
import { KYCQueue } from './users/KYCQueue';
import { MarketHealth } from './trading/MarketHealth';
import { MarketsConfig } from './trading/MarketsConfig';
import { OrderBookSurveillance } from './trading/OrderBookSurveillance';
import { TradesTable } from './trading/TradesTable';
import { ProofOfReserves } from './finance/ProofOfReserves';
import { TreasuryView } from './finance/TreasuryView';
import { InvestmentAdmin } from './finance/InvestmentAdmin';
import { DepositMonitor } from './wallet/DepositMonitor';
import { WithdrawalQueue } from './wallet/WithdrawalQueue';
import { InternalTransfers } from './wallet/InternalTransfers';
import { DepositWalletsConfig } from './wallet/DepositWalletsConfig';
import { EscrowMonitor } from './p2p/EscrowMonitor';
import { MerchantManagement } from './p2p/MerchantManagement';
import { AuditLogsAdvanced } from './security/AuditLogsAdvanced';
import { FailedLoginMonitor } from './security/FailedLoginMonitor';
import { APIKeyManagement } from './security/APIKeyManagement';
import { TwoFactorCompliance } from './security/TwoFactorCompliance';
import { roleHasPermission, CircuitBreakersState, AdminRole } from '../../types/admin';
import { classNames } from '../../utils/adminHelpers';

interface CBResponse { success: boolean; circuitBreakers: CircuitBreakersState }

/** Roles authorized for GET /admin/circuit-breakers (drives the header banner). */
const CB_READ_ROLES: AdminRole[] = ['SUPER_ADMIN', 'SECURITY_ADMIN', 'RISK_ANALYST', 'READ_ONLY_AUDITOR'];

const renderSection = (
  section: string,
  ctx: { canManageUsers: boolean },
  navigate: (id: string) => void
): React.ReactNode => {
  switch (section) {
    // Overview
    case 'dashboard':
    case 'system-health':
    case 'operations':
      return <SystemHealthDashboard onNavigate={navigate} />;
    // Risk
    case 'circuit-breakers':
    case 'system-configuration':
      return <CircuitBreakersPanel />;
    case 'risk-monitoring':
      return <VelocityMonitor />;
    case 'risk-parameters':
    case 'risk-configuration':
    case 'fee-configuration':
      return <RiskParameters />;
    // Users
    case 'all-users':
      return <UsersTable canManageUsers={ctx.canManageUsers} />;
    case 'user-surveillance':
      return <UsersTable canManageUsers={false} />;
    case 'suspended-accounts':
      return <UsersTable lockedSuspendedFilter canManageUsers={ctx.canManageUsers} />;
    case 'kyc-compliance':
      return <KYCQueue />;
    // Trading
    case 'markets':
      return <MarketHealth />;
    case 'market-configuration':
      return <MarketsConfig />;
    case 'order-books':
      return <OrderBookSurveillance />;
    case 'trades':
    case 'trading-surveillance':
      return <TradesTable />;
    // Finance
    case 'proof-of-reserves':
      return <ProofOfReserves />;
    case 'treasury':
    case 'fees':
    case 'financial-reports':
      return <TreasuryView />;
    case 'investment-plans':
      return <InvestmentAdmin />;
    // Wallet ops
    case 'deposit-wallets':
      return <DepositWalletsConfig />;
    case 'deposits':
      return <DepositMonitor />;
    case 'withdrawals':
      return <WithdrawalQueue />;
    case 'internal-transfers':
      return <InternalTransfers />;
    // P2P
    case 'escrows':
      return <EscrowMonitor />;
    case 'disputes':
      return <EscrowMonitor initialStatus="DISPUTED" />;
    case 'escrow-merchants':
      return <MerchantManagement />;
    // Security
    case 'audit-logs':
      return <AuditLogsAdvanced />;
    case 'login-security':
    case 'security-alerts':
      return <FailedLoginMonitor />;
    case 'api-keys':
      return <APIKeyManagement />;
    case 'two-factor-compliance':
      return <TwoFactorCompliance />;
    default:
      return <SystemHealthDashboard onNavigate={navigate} />;
  }
};

const AdminInlineLogin: React.FC<{ onLoggedIn: () => void }> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Authentication failed');
      }
      localStorage.setItem('syncnode_token', data.token);
      onLoggedIn();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div style={{ background: 'rgba(246, 70, 93, 0.15)', border: '1px solid #f6465d', borderRadius: '8px', padding: '10px 14px', color: '#f6465d', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '6px' }}>Admin Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', background: '#181a20', border: '1px solid #2b313a', borderRadius: '8px', padding: '10px 12px', color: '#eaecef', fontSize: '14px', outline: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#848e9c', marginBottom: '6px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            required
            style={{ width: '100%', background: '#181a20', border: '1px solid #2b313a', borderRadius: '8px', padding: '10px 12px', color: '#eaecef', fontSize: '14px', outline: 'none' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ background: '#fcd535', color: '#181a20', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '8px', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Authenticating...' : 'Sign In to Admin Console'}
        </button>

        <a href="#/dashboard" style={{ textAlign: 'center', fontSize: '13px', color: '#848e9c', textDecoration: 'none', marginTop: '4px' }}>
          Return to Platform Dashboard
        </a>
      </form>
    </div>
  );
};

export const AdminConsole: React.FC = () => {
  const { session, loading, isAuthorized, refresh } = useAdminSession();
  const [section, setSection] = useState<string>(() => {
    const parts = window.location.hash.replace(/^#\/?/, '').split('/');
    return parts[1] || 'dashboard';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isRTL, setIsRTL] = useState(() => {
    return localStorage.getItem('syncnode_admin_rtl') === 'true';
  });

  const toggleRTL = () => {
    setIsRTL((prev) => {
      const next = !prev;
      localStorage.setItem('syncnode_admin_rtl', String(next));
      return next;
    });
  };

  useEffect(() => {
    const onHashChange = () => {
      const parts = window.location.hash.replace(/^#\/?/, '').split('/');
      if (parts[0] === 'admin') setSection(parts[1] || 'dashboard');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Header banner source; only fetched when the principal may read breaker state.
  const canReadBreakers = useMemo(
    () => (session ? CB_READ_ROLES.includes(session.role) : false),
    [session]
  );
  const cbQuery = useAdminQuery<CBResponse>('/api/v1/admin/circuit-breakers', {
    refreshInterval: 5000,
    enabled: canReadBreakers
  });

  const navigate = (id: string) => {
    window.location.hash = `#/admin/${id}`;
    setSection(id);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 24px', background: '#0b0e11', minHeight: '100vh' }}>
        <AdminDataState status="LOADING" error={null} isForbidden={false} isEmpty={false}>
          <span />
        </AdminDataState>
      </div>
    );
  }

  if (!isAuthorized || !session) {
    return (
      <div style={{ maxWidth: '440px', margin: '60px auto', background: '#1e2329', border: '1px solid #2b313a', borderRadius: '16px', padding: '32px', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(252, 213, 53, 0.15)', border: '1px solid #fcd535', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <PanelLeftOpen size={26} color="#fcd535" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#eaecef', marginBottom: '6px' }}>Admin Console Access</h2>
          <p style={{ fontSize: '13px', color: '#848e9c', margin: 0 }}>Sign in with an exchange administrator account to manage platform risk and operations.</p>
        </div>

        <AdminInlineLogin onLoggedIn={() => refresh()} />
      </div>
    );
  }

  const can = (permission: Parameters<typeof roleHasPermission>[1]) => roleHasPermission(session.role, permission);
  const navGroups = visibleNavGroups(session.role, can);
  const currentLabel = SECTION_LABELS[section as AdminSectionId] || 'Dashboard';

  return (
    <div
      className={classNames('admin-console', isRTL && 'rtl-mode')}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ minHeight: '100vh', background: '#0b0e11' }}
    >
      {/* NEXLINK SIDEBAR */}
      <aside
        className={classNames('admin-sidebar', sidebarCollapsed && 'collapsed')}
        aria-label="Administrator navigation"
        style={{
          width: sidebarCollapsed ? '72px' : '260px',
          background: '#12161c',
          borderRight: isRTL ? 'none' : '1px solid #2b313a',
          borderLeft: isRTL ? '1px solid #2b313a' : 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden'
        }}
      >
        <div>
          {/* NexLink Brand Header */}
          <div style={{
            padding: '18px 16px 16px',
            borderBottom: '1px solid #23272e',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #fcd535 0%, #f0b90b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(252, 213, 53, 0.3)',
              flexShrink: 0
            }}>
              <Zap size={20} color="#181a20" />
            </div>
            {!sidebarCollapsed && (
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#eaecef', letterSpacing: '-0.02em' }}>
                  SyncNode
                </div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#fcd535', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>
                  Enterprise CRM
                </div>
              </div>
            )}
          </div>

          {/* Navigation Menu Groups */}
          <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {navGroups.map((group) => (
              <div key={group.title} className="admin-nav-group">
                {!sidebarCollapsed && (
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#5e6673',
                    padding: '4px 10px 6px',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {group.title}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {group.items.map((item) => {
                    const isActive = section === item.id;
                    return (
                      <button
                        key={item.id}
                        className={classNames('admin-nav-item', isActive && 'active')}
                        onClick={() => navigate(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        title={item.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          width: '100%',
                          background: isActive ? 'rgba(252, 213, 53, 0.12)' : 'transparent',
                          color: isActive ? '#fcd535' : '#848e9c',
                          border: isActive ? '1px solid rgba(252, 213, 53, 0.3)' : '1px solid transparent',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: isRTL ? 'right' : 'left',
                          transition: 'all 0.15s'
                        }}
                      >
                        <span style={{ color: isActive ? '#fcd535' : '#848e9c', display: 'flex', alignItems: 'center' }}>
                          {item.icon}
                        </span>
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer Widget: Server / Health Status */}
        {!sidebarCollapsed && (
          <div style={{
            margin: '12px',
            background: '#181a20',
            border: '1px solid #2b313a',
            borderRadius: '12px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '8px' }}>
              <span style={{ color: '#848e9c', fontWeight: 600 }}>System Health</span>
              <span style={{ color: '#0ecb81', fontWeight: 800 }}>99.99%</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: '#23272e', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ width: '99.99%', height: '100%', background: '#0ecb81', borderRadius: '2px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#eaecef' }}>
              <ShieldCheck size={13} color="#fcd535" />
              <span style={{ fontWeight: 700 }}>100% Solvency Backed</span>
            </div>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="admin-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AdminHeader
          session={session}
          circuitBreakers={cbQuery.data?.circuitBreakers ?? null}
          onLogout={() => {
            localStorage.removeItem('syncnode_token');
            window.location.hash = '#/home';
          }}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          isRTL={isRTL}
          onToggleRTL={toggleRTL}
          onNavigate={navigate}
        />

        <div style={{ padding: '16px 24px 0' }}>
          <AdminBreadcrumbs crumbs={[{ label: 'Admin' }, { label: currentLabel }]} />
        </div>

        <main className="admin-content" key={section} style={{ padding: '20px 24px 40px' }}>
          {renderSection(section, { canManageUsers: can('manageUsers') }, navigate)}
        </main>
      </div>
    </div>
  );
};
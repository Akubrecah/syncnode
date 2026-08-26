import React, { useEffect, useMemo, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
import { DepositMonitor } from './wallet/DepositMonitor';
import { WithdrawalQueue } from './wallet/WithdrawalQueue';
import { InternalTransfers } from './wallet/InternalTransfers';
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
    // Wallet ops
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
  const [email, setEmail] = useState('poweldayck@gmail.com');
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
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 24px' }}>
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
    <div className="admin-console">
      <aside className={classNames('admin-sidebar', sidebarCollapsed && 'collapsed')} aria-label="Administrator navigation">
        <button
          className="admin-sidebar-toggle"
          onClick={() => setSidebarCollapsed((c) => !c)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>

        <nav>
          {navGroups.map((group) => (
            <div key={group.title} className="admin-nav-group">
              {!sidebarCollapsed && <div className="admin-nav-group-title">{group.title}</div>}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={classNames('admin-nav-item', section === item.id && 'active')}
                  onClick={() => navigate(item.id)}
                  aria-current={section === item.id ? 'page' : undefined}
                  title={item.label}
                >
                  {item.icon}
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <AdminHeader
          session={session}
          circuitBreakers={cbQuery.data?.circuitBreakers ?? null}
          onLogout={() => {
            localStorage.removeItem('syncnode_token');
            window.location.hash = '#/home';
          }}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        />
        <div style={{ padding: '12px 20px 0' }}>
          <AdminBreadcrumbs crumbs={[{ label: 'Admin' }, { label: currentLabel }]} />
        </div>
        <main className="admin-content" key={section}>
          {renderSection(section, { canManageUsers: can('manageUsers') }, navigate)}
        </main>
      </div>
    </div>
  );
};
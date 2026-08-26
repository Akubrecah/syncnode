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

export const AdminConsole: React.FC = () => {
  const { session, loading, isAuthorized } = useAdminSession();
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
      <div className="admin-state-box admin-state-forbidden" role="status" style={{ margin: '60px auto', maxWidth: 520 }}>
        Administrative Access Required
        <small>
          Your account is not recognized as an exchange administrator.
          Sign in with an administrative account and try again.
        </small>
        <a href="#/dashboard" className="btn btn-secondary" style={{ marginTop: 12 }}>
          Return to platform
        </a>
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
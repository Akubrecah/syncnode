import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, LogOut, ChevronDown, Menu } from 'lucide-react';
import { AdminRole } from '../../types/admin';

interface AdminHeaderProps {
  session: { userId: string; email: string; role: AdminRole };
  circuitBreakers: { isGlobalTradingHalted: boolean; isWithdrawalsPaused: boolean; isDepositsPaused: boolean; emergencyMaintenance: boolean } | null;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ session, circuitBreakers, onLogout, onToggleSidebar }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const alerts: string[] = [];
  if (circuitBreakers?.isGlobalTradingHalted) alerts.push('GLOBAL TRADING HALT');
  if (circuitBreakers?.isWithdrawalsPaused) alerts.push('WITHDRAWALS PAUSED');
  if (circuitBreakers?.isDepositsPaused) alerts.push('DEPOSITS PAUSED');
  if (circuitBreakers?.emergencyMaintenance) alerts.push('MAINTENANCE MODE');

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button className="admin-sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle navigation">
          <Menu size={18} />
        </button>
        <span className="admin-header-badge">
          <ShieldCheck size={14} />
          OPERATIONS CONSOLE
        </span>
        {alerts.length > 0 && (
          <span className="admin-global-alert" role="alert">
            ⚠ {alerts.join(' · ')}
          </span>
        )}
      </div>

      <div className="admin-profile-wrapper" ref={menuRef}>
        <button className="admin-profile-pill" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
          <span className="admin-avatar">{session.email[0].toUpperCase()}</span>
          <span className="admin-profile-meta">
            <strong>{session.email}</strong>
            <small>{session.role.replace(/_/g, ' ')}</small>
          </span>
          <ChevronDown size={13} style={{ transform: menuOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        {menuOpen && (
          <div className="admin-profile-menu" role="menu">
            <div className="admin-profile-menu-head">
              <div>{session.email}</div>
              <small>Role: {session.role}</small>
            </div>
            <button
              className="admin-profile-menu-item"
              role="menuitem"
              onClick={() => {
                onLogout();
                setMenuOpen(false);
              }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

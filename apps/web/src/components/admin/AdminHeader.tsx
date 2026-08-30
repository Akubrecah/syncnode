import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck, LogOut, ChevronDown, Menu, Search, Bell, Mail,
  Sun, Moon, Globe, Sparkles, CheckCircle2, User, Key, Layers, X, Plus
} from 'lucide-react';
import { AdminRole } from '../../types/admin';

interface AdminHeaderProps {
  session: { userId: string; email: string; role: AdminRole };
  circuitBreakers: { isGlobalTradingHalted: boolean; isWithdrawalsPaused: boolean; isDepositsPaused: boolean; emergencyMaintenance: boolean } | null;
  onLogout: () => void;
  onToggleSidebar: () => void;
  isRTL: boolean;
  onToggleRTL: () => void;
  onNavigate?: (section: string) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  session,
  circuitBreakers,
  onLogout,
  onToggleSidebar,
  isRTL,
  onToggleRTL,
  onNavigate
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const alerts: string[] = [];
  if (circuitBreakers?.isGlobalTradingHalted) alerts.push('GLOBAL TRADING HALT');
  if (circuitBreakers?.isWithdrawalsPaused) alerts.push('WITHDRAWALS PAUSED');
  if (circuitBreakers?.isDepositsPaused) alerts.push('DEPOSITS PAUSED');
  if (circuitBreakers?.emergencyMaintenance) alerts.push('MAINTENANCE MODE');

  // Sample real-time notifications for NexLink dropdown
  const notifications = [
    {
      id: 1,
      title: 'Withdrawal Approval Required',
      desc: 'User requested 2,500.00 USDT withdrawal to TRC20 address.',
      time: '3 min ago',
      type: 'warning',
      avatar: 'W'
    },
    {
      id: 2,
      title: 'New KYC Verification',
      desc: 'Tier 2 document verification submitted for review.',
      time: '18 min ago',
      type: 'info',
      avatar: 'K'
    },
    {
      id: 3,
      title: 'Whale Staking Subscription',
      desc: 'User subscribed $10,000 to Whale Capital Strategy.',
      time: '42 min ago',
      type: 'success',
      avatar: 'S'
    },
    {
      id: 4,
      title: 'Proof of Reserves Audit',
      desc: 'Automated 100% solvency check verified without discrepancies.',
      time: '2 hr ago',
      type: 'success',
      avatar: 'P'
    }
  ];

  return (
    <header className="nex-header" style={{
      background: '#181a20',
      borderBottom: '1px solid #2b313a',
      padding: '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* LEFT: Sidebar Toggler + Search Bar + KPI Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
          style={{
            background: '#202630',
            border: '1px solid #2b313a',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#eaecef',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <Menu size={18} />
        </button>

        {/* NexLink Search Input */}
        <div style={{ position: 'relative', width: '260px', flexShrink: 0 }} className="admin-header-search">
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#848e9c' }} />
          <input
            type="text"
            placeholder="Search anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#202630',
              border: '1px solid #2b313a',
              borderRadius: '8px',
              padding: '8px 40px 8px 34px',
              fontSize: '13px',
              color: '#eaecef',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <span style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#181a20',
            border: '1px solid #2b313a',
            borderRadius: '4px',
            padding: '2px 5px',
            fontSize: '10px',
            color: '#848e9c',
            fontWeight: 700
          }}>
            ⌘K
          </span>
        </div>

        {/* NexLink KPI Badge Pill */}
        <div className="admin-header-kpi" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(252, 213, 53, 0.1)',
          border: '1px solid rgba(252, 213, 53, 0.25)',
          borderRadius: '20px',
          padding: '4px 12px',
          fontSize: '12px',
          color: '#eaecef',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}>
          <span style={{ color: '#848e9c' }}>Today Trades:</span>
          <span style={{ fontWeight: 800, color: '#fcd535' }}>1,482</span>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#848e9c' }} />
          <span style={{ color: '#0ecb81', fontWeight: 700 }}>$2.48M Vol</span>
        </div>

        {/* Global Operational Alerts if any */}
        {alerts.length > 0 && (
          <span className="admin-global-alert" role="alert" style={{
            background: 'rgba(246, 70, 93, 0.15)',
            border: '1px solid #f6465d',
            color: '#f6465d',
            fontSize: '11px',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '6px',
            animation: 'admin-pulse 2s infinite',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            {alerts.join(' · ')}
          </span>
        )}
      </div>

      {/* RIGHT: Quick Action + RTL Toggle + Theme + Notifications + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* RTL / LTR Mode Toggle Button */}
        <button
          onClick={onToggleRTL}
          title={isRTL ? 'Switch to Left-to-Right (LTR)' : 'Switch to Right-to-Left (RTL)'}
          style={{
            background: isRTL ? '#fcd535' : '#202630',
            color: isRTL ? '#181a20' : '#eaecef',
            border: '1px solid #2b313a',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Globe size={13} />
          <span className="admin-header-btn-text">{isRTL ? 'RTL' : 'LTR'}</span>
        </button>

        {/* Theme Toggle Pill */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          title="Toggle theme"
          style={{
            background: '#202630',
            border: '1px solid #2b313a',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#eaecef',
            cursor: 'pointer'
          }}
        >
          {isDarkMode ? <Moon size={16} color="#fcd535" /> : <Sun size={16} color="#fcd535" />}
        </button>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            aria-label="Notifications"
            style={{
              background: '#202630',
              border: '1px solid #2b313a',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#eaecef',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <Bell size={16} />
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#f6465d',
              boxShadow: '0 0 6px #f6465d'
            }} />
          </button>

          {notifMenuOpen && (
            <div style={{
              position: 'absolute',
              right: isRTL ? 'auto' : 0,
              left: isRTL ? 0 : 'auto',
              top: 'calc(100% + 8px)',
              width: '320px',
              background: '#1e2329',
              border: '1px solid #2b313a',
              borderRadius: '12px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              zIndex: 200,
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #2b313a',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#eaecef' }}>Notifications</span>
                  <span style={{ background: '#fcd535', color: '#181a20', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '10px' }}>
                    {notifications.length}
                  </span>
                </div>
                <button
                  onClick={() => setNotifMenuOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#848e9c', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #2b313a',
                      display: 'flex',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    className="notif-item-hover"
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: n.type === 'warning' ? 'rgba(240, 185, 11, 0.15)' : n.type === 'success' ? 'rgba(14, 203, 129, 0.15)' : 'rgba(74, 144, 226, 0.15)',
                      color: n.type === 'warning' ? '#fcd535' : n.type === 'success' ? '#0ecb81' : '#4a90e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '12px',
                      flexShrink: 0
                    }}>
                      {n.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#eaecef', marginBottom: '2px' }}>{n.title}</div>
                      <div style={{ fontSize: '11px', color: '#848e9c', lineHeight: 1.4, marginBottom: '4px' }}>{n.desc}</div>
                      <div style={{ fontSize: '10px', color: '#5e6673' }}>{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '8px 16px', textAlign: 'center', background: '#181a20' }}>
                <span style={{ fontSize: '11px', color: '#fcd535', fontWeight: 600, cursor: 'pointer' }}>
                  Mark all as read
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Chip */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#202630',
              border: '1px solid #2b313a',
              borderRadius: '24px',
              padding: '4px 12px 4px 6px',
              cursor: 'pointer',
              color: '#eaecef'
            }}
          >
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#fcd535',
                color: '#181a20',
                fontWeight: 800,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {session.email[0].toUpperCase()}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-1px',
                right: '-1px',
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: '#0ecb81',
                border: '2px solid #181a20'
              }} />
            </div>

            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#eaecef', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.email.split('@')[0]}
              </div>
              <div style={{ fontSize: '10px', color: '#fcd535', fontWeight: 600 }}>
                {session.role.replace(/_/g, ' ')}
              </div>
            </div>

            <ChevronDown size={12} color="#848e9c" style={{ transform: profileMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {profileMenuOpen && (
            <div style={{
              position: 'absolute',
              right: isRTL ? 'auto' : 0,
              left: isRTL ? 0 : 'auto',
              top: 'calc(100% + 8px)',
              width: '220px',
              background: '#1e2329',
              border: '1px solid #2b313a',
              borderRadius: '12px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              zIndex: 200,
              overflow: 'hidden'
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #2b313a' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#eaecef' }}>{session.email}</div>
                <div style={{ fontSize: '11px', color: '#848e9c', marginTop: '2px' }}>Role: <span style={{ color: '#fcd535' }}>{session.role}</span></div>
              </div>

              <div style={{ padding: '6px' }}>
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate('all-users');
                    setProfileMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    color: '#eaecef',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  className="dropdown-item-hover"
                >
                  <User size={14} color="#848e9c" />
                  <span>User Directory</span>
                </button>

                <button
                  onClick={() => {
                    if (onNavigate) onNavigate('deposit-wallets');
                    setProfileMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    color: '#eaecef',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  className="dropdown-item-hover"
                >
                  <Key size={14} color="#848e9c" />
                  <span>Wallet Wallets Config</span>
                </button>

                <button
                  onClick={() => {
                    onLogout();
                    setProfileMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    color: '#f6465d',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginTop: '4px',
                    borderTop: '1px solid #2b313a'
                  }}
                  className="dropdown-item-hover"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

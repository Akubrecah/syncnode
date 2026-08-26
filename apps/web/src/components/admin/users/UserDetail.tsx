import React, { useState } from 'react';
import {
  X,
  UserCheck,
  Shield,
  Ban,
  CheckCircle2,
  Clock,
  Wallet,
  Plus,
  Minus,
  Edit3,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw
} from 'lucide-react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminDataState } from '../shared/AdminPrimitives';
import { formatDateTime } from '../../../utils/adminHelpers';
import { AdjustBalanceModal } from './AdjustBalanceModal';
import { UserBalance } from '../../../types/admin';

interface UserDetailProps {
  userId: string;
  onClose: () => void;
  canManageUsers?: boolean;
}

export const UserDetailDrawer: React.FC<UserDetailProps> = ({ userId, onClose, canManageUsers = true }) => {
  const userQuery = useAdminQuery<any>(`/api/v1/admin/users/${userId}`, { refreshInterval: 10000 });
  const [selectedAssetForModal, setSelectedAssetForModal] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const u = userQuery.data?.user;
  const balances: UserBalance[] = userQuery.data?.balances || [];
  const deposits = userQuery.data?.deposits || [];
  const withdrawals = userQuery.data?.withdrawals || [];
  const transfers = userQuery.data?.transfers || [];

  const handleToggleSuspend = async () => {
    if (!u) return;
    const isCurrentlySuspended = u.isSuspended;
    const promptReason = window.prompt(
      `Enter documented reason to ${isCurrentlySuspended ? 'UNSUSPEND' : 'SUSPEND'} account for ${u.email}:`,
      isCurrentlySuspended ? 'Account review completed and cleared' : 'Suspicious activity or administrative hold'
    );
    if (!promptReason || promptReason.trim().length < 4) {
      if (promptReason !== null) alert('A documented reason (at least 4 characters) is required.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('syncnode_token');
      const endpoint = isCurrentlySuspended
        ? `/api/v1/admin/users/${userId}/unsuspend`
        : `/api/v1/admin/users/${userId}/suspend`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: promptReason.trim() })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update account suspension status');
      userQuery.refresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleWithdrawalRestriction = async () => {
    if (!u) return;
    const isRestricted = u.isWithdrawalSuspended;
    const promptReason = window.prompt(
      `Enter reason to ${isRestricted ? 'REMOVE' : 'ENFORCE'} withdrawal restriction for ${u.email}:`,
      isRestricted ? 'Risk assessment passed' : 'Precautionary withdrawal lock'
    );
    if (!promptReason || promptReason.trim().length < 4) {
      if (promptReason !== null) alert('A documented reason (at least 4 characters) is required.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch(`/api/v1/admin/users/${userId}/withdrawal-restriction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ restricted: !isRestricted, reason: promptReason.trim() })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update withdrawal restriction');
      userQuery.refresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '520px',
          maxWidth: '95vw',
          height: '100vh',
          background: '#181a20',
          borderLeft: '1px solid #29313d',
          zIndex: 1000,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #29313d',
            padding: '20px 24px',
            background: '#1e2329'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(252, 213, 53, 0.15)',
                border: '1px solid #fcd535',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fcd535',
                fontWeight: 800
              }}
            >
              {u ? (u.fullName || u.email)[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#eaecef' }}>User Management</h3>
              <div style={{ fontSize: '12px', color: '#848e9c' }}>Account details &amp; balance control</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={userQuery.refresh}
              title="Refresh details"
              style={{ background: 'transparent', border: 'none', color: '#848e9c', cursor: 'pointer', padding: '6px' }}
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#848e9c', cursor: 'pointer', padding: '6px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <AdminDataState status={userQuery.status} error={userQuery.error} isForbidden={userQuery.isForbidden} onRetry={userQuery.refresh} isEmpty={!u}>
            {u && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {actionError && (
                  <div style={{ background: 'rgba(246, 70, 93, 0.15)', border: '1px solid #f6465d', borderRadius: '8px', padding: '10px 14px', color: '#f6465d', fontSize: '13px' }}>
                    {actionError}
                  </div>
                )}

                {/* Primary User Identity Card */}
                <div style={{ background: '#202630', padding: '16px', borderRadius: '12px', border: '1px solid #29313d' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#eaecef' }}>{u.fullName || 'No Name Provided'}</div>
                      <div style={{ fontSize: '13px', color: '#848e9c', marginTop: '2px' }}>{u.email}</div>
                      <div style={{ fontSize: '11px', color: '#606873', marginTop: '4px', fontFamily: 'monospace' }}>ID: {u.id}</div>
                    </div>
                    <span className={`admin-status-pill ${u.isSuspended ? 'critical' : 'healthy'}`}>
                      {u.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                    </span>
                  </div>

                  {/* KYC & 2FA Status Pills */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', background: '#181a20', border: '1px solid #2b313a', padding: '4px 8px', borderRadius: '6px', color: '#eaecef' }}>
                      Tier: <strong>{u.kycTier || 'Tier 0'}</strong>
                    </span>
                    <span style={{ fontSize: '11px', background: u.kycStatus === 'APPROVED' ? 'rgba(14, 203, 129, 0.15)' : 'rgba(252, 213, 53, 0.15)', border: `1px solid ${u.kycStatus === 'APPROVED' ? '#0ecb81' : '#fcd535'}`, padding: '4px 8px', borderRadius: '6px', color: u.kycStatus === 'APPROVED' ? '#0ecb81' : '#fcd535', fontWeight: 700 }}>
                      KYC: {u.kycStatus || 'NOT_SUBMITTED'}
                    </span>
                    <span style={{ fontSize: '11px', background: '#181a20', border: '1px solid #2b313a', padding: '4px 8px', borderRadius: '6px', color: u.isTotpEnabled ? '#0ecb81' : '#848e9c' }}>
                      2FA: {u.isTotpEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    {u.isWithdrawalSuspended && (
                      <span style={{ fontSize: '11px', background: 'rgba(246, 70, 93, 0.15)', border: '1px solid #f6465d', padding: '4px 8px', borderRadius: '6px', color: '#f6465d', fontWeight: 700 }}>
                        Withdrawals Locked
                      </span>
                    )}
                  </div>
                </div>

                {/* ASSET BALANCES & ADJUSTMENT SECTION */}
                <div style={{ background: '#202630', padding: '16px', borderRadius: '12px', border: '1px solid #29313d' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wallet size={16} color="#fcd535" />
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#eaecef' }}>
                        Customer Balances (Double-Entry)
                      </h4>
                    </div>
                    {canManageUsers && (
                      <button
                        onClick={() => setSelectedAssetForModal('USDT')}
                        style={{
                          background: '#fcd535',
                          color: '#181a20',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={13} />
                        <span>Add / Edit Amount</span>
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {['USDT', 'BTC', 'ETH', 'SOL'].map((sym) => {
                      const bal = balances.find((b) => b.asset === sym) || {
                        asset: sym as any,
                        available: '0.00',
                        locked: '0.00',
                        pendingWithdrawal: '0.00',
                        p2pEscrow: '0.00',
                        total: '0.00'
                      };
                      return (
                        <div
                          key={sym}
                          style={{
                            background: '#181a20',
                            border: '1px solid #2b313a',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef' }}>{sym}</div>
                            <div style={{ fontSize: '11px', color: '#848e9c', marginTop: '2px' }}>
                              Available: <span style={{ color: '#eaecef', fontFamily: 'monospace' }}>{parseFloat(bal.available || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
                              {parseFloat(bal.locked || '0') > 0 && ` · Locked: ${bal.locked}`}
                            </div>
                          </div>

                          {canManageUsers && (
                            <button
                              onClick={() => setSelectedAssetForModal(sym)}
                              style={{
                                background: '#202630',
                                border: '1px solid #2b313a',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                color: '#fcd535',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Edit3 size={12} />
                              <span>Adjust</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ADMINISTRATIVE CONTROLS */}
                {canManageUsers && (
                  <div style={{ background: '#202630', padding: '16px', borderRadius: '12px', border: '1px solid #29313d' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#eaecef', marginBottom: '12px' }}>
                      Security Restrictions
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        onClick={handleToggleSuspend}
                        disabled={actionLoading}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: u.isSuspended ? '1px solid #0ecb81' : '1px solid #f6465d',
                          background: u.isSuspended ? 'rgba(14, 203, 129, 0.15)' : 'rgba(246, 70, 93, 0.15)',
                          color: u.isSuspended ? '#0ecb81' : '#f6465d',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        {u.isSuspended ? <Unlock size={14} /> : <Ban size={14} />}
                        <span>{u.isSuspended ? 'Unsuspend Account' : 'Suspend Account'}</span>
                      </button>

                      <button
                        onClick={handleToggleWithdrawalRestriction}
                        disabled={actionLoading}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: u.isWithdrawalSuspended ? '1px solid #0ecb81' : '1px solid #fcd535',
                          background: u.isWithdrawalSuspended ? 'rgba(14, 203, 129, 0.15)' : 'rgba(252, 213, 53, 0.15)',
                          color: u.isWithdrawalSuspended ? '#0ecb81' : '#fcd535',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        {u.isWithdrawalSuspended ? <Unlock size={14} /> : <Lock size={14} />}
                        <span>{u.isWithdrawalSuspended ? 'Unlock Withdrawals' : 'Lock Withdrawals'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* RECENT DEPOSITS & WITHDRAWALS ACCORDION */}
                <div style={{ background: '#202630', padding: '16px', borderRadius: '12px', border: '1px solid #29313d' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#eaecef', marginBottom: '10px' }}>
                    Recent Activity History ({deposits.length} deposits, {withdrawals.length} withdrawals)
                  </div>
                  {deposits.length === 0 && withdrawals.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#848e9c', fontStyle: 'italic' }}>No on-chain deposits or withdrawals recorded yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {deposits.slice(0, 3).map((d: any) => (
                        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 8px', background: '#181a20', borderRadius: '6px' }}>
                          <span style={{ color: '#0ecb81' }}>+ Deposit {d.amount} {d.asset}</span>
                          <span style={{ color: '#848e9c' }}>{d.status}</span>
                        </div>
                      ))}
                      {withdrawals.slice(0, 3).map((w: any) => (
                        <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 8px', background: '#181a20', borderRadius: '6px' }}>
                          <span style={{ color: '#f6465d' }}>- Withdrawal {w.amount} {w.asset}</span>
                          <span style={{ color: '#848e9c' }}>{w.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </AdminDataState>
        </div>
      </div>

      {/* Interactive Modal for Balance Adjustments */}
      {selectedAssetForModal && u && (
        <AdjustBalanceModal
          userId={u.id}
          userEmail={u.email}
          userName={u.fullName}
          initialAsset={selectedAssetForModal}
          balances={balances}
          onClose={() => setSelectedAssetForModal(null)}
          onSuccess={() => {
            setSelectedAssetForModal(null);
            userQuery.refresh();
          }}
        />
      )}
    </>
  );
};

import React, { useState } from 'react';
import { X, UserCheck, Shield, Ban, CheckCircle2, Clock } from 'lucide-react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminDataState } from '../shared/AdminPrimitives';
import { formatDateTime } from '../../../utils/adminHelpers';

interface UserDetailProps {
  userId: string;
  onClose: () => void;
}

export const UserDetailDrawer: React.FC<UserDetailProps> = ({ userId, onClose }) => {
  const userQuery = useAdminQuery<any>(`/api/v1/admin/users/${userId}`, {});
  const u = userQuery.data?.user;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '440px',
        maxWidth: '90vw',
        height: '100vh',
        background: '#181a20',
        borderLeft: '1px solid #29313d',
        zIndex: 1000,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #29313d', paddingBottom: '16px', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#eaecef' }}>User Details</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#848e9c', cursor: 'pointer', padding: '4px' }}>
          <X size={18} />
        </button>
      </div>

      <AdminDataState status={userQuery.status} error={userQuery.error} isForbidden={userQuery.isForbidden} onRetry={userQuery.refresh} isEmpty={!u}>
        {u && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <div style={{ background: '#202630', padding: '16px', borderRadius: '8px', border: '1px solid #29313d' }}>
              <div style={{ fontSize: '12px', color: '#848e9c' }}>Email Address</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#eaecef', marginTop: '4px' }}>{u.email}</div>
              <div style={{ fontSize: '11px', color: '#707a8a', marginTop: '2px', fontFamily: 'monospace' }}>ID: {u.id}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#202630', padding: '12px', borderRadius: '8px', border: '1px solid #29313d' }}>
                <div style={{ fontSize: '11px', color: '#848e9c' }}>KYC Status</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: u.kycStatus === 'APPROVED' ? '#2ebd85' : '#fcd535', marginTop: '4px' }}>
                  {u.kycStatus || 'UNVERIFIED'}
                </div>
              </div>
              <div style={{ background: '#202630', padding: '12px', borderRadius: '8px', border: '1px solid #29313d' }}>
                <div style={{ fontSize: '11px', color: '#848e9c' }}>KYC Tier</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#eaecef', marginTop: '4px' }}>
                  {u.kycTier || 'Tier 0'}
                </div>
              </div>
            </div>

            <div style={{ background: '#202630', padding: '16px', borderRadius: '8px', border: '1px solid #29313d' }}>
              <div style={{ fontSize: '12px', color: '#848e9c', marginBottom: '8px' }}>Security &amp; Permissions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>2FA Enabled:</span>
                  <span style={{ color: u.twoFactorEnabled ? '#2ebd85' : '#848e9c', fontWeight: 700 }}>{u.twoFactorEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Account Status:</span>
                  <span style={{ color: u.isSuspended ? '#f6465d' : '#2ebd85', fontWeight: 700 }}>{u.isSuspended ? 'Suspended' : 'Active'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Created At:</span>
                  <span style={{ color: '#848e9c' }}>{u.createdAt ? formatDateTime(u.createdAt) : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminDataState>
    </div>
  );
};

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAdminQuery, useAdminMutation } from '../../../hooks/useAdminApi';
import {
  AdminSectionHeader, AdminDataState, ConfirmActionModal,
  ConfirmActionConfig, ToastBar, AdminToast
} from '../shared/AdminPrimitives';
import { KycApplication } from '../../../types/admin';
import { formatDateTime } from '../../../utils/adminHelpers';

interface KycResponse { success: boolean; applications: KycApplication[] }

/**
 * KYC / Compliance review queue. Approval and rejection are privileged,
 * confirmed actions; rejection requires a documented reason which the
 * compliance service records in the audit trail.
 */
export const KYCQueue: React.FC = () => {
  const pendingQuery = useAdminQuery<KycResponse>('/api/v1/admin/kyc/pending', { refreshInterval: 15000 });
  const [confirm, setConfirm] = useState<ConfirmActionConfig | null>(null);
  const [toast, setToast] = useState<AdminToast | null>(null);

  const reviewMutation = useAdminMutation<{ kycId: string; approved: boolean; reason?: string }, unknown>(
    '/api/v1/admin/kyc/review',
    'POST'
  );

  const applications = pendingQuery.data?.applications || [];

  const openReview = (app: KycApplication, approved: boolean) => {
    setConfirm({
      title: approved ? `Approve ${app.tier.replace(/_/g, ' ')}` : `Reject ${app.tier.replace(/_/g, ' ')}`,
      description: approved
        ? `${app.fullName} will be granted ${app.tier.replace(/_/g, ' ')} privileges.`
        : `The application from ${app.fullName} will be rejected.`,
      confirmLabel: approved ? 'Approve Application' : 'Reject Application',
      danger: !approved,
      requireReason: true,
      onConfirm: async (payload) => {
        const result = await reviewMutation.execute({
          kycId: app.id,
          approved,
          reason: String(payload.reason || '')
        });
        if (result !== null) {
          setToast({ kind: 'success', message: approved ? 'Application approved' : 'Application rejected' });
          pendingQuery.refresh();
        } else {
          setToast({ kind: 'failed', message: reviewMutation.error || 'Review failed' });
        }
      },
      onClose: () => setConfirm(null)
    });
  };

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="KYC / Compliance Queue"
        subtitle={`${applications.length} application(s) awaiting review`}
        actions={
          <button className="btn btn-secondary" onClick={pendingQuery.refresh} disabled={pendingQuery.status === 'LOADING'}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <ToastBar toast={toast} onDismiss={() => setToast(null)} />

      <AdminDataState
        status={pendingQuery.status}
        error={pendingQuery.error}
        isForbidden={pendingQuery.isForbidden}
        isEmpty={applications.length === 0}
        emptyMessage="No pending KYC applications. The queue is clear."
        onRetry={pendingQuery.refresh}
      >
        <div className="bn-table-wrapper">
          <table className="bn-table admin-users-table">
            <thead>
              <tr>
                <th>Applicant</th><th>Tier</th><th>Document</th><th>Country</th><th>Submitted</th><th></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="admin-user-cell">
                      <span className="admin-avatar sm">{(a.fullName || '?')[0].toUpperCase()}</span>
                      <div>
                        <strong>{a.fullName}</strong>
                        <small>{a.userEmail || a.userId}</small>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-amber">{a.tier.replace('TIER_', 'Tier ').replace(/_/g, ' ')}</span></td>
                  <td className="admin-muted-cell">{a.idDocumentType.replace(/_/g, ' ')} ···{a.idNumber.slice(-4)}</td>
                  <td className="admin-muted-cell">{a.country}</td>
                  <td className="admin-muted-cell">{formatDateTime(a.submittedAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-buy" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => openReview(a, true)}>
                      Approve
                    </button>
                    <button className="btn btn-sell" style={{ padding: '4px 12px', fontSize: '12px', marginLeft: 6 }} onClick={() => openReview(a, false)}>
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminDataState>

      {confirm && <ConfirmActionModal {...confirm} />}
    </div>
  );
};
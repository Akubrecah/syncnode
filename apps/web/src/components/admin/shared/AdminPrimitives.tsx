import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldOff, Wifi, WifiOff } from 'lucide-react';
import { QueryStatus } from '../../../hooks/useAdminApi';
import { FeedState } from '../../../hooks/useAdminWebSocket';
import { classNames } from '../../../utils/adminHelpers';

// ---------- Data state wrapper: guarantees loading/empty/error/forbidden states ----------

interface AdminDataStateProps {
  status: QueryStatus;
  error: string | null;
  isForbidden: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

export const AdminDataState: React.FC<AdminDataStateProps> = ({
  status,
  error,
  isForbidden,
  isEmpty,
  emptyMessage = 'No records found.',
  onRetry,
  children
}) => {
  if (isForbidden) {
    return (
      <div className="admin-state-box admin-state-forbidden" role="status">
        <ShieldOff size={28} />
        <h3>Permission Denied</h3>
        <p>Your administrative role is not authorized to view this section.</p>
      </div>
    );
  }
  if (status === 'ERROR') {
    return (
      <div className="admin-state-box admin-state-error" role="alert">
        <AlertTriangle size={28} />
        <h3>Failed to Load</h3>
        <p>{error || 'An unexpected error occurred.'}</p>
        {onRetry && (
          <button className="btn btn-secondary" onClick={onRetry}>
            <RefreshCw size={14} /> Retry
          </button>
        )}
      </div>
    );
  }
  if (status === 'LOADING' && !isEmpty) {
    return (
      <div className="admin-state-box" role="status" aria-live="polite">
        <Loader2 size={26} className="admin-spin" />
        <p>Loading…</p>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="admin-state-box admin-state-empty" role="status">
        <CheckCircle2 size={24} style={{ color: 'var(--text-muted)' }} />
        <p>{emptyMessage}</p>
      </div>
    );
  }
  return <>{children}</>;
};

// ---------- Live/stale feed indicator ----------

export const FeedIndicator: React.FC<{ feedState: FeedState; lastMessageAt: number | null }> = ({ feedState, lastMessageAt }) => {
  const label =
    feedState === 'LIVE' ? 'LIVE'
    : feedState === 'CONNECTING' || feedState === 'RECONNECTING' ? 'RECONNECTING'
    : 'DISCONNECTED';
  return (
    <span className={`admin-feed-indicator admin-feed-${feedState.toLowerCase()}`} role="status">
      {feedState === 'DISCONNECTED' ? <WifiOff size={11} /> : <Wifi size={11} />}
      {label}
    </span>
  );
};

export const PollingIndicator: React.FC<{ lastUpdatedAt: number | null; isStale: boolean }> = ({ lastUpdatedAt, isStale }) => (
  <span className={classNames('admin-feed-indicator', isStale ? 'admin-feed-disconnected' : 'admin-feed-live')} role="status">
    ● {isStale ? 'STALE DATA' : lastUpdatedAt ? `SYNCED ${new Date(lastUpdatedAt).toLocaleTimeString()}` : 'SYNCING'}
  </span>
);

// ---------- Section shell ----------

export const AdminSectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, subtitle, icon, actions }) => (
  <div className="admin-section-header">
    <div className="admin-section-header-left">
      {icon}
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="admin-section-header-actions">{actions}</div>}
  </div>
);

// ---------- Confirmation modal for privileged operations ----------

export interface ConfirmActionConfig {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  /** When true a reason (min 4 chars) is mandatory and sent as { reason }. */
  requireReason?: boolean;
  extraFields?: React.ReactNode;
  onConfirm: (payload: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionConfig> = ({
  title,
  description,
  confirmLabel = 'Confirm',
  danger,
  requireReason,
  extraFields,
  onConfirm,
  onClose
}) => {
  const [reason, setReason] = React.useState('');
  const [processing, setProcessing] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const reasonValid = !requireReason || reason.trim().length >= 4;

  const handleConfirm = async () => {
    if (!reasonValid) return;
    setProcessing(true);
    setFailure(null);
    try {
      await onConfirm(requireReason ? { reason: reason.trim() } : {});
      onClose();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : String(err));
      setProcessing(false);
    }
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content admin-confirm-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="admin-confirm-head">
          <span className={classNames('admin-confirm-icon', danger && 'danger')}>
            <AlertTriangle size={20} />
          </span>
          <h3>{title}</h3>
        </div>
        <p className="admin-confirm-desc">{description}</p>

        {requireReason && (
          <div className="input-group">
            <label className="input-label" htmlFor="confirm-action-reason">
              Documented reason <span style={{ color: 'var(--sell-red)' }}>*</span>
            </label>
            <textarea
              id="confirm-action-reason"
              className="input-field"
              rows={3}
              value={reason}
              autoFocus
              placeholder="Minimum 4 characters - recorded in the immutable audit trail"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}
        {extraFields}

        {failure && (
          <div className="signup-alert-box" role="alert">{failure}</div>
        )}

        <div className="admin-confirm-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={processing}>Cancel</button>
          <button
            className={classNames('btn', danger ? 'btn-sell' : 'btn-primary')}
            onClick={handleConfirm}
            disabled={!reasonValid || processing}
          >
            {processing && <Loader2 size={14} className="admin-spin" />}
            {processing ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Toast feedback for mutation results ----------

export interface AdminToast {
  kind: 'success' | 'failed';
  message: string;
}

export const ToastBar: React.FC<{ toast: AdminToast | null; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div className={classNames('admin-toast', toast.kind === 'success' ? 'admin-toast-success' : 'admin-toast-failed')} role="status">
      {toast.kind === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
      <span>{toast.message}</span>
      <button onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
};

// ---------- Pagination controls ----------

export const AdminPagination: React.FC<{
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}> = ({ page, totalPages, total, onPageChange }) => (
  <div className="admin-pagination">
    <span>Page {page} of {totalPages} · {total.toLocaleString()} records</span>
    <div className="admin-pagination-btns">
      <button className="btn btn-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</button>
      <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  </div>
);

// ---------- Permission denied inline guard for action buttons ----------

export const PermissionGate: React.FC<{ allowed: boolean; children: React.ReactNode }> = ({ allowed, children }) =>
  allowed ? <>{children}</> : null;

// ---------- Metric Card & Operational Alerts ----------

export const MetricCard: React.FC<{
  label: string;
  value: string;
  hint?: string;
  tone?: 'good' | 'warn' | 'bad';
  onClick?: () => void;
}> = ({ label, value, hint, tone, onClick }) => (
  <div
    className={classNames('admin-metric-card', tone ? `admin-tone-${tone}` : '', onClick ? 'admin-clickable' : '')}
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
  >
    <div className="admin-metric-label">{label}</div>
    <div className="admin-metric-value">{value}</div>
    {hint && <div className="admin-metric-hint">{hint}</div>}
  </div>
);

export const OperationalAlerts: React.FC<{ circuitBreakers?: any }> = ({ circuitBreakers }) => {
  if (!circuitBreakers) return null;
  const tripped = Object.entries(circuitBreakers).filter(([_, status]: [string, any]) => status?.tripped || status?.isOpen);
  if (tripped.length === 0) return null;

  return (
    <div className="admin-operational-alerts" style={{ background: '#3b1c1c', border: '1px solid #732222', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b6b', fontWeight: 700, fontSize: '13px' }}>
        <AlertTriangle size={16} />
        <span>Active Circuit Breaker Alert ({tripped.length} subsystem tripped)</span>
      </div>
      <div style={{ marginTop: '6px', fontSize: '12px', color: '#ffc9c9' }}>
        Subsystems affected: {tripped.map(([k]) => k).join(', ')}
      </div>
    </div>
  );
};


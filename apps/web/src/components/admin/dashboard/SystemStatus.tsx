import React from 'react';
import { AdminServiceStatus, ServiceStatus } from '../../../types/admin';
import { classNames } from '../../../utils/adminHelpers';

const STATUS_LABEL: Record<ServiceStatus, string> = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  CRITICAL: 'CRITICAL'
};

/**
 * Service liveness list. Status text is always shown alongside the indicator
 * so color is never the sole signal (accessibility requirement).
 */
export const SystemStatus: React.FC<{ services: AdminServiceStatus[] }> = ({ services }) => (
  <div className="admin-system-status">
    {services.map((svc) => (
      <div key={svc.name} className="admin-service-row">
        <span className={classNames('admin-status-dot', svc.status.toLowerCase())} aria-hidden="true" />
        <div className="admin-service-meta">
          <strong>{svc.name}</strong>
          <small>{svc.detail}</small>
        </div>
        <span className={classNames('admin-status-pill', svc.status.toLowerCase())}>{STATUS_LABEL[svc.status]}</span>
      </div>
    ))}
  </div>
);

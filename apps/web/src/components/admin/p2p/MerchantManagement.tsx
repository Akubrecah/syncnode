import React from 'react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminSectionHeader, AdminDataState } from '../shared/AdminPrimitives';
import { formatDateTime, formatPrice } from '../../../utils/adminHelpers';

interface P2PAd {
  id: string;
  ownerId: string;
  ownerEmail?: string;
  side: 'BUY' | 'SELL';
  asset: string;
  fiatCurrency: string;
  price: string;
  minLimit: string;
  maxLimit: string;
  paymentMethods: string[];
  isActive: boolean;
  createdAt: number;
}

interface AdsResponse { success: boolean; ads: P2PAd[] }

/** P2P merchant advertisement registry (read-only oversight). */
export const MerchantManagement: React.FC = () => {
  const query = useAdminQuery<AdsResponse>('/api/v1/admin/p2p/ads', { refreshInterval: 30000 });
  const ads = query.data?.ads || [];

  return (
    <div className="admin-section">
      <MerchantTable query={query} ads={ads} />
    </div>
  );
};

const MerchantTable: React.FC<{
  query: ReturnType<typeof useAdminQuery<AdsResponse>>;
  ads: P2PAd[];
}> = ({ query, ads }) => (
  <>
    <AdminSectionHeader
      title="P2P Merchants & Advertisements"
      subtitle={`${ads.length} active marketplace listing(s)`}
    />
    <AdminDataState
      status={query.status}
      error={query.error}
      isForbidden={query.isForbidden}
      isEmpty={ads.length === 0}
      emptyMessage="No P2P advertisements exist yet."
      onRetry={query.refresh}
    >
      <div className="bn-table-wrapper">
        <table className="bn-table admin-users-table">
          <thead>
            <tr>
              <th>Ad ID</th><th>Merchant</th><th>Type</th><th>Asset</th><th>Price</th><th>Limits</th><th>Payment</th><th>Status</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <tr key={ad.id}>
                <td className="mono" title={ad.id}>{ad.id.slice(0, 14)}…</td>
                <td>{ad.ownerEmail || ad.ownerId}</td>
                <td style={{ color: ad.side === 'BUY' ? 'var(--buy-green)' : 'var(--sell-red)', fontWeight: 700 }}>
                  {ad.side}
                </td>
                <td><strong>{ad.asset}</strong></td>
                <td>{formatPrice(ad.price)} {ad.fiatCurrency}</td>
                <td className="admin-muted-cell">{ad.minLimit} – {ad.maxLimit}</td>
                <td className="admin-muted-cell">{(ad.paymentMethods || []).join(', ') || '—'}</td>
                <td>
                  <span className={`admin-status-pill ${ad.isActive ? 'healthy' : ''}`}>
                    {ad.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td className="admin-muted-cell">{formatDateTime(ad.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminDataState>
  </>
);
import React, { useState } from 'react';
import { RefreshCw, Plus, Edit2, QrCode, Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAdminQuery, useAdminMutation } from '../../../hooks/useAdminApi';
import {
  AdminSectionHeader, AdminDataState, ToastBar, AdminToast
} from '../shared/AdminPrimitives';
import { truncateMiddle } from '../../../utils/adminHelpers';

interface DepositAddressConfig {
  asset: string;
  network: string;
  address: string;
  memo?: string | null;
  qr_code_url?: string | null;
  min_deposit?: string;
  confirmations_required?: number;
  updated_at?: number;
}

interface DepositAddressesResponse {
  success: boolean;
  addresses: DepositAddressConfig[];
}

export const DepositWalletsConfig: React.FC = () => {
  const query = useAdminQuery<DepositAddressesResponse>('/api/v1/admin/wallet/deposit-addresses', {
    refreshInterval: 15000
  });

  const saveMutation = useAdminMutation<DepositAddressConfig, unknown>(
    () => '/api/v1/admin/wallet/deposit-addresses',
    'POST'
  );

  const [toast, setToast] = useState<AdminToast | null>(null);
  const [editingItem, setEditingItem] = useState<DepositAddressConfig | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const [formAsset, setFormAsset] = useState('USDT');
  const [formNetwork, setFormNetwork] = useState('TRC20');
  const [formAddress, setFormAddress] = useState('');
  const [formMemo, setFormMemo] = useState('');
  const [formMinDeposit, setFormMinDeposit] = useState('10.00');
  const [formConfirmations, setFormConfirmations] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addresses = query.data?.addresses || [];

  const handleOpenEdit = (item?: DepositAddressConfig) => {
    if (item) {
      setEditingItem(item);
      setFormAsset(item.asset);
      setFormNetwork(item.network);
      setFormAddress(item.address);
      setFormMemo(item.memo || '');
      setFormMinDeposit(item.min_deposit || '0.0001');
      setFormConfirmations(item.confirmations_required || 1);
    } else {
      setEditingItem({ asset: 'USDT', network: 'TRC20', address: '' });
      setFormAsset('USDT');
      setFormNetwork('TRC20');
      setFormAddress('');
      setFormMemo('');
      setFormMinDeposit('10.00');
      setFormConfirmations(1);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAddress.trim()) {
      setToast({ kind: 'failed', message: 'Deposit wallet address is required' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await saveMutation.execute({
        asset: formAsset,
        network: formNetwork,
        address: formAddress.trim(),
        memo: formMemo.trim() || undefined,
        min_deposit: formMinDeposit,
        confirmations_required: Number(formConfirmations)
      });
      if (res !== null) {
        setToast({ kind: 'success', message: `Fixed deposit wallet for ${formAsset} (${formNetwork}) updated successfully.` });
        setEditingItem(null);
        query.refresh();
      } else {
        setToast({ kind: 'failed', message: saveMutation.error || 'Failed to save address' });
      }
    } catch (err: any) {
      setToast({ kind: 'failed', message: err.message || 'Save failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="Fixed Deposit Wallets Configuration"
        subtitle="Manage the system-wide fixed deposit addresses and networks displayed to all registered users"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={query.refresh} disabled={query.status === 'LOADING'}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={() => handleOpenEdit()} style={{ background: '#fcd535', color: '#181a20', fontWeight: 700 }}>
              <Plus size={14} /> Configure Wallet
            </button>
          </div>
        }
      />

      <ToastBar toast={toast} onDismiss={() => setToast(null)} />

      {/* Info Banner */}
      <div style={{
        background: 'rgba(252, 213, 53, 0.08)',
        border: '1px solid rgba(252, 213, 53, 0.25)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <ShieldCheck size={22} color="#fcd535" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '13px', color: '#eaecef' }}>
          <strong>Fixed User Deposit Routing:</strong> All incoming customer deposits will be directed to these designated hot/cold wallet addresses. Whenever users select an asset & network on the Deposit page, the system presents the corresponding fixed address and QR code configured here.
        </div>
      </div>

      <AdminDataState
        status={query.status}
        error={query.error}
        isForbidden={query.isForbidden}
        isEmpty={addresses.length === 0}
        emptyMessage="No deposit addresses configured. Click 'Configure Wallet' to add one."
        onRetry={query.refresh}
      >
        <div className="bn-table-wrapper">
          <table className="bn-table admin-users-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Network</th>
                <th>Assigned Deposit Address</th>
                <th>Memo / Tag</th>
                <th>Min Deposit</th>
                <th>Confirmations</th>
                <th>QR Preview</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {addresses.map((item, idx) => (
                <tr key={`${item.asset}_${item.network}_${idx}`}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#eaecef' }}>{item.asset}</span>
                    </div>
                  </td>
                  <td>
                    <span className="admin-status-pill" style={{ background: 'rgba(255, 255, 255, 0.06)', color: '#eaecef' }}>
                      {item.network}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="mono" style={{ color: '#0ecb81', fontSize: '13px' }} title={item.address}>
                        {truncateMiddle(item.address, 16)}
                      </span>
                      <button
                        onClick={() => handleCopy(item.address, `${item.asset}_${item.network}`)}
                        style={{ background: 'transparent', border: 'none', color: '#848e9c', cursor: 'pointer', padding: 2 }}
                        title="Copy address"
                      >
                        {copiedKey === `${item.asset}_${item.network}` ? <Check size={14} color="#0ecb81" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="admin-muted-cell">{item.memo || '--'}</td>
                  <td>{item.min_deposit ? `${item.min_deposit} ${item.asset}` : '--'}</td>
                  <td className="admin-muted-cell">{item.confirmations_required ?? 1} Block(s)</td>
                  <td>
                    {item.qr_code_url ? (
                      <a href={item.qr_code_url} target="_blank" rel="noreferrer" title="Open QR Code" style={{ color: '#fcd535', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: '12px' }}>
                        <QrCode size={16} /> QR
                      </a>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => handleOpenEdit(item)}
                    >
                      <Edit2 size={12} style={{ marginRight: 4 }} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminDataState>

      {/* Edit / Add Modal */}
      {editingItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#1e2329',
            border: '1px solid #2b313a',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#eaecef', margin: '0 0 16px' }}>
              {editingItem.address ? `Edit ${formAsset} (${formNetwork}) Deposit Wallet` : 'Configure New Deposit Wallet'}
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Asset Symbol</label>
                  <select
                    value={formAsset}
                    onChange={(e) => setFormAsset(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                  >
                    <option value="USDT">USDT (Tether)</option>
                    <option value="BTC">BTC (Bitcoin)</option>
                    <option value="ETH">ETH (Ethereum)</option>
                    <option value="BNB">BNB (BNB Chain)</option>
                    <option value="SOL">SOL (Solana)</option>
                    <option value="XRP">XRP (Ripple)</option>
                    <option value="ADA">ADA (Cardano)</option>
                    <option value="DOGE">DOGE (Dogecoin)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Network</label>
                  <input
                    type="text"
                    value={formNetwork}
                    onChange={(e) => setFormNetwork(e.target.value)}
                    placeholder="e.g. TRC20, ERC20, BTC, BEP20"
                    required
                    style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Fixed Receiving Wallet Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Paste admin-controlled address"
                  required
                  className="mono"
                  style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Memo / Tag (Optional)</label>
                <input
                  type="text"
                  value={formMemo}
                  onChange={(e) => setFormMemo(e.target.value)}
                  placeholder="Leave empty if not required for network"
                  style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Min Deposit Amount</label>
                  <input
                    type="text"
                    value={formMinDeposit}
                    onChange={(e) => setFormMinDeposit(e.target.value)}
                    placeholder="e.g. 10.00"
                    style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Confirmations</label>
                  <input
                    type="number"
                    value={formConfirmations}
                    onChange={(e) => setFormConfirmations(Number(e.target.value))}
                    min={1}
                    max={64}
                    style={{ width: '100%', padding: '10px 12px', background: '#181a20', border: '1px solid #2b313a', color: '#eaecef', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingItem(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ background: '#fcd535', color: '#181a20', fontWeight: 700 }}
                >
                  {isSubmitting ? 'Saving Address...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

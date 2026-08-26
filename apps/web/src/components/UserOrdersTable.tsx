import React, { useState } from 'react';
import { XCircle, CheckCircle2 } from 'lucide-react';

interface UserOrdersTableProps {
  orders: any[];
  userTrades: any[];
  onCancelOrder: (id: string) => void;
  onCancelAllOrders?: () => void;
}

export const UserOrdersTable: React.FC<UserOrdersTableProps> = ({
  orders,
  userTrades,
  onCancelOrder,
  onCancelAllOrders
}) => {
  const [tab, setTab] = useState<'open' | 'history' | 'trades'>('open');

  const openOrders = orders.filter((o) => ['OPEN', 'PARTIALLY_FILLED'].includes(o.status));
  const orderHistory = orders.filter((o) => ['FILLED', 'CANCELED', 'REJECTED'].includes(o.status));

  return (
    <div className="panel" style={{ height: '220px', borderTop: '1px solid var(--border-color)' }}>
      <div className="panel-header" style={{ padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`nav-item ${tab === 'open' ? 'active' : ''}`}
            onClick={() => setTab('open')}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            Open Orders ({openOrders.length})
          </button>
          <button
            className={`nav-item ${tab === 'history' ? 'active' : ''}`}
            onClick={() => setTab('history')}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            Order History
          </button>
          <button
            className={`nav-item ${tab === 'trades' ? 'active' : ''}`}
            onClick={() => setTab('trades')}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            Trade Executions
          </button>
        </div>

        {tab === 'open' && openOrders.length > 0 && onCancelAllOrders && (
          <button
            className="btn btn-secondary"
            style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--sell-red)' }}
            onClick={onCancelAllOrders}
          >
            Cancel All
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'open' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '8px 12px' }}>Pair</th>
                <th style={{ padding: '8px 12px' }}>Side</th>
                <th style={{ padding: '8px 12px' }}>Type</th>
                <th style={{ padding: '8px 12px' }}>Price</th>
                <th style={{ padding: '8px 12px' }}>Amount</th>
                <th style={{ padding: '8px 12px' }}>Filled</th>
                <th style={{ padding: '8px 12px' }}>Action</th>
              </tr>
            </thead>
            <tbody className="mono">
              {openOrders.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px 12px' }}>{o.symbol}</td>
                  <td style={{ padding: '8px 12px', color: o.side === 'BUY' ? 'var(--buy-green)' : 'var(--sell-red)' }}>{o.side}</td>
                  <td style={{ padding: '8px 12px' }}>{o.type}</td>
                  <td style={{ padding: '8px 12px' }}>${o.price || 'Market'}</td>
                  <td style={{ padding: '8px 12px' }}>{o.quantity}</td>
                  <td style={{ padding: '8px 12px' }}>{o.filledQuantity} / {o.quantity}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--sell-red)' }}
                      onClick={() => onCancelOrder(o.id)}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
              {openOrders.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No active open orders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'history' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '8px 12px' }}>Time</th>
                <th style={{ padding: '8px 12px' }}>Pair</th>
                <th style={{ padding: '8px 12px' }}>Side</th>
                <th style={{ padding: '8px 12px' }}>Price</th>
                <th style={{ padding: '8px 12px' }}>Amount</th>
                <th style={{ padding: '8px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody className="mono">
              {orderHistory.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleTimeString()}</td>
                  <td style={{ padding: '8px 12px' }}>{o.symbol}</td>
                  <td style={{ padding: '8px 12px', color: o.side === 'BUY' ? 'var(--buy-green)' : 'var(--sell-red)' }}>{o.side}</td>
                  <td style={{ padding: '8px 12px' }}>${o.price || 'Market'}</td>
                  <td style={{ padding: '8px 12px' }}>{o.quantity}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className={`badge ${o.status === 'FILLED' ? 'badge-green' : 'badge-amber'}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'trades' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '8px 12px' }}>Time</th>
                <th style={{ padding: '8px 12px' }}>Pair</th>
                <th style={{ padding: '8px 12px' }}>Price</th>
                <th style={{ padding: '8px 12px' }}>Quantity</th>
                <th style={{ padding: '8px 12px' }}>Total (Quote)</th>
              </tr>
            </thead>
            <tbody className="mono">
              {userTrades.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{new Date(t.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: '8px 12px' }}>{t.symbol}</td>
                  <td style={{ padding: '8px 12px' }}>${Number(t.price).toFixed(2)}</td>
                  <td style={{ padding: '8px 12px' }}>{Number(t.quantity).toFixed(4)}</td>
                  <td style={{ padding: '8px 12px' }}>${Number(t.quoteQuantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

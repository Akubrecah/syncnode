import React from 'react';
import { AlertOctagon, PauseCircle, Wrench } from 'lucide-react';
import { CircuitBreakersState } from '../../../types/admin';

interface OperationalAlertsProps {
  circuitBreakers: CircuitBreakersState;
}

/**
 * Renders active operational alerts derived from the authoritative
 * circuit-breaker state. Only displays conditions the backend actually reports.
 */
export const OperationalAlerts: React.FC<OperationalAlertsProps> = ({ circuitBreakers }) => {
  const alerts: Array<{ icon: React.ReactNode; text: string; severity: 'critical' | 'warning' }> = [];

  if (circuitBreakers.isGlobalTradingHalted) {
    alerts.push({ icon: <AlertOctagon size={14} />, text: 'Global trading halt is ENGAGED - all order placement frozen', severity: 'critical' });
  }
  if (circuitBreakers.isWithdrawalsPaused) {
    alerts.push({ icon: <PauseCircle size={14} />, text: 'Withdrawals are paused exchange-wide', severity: 'critical' });
  }
  if (circuitBreakers.isDepositsPaused) {
    alerts.push({ icon: <PauseCircle size={14} />, text: 'Deposits are paused exchange-wide', severity: 'warning' });
  }
  if (circuitBreakers.emergencyMaintenance) {
    alerts.push({ icon: <Wrench size={14} />, text: 'Emergency maintenance mode is enabled', severity: 'warning' });
  }
  const haltedMarkets = Object.entries(circuitBreakers.haltedMarkets || {}).filter(([, halted]) => halted);
  if (haltedMarkets.length > 0) {
    alerts.push({
      icon: <AlertOctagon size={14} />,
      text: `Markets halted by circuit breakers: ${haltedMarkets.map(([sym]) => sym).join(', ')}`,
      severity: 'critical'
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="admin-alerts-stack" role="alert">
      {alerts.map((a, i) => (
        <div key={i} className={`admin-alert-row ${a.severity}`}>
          {a.icon}
          <span>{a.text}</span>
        </div>
      ))}
    </div>
  );
};

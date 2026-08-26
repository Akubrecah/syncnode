import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, hint, tone = 'default', onClick }) => (
  <div
    className={`admin-metric-card ${onClick ? 'clickable' : ''}`}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={(e) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    }}
  >
    <span className="admin-metric-label">{label}</span>
    <span className={`admin-metric-value tone-${tone}`}>{value}</span>
    {hint && <span className="admin-metric-hint">{hint}</span>}
  </div>
);

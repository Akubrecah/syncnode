import React, { useState, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface PriceAlertData {
  id?: string;
  name: string;
  stockIdentifier: string;
  symbol: string;
  alertType: 'Price' | 'Volume' | 'Percentage Change';
  condition: 'Greater than (>)' | 'Less than (<)' | 'Equal to (=)';
  thresholdValue: string;
  frequency: 'Once per minute' | 'Once per hour' | 'Once per day';
}

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStock?: { symbol: string; name: string; price?: string };
  onSaveAlert: (alert: PriceAlertData) => void;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  isOpen,
  onClose,
  initialStock = { symbol: 'AAPL', name: 'Apple Inc', price: '229.65' },
  onSaveAlert
}) => {
  const [alertName, setAlertName] = useState('Apple at Discount');
  const [stockIdentifier, setStockIdentifier] = useState(`${initialStock.name} (${initialStock.symbol})`);
  const [alertType, setAlertType] = useState<'Price' | 'Volume' | 'Percentage Change'>('Price');
  const [condition, setCondition] = useState<'Greater than (>)' | 'Less than (<)' | 'Equal to (=)'>('Greater than (>)');
  const [thresholdValue, setThresholdValue] = useState('');
  const [frequency, setFrequency] = useState<'Once per minute' | 'Once per hour' | 'Once per day'>('Once per day');

  useEffect(() => {
    if (initialStock) {
      setStockIdentifier(`${initialStock.name} (${initialStock.symbol})`);
      setAlertName(`${initialStock.name.split(' ')[0]} Target`);
      if (initialStock.price) {
        setThresholdValue(initialStock.price.replace('$', ''));
      }
    }
  }, [initialStock]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveAlert({
      name: alertName || `${initialStock.symbol} Alert`,
      stockIdentifier,
      symbol: initialStock.symbol,
      alertType,
      condition,
      thresholdValue: thresholdValue || '140',
      frequency
    });
    onClose();
  };

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div
        className="price-alert-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="price-alert-title">Price Alert</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#848e9c',
              cursor: 'pointer',
              display: 'flex',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="price-alert-form">
          {/* Alert Name */}
          <div className="price-alert-field">
            <label className="price-alert-label">Alert Name</label>
            <input
              type="text"
              className="price-alert-input active-highlight"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              placeholder="e.g. Apple at Discount"
              required
            />
          </div>

          {/* Stock Identifier */}
          <div className="price-alert-field">
            <label className="price-alert-label">Stock identifier</label>
            <input
              type="text"
              className="price-alert-input readonly"
              value={stockIdentifier}
              readOnly
            />
          </div>

          {/* Alert Type */}
          <div className="price-alert-field">
            <label className="price-alert-label">Alert type</label>
            <div className="price-alert-select-wrapper">
              <select
                className="price-alert-select"
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as any)}
              >
                <option value="Price">Price</option>
                <option value="Volume">Volume</option>
                <option value="Percentage Change">Percentage Change</option>
              </select>
              <ChevronDown size={15} className="select-chevron" />
            </div>
          </div>

          {/* Condition */}
          <div className="price-alert-field">
            <label className="price-alert-label">Condition</label>
            <div className="price-alert-select-wrapper">
              <select
                className="price-alert-select"
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
              >
                <option value="Greater than (>)" selected>Greater than (&gt;)</option>
                <option value="Less than (<)">Less than (&lt;)</option>
                <option value="Equal to (=)">Equal to (=)</option>
              </select>
              <ChevronDown size={15} className="select-chevron" />
            </div>
          </div>

          {/* Threshold Value */}
          <div className="price-alert-field">
            <label className="price-alert-label">Threshold value</label>
            <div className="price-alert-threshold-box">
              <span className="dollar-prefix">$</span>
              <input
                type="number"
                step="0.01"
                className="price-alert-input threshold-input"
                placeholder="eg: 140"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="price-alert-field">
            <label className="price-alert-label">Frequency</label>
            <div className="price-alert-select-wrapper">
              <select
                className="price-alert-select"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
              >
                <option value="Once per minute">Once per minute</option>
                <option value="Once per hour">Once per hour</option>
                <option value="Once per day">Once per day</option>
              </select>
              <ChevronDown size={15} className="select-chevron" />
            </div>
          </div>

          {/* Create Alert Button */}
          <button type="submit" className="price-alert-submit-btn">
            Create Alert
          </button>
        </form>
      </div>
    </div>
  );
};

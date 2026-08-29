import React from 'react';
import { Zap, ShieldCheck, ArrowUpRight, Lock, Activity } from 'lucide-react';

interface FooterProps {
  onNavigateToTrade?: (sym?: string) => void;
  onNavigateToP2P?: () => void;
  onOpenAuth?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateToTrade,
  onNavigateToP2P,
  onOpenAuth
}) => {
  return (
    <footer
      style={{
        background: '#12141a',
        borderTop: '1px solid #2b313a',
        padding: '50px 24px 30px',
        color: '#848e9c',
        fontSize: '13px'
      }}
    >
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        {/* Main 4-Column Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '40px',
            marginBottom: '40px'
          }}
        >
          {/* Column 1: Brand & Solvency */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 800, color: '#fcd535' }}>
              <Zap size={24} />
              <span>CryptoBridge</span>
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.6', margin: 0, color: '#848e9c' }}>
              Institutional-grade digital asset exchange engineered with microsecond deterministic matching, strict double-entry ledger architecture, and 100% verified Proof of Reserves.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2ebd85', fontWeight: 600, background: 'rgba(46, 189, 133, 0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(46, 189, 133, 0.2)' }}>
                <ShieldCheck size={14} />
                100% Proof of Reserves
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#fcd535', fontWeight: 600, background: 'rgba(252, 213, 53, 0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(252, 213, 53, 0.2)' }}>
                <Lock size={14} />
                $1B SAFU
              </span>
            </div>
          </div>

          {/* Column 2: Products */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#eaecef', margin: '0 0 16px 0' }}>Products</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <a
                  href="/trade/BTC-USDT"
                  onClick={(e) => {
                    if (onNavigateToTrade) {
                      e.preventDefault();
                      onNavigateToTrade('BTC/USDT');
                    }
                  }}
                  style={{ color: '#848e9c', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  Spot Trading (350+ Pairs)
                </a>
              </li>
              <li>
                <a
                  href="/invest"
                  style={{ color: '#848e9c', textDecoration: 'none', transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  <span>High-Yield Earn &amp; Staking</span>
                  <span style={{ background: 'rgba(252, 213, 53, 0.15)', color: '#fcd535', fontSize: '10px', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>250% ROI</span>
                </a>
              </li>
              <li>
                <a
                  href="/wallet"
                  style={{ color: '#848e9c', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  Instant Internal Transfers (0% Fee)
                </a>
              </li>
              <li>
                <a
                  href="/p2p"
                  onClick={(e) => {
                    if (onNavigateToP2P) {
                      e.preventDefault();
                      onNavigateToP2P();
                    }
                  }}
                  style={{ color: '#848e9c', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  P2P Escrow Market
                </a>
              </li>
              <li>
                <a
                  href="/stock/NVDA"
                  style={{ color: '#848e9c', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  Stock &amp; Equity Intelligence
                </a>
              </li>
              <li>
                <a
                  href="/news"
                  style={{ color: '#848e9c', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  Live Financial News &amp; Feeds
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Governance & Security */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#eaecef', margin: '0 0 16px 0' }}>Governance &amp; Security</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <a
                  href="/dashboard"
                  style={{ color: '#848e9c', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  Proof of Reserves Audit
                </a>
              </li>
              <li>
                <a
                  href="/security"
                  style={{ color: '#848e9c', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  SAFU Vault Custody
                </a>
              </li>
              <li>
                <a
                  href="/admin"
                  style={{ color: '#fcd535', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Executive Admin Console</span>
                  <ArrowUpRight size={13} />
                </a>
              </li>
              <li>
                <a
                  href="/dashboard"
                  style={{ color: '#848e9c', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  Identity &amp; KYC Verification
                </a>
              </li>
              <li>
                <a
                  href="/watchlist"
                  style={{ color: '#848e9c', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  Watchlist &amp; Price Alerts
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Support & Legal */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#eaecef', margin: '0 0 16px 0' }}>Support &amp; Compliance</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <span style={{ color: '#848e9c' }}>24/7 Dedicated Support</span>
              </li>
              <li>
                <span style={{ color: '#848e9c' }}>Zero-Fee Crypto Deposits</span>
              </li>
              <li>
                <span style={{ color: '#848e9c' }}>Institutional Fee Schedule (0.08% Maker)</span>
              </li>
              <li>
                <span style={{ color: '#848e9c' }}>Terms of Service &amp; Privacy Policy</span>
              </li>
              <li>
                <span style={{ color: '#848e9c' }}>Risk Warning &amp; Disclosure</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Security Attestation */}
        <div
          style={{
            borderTop: '1px solid #23272e',
            paddingTop: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            fontSize: '12px',
            color: '#707a8a'
          }}
        >
          <div>
            CryptoBridge Exchange &copy; 2026. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>SOC 2 Type II Certified</span>
            <span>&bull;</span>
            <span>ISO 27001 Security Standard</span>
            <span>&bull;</span>
            <span style={{ color: '#2ebd85' }}>100% Solvency Backed</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

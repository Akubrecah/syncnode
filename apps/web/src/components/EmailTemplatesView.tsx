import React, { useState } from 'react';
import {
  Mail,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Send,
  Sparkles,
  TrendingUp,
  Bell,
  Newspaper,
  UserCheck
} from 'lucide-react';
import {
  generateWelcomeEmail,
  generatePriceAlertEmail,
  generateReEngagementEmail,
  generateNewsSummaryEmail
} from '../utils/emailTemplates';

type TemplateKey = 'welcome' | 'price_above' | 'price_below' | 're_engagement' | 'news_summary';

export const EmailTemplatesView: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('welcome');
  const [deviceView, setDeviceView] = useState<'mobile' | 'desktop'>('mobile');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Dynamic parameters for live preview testing
  const [userName, setUserName] = useState('Adrian');
  const [ticker, setTicker] = useState('MSFT');
  const [companyName, setCompanyName] = useState('Microsoft Corp');
  const [targetPrice, setTargetPrice] = useState('$340.00');
  const [currentPrice, setCurrentPrice] = useState('$352.52');
  const [change, setChange] = useState('+1.4%');

  const templates: Record<TemplateKey, { title: string; subtitle: string; icon: React.ReactNode; getHtml: () => string }> = {
    welcome: {
      title: 'Welcome to Signalist 🚀',
      subtitle: 'Onboarding welcome & product tour email',
      icon: <Sparkles size={16} color="#00e599" />,
      getHtml: () => generateWelcomeEmail({
        name: userName,
        dashboardUrl: window.location.origin + '/#/dashboard'
      })
    },
    price_above: {
      title: `🔔 [${ticker}] just hit your alert (Price Above)`,
      subtitle: 'Target price reached & profit taking notification',
      icon: <TrendingUp size={16} color="#00e599" />,
      getHtml: () => generatePriceAlertEmail({
        ticker,
        companyName,
        type: 'above',
        conditionPrice: targetPrice,
        currentPrice,
        change,
        dashboardUrl: window.location.origin + '/#/watchlist'
      })
    },
    price_below: {
      title: `🔔 [${ticker}] just hit your alert (Price Below)`,
      subtitle: 'Dip alert & buying opportunity notification',
      icon: <Bell size={16} color="#f87171" />,
      getHtml: () => generatePriceAlertEmail({
        ticker,
        companyName,
        type: 'below',
        conditionPrice: '$360.00',
        currentPrice: '$352.52',
        change: '-1.4%',
        dashboardUrl: window.location.origin + '/#/watchlist'
      })
    },
    re_engagement: {
      title: `🔔 [${userName}], opportunities are waiting for you`,
      subtitle: 'Re-activation campaign for inactive users',
      icon: <UserCheck size={16} color="#fcd535" />,
      getHtml: () => generateReEngagementEmail({
        name: userName,
        dashboardUrl: window.location.origin + '/#/dashboard'
      })
    },
    news_summary: {
      title: "Today's Market News Summary - Friday, Sept 5",
      subtitle: 'Daily curated financial bulletin email',
      icon: <Newspaper size={16} color="#38bdf8" />,
      getHtml: () => generateNewsSummaryEmail({
        dateStr: 'Friday, September 5, 2025',
        dashboardUrl: window.location.origin + '/#/watchlist',
        articles: [
          {
            title: 'Inflation and Tariffs Could Challenge Back-to-School Spending and the Stock Market',
            bullets: [
              'Many families are struggling with higher prices for everyday items, impacting how much they can spend on school supplies.',
              'New tariffs on goods from China could make some back-to-school items even more expensive.',
              'These economic pressures might make the stock market more unpredictable.'
            ],
            url: '#/stock/AAPL'
          },
          {
            title: "Sending kids back to school with PB&J lunches costs 8% more this year. Here's how tariffs, SNAP cuts factor",
            bullets: [
              'The cost of common lunch items like peanut butter and jelly have climbed again for the school year.',
              'Tariffs on imported goods and cuts to government food assistance programs like SNAP are contributing to higher grocery prices.',
              'Because perishable foods can\'t be easily stockpiled, families feel the impact of these price increases directly on their budgets.'
            ],
            url: '#/stock/GOOGL'
          }
        ]
      })
    }
  };

  const activeHtml = templates[selectedTemplate].getHtml();

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(activeHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTest = () => {
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
  };

  return (
    <div className="email-showcase-container">
      {/* Top Banner */}
      <div className="email-showcase-header">
        <div>
          <h1 className="email-showcase-title">Transactional Email Templates</h1>
          <p className="email-showcase-sub">
            Pixel-perfect, dark-mode responsive email templates built for high deliverability and user engagement.
          </p>
        </div>

        <div className="email-header-actions">
          <div className="device-switcher">
            <button
              className={`device-btn ${deviceView === 'mobile' ? 'active' : ''}`}
              onClick={() => setDeviceView('mobile')}
              title="Mobile Preview (390px)"
            >
              <Smartphone size={15} />
              <span>Mobile</span>
            </button>
            <button
              className={`device-btn ${deviceView === 'desktop' ? 'active' : ''}`}
              onClick={() => setDeviceView('desktop')}
              title="Desktop Preview (560px)"
            >
              <Monitor size={15} />
              <span>Desktop</span>
            </button>
          </div>

          <button className="btn btn-secondary" onClick={handleCopyHtml} style={{ fontSize: '12px', gap: '6px' }}>
            {copied ? <Check size={14} color="#00e599" /> : <Copy size={14} />}
            <span>{copied ? 'HTML Copied!' : 'Copy HTML'}</span>
          </button>

          <button className="btn btn-primary" onClick={handleSendTest} style={{ fontSize: '12px', gap: '6px', background: '#fcd535', color: '#181a20', fontWeight: 800 }}>
            {sentSuccess ? <Check size={14} /> : <Send size={14} />}
            <span>{sentSuccess ? 'Sent to Inbox!' : 'Send Test'}</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Template Selector Sidebar + Live Iframe Preview */}
      <div className="email-showcase-grid">
        
        {/* Template Selector Column */}
        <div className="email-template-sidebar">
          <div className="email-sidebar-head">Templates (5)</div>

          <div className="email-template-nav">
            {(Object.keys(templates) as TemplateKey[]).map((key) => {
              const item = templates[key];
              const isSelected = selectedTemplate === key;

              return (
                <div
                  key={key}
                  className={`email-nav-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedTemplate(key)}
                >
                  <div className="email-nav-icon">{item.icon}</div>
                  <div className="email-nav-info">
                    <div className="email-nav-title">{item.title}</div>
                    <div className="email-nav-desc">{item.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Test Parameter Controls */}
          <div className="email-test-controls">
            <div className="test-controls-title">Dynamic Parameters</div>
            <div className="test-input-group">
              <label>User Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="test-input"
              />
            </div>
            <div className="test-input-group">
              <label>Ticker &amp; Company</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px' }}>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="test-input"
                />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="test-input"
                />
              </div>
            </div>
            <div className="test-input-group">
              <label>Price &amp; Target</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <input
                  type="text"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="test-input"
                />
                <input
                  type="text"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="test-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Email Preview Frame */}
        <div className="email-preview-wrapper">
          <div className={`email-device-frame ${deviceView}`}>
            <div className="device-frame-header">
              <div className="device-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <div className="device-subject-bar">
                Subject: {templates[selectedTemplate].title}
              </div>
            </div>

            <iframe
              title="Email Preview"
              srcDoc={activeHtml}
              className="email-iframe"
              sandbox="allow-same-origin"
            />
          </div>
        </div>

      </div>

      {/* Side-by-Side Multi Template Carousel Grid (Matching User Screenshot) */}
      <div className="email-gallery-section">
        <h2 className="email-gallery-title">All 5 Templates Overview</h2>
        <div className="email-gallery-grid">
          {(Object.keys(templates) as TemplateKey[]).map((key) => (
            <div
              key={key}
              className={`email-gallery-card ${selectedTemplate === key ? 'selected' : ''}`}
              onClick={() => setSelectedTemplate(key)}
            >
              <div className="gallery-card-header">
                <div className="gallery-card-title">{templates[key].title}</div>
              </div>
              <div className="gallery-card-preview">
                <iframe
                  title={`Gallery ${key}`}
                  srcDoc={templates[key].getHtml()}
                  className="gallery-iframe"
                  tabIndex={-1}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

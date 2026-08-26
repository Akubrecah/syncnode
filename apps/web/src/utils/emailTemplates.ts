/**
 * Production-ready, Responsive HTML Email Templates for Signalist
 * Compatible with all major email clients (Gmail, Apple Mail, Outlook, Yahoo).
 */

export interface WelcomeEmailParams {
  name: string;
  dashboardUrl?: string;
  supportEmail?: string;
}

export interface PriceAlertEmailParams {
  ticker: string;
  companyName: string;
  type: 'above' | 'below';
  conditionPrice: string;
  currentPrice: string;
  change: string;
  timestamp?: string;
  dashboardUrl?: string;
}

export interface ReEngagementEmailParams {
  name: string;
  marketHighlights?: string;
  dashboardUrl?: string;
}

export interface NewsSummaryEmailParams {
  dateStr: string;
  dashboardUrl?: string;
  articles: Array<{
    title: string;
    bullets: string[];
    url: string;
  }>;
}

// Base Wrapper for Dark Theme Emails
const emailWrapper = (content: string, preheaderText: string = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signalist Notification</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #0b0d13; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #0b0d13; color: #eaecef;">
  <!-- Hidden Preheader Text -->
  <div style="display: none; font-size: 1px; color: #0b0d13; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheaderText}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table class="email-container" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #12141c; border: 1px solid #1f2433; border-radius: 12px; overflow: hidden; padding: 28px 24px;">
          <!-- Header / Brand Logo -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left">
                    <div style="display: inline-flex; align-items: center;">
                      <span style="display: inline-block; width: 26px; height: 26px; border-radius: 6px; background-color: rgba(0, 229, 153, 0.12); border: 1px solid rgba(0, 229, 153, 0.3); text-align: center; line-height: 26px; color: #00e599; font-weight: 800; font-size: 15px;">⚡</span>
                      <span style="font-size: 20px; font-weight: 800; color: #ffffff; margin-left: 8px; letter-spacing: -0.5px;">Signalist</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td>
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 28px; border-top: 1px solid #1c2130; margin-top: 24px; text-align: center; font-size: 11px; color: #64748b;">
              <p style="margin: 0 0 8px;">You're receiving this email because you signed up for Signalist.</p>
              <p style="margin: 0 0 12px;">
                <a href="#/settings" style="color: #fcd535; text-decoration: underline;">Unsubscribe</a> &nbsp;•&nbsp; 
                <a href="#/dashboard" style="color: #fcd535; text-decoration: underline;">Visit Signalist</a>
              </p>
              <p style="margin: 0; color: #475569;">© 2025 Signalist Inc. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * 1. Welcome to Signalist Email
 */
export function generateWelcomeEmail(params: WelcomeEmailParams): string {
  const content = `
    <!-- Mockup Hero Image -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; background: #0c0e14; border: 1px solid #1a1e2b; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="padding: 16px; text-align: center;">
          <div style="background: #141722; border-radius: 6px; padding: 12px; border: 1px solid #232838;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="color: #00e599; font-weight: 700; font-size: 11px;">● S&P 500 +1.42%</span>
              <span style="color: #fcd535; font-weight: 700; font-size: 11px;">BTC $64,280</span>
            </div>
            <div style="height: 60px; background: linear-gradient(180deg, rgba(0, 229, 153, 0.15) 0%, rgba(0, 229, 153, 0) 100%); border-bottom: 2px solid #00e599; border-radius: 4px;"></div>
          </div>
        </td>
      </tr>
    </table>

    <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 14px; letter-spacing: -0.3px;">
      Your smarter investing journey starts here.
    </h1>

    <p style="font-size: 13.5px; line-height: 1.55; color: #94a3b8; margin: 0 0 16px;">
      Thanks for joining Signalist, ${params.name || 'there'}! You now have the tools to track markets, spot opportunities, and make smarter moves — all in one place. Here's what you can do right now:
    </p>

    <ul style="padding-left: 20px; margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #cbd5e1;">
      <li><strong>Set up your watchlist</strong> to follow your favorite stocks &amp; crypto</li>
      <li><strong>Create price alerts</strong> so you never miss a critical market move</li>
      <li><strong>Explore real-time data</strong> and institutional financial indicators</li>
    </ul>

    <div style="background-color: #171b26; border-left: 3px solid #fcd535; padding: 12px 14px; border-radius: 4px; margin-bottom: 24px;">
      <p style="font-size: 12.5px; line-height: 1.5; color: #94a3b8; margin: 0;">
        We'll keep you informed with timely updates, insights, and alerts — so you can focus on making the right calls.
      </p>
    </div>

    <!-- CTA Button -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="${params.dashboardUrl || '#/dashboard'}" style="display: block; width: 100%; background-color: #fcd535; color: #12141c; font-size: 14px; font-weight: 800; text-align: center; text-decoration: none; padding: 14px 0; border-radius: 6px; box-sizing: border-box;">
            Go to My Dashboard
          </a>
        </td>
      </tr>
    </table>
  `;

  return emailWrapper(content, `Welcome to Signalist, ${params.name || ''}! Start tracking markets today.`);
}

/**
 * 2 & 3. Price Alert Trigger Email (Above / Below)
 */
export function generatePriceAlertEmail(params: PriceAlertEmailParams): string {
  const isAbove = params.type === 'above';
  const bannerBg = isAbove ? '#133926' : '#4a151b';
  const bannerBorder = isAbove ? '#10b981' : '#ef4444';
  const bannerText = isAbove ? 'Price Above Reached' : 'Price Below Hit';
  const bannerColor = isAbove ? '#34d399' : '#f87171';
  const priceColor = isAbove ? '#00e599' : '#f87171';

  const content = `
    <!-- Alert Banner -->
    <div style="background-color: ${bannerBg}; border: 1px solid ${bannerBorder}; border-radius: 8px; padding: 12px 16px; text-align: center; margin-bottom: 20px;">
      <div style="font-size: 15px; font-weight: 800; color: ${bannerColor}; text-transform: uppercase; letter-spacing: 0.5px;">
        ${bannerText}
      </div>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">
        ${params.timestamp || 'Today at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>

    <!-- Stock Card -->
    <div style="background-color: #161a24; border: 1px solid #232a3b; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">
        ${params.ticker} — ${params.companyName}
      </div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">Current Price</div>
      <div style="font-size: 32px; font-weight: 900; color: ${priceColor}; font-family: monospace; letter-spacing: -0.5px;">
        ${params.currentPrice}
      </div>
    </div>

    <!-- Alert Details Box -->
    <div style="background-color: #161a24; border: 1px solid #232a3b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <div style="font-size: 12.5px; font-weight: 800; color: #ffffff; margin-bottom: 8px;">Alert Details:</div>
      <p style="font-size: 12px; color: #94a3b8; margin: 0 0 10px;">
        Your alert for <strong>${params.companyName} (${params.ticker})</strong> just triggered.
      </p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 12px; color: #cbd5e1; font-family: monospace;">
        <tr>
          <td style="padding: 3px 0; color: #64748b;">Condition:</td>
          <td align="right" style="padding: 3px 0; font-weight: 700; color: #ffffff;">Price ${isAbove ? '≥' : '≤'} ${params.conditionPrice}</td>
        </tr>
        <tr>
          <td style="padding: 3px 0; color: #64748b;">Current Price:</td>
          <td align="right" style="padding: 3px 0; font-weight: 700; color: ${priceColor};">${params.currentPrice}</td>
        </tr>
        <tr>
          <td style="padding: 3px 0; color: #64748b;">Change:</td>
          <td align="right" style="padding: 3px 0; font-weight: 700; color: ${isAbove ? '#00e599' : '#f87171'};">${params.change}</td>
        </tr>
      </table>
    </div>

    <!-- Opportunity Context -->
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
        ${isAbove ? 'Opportunity Alert:' : 'Price Dropped:'}
      </div>
      <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; margin: 0;">
        ${isAbove
          ? `${params.ticker} has reached your target price! This would be a good time to review your position and consider taking profits or adjusting your strategy.`
          : `${params.ticker} dropped below your target price. This might be a good time to buy or evaluate market dip conditions.`}
      </p>
    </div>

    <!-- CTA Button -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="${params.dashboardUrl || '#/watchlist'}" style="display: block; width: 100%; background-color: #fcd535; color: #12141c; font-size: 14px; font-weight: 800; text-align: center; text-decoration: none; padding: 14px 0; border-radius: 6px; box-sizing: border-box;">
            View Dashboard
          </a>
        </td>
      </tr>
    </table>
  `;

  return emailWrapper(content, `🔔 [${params.ticker}] just hit your alert at ${params.currentPrice}!`);
}

/**
 * 4. Re-engagement Email ("We Miss You")
 */
export function generateReEngagementEmail(params: ReEngagementEmailParams): string {
  const content = `
    <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 16px; letter-spacing: -0.3px;">
      We Miss You, ${params.name || 'Adrian'}
    </h1>

    <p style="font-size: 13.5px; line-height: 1.55; color: #94a3b8; margin: 0 0 16px;">
      Hi ${params.name || 'there'},
    </p>

    <p style="font-size: 13.5px; line-height: 1.55; color: #94a3b8; margin: 0 0 20px;">
      We noticed you haven't visited Signalist in a while. The markets have been moving, and there might be some opportunities you don't want to miss!
    </p>

    <!-- Market Update Box -->
    <div style="background-color: #161a24; border: 1px solid #232a3b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <div style="font-size: 12.5px; font-weight: 800; color: #fcd535; margin-bottom: 6px;">Market Update:</div>
      <p style="font-size: 12px; line-height: 1.5; color: #cbd5e1; margin: 0;">
        ${params.marketHighlights || 'Several stocks have seen volatile swings in the past week with significant movements, and there might be opportunities for your tracked stocks that you don\'t want to miss.'}
      </p>
    </div>

    <p style="font-size: 13px; line-height: 1.55; color: #94a3b8; margin: 0 0 24px;">
      Your watchlists are still active and ready to help you stay on top of your investments. Don't let market opportunities pass you by!
    </p>

    <!-- CTA Button -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="${params.dashboardUrl || '#/dashboard'}" style="display: block; width: 100%; background-color: #fcd535; color: #12141c; font-size: 14px; font-weight: 800; text-align: center; text-decoration: none; padding: 14px 0; border-radius: 6px; box-sizing: border-box;">
            Return to Dashboard
          </a>
        </td>
      </tr>
    </table>
  `;

  return emailWrapper(content, `[${params.name || 'Adrian'}], opportunities are waiting for you on Signalist`);
}

/**
 * 5. Daily Market News Summary Email
 */
export function generateNewsSummaryEmail(params: NewsSummaryEmailParams): string {
  const articlesHtml = params.articles.map((art) => `
    <div style="background-color: #161a24; border: 1px solid #232a3b; border-radius: 8px; padding: 18px; margin-bottom: 18px;">
      <h3 style="font-size: 14.5px; font-weight: 800; color: #ffffff; line-height: 1.4; margin: 0 0 10px;">
        ${art.title}
      </h3>
      <ul style="padding-left: 18px; margin: 0 0 12px; font-size: 12px; line-height: 1.55; color: #94a3b8;">
        ${art.bullets.map(b => `<li style="margin-bottom: 6px;">${b}</li>`).join('')}
      </ul>
      <div>
        <a href="${art.url}" style="font-size: 11.5px; font-weight: 700; color: #fcd535; text-decoration: none;">
          Read More →
        </a>
      </div>
    </div>
  `).join('');

  const content = `
    <div style="margin-bottom: 20px;">
      <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 4px; letter-spacing: -0.3px;">
        Today's Market News Summary
      </h1>
      <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">
        ${params.dateStr || 'Friday, September 5, 2025'}
      </div>
    </div>

    ${articlesHtml}

    <!-- View More in Dashboard Button -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 10px;">
      <tr>
        <td align="center">
          <a href="${params.dashboardUrl || '#/watchlist'}" style="display: block; width: 100%; background-color: #232838; color: #ffffff; border: 1px solid #333a4c; font-size: 13px; font-weight: 700; text-align: center; text-decoration: none; padding: 12px 0; border-radius: 6px; box-sizing: border-box;">
            Explore All Live News
          </a>
        </td>
      </tr>
    </table>
  `;

  return emailWrapper(content, `Today's Market News Summary - ${params.dateStr || 'Friday, September 5, 2025'}`);
}

// Affiliate Shortcodes Export
export { default as AffiliateLinkGenerator } from './AffiliateLinkGenerator';
export { default as CommissionDashboard } from './CommissionDashboard';
export { default as PayoutRequests } from './PayoutRequests';

// Shortcode Registration Map for Affiliate Components
export const affiliateShortcodes = {
  'affiliate_link_generator': {
    component: 'AffiliateLinkGenerator',
    description: 'Generate and manage affiliate links with AFFILIATE app integration',
    attributes: {}
  },
  'affiliate_commission_dashboard': {
    component: 'CommissionDashboard',
    description: 'Track commissions, earnings, and performance metrics',
    attributes: {
      dateRange: {
        type: 'select',
        options: ['7d', '30d', '90d', '1y'],
        default: '30d',
        description: 'Default date range for data display'
      }
    }
  },
  'affiliate_payout_requests': {
    component: 'PayoutRequests',
    description: 'Manage payout requests and payment methods',
    attributes: {}
  },
  'affiliate_performance_chart': {
    component: 'PerformanceChart',
    description: 'Visual performance analytics',
    attributes: {
      chartType: {
        type: 'select',
        options: ['line', 'bar', 'area', 'pie'],
        default: 'line',
        description: 'Chart visualization type'
      }
    }
  },
  'affiliate_link_stats': {
    component: 'LinkStats',
    description: 'Detailed statistics for individual affiliate links',
    attributes: {
      linkId: {
        type: 'string',
        required: false,
        description: 'Specific link ID to display stats for'
      }
    }
  },
  'affiliate_marketing_materials': {
    component: 'MarketingMaterials',
    description: 'Download banners, creatives, and marketing materials',
    attributes: {}
  },
  'affiliate_referral_tree': {
    component: 'ReferralTree',
    description: 'Multi-level affiliate network visualization',
    attributes: {
      levels: {
        type: 'number',
        default: 3,
        description: 'Number of referral levels to display'
      }
    }
  },
  'affiliate_quick_stats': {
    component: 'QuickStats',
    description: 'Compact affiliate statistics widget',
    attributes: {
      layout: {
        type: 'select',
        options: ['horizontal', 'vertical', 'grid'],
        default: 'horizontal',
        description: 'Widget layout style'
      }
    }
  },
  'affiliate_leaderboard': {
    component: 'Leaderboard',
    description: 'Top performing affiliates leaderboard',
    attributes: {
      period: {
        type: 'select',
        options: ['daily', 'weekly', 'monthly', 'alltime'],
        default: 'monthly',
        description: 'Leaderboard time period'
      },
      limit: {
        type: 'number',
        default: 10,
        description: 'Number of top affiliates to show'
      }
    }
  },
  'affiliate_tier_progress': {
    component: 'TierProgress',
    description: 'Affiliate tier level and progress tracker',
    attributes: {}
  }
};

// AFFILIATE App Integration Configuration
export const affiliateAppConfig = {
  baseUrl: process.env.NEXT_PUBLIC_AFFILIATE_APP_URL || 'https://affiliate.app',
  apiVersion: 'v1',
  platform: 'dropshipping',
  features: {
    linkGeneration: true,
    commissionTracking: true,
    payoutManagement: true,
    multiLevelSupport: true,
    realTimeSync: true,
    webhookNotifications: true
  },
  endpoints: {
    connection: '/api/v1/connection/status',
    links: '/api/v1/links',
    commissions: '/api/v1/commissions',
    payouts: '/api/v1/payouts',
    analytics: '/api/v1/analytics',
    sync: '/api/v1/sync'
  }
};

// Helper function to check AFFILIATE app connection
export const checkAffiliateAppConnection = async (): Promise<boolean> => {
  try {
    const apiKey = localStorage.getItem('affiliate_api_key');
    if (!apiKey) return false;

    const response = await fetch(`${affiliateAppConfig.baseUrl}${affiliateAppConfig.endpoints.connection}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Platform': affiliateAppConfig.platform
      }
    });

    return response.ok;
  } catch (error) {
    console.error('AFFILIATE app connection error:', error);
    return false;
  }
};

// Export all affiliate utilities
export * from './utils';
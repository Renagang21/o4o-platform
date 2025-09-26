// Partner Shortcodes Export
export { default as PartnerLinkGenerator } from './PartnerLinkGenerator';
export { default as CommissionDashboard } from './CommissionDashboard';
export { default as PayoutRequests } from './PayoutRequests';

// Shortcode Registration Map for Partner Components
export const partnerShortcodes = {
  'partner_link_generator': {
    component: 'PartnerLinkGenerator',
    description: 'Generate and manage partner links with PARTNER app integration',
    attributes: {}
  },
  'partner_commission_dashboard': {
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
  'partner_payout_requests': {
    component: 'PayoutRequests',
    description: 'Manage payout requests and payment methods',
    attributes: {}
  },
  'partner_performance_chart': {
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
  'partner_link_stats': {
    component: 'LinkStats',
    description: 'Detailed statistics for individual partner links',
    attributes: {
      linkId: {
        type: 'string',
        required: false,
        description: 'Specific link ID to display stats for'
      }
    }
  },
  'partner_marketing_materials': {
    component: 'MarketingMaterials',
    description: 'Download banners, creatives, and marketing materials',
    attributes: {}
  },
  'partner_referral_tree': {
    component: 'ReferralTree',
    description: 'Multi-level partner network visualization',
    attributes: {
      levels: {
        type: 'number',
        default: 3,
        description: 'Number of referral levels to display'
      }
    }
  },
  'partner_quick_stats': {
    component: 'QuickStats',
    description: 'Compact partner statistics widget',
    attributes: {
      layout: {
        type: 'select',
        options: ['horizontal', 'vertical', 'grid'],
        default: 'horizontal',
        description: 'Widget layout style'
      }
    }
  },
  'partner_leaderboard': {
    component: 'Leaderboard',
    description: 'Top performing partners leaderboard',
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
        description: 'Number of top partners to show'
      }
    }
  },
  'partner_tier_progress': {
    component: 'TierProgress',
    description: 'Partner tier level and progress tracker',
    attributes: {}
  }
};

// PARTNER App Integration Configuration
export const partnerAppConfig = {
  baseUrl: process.env.NEXT_PUBLIC_PARTNER_APP_URL || 'https://partner.app',
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

// Helper function to check PARTNER app connection
export const checkPartnerAppConnection = async (): Promise<boolean> => {
  try {
    const apiKey = localStorage.getItem('partner_api_key');
    if (!apiKey) return false;

    const response = await fetch(`${partnerAppConfig.baseUrl}${partnerAppConfig.endpoints.connection}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Platform': partnerAppConfig.platform
      }
    });

    return response.ok;
  } catch (error) {
    // Error log removed
    return false;
  }
};

// Export all partner utilities
export * from './utils';
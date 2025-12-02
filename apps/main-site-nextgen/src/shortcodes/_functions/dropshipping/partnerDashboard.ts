import type { FunctionComponent } from '@/components/registry/function';

export const partnerDashboard: FunctionComponent = (props, context) => {
  const data = props.data || {};

  return {
    type: 'DropshippingDashboard',
    props: {
      title: 'Partner Dashboard',
      kpis: [
        {
          label: 'Total Commissions',
          value: `₩${(data.totalCommissions || 0).toLocaleString()}`,
          icon: 'dollar',
          color: 'green',
        },
        {
          label: 'Pending Payouts',
          value: `₩${(data.pendingPayouts || 0).toLocaleString()}`,
          icon: 'clock',
          color: 'yellow',
        },
        {
          label: 'Active Referrals',
          value: data.activeReferrals || 0,
          icon: 'users',
          color: 'blue',
        },
        {
          label: 'Clicks This Month',
          value: data.clicksThisMonth || 0,
          icon: 'mouse',
          color: 'purple',
        },
        {
          label: 'Conversion Rate',
          value: `${((data.conversionRate || 0) * 100).toFixed(1)}%`,
          icon: 'trending-up',
          color: 'green',
        },
      ],
    },
  };
};

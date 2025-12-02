import type { FunctionComponent } from '@/components/registry/function';

export const adminDashboard: FunctionComponent = (props, _context) => {
  const data = props.data || {};

  return {
    type: 'AdminDashboardPanel',
    props: {
      stats: data.stats || {},
      recentActivity: data.recentActivity || [],
    },
  };
};

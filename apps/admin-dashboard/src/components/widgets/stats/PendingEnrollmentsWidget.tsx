/**
 * P1 Phase C: Pending Enrollments Stat Widget
 *
 * Shows count of pending enrollment applications (Admin only).
 */

import { FC } from 'react';
import { Users } from 'lucide-react';
import { StatWidget } from '../StatWidget';
import type { DashboardWidgetProps, StatWidgetData } from '@o4o/types';

export const PendingEnrollmentsWidget: FC<DashboardWidgetProps<StatWidgetData>> = ({
  dataState,
}) => {
  if (!dataState.data) return null;

  return <StatWidget data={dataState.data} icon={<Users className="w-5 h-5" />} color="yellow" />;
};

export default PendingEnrollmentsWidget;

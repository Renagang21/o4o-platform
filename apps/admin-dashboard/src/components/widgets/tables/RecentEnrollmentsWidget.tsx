/**
 * P1 Phase C: Recent Enrollments Table Widget
 *
 * Shows recent enrollment applications (Admin only).
 */

import { FC } from 'react';
import { TableWidget } from '../TableWidget';
import type { DashboardWidgetProps, TableWidgetData } from '@o4o/types';

export const RecentEnrollmentsWidget: FC<DashboardWidgetProps<TableWidgetData>> = ({
  dataState,
}) => {
  if (!dataState.data) return null;

  return <TableWidget data={dataState.data} />;
};

export default RecentEnrollmentsWidget;

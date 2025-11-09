/**
 * P1 Phase C: Pending Orders Table Widget
 *
 * Shows recent pending orders.
 */

import { FC } from 'react';
import { TableWidget } from '../TableWidget';
import type { DashboardWidgetProps, TableWidgetData } from '@o4o/types';

export const PendingOrdersWidget: FC<DashboardWidgetProps<TableWidgetData>> = ({
  dataState,
}) => {
  if (!dataState.data) return null;

  return <TableWidget data={dataState.data} />;
};

export default PendingOrdersWidget;

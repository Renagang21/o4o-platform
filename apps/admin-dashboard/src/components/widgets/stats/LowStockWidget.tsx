/**
 * P1 Phase C: Low Stock Alert Stat Widget
 *
 * Shows count of products with low stock (Supplier only).
 */

import { FC } from 'react';
import { AlertTriangle } from 'lucide-react';
import { StatWidget } from '../StatWidget';
import type { DashboardWidgetProps, StatWidgetData } from '@o4o/types';

export const LowStockWidget: FC<DashboardWidgetProps<StatWidgetData>> = ({ dataState }) => {
  if (!dataState.data) return null;

  return <StatWidget data={dataState.data} icon={<AlertTriangle className="w-5 h-5" />} color="red" />;
};

export default LowStockWidget;

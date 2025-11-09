/**
 * P1 Phase C: Today Orders Stat Widget
 *
 * Shows count of orders placed today.
 */

import { FC } from 'react';
import { ShoppingCart } from 'lucide-react';
import { StatWidget } from '../StatWidget';
import type { DashboardWidgetProps, StatWidgetData } from '@o4o/types';

export const TodayOrdersWidget: FC<DashboardWidgetProps<StatWidgetData>> = ({ dataState }) => {
  if (!dataState.data) return null;

  return <StatWidget data={dataState.data} icon={<ShoppingCart className="w-5 h-5" />} color="blue" />;
};

export default TodayOrdersWidget;

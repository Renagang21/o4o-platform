/**
 * P1 Phase C: Monthly Revenue Stat Widget
 *
 * Shows total revenue for current month.
 */

import { FC } from 'react';
import { DollarSign } from 'lucide-react';
import { StatWidget } from '../StatWidget';
import type { DashboardWidgetProps, StatWidgetData } from '@o4o/types';

export const MonthlyRevenueWidget: FC<DashboardWidgetProps<StatWidgetData>> = ({ dataState }) => {
  if (!dataState.data) return null;

  return <StatWidget data={dataState.data} icon={<DollarSign className="w-5 h-5" />} color="green" />;
};

export default MonthlyRevenueWidget;

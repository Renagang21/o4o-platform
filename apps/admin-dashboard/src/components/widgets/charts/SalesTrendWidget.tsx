/**
 * P1 Phase C: Sales Trend Chart Widget
 *
 * Shows 7-day sales trend (simplified, no chart library yet).
 */

import { FC } from 'react';
import type { DashboardWidgetProps, ChartWidgetData } from '@o4o/types';

export const SalesTrendWidget: FC<DashboardWidgetProps<ChartWidgetData>> = ({ dataState }) => {
  if (!dataState.data) return null;

  const { data, yAxisLabel } = dataState.data;
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="space-y-4">
      {/* Simple Bar Chart */}
      <div className="flex items-end justify-between h-40 px-2">
        {data.map((point, index) => {
          const height = (point.value / maxValue) * 100;

          return (
            <div key={index} className="flex flex-col items-center flex-1 space-y-2">
              <div className="text-xs font-medium text-gray-600">
                {(point.value / 10000).toFixed(0)}만
              </div>
              <div
                className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-all"
                style={{ height: `${height}%`, minHeight: '4px' }}
                title={`${point.label}: ${point.value.toLocaleString()}원`}
              />
              <div className="text-xs text-gray-500">{point.label}</div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="text-center text-sm text-gray-600">
        {yAxisLabel || '매출액'}
      </div>
    </div>
  );
};

export default SalesTrendWidget;

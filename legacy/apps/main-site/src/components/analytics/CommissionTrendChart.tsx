/**
 * Commission Trend Chart Component
 * Phase 7: Line chart showing commission over time (30 days)
 */

import React from 'react';
import type { TimeseriesResponse } from '../../services/analyticsApi';

interface CommissionTrendChartProps {
  data: TimeseriesResponse['data'] | undefined;
  loading: boolean;
}

export const CommissionTrendChart: React.FC<CommissionTrendChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!data || !data.dataPoints || data.dataPoints.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">커미션 추이 (최근 30일)</h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">데이터가 없습니다</p>
          </div>
        </div>
      </div>
    );
  }

  const { dataPoints, summary } = data;

  // Calculate SVG dimensions and scaling
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...dataPoints.map(d => d.value), 1);
  const minValue = Math.min(...dataPoints.map(d => d.value), 0);
  const valueRange = maxValue - minValue;

  const xScale = chartWidth / Math.max(dataPoints.length - 1, 1);
  const yScale = chartHeight / (valueRange || 1);

  // Generate line path
  const linePath = dataPoints.map((point, index) => {
    const x = padding.left + index * xScale;
    const y = padding.top + chartHeight - (point.value - minValue) * yScale;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate area path (for fill)
  const areaPath = linePath +
    ` L ${padding.left + (dataPoints.length - 1) * xScale} ${padding.top + chartHeight}` +
    ` L ${padding.left} ${padding.top + chartHeight} Z`;

  // Format date for display
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Get y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => ({
    value: minValue + valueRange * ratio,
    y: padding.top + chartHeight - chartHeight * ratio
  }));

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">커미션 추이 (최근 30일)</h3>
          <p className="text-sm text-gray-500 mt-1">
            합계: ₩{summary.total.toLocaleString()} / 평균: ₩{Math.round(summary.average).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height}
          className="mx-auto"
          style={{ minWidth: '600px' }}
        >
          {/* Grid lines */}
          {yTicks.map((tick, index) => (
            <g key={index}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={padding.left + chartWidth}
                y2={tick.y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#6b7280"
              >
                ₩{Math.round(tick.value / 1000)}k
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#gradient)"
            opacity="0.2"
          />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {dataPoints.map((point, index) => {
            const x = padding.left + index * xScale;
            const y = padding.top + chartHeight - (point.value - minValue) * yScale;

            // Only show labels for a subset of points to avoid clutter
            const showLabel = index % Math.ceil(dataPoints.length / 6) === 0 || index === dataPoints.length - 1;

            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#8b5cf6"
                  className="hover:r-5 transition-all"
                />
                {showLabel && (
                  <text
                    x={x}
                    y={padding.top + chartHeight + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#6b7280"
                  >
                    {formatDate(point.timestamp)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

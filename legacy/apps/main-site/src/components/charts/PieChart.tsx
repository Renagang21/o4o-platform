/**
 * Pie/Donut Chart Component
 * Phase PD-6: Dashboard UX Enhancement
 * Used for: Top Products, Category breakdown, Status distribution
 */

import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

export interface PieChartProps {
  /** Chart title */
  title?: string;
  /** Chart data series (values) */
  series: number[];
  /** Labels for each slice */
  labels: string[];
  /** Chart height */
  height?: number;
  /** Chart colors */
  colors?: string[];
  /** Loading state */
  loading?: boolean;
  /** Chart type: pie or donut */
  variant?: 'pie' | 'donut';
  /** Show legend */
  showLegend?: boolean;
  /** Value formatter */
  valueFormatter?: (value: number) => string;
}

const defaultColors = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#14B8A6',
];

export const PieChart: React.FC<PieChartProps> = ({
  title,
  series,
  labels,
  height = 350,
  colors = defaultColors,
  loading = false,
  variant = 'donut',
  showLegend = true,
  valueFormatter,
}) => {
  const options: ApexOptions = {
    chart: {
      type: variant,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
        },
      },
    },
    colors: colors,
    labels: labels,
    title: title
      ? {
          text: title,
          align: 'left',
          style: {
            fontSize: '16px',
            fontWeight: '600',
            color: '#1F2937',
          },
        }
      : undefined,
    legend: {
      show: showLegend,
      position: 'bottom',
      fontSize: '12px',
      fontWeight: 500,
      labels: {
        colors: '#6B7280',
      },
      markers: {
        width: 12,
        height: 12,
        radius: 2,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => {
        return `${val.toFixed(1)}%`;
      },
      style: {
        fontSize: '12px',
        fontWeight: 600,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: variant === 'donut' ? '65%' : '0%',
          labels: {
            show: variant === 'donut',
            name: {
              show: true,
              fontSize: '14px',
              fontWeight: 600,
              color: '#1F2937',
            },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: 700,
              color: '#1F2937',
              formatter: valueFormatter,
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              fontWeight: 600,
              color: '#6B7280',
              formatter: (w) => {
                const total = w.globals.seriesTotals.reduce(
                  (a: number, b: number) => a + b,
                  0
                );
                return valueFormatter ? valueFormatter(total) : total.toString();
              },
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: valueFormatter,
      },
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: '100%',
          },
          legend: {
            position: 'bottom',
          },
        },
      },
    ],
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-80 bg-gray-100 rounded-full mx-auto max-w-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <Chart options={options} series={series} type={variant} height={height} />
    </div>
  );
};

export default PieChart;

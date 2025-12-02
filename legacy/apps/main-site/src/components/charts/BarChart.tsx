/**
 * Bar Chart Component
 * Phase PD-6: Dashboard UX Enhancement
 * Used for: Monthly settlements, Revenue comparison, Order volumes
 */

import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

export interface BarChartProps {
  /** Chart title */
  title?: string;
  /** Chart data series */
  series: {
    name: string;
    data: number[];
  }[];
  /** X-axis categories (labels) */
  categories: string[];
  /** Chart height */
  height?: number;
  /** Chart colors */
  colors?: string[];
  /** Loading state */
  loading?: boolean;
  /** Horizontal bars */
  horizontal?: boolean;
  /** Show data labels */
  showDataLabels?: boolean;
  /** Stacked bars */
  stacked?: boolean;
  /** Y-axis formatter */
  yAxisFormatter?: (value: number) => string;
  /** Tooltip formatter */
  tooltipFormatter?: (value: number) => string;
}

const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const BarChart: React.FC<BarChartProps> = ({
  title,
  series,
  categories,
  height = 350,
  colors = defaultColors,
  loading = false,
  horizontal = false,
  showDataLabels = false,
  stacked = false,
  yAxisFormatter,
  tooltipFormatter,
}) => {
  const options: ApexOptions = {
    chart: {
      type: 'bar',
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
      stacked: stacked,
    },
    colors: colors,
    plotOptions: {
      bar: {
        horizontal: horizontal,
        columnWidth: '60%',
        borderRadius: 4,
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: showDataLabels,
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: ['#6B7280'],
      },
    },
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
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
    },
    xaxis: {
      categories: categories,
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: '12px',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: '12px',
        },
        formatter: yAxisFormatter,
      },
    },
    tooltip: {
      y: {
        formatter: tooltipFormatter,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      fontWeight: 500,
      labels: {
        colors: '#6B7280',
      },
    },
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-80 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <Chart options={options} series={series} type="bar" height={height} />
    </div>
  );
};

export default BarChart;

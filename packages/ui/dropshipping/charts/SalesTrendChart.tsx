import React, { useState, useMemo } from 'react';
import { Calendar, TrendingUp, BarChart3, LineChart, Filter } from 'lucide-react';

interface SalesData {
  date: string;
  sales: number;
  orders: number;
  avgOrder: number;
  lastYearSales?: number;
}

interface SalesTrendChartProps {
  data: SalesData[];
  height?: number;
  onPointClick?: (data: SalesData) => void;
  className?: string;
}

type ChartType = 'line' | 'bar' | 'combo';
type TimeRange = '7d' | '30d' | '3m';

const timeRangeLabels = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  '3m': '최근 3개월'
};

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
  data,
  height = 400,
  onPointClick,
  className = ''
}) => {
  const [chartType, setChartType] = useState<ChartType>('combo');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(true);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return data.slice(-days);
  }, [data, timeRange]);

  // Calculate chart dimensions and scales
  const chartWidth = 800;
  const chartHeight = height - 100; // Reserve space for axes and controls
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxSales = Math.max(...filteredData.map(d => d.sales));
  const minSales = Math.min(...filteredData.map(d => d.sales));
  const maxOrders = Math.max(...filteredData.map(d => d.orders));
  const salesRange = maxSales - minSales || 1;
  const ordersRange = maxOrders || 1;

  // Generate chart points
  const salesPoints = filteredData.map((d, i) => ({
    x: padding.left + (i / Math.max(filteredData.length - 1, 1)) * innerWidth,
    y: padding.top + innerHeight - ((d.sales - minSales) / salesRange) * innerHeight,
    data: d,
    index: i
  }));

  const orderBars = filteredData.map((d, i) => ({
    x: padding.left + (i / Math.max(filteredData.length - 1, 1)) * innerWidth - 8,
    y: padding.top + innerHeight - (d.orders / ordersRange) * innerHeight,
    width: 16,
    height: (d.orders / ordersRange) * innerHeight,
    data: d,
    index: i
  }));

  // Comparison line (last year)
  const comparisonPoints = showComparison && filteredData.some(d => d.lastYearSales) 
    ? filteredData.map((d, i) => ({
        x: padding.left + (i / Math.max(filteredData.length - 1, 1)) * innerWidth,
        y: d.lastYearSales 
          ? padding.top + innerHeight - ((d.lastYearSales - minSales) / salesRange) * innerHeight
          : null,
        data: d,
        index: i
      })).filter(p => p.y !== null)
    : [];

  // Create path for line chart
  const salesPath = salesPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  const comparisonPath = comparisonPoints.length > 0 
    ? comparisonPoints.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
      ).join(' ')
    : '';

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* Header Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">매출 추이 분석</h3>
            <p className="text-sm text-gray-500 mt-1">일별 매출 및 주문 현황</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Chart Type Selector */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setChartType('line')}
                className={`p-2 rounded-md transition-colors ${
                  chartType === 'line' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <LineChart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`p-2 rounded-md transition-colors ${
                  chartType === 'bar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('combo')}
                className={`p-2 rounded-md transition-colors ${
                  chartType === 'combo' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </button>
            </div>

            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(timeRangeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Comparison Toggle */}
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                showComparison 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'bg-gray-50 text-gray-600 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              전년 비교
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
            <span className="text-gray-700">매출</span>
          </div>
          {chartType === 'combo' && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded opacity-70"></div>
              <span className="text-gray-700">주문 수</span>
            </div>
          )}
          {showComparison && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-gray-400 rounded border-2 border-gray-400" style={{ borderStyle: 'dashed' }}></div>
              <span className="text-gray-700">전년 동기</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-6">
        <div className="relative">
          <svg 
            width="100%" 
            height={height}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="overflow-visible"
          >
            {/* Grid Lines */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
              </pattern>
            </defs>
            
            {/* Y-axis grid lines */}
            {Array.from({ length: 5 }, (_, i) => {
              const y = padding.top + (i / 4) * innerHeight;
              const value = maxSales - (i / 4) * salesRange;
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + innerWidth}
                    y2={y}
                    stroke="#f3f4f6"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-xs fill-gray-500"
                  >
                    {formatCurrency(value)}
                  </text>
                </g>
              );
            })}

            {/* X-axis */}
            <line
              x1={padding.left}
              y1={padding.top + innerHeight}
              x2={padding.left + innerWidth}
              y2={padding.top + innerHeight}
              stroke="#e5e7eb"
              strokeWidth="1"
            />

            {/* Y-axis */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + innerHeight}
              stroke="#e5e7eb"
              strokeWidth="1"
            />

            {/* Chart Content */}
            <g>
              {/* Order Bars (for combo chart) */}
              {chartType === 'combo' && orderBars.map((bar, i) => (
                <rect
                  key={`bar-${i}`}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  fill="#f97316"
                  opacity="0.7"
                  rx="2"
                  className="hover:opacity-90 transition-opacity cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onClick={() => onPointClick?.(bar.data)}
                />
              ))}

              {/* Comparison Line (Last Year) */}
              {showComparison && comparisonPath && (
                <path
                  d={comparisonPath}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.8"
                />
              )}

              {/* Main Sales Line */}
              {(chartType === 'line' || chartType === 'combo') && (
                <>
                  <path
                    d={salesPath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Sales Line Points */}
                  {salesPoints.map((point, i) => (
                    <circle
                      key={`point-${i}`}
                      cx={point.x}
                      cy={point.y}
                      r={hoveredPoint === i ? "6" : "4"}
                      fill="#3b82f6"
                      className="hover:r-6 transition-all cursor-pointer"
                      onMouseEnter={() => setHoveredPoint(i)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => onPointClick?.(point.data)}
                    />
                  ))}
                </>
              )}

              {/* Sales Bars (for bar chart) */}
              {chartType === 'bar' && salesPoints.map((point, i) => {
                const barHeight = (point.data.sales / maxSales) * innerHeight;
                const barY = padding.top + innerHeight - barHeight;
                
                return (
                  <rect
                    key={`sales-bar-${i}`}
                    x={point.x - 12}
                    y={barY}
                    width={24}
                    height={barHeight}
                    fill="#3b82f6"
                    rx="4"
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => onPointClick?.(point.data)}
                  />
                );
              })}
            </g>

            {/* X-axis Labels */}
            {filteredData.map((d, i) => {
              const x = padding.left + (i / Math.max(filteredData.length - 1, 1)) * innerWidth;
              const showLabel = filteredData.length <= 14 || i % Math.ceil(filteredData.length / 8) === 0;
              
              return showLabel ? (
                <text
                  key={`label-${i}`}
                  x={x}
                  y={padding.top + innerHeight + 25}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                >
                  {formatDate(d.date)}
                </text>
              ) : null;
            })}

            {/* Tooltip */}
            {hoveredPoint !== null && (
              <g>
                {(() => {
                  const point = salesPoints[hoveredPoint];
                  const data = point.data;
                  const tooltipWidth = 200;
                  const tooltipHeight = 120;
                  const tooltipX = Math.min(point.x - tooltipWidth / 2, chartWidth - tooltipWidth - 10);
                  const tooltipY = Math.max(point.y - tooltipHeight - 10, 10);

                  return (
                    <>
                      <rect
                        x={tooltipX}
                        y={tooltipY}
                        width={tooltipWidth}
                        height={tooltipHeight}
                        fill="white"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        rx="8"
                        className="drop-shadow-lg"
                      />
                      <text x={tooltipX + 12} y={tooltipY + 20} className="text-sm font-semibold fill-gray-900">
                        {formatDate(data.date)}
                      </text>
                      <text x={tooltipX + 12} y={tooltipY + 40} className="text-sm fill-gray-700">
                        매출: {formatCurrency(data.sales)}
                      </text>
                      <text x={tooltipX + 12} y={tooltipY + 58} className="text-sm fill-gray-700">
                        주문: {data.orders.toLocaleString()}건
                      </text>
                      <text x={tooltipX + 12} y={tooltipY + 76} className="text-sm fill-gray-700">
                        평균 주문액: {formatCurrency(data.avgOrder)}
                      </text>
                      {data.lastYearSales && (
                        <text x={tooltipX + 12} y={tooltipY + 94} className="text-sm fill-gray-500">
                          전년: {formatCurrency(data.lastYearSales)}
                        </text>
                      )}
                    </>
                  );
                })()}
              </g>
            )}
          </svg>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            {
              label: '총 매출',
              value: formatCurrency(filteredData.reduce((sum, d) => sum + d.sales, 0)),
              change: '+12.5%'
            },
            {
              label: '총 주문',
              value: filteredData.reduce((sum, d) => sum + d.orders, 0).toLocaleString() + '건',
              change: '+8.2%'
            },
            {
              label: '평균 주문액',
              value: formatCurrency(filteredData.reduce((sum, d) => sum + d.avgOrder, 0) / filteredData.length),
              change: '+3.1%'
            },
            {
              label: '일평균 매출',
              value: formatCurrency(filteredData.reduce((sum, d) => sum + d.sales, 0) / filteredData.length),
              change: '+15.7%'
            }
          ].map((stat, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
              <div className="text-lg font-bold text-gray-900 mt-1">{stat.value}</div>
              <div className="text-xs text-green-600 font-medium mt-1">{stat.change}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
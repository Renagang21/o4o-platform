import React, { useState, useMemo } from 'react';
import { Package, TrendingUp, Eye, ShoppingCart } from 'lucide-react';

interface CategoryData {
  name: string;
  value: number;
  sales: number;
  color: string;
  products: number;
  growth: number;
}

interface ProductPerformanceChartProps {
  data: CategoryData[];
  onSegmentClick?: (category: CategoryData) => void;
  className?: string;
}

export const ProductPerformanceChart: React.FC<ProductPerformanceChartProps> = ({
  data,
  onSegmentClick,
  className = ''
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<number>>(new Set());

  // Filter out hidden categories
  const visibleData = data.filter((_, index) => !hiddenCategories.has(index));
  const total = visibleData.reduce((sum, item) => sum + item.value, 0);

  // Calculate angles for each segment
  const segments = useMemo(() => {
    let currentAngle = -90; // Start from top
    
    return visibleData.map((item, index) => {
      const percentage = item.value / total;
      const angle = percentage * 360;
      const segment = {
        ...item,
        originalIndex: data.findIndex(d => d.name === item.name),
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        percentage,
        isHovered: hoveredSegment === data.findIndex(d => d.name === item.name)
      };
      currentAngle += angle;
      return segment;
    });
  }, [visibleData, total, hoveredSegment, data]);

  // SVG path generation for donut segments
  const createPath = (centerX: number, centerY: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + innerRadius * Math.cos(startAngleRad);
    const y1 = centerY + innerRadius * Math.sin(startAngleRad);
    const x2 = centerX + outerRadius * Math.cos(startAngleRad);
    const y2 = centerY + outerRadius * Math.sin(startAngleRad);

    const x3 = centerX + outerRadius * Math.cos(endAngleRad);
    const y3 = centerY + outerRadius * Math.sin(endAngleRad);
    const x4 = centerX + innerRadius * Math.cos(endAngleRad);
    const y4 = centerY + innerRadius * Math.sin(endAngleRad);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", x1, y1,
      "L", x2, y2,
      "A", outerRadius, outerRadius, 0, largeArcFlag, 1, x3, y3,
      "L", x4, y4,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 0, x1, y1,
      "Z"
    ].join(" ");
  };

  const centerX = 200;
  const centerY = 200;
  const innerRadius = 80;
  const outerRadius = 160;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const toggleCategory = (index: number) => {
    const newHiddenCategories = new Set(hiddenCategories);
    if (newHiddenCategories.has(index)) {
      newHiddenCategories.delete(index);
    } else {
      newHiddenCategories.add(index);
    }
    setHiddenCategories(newHiddenCategories);
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">카테고리별 성과</h3>
            <p className="text-sm text-gray-500 mt-1">매출 비중 및 성장률</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="w-4 h-4" />
            <span>총 {data.reduce((sum, d) => sum + d.products, 0)}개 상품</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart */}
          <div className="relative">
            <svg width="400" height="400" className="overflow-visible">
              {/* Donut Segments */}
              {segments.map((segment, index) => {
                const hoverRadius = segment.isHovered ? outerRadius + 10 : outerRadius;
                const path = createPath(
                  centerX,
                  centerY,
                  innerRadius,
                  hoverRadius,
                  segment.startAngle,
                  segment.endAngle
                );

                return (
                  <g key={segment.name}>
                    <path
                      d={path}
                      fill={segment.color}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer transition-all duration-300 hover:brightness-110"
                      onMouseEnter={() => setHoveredSegment(segment.originalIndex)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => onSegmentClick?.(segment)}
                    />
                    
                    {/* Percentage Labels */}
                    {segment.percentage > 0.05 && (() => {
                      const labelAngle = (segment.startAngle + segment.endAngle) / 2;
                      const labelRadius = (innerRadius + hoverRadius) / 2;
                      const labelX = centerX + labelRadius * Math.cos((labelAngle * Math.PI) / 180);
                      const labelY = centerY + labelRadius * Math.sin((labelAngle * Math.PI) / 180);

                      return (
                        <text
                          x={labelX}
                          y={labelY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-sm font-semibold fill-white"
                        >
                          {(segment.percentage * 100).toFixed(1)}%
                        </text>
                      );
                    })()}
                  </g>
                );
              })}

              {/* Center Content */}
              <g>
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={innerRadius - 5}
                  fill="#f9fafb"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={centerX}
                  y={centerY - 15}
                  textAnchor="middle"
                  className="text-sm font-medium fill-gray-600"
                >
                  총 매출
                </text>
                <text
                  x={centerX}
                  y={centerY + 5}
                  textAnchor="middle"
                  className="text-lg font-bold fill-gray-900"
                >
                  {formatCurrency(data.reduce((sum, d) => sum + d.sales, 0))}
                </text>
                <text
                  x={centerX}
                  y={centerY + 25}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                >
                  이번 달
                </text>
              </g>

              {/* Hover Tooltip */}
              {hoveredSegment !== null && (() => {
                const segment = segments.find(s => s.originalIndex === hoveredSegment);
                if (!segment) return null;

                const tooltipAngle = (segment.startAngle + segment.endAngle) / 2;
                const tooltipRadius = outerRadius + 40;
                const tooltipX = centerX + tooltipRadius * Math.cos((tooltipAngle * Math.PI) / 180);
                const tooltipY = centerY + tooltipRadius * Math.sin((tooltipAngle * Math.PI) / 180);

                return (
                  <g>
                    <rect
                      x={tooltipX - 80}
                      y={tooltipY - 40}
                      width="160"
                      height="80"
                      fill="white"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      rx="8"
                      className="drop-shadow-lg"
                    />
                    <text x={tooltipX} y={tooltipY - 20} textAnchor="middle" className="text-sm font-semibold fill-gray-900">
                      {segment.name}
                    </text>
                    <text x={tooltipX} y={tooltipY - 2} textAnchor="middle" className="text-sm fill-gray-700">
                      {formatCurrency(segment.sales)}
                    </text>
                    <text x={tooltipX} y={tooltipY + 16} textAnchor="middle" className="text-sm fill-gray-700">
                      {segment.products}개 상품
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Legend and Stats */}
          <div className="space-y-6">
            {/* Legend */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">카테고리</h4>
              <div className="space-y-2">
                {data.map((item, index) => {
                  const isHidden = hiddenCategories.has(index);
                  const isHovered = hoveredSegment === index;
                  
                  return (
                    <div
                      key={item.name}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        isHovered ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                      } ${isHidden ? 'opacity-50' : ''}`}
                      onMouseEnter={() => setHoveredSegment(index)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => toggleCategory(index)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.products}개 상품</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {((item.value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%
                        </div>
                        <div className={`text-xs font-medium flex items-center gap-1 ${
                          item.growth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <TrendingUp className={`w-3 h-3 ${item.growth < 0 ? 'rotate-180' : ''}`} />
                          {item.growth > 0 ? '+' : ''}{item.growth}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">성과 요약</h4>
              <div className="space-y-3">
                {[
                  {
                    icon: ShoppingCart,
                    label: '베스트 카테고리',
                    value: data.reduce((best, current) => current.sales > best.sales ? current : best, data[0])?.name,
                    color: 'text-blue-700'
                  },
                  {
                    icon: TrendingUp,
                    label: '최고 성장률',
                    value: `+${Math.max(...data.map(d => d.growth))}%`,
                    color: 'text-green-700'
                  },
                  {
                    icon: Eye,
                    label: '집중 관리 필요',
                    value: data.filter(d => d.growth < 0).length + '개 카테고리',
                    color: 'text-orange-700'
                  }
                ].map((stat, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <div>
                      <div className="text-xs text-blue-700 font-medium">{stat.label}</div>
                      <div className="text-sm font-semibold text-blue-900">{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">빠른 작업</h4>
              <div className="grid grid-cols-2 gap-2">
                <button className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
                  상품 추가
                </button>
                <button className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  분석 보고서
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
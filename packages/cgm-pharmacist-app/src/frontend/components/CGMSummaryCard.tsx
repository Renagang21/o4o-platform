/**
 * CGM Summary Card Component
 *
 * CGM 데이터 요약 카드
 */

import React from 'react';
import type { CGMSummaryDetail } from '../../backend/dto/index.js';

interface CGMSummaryCardProps {
  summary: CGMSummaryDetail;
}

export const CGMSummaryCard: React.FC<CGMSummaryCardProps> = ({ summary }) => {
  const { metrics, timeInRange, trend, period } = summary;

  // Time in Range 바 색상
  const tirColors = {
    veryLow: 'bg-red-600',
    low: 'bg-red-400',
    inRange: 'bg-green-500',
    high: 'bg-yellow-400',
    veryHigh: 'bg-orange-500',
  };

  const trendText = {
    improved: { text: '개선됨', color: 'text-green-600', icon: '↑' },
    worsened: { text: '악화됨', color: 'text-red-600', icon: '↓' },
    stable: { text: '유지', color: 'text-gray-600', icon: '→' },
  };

  const trendInfo = trendText[trend.comparedToPrevious];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">CGM 요약</h3>
        <span className="text-sm text-gray-500">
          {period.from} ~ {period.to} ({period.days}일)
        </span>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{metrics.averageGlucose}</div>
          <div className="text-xs text-gray-500">평균 혈당 (mg/dL)</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{metrics.estimatedA1C.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">추정 A1C</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{metrics.glucoseManagementIndicator.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">GMI</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{metrics.coefficientOfVariation}%</div>
          <div className="text-xs text-gray-500">변동계수 (CV)</div>
        </div>
      </div>

      {/* Time in Range 바 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">목표 범위 내 시간 (TIR)</span>
          <span className="text-lg font-bold text-green-600">{timeInRange.inRange}%</span>
        </div>
        <div className="flex h-6 rounded-full overflow-hidden">
          {timeInRange.veryLow > 0 && (
            <div
              className={`${tirColors.veryLow} flex items-center justify-center text-xs text-white`}
              style={{ width: `${timeInRange.veryLow}%` }}
            >
              {timeInRange.veryLow > 5 && `${timeInRange.veryLow}%`}
            </div>
          )}
          {timeInRange.low > 0 && (
            <div
              className={`${tirColors.low} flex items-center justify-center text-xs text-white`}
              style={{ width: `${timeInRange.low}%` }}
            >
              {timeInRange.low > 5 && `${timeInRange.low}%`}
            </div>
          )}
          <div
            className={`${tirColors.inRange} flex items-center justify-center text-xs text-white font-medium`}
            style={{ width: `${timeInRange.inRange}%` }}
          >
            {timeInRange.inRange}%
          </div>
          {timeInRange.high > 0 && (
            <div
              className={`${tirColors.high} flex items-center justify-center text-xs text-gray-800`}
              style={{ width: `${timeInRange.high}%` }}
            >
              {timeInRange.high > 5 && `${timeInRange.high}%`}
            </div>
          )}
          {timeInRange.veryHigh > 0 && (
            <div
              className={`${tirColors.veryHigh} flex items-center justify-center text-xs text-white`}
              style={{ width: `${timeInRange.veryHigh}%` }}
            >
              {timeInRange.veryHigh > 5 && `${timeInRange.veryHigh}%`}
            </div>
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>매우낮음 (&lt;54)</span>
          <span>낮음 (54-69)</span>
          <span>목표범위 (70-180)</span>
          <span>높음 (181-250)</span>
          <span>매우높음 (&gt;250)</span>
        </div>
      </div>

      {/* 트렌드 */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-700">이전 기간 대비</span>
        <span className={`flex items-center gap-1 font-medium ${trendInfo.color}`}>
          <span>{trendInfo.icon}</span>
          <span>{trendInfo.text}</span>
          {trend.changePercent !== undefined && (
            <span className="text-sm">({trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%)</span>
          )}
        </span>
      </div>
    </div>
  );
};

export default CGMSummaryCard;

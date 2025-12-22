/**
 * Patient Card Component
 *
 * 환자 요약 카드 (리스트 화면용)
 */

import React from 'react';
import type { PatientSummary, RiskLevel, GlucoseTrend } from '../../backend/dto/index.js';

interface PatientCardProps {
  patient: PatientSummary;
  onClick?: () => void;
}

// 위험 수준 색상
const riskColors: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  normal: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

const riskLabels: Record<RiskLevel, string> = {
  high: '주의 필요',
  medium: '관찰 필요',
  low: '경미',
  normal: '정상',
};

// 트렌드 아이콘
const trendIcons: Record<GlucoseTrend, string> = {
  rising: '↑',
  falling: '↓',
  stable: '→',
  fluctuating: '↕',
};

const trendLabels: Record<GlucoseTrend, string> = {
  rising: '상승',
  falling: '하락',
  stable: '안정',
  fluctuating: '변동',
};

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick }) => {
  const { patient: patientInfo, riskLevel, recentSummary, cgmConnection, riskFlags } = patient;
  const colors = riskColors[riskLevel];
  const unacknowledgedFlags = riskFlags.filter((f) => !f.isAcknowledged);

  const formatTime = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return '방금 전';
    if (diffHours < 24) return `${diffHours}시간 전`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '어제';
    return `${diffDays}일 전`;
  };

  return (
    <div
      className={`rounded-lg border ${colors.border} ${colors.bg} p-4 cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
    >
      {/* 헤더: 환자명 + 위험 뱃지 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{patientInfo.displayName}</span>
          <span className="text-sm text-gray-500">
            {patientInfo.age}세 · {patientInfo.diabetesType === 'type1' ? '1형' : patientInfo.diabetesType === 'type2' ? '2형' : '전당뇨'}
          </span>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${colors.text} ${colors.bg}`}>
          {riskLabels[riskLevel]}
        </span>
      </div>

      {/* CGM 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <div className="text-xs text-gray-500">평균 혈당</div>
          <div className="text-lg font-semibold text-gray-900">
            {recentSummary.averageGlucose}
            <span className="text-xs text-gray-500 ml-1">mg/dL</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">목표 범위</div>
          <div className="text-lg font-semibold text-gray-900">
            {recentSummary.timeInRange}
            <span className="text-xs text-gray-500 ml-1">%</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">추세</div>
          <div className="text-lg font-semibold text-gray-900">
            <span className="mr-1">{trendIcons[recentSummary.trend]}</span>
            <span className="text-sm">{trendLabels[recentSummary.trend]}</span>
          </div>
        </div>
      </div>

      {/* 경고 플래그 */}
      {unacknowledgedFlags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {unacknowledgedFlags.slice(0, 2).map((flag) => (
            <span
              key={flag.id}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-700"
            >
              ⚠ {flag.title}
            </span>
          ))}
          {unacknowledgedFlags.length > 2 && (
            <span className="text-xs text-gray-500">+{unacknowledgedFlags.length - 2}개</span>
          )}
        </div>
      )}

      {/* 하단: 연동 상태 + 마지막 동기화 */}
      <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2">
        <div className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${cgmConnection.isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span>{cgmConnection.vendorDisplayName}</span>
        </div>
        <span>마지막 동기화: {formatTime(cgmConnection.lastSyncAt)}</span>
      </div>
    </div>
  );
};

export default PatientCard;

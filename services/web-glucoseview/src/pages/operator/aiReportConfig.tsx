/**
 * AI Report Config - GlucoseView
 * WO-O4O-AI-REPORT-PAGE-COMMONIZATION-V1
 *
 * 혈당 관리/당뇨 특화 설정 + Mock 데이터 + Header Nav
 */

import { Activity, Building2, FileText, Package } from 'lucide-react';
import type { AiReportConfig, KpiPeriodData, ContextAssetExposure, ExposureReason, DailyTrend, QualitySignal } from '@o4o/ui';

const kpiData: Record<'7d' | '30d' | '90d', KpiPeriodData> = {
  '7d': {
    totalAiResponses: 978,
    totalExposures: 2845,
    uniqueAssets: 112,
    avgExposurePerResponse: 2.91,
    trends: {
      responses: { change: 14.8, direction: 'up' },
      exposures: { change: 19.5, direction: 'up' },
      assets: { change: 7.3, direction: 'up' },
    },
  },
  '30d': {
    totalAiResponses: 4123,
    totalExposures: 12456,
    uniqueAssets: 198,
    avgExposurePerResponse: 3.02,
    trends: {
      responses: { change: 28.2, direction: 'up' },
      exposures: { change: 32.8, direction: 'up' },
      assets: { change: 12.4, direction: 'up' },
    },
  },
  '90d': {
    totalAiResponses: 12345,
    totalExposures: 38456,
    uniqueAssets: 287,
    avgExposurePerResponse: 3.12,
    trends: {
      responses: { change: 42.5, direction: 'up' },
      exposures: { change: 52.3, direction: 'up' },
      assets: { change: 21.8, direction: 'up' },
    },
  },
};

const exposureData: ContextAssetExposure[] = [
  { id: '1', assetType: 'device', assetName: '연속혈당측정기 G7', exposureCount: 534, uniqueUsers: 312, topReasons: ['사용법', '교정 방법', '오류 해결'], trend: 'up', trendPercent: 28.4 },
  { id: '2', assetType: 'content', assetName: '혈당 관리 기본 가이드', exposureCount: 456, uniqueUsers: 267, topReasons: ['정보 요청', '목표 설정', '식단 조절'], trend: 'up', trendPercent: 22.1 },
  { id: '3', assetType: 'pharmacy', assetName: '서울 강남 당뇨케어 약국', exposureCount: 389, uniqueUsers: 228, topReasons: ['위치 확인', '상담 예약', '재고 문의'], trend: 'up', trendPercent: 15.6 },
  { id: '4', assetType: 'guide', assetName: '인슐린 주사 가이드', exposureCount: 345, uniqueUsers: 198, topReasons: ['주사 방법', '보관법', '용량 조절'], trend: 'stable', trendPercent: 3.8 },
  { id: '5', assetType: 'device', assetName: '혈당측정기 프리스타일', exposureCount: 298, uniqueUsers: 176, topReasons: ['정확도', '스트립 호환', '앱 연동'], trend: 'up', trendPercent: 12.5 },
  { id: '6', assetType: 'content', assetName: '저혈당 대처법', exposureCount: 267, uniqueUsers: 156, topReasons: ['응급 처치', '증상 확인', '예방법'], trend: 'down', trendPercent: -4.2 },
  { id: '7', assetType: 'pharmacy', assetName: '부산 해운대 약국', exposureCount: 234, uniqueUsers: 134, topReasons: ['영업시간', '배송 가능', '상담 예약'], trend: 'stable', trendPercent: 1.8 },
  { id: '8', assetType: 'guide', assetName: '당뇨 식단 플래너', exposureCount: 198, uniqueUsers: 112, topReasons: ['식단 구성', '탄수화물 계산', '레시피'], trend: 'up', trendPercent: 9.7 },
];

const reasonData: ExposureReason[] = [
  { reason: '기기 사용법/문의', count: 1245, percentage: 43.7, color: '#10B981' },
  { reason: '혈당 관리 정보', count: 678, percentage: 23.8, color: '#3B82F6' },
  { reason: '약국/상담 문의', count: 456, percentage: 16.0, color: '#F59E0B' },
  { reason: '식단/운동 가이드', count: 289, percentage: 10.2, color: '#8B5CF6' },
  { reason: '응급 상황/대처', count: 134, percentage: 4.7, color: '#EF4444' },
  { reason: '기타', count: 43, percentage: 1.6, color: '#6B7280' },
];

const dailyTrendData: DailyTrend[] = [
  { date: '01/09', totalExposures: 378, uniqueAssets: 67, aiResponses: 128 },
  { date: '01/10', totalExposures: 412, uniqueAssets: 74, aiResponses: 140 },
  { date: '01/11', totalExposures: 389, uniqueAssets: 70, aiResponses: 132 },
  { date: '01/12', totalExposures: 456, uniqueAssets: 82, aiResponses: 154 },
  { date: '01/13', totalExposures: 423, uniqueAssets: 76, aiResponses: 143 },
  { date: '01/14', totalExposures: 478, uniqueAssets: 86, aiResponses: 162 },
  { date: '01/15', totalExposures: 445, uniqueAssets: 80, aiResponses: 151 },
];

const qualitySignals: QualitySignal[] = [
  {
    id: 'qs-1', signalType: 'fallback_high', severity: 'high',
    title: 'Fallback 비율 높음',
    description: '최근 7일간 AI 응답 중 19%가 맥락 자산 없이 일반 응답으로 처리되었습니다.',
    metric: 'Fallback 비율: 19% (권장: 15% 이하)',
    suggestion: '혈당 측정, CGM 관련 Context Asset을 추가 등록하여 맥락 기반 응답률을 높이세요.',
    relatedAssets: ['연속혈당측정기', '혈당 관리'],
  },
  {
    id: 'qs-2', signalType: 'asset_concentration', severity: 'medium',
    title: '특정 Asset 과다 노출',
    description: '"연속혈당측정기 G7"이 전체 노출의 32%를 차지하고 있습니다.',
    metric: '상위 1개 Asset 집중도: 32% (권장: 20% 이하)',
    suggestion: '다른 혈당측정기 모델의 Asset 품질을 개선하거나 신규 등록을 검토하세요.',
    relatedAssets: ['연속혈당측정기 G7'],
  },
  {
    id: 'qs-3', signalType: 'asset_underutilized', severity: 'low',
    title: '저활용 Asset 발견',
    description: '등록된 112개 Asset 중 18개(16%)가 최근 30일간 노출되지 않았습니다.',
    metric: '미노출 Asset: 18개 (등록 대비 16%)',
    suggestion: '해당 Asset의 메타데이터와 연관 키워드를 점검하세요.',
    relatedAssets: ['혈당 기록앱 연동', '인슐린 펜 사용법', '저혈당 응급 키트'],
  },
];

export const glucoseviewAiReportConfig: AiReportConfig = {
  mode: 'full',
  theme: 'teal',
  assetTypes: [
    { type: 'device', label: '기기', icon: Activity, iconColor: 'text-teal-600 bg-teal-100' },
    { type: 'pharmacy', label: '약국', icon: Building2, iconColor: 'text-green-600 bg-green-100' },
    { type: 'content', label: '콘텐츠', icon: FileText, iconColor: 'text-purple-600 bg-purple-100' },
    { type: 'guide', label: '가이드', icon: Package, iconColor: 'text-amber-600 bg-amber-100' },
  ],
  infoBannerText: (
    <>
      <strong>Context Asset</strong>은 AI 응답에 포함된 기기, 약국, 콘텐츠, 가이드 정보입니다.
      이 리포트를 통해 사용자가 어떤 정보를 많이 찾고 있는지 파악하고,
      서비스를 개선할 수 있습니다.
    </>
  ),
  kpiData,
  exposureData,
  reasonData,
  dailyTrendData,
  qualitySignals,
  avgExposureChangePercent: 4.5,
  headerNav: {
    serviceName: 'GlucoseView',
    serviceNameColor: 'text-teal-600',
    backLink: '/operator/applications',
    navLinks: [
      { to: '/operator/applications', label: '신청 관리', className: 'text-sm text-slate-600 hover:text-teal-600' },
      { to: '/', label: '메인으로', className: 'text-sm text-slate-500 hover:text-slate-700' },
    ],
  },
  operatorInsights: [
    {
      bulletColor: 'text-green-300',
      content: (
        <>
          <strong className="text-white">"연속혈당측정기 G7"</strong>이 가장 많이 조회되고 있습니다.
          관련 교육 콘텐츠와 FAQ를 강화하세요.
        </>
      ),
    },
    {
      bulletColor: 'text-amber-300',
      content: (
        <>
          <strong className="text-white">"저혈당 대처법"</strong> 콘텐츠 조회가 감소 추세입니다.
          시즌별 관리법 콘텐츠로 업데이트를 고려하세요.
        </>
      ),
    },
    {
      bulletColor: 'text-blue-300',
      content: (
        <>
          "기기 사용법/문의"가 43.7%를 차지합니다.
          비디오 가이드나 튜토리얼을 추가하면 사용자 만족도가 높아집니다.
        </>
      ),
    },
  ],
};

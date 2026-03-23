/**
 * AI Report Config - GlycoPharm
 * WO-O4O-AI-REPORT-PAGE-COMMONIZATION-V1
 *
 * 약국/건강기능식품 특화 설정 + Mock 데이터
 */

import { Package, Building2, FileText, ShoppingBag } from 'lucide-react';
import type { AiReportConfig, KpiPeriodData, ContextAssetExposure, ExposureReason, DailyTrend, QualitySignal } from '@o4o/ui';

const kpiData: Record<'7d' | '30d' | '90d', KpiPeriodData> = {
  '7d': {
    totalAiResponses: 1456,
    totalExposures: 4523,
    uniqueAssets: 178,
    avgExposurePerResponse: 3.11,
    trends: {
      responses: { change: 18.3, direction: 'up' },
      exposures: { change: 25.6, direction: 'up' },
      assets: { change: 9.2, direction: 'up' },
    },
  },
  '30d': {
    totalAiResponses: 6234,
    totalExposures: 21456,
    uniqueAssets: 356,
    avgExposurePerResponse: 3.44,
    trends: {
      responses: { change: 32.1, direction: 'up' },
      exposures: { change: 38.7, direction: 'up' },
      assets: { change: 14.5, direction: 'up' },
    },
  },
  '90d': {
    totalAiResponses: 18456,
    totalExposures: 62345,
    uniqueAssets: 512,
    avgExposurePerResponse: 3.38,
    trends: {
      responses: { change: 45.2, direction: 'up' },
      exposures: { change: 62.8, direction: 'up' },
      assets: { change: 24.3, direction: 'up' },
    },
  },
};

const exposureData: ContextAssetExposure[] = [
  { id: '1', assetType: 'product', assetName: '글루코스밸런스 프로', exposureCount: 623, uniqueUsers: 389, topReasons: ['효능 문의', '복용법', '가격 비교'], trend: 'up', trendPercent: 32.5 },
  { id: '2', assetType: 'pharmacy', assetName: '강남 혜민약국', exposureCount: 512, uniqueUsers: 298, topReasons: ['위치 확인', '재고 문의', '영업시간'], trend: 'up', trendPercent: 21.3 },
  { id: '3', assetType: 'content', assetName: '당뇨병 식이요법 가이드', exposureCount: 456, uniqueUsers: 267, topReasons: ['정보 요청', '식단 추천', '주의사항'], trend: 'up', trendPercent: 15.8 },
  { id: '4', assetType: 'product', assetName: '오메가3 플러스', exposureCount: 398, uniqueUsers: 234, topReasons: ['성분 문의', '복용 시간', '상호작용'], trend: 'stable', trendPercent: 3.2 },
  { id: '5', assetType: 'supplier', assetName: '한국건강식품(주)', exposureCount: 345, uniqueUsers: 198, topReasons: ['공급사 정보', '인증 확인', '제품 라인'], trend: 'up', trendPercent: 12.4 },
  { id: '6', assetType: 'pharmacy', assetName: '서초 건강약국', exposureCount: 289, uniqueUsers: 167, topReasons: ['재고 확인', '상담 예약', '배송 문의'], trend: 'down', trendPercent: -4.8 },
  { id: '7', assetType: 'content', assetName: '혈당 측정 가이드', exposureCount: 245, uniqueUsers: 145, topReasons: ['측정 방법', '정상 범위', '기기 선택'], trend: 'up', trendPercent: 8.9 },
  { id: '8', assetType: 'product', assetName: '비타민D 1000IU', exposureCount: 198, uniqueUsers: 112, topReasons: ['복용량', '부작용', '효과'], trend: 'stable', trendPercent: 1.2 },
];

const reasonData: ExposureReason[] = [
  { reason: '제품 효능/성분 문의', count: 1856, percentage: 41.0, color: '#3B82F6' },
  { reason: '약국 위치/재고 확인', count: 923, percentage: 20.4, color: '#10B981' },
  { reason: '복용법/주의사항', count: 712, percentage: 15.7, color: '#F59E0B' },
  { reason: '가격/구매 문의', count: 534, percentage: 11.8, color: '#8B5CF6' },
  { reason: '건강 정보/가이드', count: 356, percentage: 7.9, color: '#EC4899' },
  { reason: '기타', count: 142, percentage: 3.2, color: '#6B7280' },
];

const dailyTrendData: DailyTrend[] = [
  { date: '01/09', totalExposures: 567, uniqueAssets: 98, aiResponses: 182 },
  { date: '01/10', totalExposures: 634, uniqueAssets: 112, aiResponses: 204 },
  { date: '01/11', totalExposures: 589, uniqueAssets: 105, aiResponses: 189 },
  { date: '01/12', totalExposures: 712, uniqueAssets: 125, aiResponses: 228 },
  { date: '01/13', totalExposures: 678, uniqueAssets: 118, aiResponses: 218 },
  { date: '01/14', totalExposures: 745, uniqueAssets: 132, aiResponses: 239 },
  { date: '01/15', totalExposures: 698, uniqueAssets: 124, aiResponses: 224 },
];

const qualitySignals: QualitySignal[] = [
  {
    id: 'qs-1', signalType: 'fallback_high', severity: 'high',
    title: 'Fallback 비율 높음',
    description: '최근 7일간 AI 응답 중 21%가 맥락 자산 없이 일반 응답으로 처리되었습니다.',
    metric: 'Fallback 비율: 21% (권장: 15% 이하)',
    suggestion: '건강기능식품, 약국 정보 관련 Context Asset을 추가 등록하세요.',
    relatedAssets: ['건강기능식품', '약국 위치'],
  },
  {
    id: 'qs-2', signalType: 'asset_concentration', severity: 'medium',
    title: '특정 Asset 과다 노출',
    description: '"글루코스밸런스 프로"가 전체 노출의 28%를 차지하고 있습니다.',
    metric: '상위 1개 Asset 집중도: 28% (권장: 20% 이하)',
    suggestion: '다른 혈당 관리 제품의 Asset 품질을 개선하거나 신규 등록을 검토하세요.',
    relatedAssets: ['글루코스밸런스 프로'],
  },
  {
    id: 'qs-3', signalType: 'asset_underutilized', severity: 'low',
    title: '저활용 Asset 발견',
    description: '등록된 178개 Asset 중 25개(14%)가 최근 30일간 노출되지 않았습니다.',
    metric: '미노출 Asset: 25개 (등록 대비 14%)',
    suggestion: '해당 Asset의 메타데이터와 연관 키워드를 점검하세요.',
    relatedAssets: ['프로바이오틱스 골드', '마그네슘 400mg', '코엔자임Q10'],
  },
];

export const glycopharmAiReportConfig: Omit<AiReportConfig, 'headerActions'> = {
  mode: 'full',
  theme: 'green',
  assetTypes: [
    { type: 'product', label: '제품', icon: Package, iconColor: 'text-blue-600 bg-blue-100' },
    { type: 'pharmacy', label: '약국', icon: Building2, iconColor: 'text-green-600 bg-green-100' },
    { type: 'content', label: '콘텐츠', icon: FileText, iconColor: 'text-purple-600 bg-purple-100' },
    { type: 'supplier', label: '공급사', icon: ShoppingBag, iconColor: 'text-amber-600 bg-amber-100' },
  ],
  infoBannerText: (
    <>
      <strong>Context Asset</strong>은 AI 응답에 포함된 제품, 약국, 콘텐츠, 공급사 정보입니다.
      이 리포트를 통해 고객이 어떤 정보를 많이 찾고 있는지 파악하고,
      서비스를 개선할 수 있습니다.
    </>
  ),
  kpiData,
  exposureData,
  reasonData,
  dailyTrendData,
  qualitySignals,
  avgExposureChangePercent: 5.8,
  operatorInsights: [
    {
      bulletColor: 'text-green-400',
      content: (
        <>
          <strong className="text-white">"글루코스밸런스 프로"</strong>가 가장 많이 조회되고 있습니다.
          재고 및 프로모션 상태를 확인하세요.
        </>
      ),
    },
    {
      bulletColor: 'text-amber-400',
      content: (
        <>
          <strong className="text-white">"서초 건강약국"</strong> 조회가 감소 추세입니다.
          해당 약국 정보가 최신 상태인지 확인하세요.
        </>
      ),
    },
    {
      bulletColor: 'text-blue-400',
      content: (
        <>
          "제품 효능/성분 문의"가 41.0%를 차지합니다.
          제품 상세 페이지의 성분 정보를 보강하면 도움이 됩니다.
        </>
      ),
    },
  ],
};

/**
 * AI Report Config - K-Cosmetics
 * WO-O4O-AI-REPORT-PAGE-COMMONIZATION-V1
 *
 * 화장품 특화 설정 + Mock 데이터
 */

import { Package, Building2, FileText, ShoppingBag } from 'lucide-react';
import type { AiReportConfig, KpiPeriodData, ContextAssetExposure, ExposureReason, DailyTrend, QualitySignal } from '@o4o/ui';

const kpiData: Record<'7d' | '30d' | '90d', KpiPeriodData> = {
  '7d': {
    totalAiResponses: 1834,
    totalExposures: 5678,
    uniqueAssets: 234,
    avgExposurePerResponse: 3.10,
    trends: {
      responses: { change: 22.4, direction: 'up' },
      exposures: { change: 28.9, direction: 'up' },
      assets: { change: 11.5, direction: 'up' },
    },
  },
  '30d': {
    totalAiResponses: 7856,
    totalExposures: 26789,
    uniqueAssets: 456,
    avgExposurePerResponse: 3.41,
    trends: {
      responses: { change: 35.6, direction: 'up' },
      exposures: { change: 42.3, direction: 'up' },
      assets: { change: 18.7, direction: 'up' },
    },
  },
  '90d': {
    totalAiResponses: 23456,
    totalExposures: 78234,
    uniqueAssets: 678,
    avgExposurePerResponse: 3.34,
    trends: {
      responses: { change: 52.8, direction: 'up' },
      exposures: { change: 68.4, direction: 'up' },
      assets: { change: 32.1, direction: 'up' },
    },
  },
};

const exposureData: ContextAssetExposure[] = [
  { id: '1', assetType: 'product', assetName: '수분크림 글로우 에디션', exposureCount: 789, uniqueUsers: 456, topReasons: ['성분 문의', '사용법', '피부 타입'], trend: 'up', trendPercent: 35.2 },
  { id: '2', assetType: 'brand', assetName: '코리아뷰티', exposureCount: 634, uniqueUsers: 378, topReasons: ['브랜드 문의', '제품 라인', '인증 확인'], trend: 'up', trendPercent: 24.6 },
  { id: '3', assetType: 'content', assetName: '피부 타입별 스킨케어 가이드', exposureCount: 567, uniqueUsers: 334, topReasons: ['정보 요청', '루틴 추천', '성분 설명'], trend: 'up', trendPercent: 18.9 },
  { id: '4', assetType: 'product', assetName: '비타민C 세럼 프로', exposureCount: 489, uniqueUsers: 289, topReasons: ['효과 문의', '사용 순서', '보관법'], trend: 'stable', trendPercent: 4.2 },
  { id: '5', assetType: 'store', assetName: '뷰티랩 강남점', exposureCount: 412, uniqueUsers: 245, topReasons: ['위치 확인', '영업시간', '재고 문의'], trend: 'up', trendPercent: 15.3 },
  { id: '6', assetType: 'content', assetName: '2024 K-뷰티 트렌드', exposureCount: 345, uniqueUsers: 198, topReasons: ['트렌드 문의', '추천 제품', '새 제품'], trend: 'down', trendPercent: -3.8 },
  { id: '7', assetType: 'brand', assetName: '스킨랩', exposureCount: 289, uniqueUsers: 167, topReasons: ['베스트셀러', '가격대', '신제품'], trend: 'up', trendPercent: 12.4 },
  { id: '8', assetType: 'store', assetName: '코스메틱 홍대점', exposureCount: 234, uniqueUsers: 134, topReasons: ['재고 확인', '이벤트', '매장 서비스'], trend: 'stable', trendPercent: 2.1 },
];

const reasonData: ExposureReason[] = [
  { reason: '제품 성분/효능 문의', count: 2156, percentage: 38.0, color: '#EC4899' },
  { reason: '피부 타입/루틴 추천', count: 1234, percentage: 21.7, color: '#8B5CF6' },
  { reason: '매장/재고 확인', count: 912, percentage: 16.1, color: '#10B981' },
  { reason: '브랜드 정보', count: 678, percentage: 11.9, color: '#F59E0B' },
  { reason: '트렌드/신제품', count: 512, percentage: 9.0, color: '#3B82F6' },
  { reason: '기타', count: 186, percentage: 3.3, color: '#6B7280' },
];

const dailyTrendData: DailyTrend[] = [
  { date: '01/09', totalExposures: 723, uniqueAssets: 134, aiResponses: 234 },
  { date: '01/10', totalExposures: 812, uniqueAssets: 148, aiResponses: 262 },
  { date: '01/11', totalExposures: 756, uniqueAssets: 139, aiResponses: 243 },
  { date: '01/12', totalExposures: 889, uniqueAssets: 162, aiResponses: 286 },
  { date: '01/13', totalExposures: 845, uniqueAssets: 154, aiResponses: 272 },
  { date: '01/14', totalExposures: 923, uniqueAssets: 168, aiResponses: 297 },
  { date: '01/15', totalExposures: 867, uniqueAssets: 158, aiResponses: 279 },
];

const qualitySignals: QualitySignal[] = [
  {
    id: 'qs-1', signalType: 'fallback_high', severity: 'medium',
    title: 'Fallback 비율 주의',
    description: '최근 7일간 AI 응답 중 16%가 맥락 자산 없이 일반 응답으로 처리되었습니다.',
    metric: 'Fallback 비율: 16% (권장: 15% 이하)',
    suggestion: '스킨케어, 메이크업 카테고리의 Context Asset을 보강하세요.',
    relatedAssets: ['스킨케어 루틴', '메이크업 팁'],
  },
  {
    id: 'qs-2', signalType: 'asset_concentration', severity: 'high',
    title: '특정 Asset 과다 노출',
    description: '"수분크림 글로우 에디션"이 전체 노출의 38%를 차지하고 있습니다.',
    metric: '상위 1개 Asset 집중도: 38% (권장: 20% 이하)',
    suggestion: '다른 수분크림 제품이나 대체 제품의 Asset 품질을 개선하세요.',
    relatedAssets: ['수분크림 글로우 에디션'],
  },
  {
    id: 'qs-3', signalType: 'asset_underutilized', severity: 'low',
    title: '저활용 Asset 발견',
    description: '등록된 234개 Asset 중 28개(12%)가 최근 30일간 노출되지 않았습니다.',
    metric: '미노출 Asset: 28개 (등록 대비 12%)',
    suggestion: '해당 Asset의 메타데이터와 연관 키워드를 점검하세요.',
    relatedAssets: ['립글로스 플럼핑', '아이섀도우 팔레트', '선크림 SPF50'],
  },
];

export const kCosmeticsAiReportConfig: Omit<AiReportConfig, 'headerActions'> = {
  mode: 'full',
  theme: 'pink',
  assetTypes: [
    { type: 'product', label: '제품', icon: Package, iconColor: 'text-pink-600 bg-pink-100' },
    { type: 'store', label: '매장', icon: Building2, iconColor: 'text-green-600 bg-green-100' },
    { type: 'content', label: '콘텐츠', icon: FileText, iconColor: 'text-purple-600 bg-purple-100' },
    { type: 'brand', label: '브랜드', icon: ShoppingBag, iconColor: 'text-amber-600 bg-amber-100' },
  ],
  infoBannerText: (
    <>
      <strong>Context Asset</strong>은 AI 응답에 포함된 제품, 매장, 콘텐츠, 브랜드 정보입니다.
      이 리포트를 통해 고객이 어떤 정보를 많이 찾고 있는지 파악하고,
      서비스를 개선할 수 있습니다.
    </>
  ),
  kpiData,
  exposureData,
  reasonData,
  dailyTrendData,
  qualitySignals,
  avgExposureChangePercent: 6.2,
  operatorInsights: [
    {
      bulletColor: 'text-green-300',
      content: (
        <>
          <strong className="text-white">"수분크림 글로우 에디션"</strong>이 가장 많이 조회되고 있습니다.
          재고 및 프로모션 상태를 확인하세요.
        </>
      ),
    },
    {
      bulletColor: 'text-amber-300',
      content: (
        <>
          <strong className="text-white">"2024 K-뷰티 트렌드"</strong> 콘텐츠 조회가 감소 추세입니다.
          최신 트렌드 콘텐츠 업데이트를 고려해보세요.
        </>
      ),
    },
    {
      bulletColor: 'text-blue-300',
      content: (
        <>
          "제품 성분/효능 문의"가 38.0%를 차지합니다.
          제품 상세 페이지의 성분 정보를 보강하면 고객 만족도가 높아집니다.
        </>
      ),
    },
  ],
};

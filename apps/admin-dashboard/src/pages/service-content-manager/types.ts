/**
 * Service Content Manager Types
 * WO-ADMIN-CONTENT-SLOT-V1
 *
 * 서비스별 콘텐츠 슬롯 관리를 위한 타입 정의
 */

/**
 * 관리 대상 SaaS 서비스 정의
 */
export interface ManagedService {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'development' | 'planned';
  owner: string; // 콘텐츠 소유 주체 (예: 약사공론)
}

/**
 * 슬롯 타입
 */
export type SlotType = 'news' | 'promotion' | 'mid_content' | 'system_notice';

/**
 * 슬롯 상태
 */
export type SlotStatus = 'active' | 'inactive' | 'scheduled';

/**
 * 기본 슬롯 설정
 */
export interface SlotConfig {
  id: string;
  serviceId: string;
  slotType: SlotType;
  status: SlotStatus;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * News Slot 설정
 * - 약사공론 기사 API 연동
 * - 노출 정책 관리
 */
export interface NewsSlotConfig extends SlotConfig {
  slotType: 'news';
  settings: {
    enabled: boolean;
    maxItems: number;
    sortBy: 'latest' | 'popular' | 'recommended';
    categories: string[];
    refreshInterval: number; // 분 단위
  };
}

/**
 * Promotion Slot 콘텐츠
 * - 광고, 설문, 강좌 안내
 */
export type PromotionContentType = 'ad' | 'survey' | 'course' | 'announcement';

export interface PromotionSlotContent {
  id: string;
  slotConfigId: string;
  type: PromotionContentType;
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  startDate: string;
  endDate: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionSlotConfig extends SlotConfig {
  slotType: 'promotion';
  settings: {
    enabled: boolean;
    maxItems: number;
    autoRotate: boolean;
    rotateInterval: number; // 초 단위
  };
  contents: PromotionSlotContent[];
}

/**
 * Mid Content Slot 설정
 * - 메인 콘텐츠 사이에 삽입되는 완충형 슬롯
 */
export interface MidContentSlotContent {
  id: string;
  slotConfigId: string;
  title: string;
  content: string; // HTML 또는 마크다운
  imageUrl?: string;
  linkUrl?: string;
  position: number; // 삽입 위치 (1, 2, 3...)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MidContentSlotConfig extends SlotConfig {
  slotType: 'mid_content';
  settings: {
    enabled: boolean;
    positions: number[]; // 사용 가능한 위치들
  };
  contents: MidContentSlotContent[];
}

/**
 * System Notice 설정
 * - 전체 지부/분회 공통 시스템 공지
 */
export type NoticeLevel = 'info' | 'warning' | 'urgent';

export interface SystemNoticeContent {
  id: string;
  slotConfigId: string;
  title: string;
  content: string;
  level: NoticeLevel;
  startDate: string;
  endDate: string;
  forceTop: boolean; // 강제 상단 노출
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemNoticeSlotConfig extends SlotConfig {
  slotType: 'system_notice';
  settings: {
    enabled: boolean;
    maxItems: number;
  };
  notices: SystemNoticeContent[];
}

/**
 * 서비스별 전체 슬롯 상태
 */
export interface ServiceSlotOverview {
  serviceId: string;
  serviceName: string;
  slots: {
    news: { enabled: boolean; itemCount: number };
    promotion: { enabled: boolean; activeCount: number };
    midContent: { enabled: boolean; activeCount: number };
    systemNotice: { enabled: boolean; activeCount: number };
  };
  lastUpdated: string;
}

/**
 * 사전 정의된 서비스 목록
 */
export const MANAGED_SERVICES: ManagedService[] = [
  {
    id: 'kpa-society-intranet',
    name: '약사회 지부/분회 Intranet',
    description: '약사회 지부 및 분회 운영을 위한 SaaS 서비스',
    status: 'active',
    owner: '약사공론',
  },
  // 향후 추가될 서비스들
  // {
  //   id: 'yaksa-groupbuy',
  //   name: '약사 공동구매',
  //   description: '약사회 공동구매 플랫폼',
  //   status: 'planned',
  //   owner: '약사공론',
  // },
];

/**
 * 슬롯 타입 라벨
 */
export const SLOT_TYPE_LABELS: Record<SlotType, string> = {
  news: '기사 영역',
  promotion: '상단 프로모션',
  mid_content: '중간 콘텐츠',
  system_notice: '시스템 공지',
};

/**
 * 프로모션 콘텐츠 타입 라벨
 */
export const PROMOTION_TYPE_LABELS: Record<PromotionContentType, string> = {
  ad: '광고',
  survey: '설문',
  course: '강좌 안내',
  announcement: '공지',
};

/**
 * 공지 레벨 라벨
 */
export const NOTICE_LEVEL_LABELS: Record<NoticeLevel, string> = {
  info: '안내',
  warning: '주의',
  urgent: '긴급',
};

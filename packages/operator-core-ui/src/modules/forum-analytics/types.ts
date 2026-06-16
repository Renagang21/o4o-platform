/**
 * Operator Forum Analytics Module — Types
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-ANALYTICS-COMMONIZE-V1
 *
 * KPA-Society / GlycoPharm / K-Cosmetics 의 forum 분석 화면(조회 전용)을 단일 콘솔로 수렴.
 * 서비스 차이는 accent(className 문자열) + client adapter 로만 흡수.
 */

export interface ForumAnalyticsSummary {
  totalForums: number;
  activeForums: number;
  totalPosts: number;
  pendingRequests: number;
  revisionRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  deleteRequestsPending: number;
}

export interface ForumAnalyticsTrendDay {
  date: string;
  requests: number;
  approved: number;
  rejected: number;
}

export interface ForumAnalyticsActivityItem {
  id: string;
  type: string;
  name: string;
  status: string;
  reviewerName: string | null;
  reviewComment: string | null;
  requesterName: string;
  timestamp: string;
}

/**
 * 서비스별 분석 API adapter.
 *
 * 기존 각 서비스 `forumAnalyticsApi` 객체(getSummary/getTrend/getActivity)가 그대로 충족한다.
 * 응답의 `data` 접근/narrowing 은 공통 콘솔이 런타임에서 수행하며, 기존 페이지와 동일하다
 * (`s.data` / `t.data.daily` / `Array.isArray(a.data)`). 따라서 data 타입은 loose(unknown)로 둔다.
 */
export interface ForumAnalyticsClient {
  getSummary(): Promise<{ data?: unknown } | null>;
  getTrend(days?: number): Promise<{ data?: unknown } | null>;
  getActivity(limit?: number): Promise<{ data?: unknown } | null>;
}

/**
 * 서비스 accent — className 문자열로 주입.
 * 값은 각 서비스 wrapper 소스에 리터럴로 존재하므로 Tailwind content 스캔에 포함되어 생성이 보장된다.
 */
export interface ForumAnalyticsAccent {
  /** 헤더/섹션 아이콘 + 로더 텍스트 색 (e.g. 'text-blue-600') */
  iconText: string;
  /** 트렌드 차트 막대 + 범례 swatch 배경 (e.g. 'bg-blue-500') */
  barColor: string;
  /** '활성 포럼' KPI 카드 아이콘 텍스트 색 (e.g. 'text-emerald-600') */
  activeForumText: string;
  /** '활성 포럼' KPI 카드 아이콘 배경 (e.g. 'bg-emerald-50') */
  activeForumBg: string;
}

export interface OperatorForumAnalyticsPageProps {
  /** 서비스별 분석 API adapter */
  client: ForumAnalyticsClient;
  /** 서비스 accent */
  accent: ForumAnalyticsAccent;
  /** 페이지 제목 (기본 '포럼 분석') */
  title?: string;
  /** 페이지 설명 (기본 '포럼 운영 현황과 트렌드를 확인하세요') */
  description?: string;
}

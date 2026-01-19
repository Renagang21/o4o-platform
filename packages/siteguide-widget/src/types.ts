/**
 * SiteGuide Widget Types
 *
 * @service SiteGuide
 * @domain siteguide.co.kr
 * @audience 외부 사업자 (모든 홈페이지 운영자)
 * @independence Neture 종속 아님 - 독립 서비스
 */

export interface SiteGuideConfig {
  /** 사업자 API 키 */
  apiKey: string;
  /** API 서버 URL (기본: https://api.siteguide.co.kr) */
  apiUrl?: string;
  /** 위젯 위치 */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** 위젯 테마 */
  theme?: 'light' | 'dark' | 'auto';
  /** 버튼 색상 (hex) */
  primaryColor?: string;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 환영 메시지 */
  welcomeMessage?: string;
  /** 자동으로 열기 (첫 방문 시) */
  autoOpen?: boolean;
  /** 페이지 컨텍스트 (선택적 수동 설정) */
  pageContext?: PageContext;
}

export interface PageContext {
  /** 페이지 타입 */
  pageType?: string;
  /** 카테고리 */
  category?: string;
  /** 태그 목록 */
  tags?: string[];
  /** 추가 데이터 */
  customData?: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface QueryRequest {
  question: string;
  pageContext: {
    url: string;
    title: string;
    description?: string;
    pageType?: string;
    category?: string;
    tags?: string[];
    customData?: Record<string, unknown>;
  };
  sessionId: string;
}

export interface QueryResponse {
  success: boolean;
  answer?: string;
  error?: string;
  errorCode?: string;
}

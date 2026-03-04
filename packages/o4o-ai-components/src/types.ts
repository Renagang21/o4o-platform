/**
 * @o4o/ai-components — 공유 타입
 *
 * WO-O4O-AI-COMPONENTS-CORE-EXTRACTION-V1
 */

import type React from 'react';

/** SVG 아이콘 공통 props */
export interface IconProps {
  size?: number;
  style?: React.CSSProperties;
}

/** AiSummaryModal props */
export interface AiSummaryModalProps {
  /** 모달 표시 여부 */
  open: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 컨텍스트 라벨 (예: "대시보드 요약", "상품 요약") */
  contextLabel?: string;
  /** 요약할 데이터 컨텍스트 */
  contextData?: Record<string, unknown>;
  /** 서비스 ID (예: 'neture', 'glycopharm') */
  serviceId?: string;
  /** 액세스 토큰 반환 함수 (제공 시 Authorization 헤더에 추가) */
  getAccessToken?: () => string | null;
}

/** AiSummaryButton props */
export interface AiSummaryButtonProps {
  /** 버튼 라벨 (기본: "AI 요약") */
  label?: string;
  /** Modal의 contextLabel (예: "대시보드 요약", "상품 요약") */
  contextLabel?: string;
  /** 버튼 크기 */
  size?: 'sm' | 'md';
  /** 버튼 스타일 변형 */
  variant?: 'default' | 'outline';
  /** 추가 className (Tailwind용) */
  className?: string;
  /** 요약할 데이터 컨텍스트 */
  contextData?: Record<string, unknown>;
  /** 서비스 ID */
  serviceId?: string;
  /** 액세스 토큰 반환 함수 */
  getAccessToken?: () => string | null;
}

/** AiPreviewModal props */
export interface AiPreviewModalProps {
  /** 모달 표시 여부 */
  open: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 모달 제목 (기본: "AI 요약 (Preview)") */
  title?: string;
  /** 컨텍스트 라벨 (예: "대시보드 요약", "상품 요약") */
  contextLabel?: string;
}

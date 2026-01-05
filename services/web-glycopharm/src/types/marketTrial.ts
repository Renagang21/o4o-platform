/**
 * Market Trial Extension Types
 *
 * Trial 생성/운영: Neture/본부
 * GlycoPharm: 선별 노출 + 활용 연결 UI
 */

/**
 * Trial 상태
 */
export type TrialStatus = 'upcoming' | 'active' | 'ended';

/**
 * Trial 제품 아이템
 */
export interface TrialItem {
  id: string;
  productName: string;
  productImage?: string;
  supplier: string;
  supplierId: string;
  description: string;
  trialPurpose: string;           // Trial 목적 (한 줄)
  status: TrialStatus;
  startDate: string;
  endDate: string;
  isActive: boolean;              // 운영자가 노출 ON/OFF
  displayOrder: number;           // 노출 순서
  // 활용 연결 정보
  signageContentId?: string;      // 연결된 Signage 콘텐츠 ID
  forumPostId?: string;           // 연결된 Forum 게시글 ID
  storeProductId?: string;        // 연결된 Store 제품 ID
  createdAt: string;
  updatedAt: string;
}

/**
 * Trial 활용 연결 타입
 */
export type TrialConnectionType = 'signage' | 'store' | 'forum';

/**
 * Trial 활용 연결 정보
 */
export interface TrialConnection {
  trialId: string;
  type: TrialConnectionType;
  targetId: string;
  targetName: string;
  connectedAt: string;
}

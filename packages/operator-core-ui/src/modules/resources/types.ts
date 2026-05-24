/**
 * Operator Resources Console — Types
 *
 * WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1
 *
 * KPA / GP / K-Cos 3 service 의 Operator Resources Console 공통 wrapper 의 타입.
 * 선행: WO-O4O-KCOS-RESOURCES-BACKEND-V1.
 */

import type React from 'react';

export type ResourceStatus = 'draft' | 'published' | 'private';
export type ResourceSourceType = 'manual' | 'upload' | 'external';
export type ResourceUsageType = 'READ' | 'LINK' | 'DOWNLOAD' | 'COPY';
export type ResourceReusablePolicy = 'platform' | 'restricted';

export interface ResourcesConsoleItem {
  id: string;
  title: string;
  summary: string | null;
  tags?: string[];
  category?: string | null;
  status: string;
  source_type: string;
  source_url: string | null;
  source_file_name: string | null;
  usage_type: string | null;
  thumbnail_url?: string | null;
  created_by: string | null;
  author_name?: string | null;
  like_count?: number;
  view_count?: number;
  reusable_policy?: ResourceReusablePolicy;
  created_at: string;
  updated_at: string;
}

export interface ResourcesConsoleListResponse {
  data?: {
    items?: ResourcesConsoleItem[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  items?: ResourcesConsoleItem[];
  total?: number;
}

export interface ResourcesConsoleListParams {
  page?: number;
  limit?: number;
  search?: string;
  source_type?: ResourceSourceType;
  status?: ResourceStatus;
  usage_type?: ResourceUsageType;
}

/**
 * Service-side API client adapter. Each service (KPA / GP / K-Cos) provides
 * its own client. The wrapper calls these methods. Response shape varies
 * across services so the wrapper does defensive unwrapping (see component).
 */
export interface ResourcesConsoleClient {
  operatorList: (params: ResourcesConsoleListParams) => Promise<any>;
  operatorUpdateStatus: (id: string, status: ResourceStatus) => Promise<any>;
  operatorDelete: (id: string) => Promise<any>;
}

/**
 * Optional AI generation slot. When provided, wrapper renders the "AI 콘텐츠
 * 생성" button in header + invokes `render` to draw the modal. The wrapper
 * passes `open / onClose / onSaved` to the render function. `onSaved` should
 * be called after a successful AI save to trigger list refresh.
 *
 * GP 의 AiContentModal 분기는 본 slot 으로 흡수 (service-별 page 분리 회피).
 */
export interface ResourcesConsoleAiSlot {
  /** Header button label (e.g., 'AI 콘텐츠 생성'). */
  buttonLabel: string;
  /** Render the AI modal. Wrapper manages open state. */
  render: (props: {
    open: boolean;
    onClose: () => void;
    /** Call after successful save to trigger list refetch in wrapper. */
    onSaved: () => void;
  }) => React.ReactNode;
}

export interface OperatorResourcesConsolePageProps {
  /** Canonical service key (kpa-society / glycopharm / k-cosmetics). */
  serviceKey: string;
  /** Service-side API client. */
  client: ResourcesConsoleClient;
  /** Optional AI integration. KPA / K-Cos 는 unset, GP 는 set. */
  aiSlot?: ResourcesConsoleAiSlot;
  /** Optional override of policy banner text. Default: 자료실 운영 정책 문구. */
  policyBanner?: string;
  /**
   * Optional detail-link builder. Default `/resources/:id`.
   * 각 service 의 user-facing 자료실 URL 이 다르면 override.
   */
  detailLinkPath?: (id: string) => string;
}

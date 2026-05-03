/**
 * Stores Module — Types
 *
 * WO-O4O-OPERATOR-STORES-CORE-EXTRACTION-V1
 * 설계 기준: docs/architecture/OPERATOR-CORE-DESIGN-V1.md §4
 *
 * 3 서비스(KPA, GlycoPharm, K-Cosmetics) 공통 Store 모델 + 주입 인터페이스.
 * 서비스별 차이는 generic 확장 + Adapter / Config / Slot 패턴으로 흡수한다.
 */

import type { ReactNode } from 'react';
import type { ListColumnDef } from '@o4o/operator-ux-core';

// ─── Base Type ──────────────────────────────────────────────────────────────

/**
 * 3 서비스가 공통으로 보유하는 매장 필드.
 * 서비스 자체 타입은 본 인터페이스를 만족(또는 extend)하면서 추가 필드를 가질 수 있다.
 */
export interface OperatorStoreBase {
  id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  address: string | null;
  phone: string | null;
  businessNumber: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  slug: string | null;
  channelCount: number;
  productCount: number;
  createdAt: string;
}

// ─── Backend Response Shapes ────────────────────────────────────────────────

export interface StoresListStats {
  totalStores: number;
  activeStores: number;
  withChannel: number;
  withProducts: number;
}

export interface StoresListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StoresListResponse<T extends OperatorStoreBase = OperatorStoreBase> {
  success: boolean;
  stores: T[];
  stats: StoresListStats;
  pagination: StoresListPagination;
}

export interface StoresListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// ─── Adapter Interface (서비스가 주입) ──────────────────────────────────────

/**
 * 서비스별 http 클라이언트(KPA fetch wrapper, Glyco/K-Cos axios)를 흡수하는 어댑터.
 * LMS V2 의 LmsHttpClient 와 동일한 factory injection 패턴.
 *
 * 사용 예 (KPA):
 *   const kpaStoresApi: StoresApi<KpaStore> = {
 *     listStores: (params) => apiFetch('/api/v1/operator/stores', params),
 *     getStore: (id) => apiFetch(`/api/v1/operator/stores/${id}`),
 *   };
 */
export interface StoresApi<T extends OperatorStoreBase = OperatorStoreBase> {
  listStores(params: StoresListParams): Promise<StoresListResponse<T>>;
  getStore(id: string): Promise<T>;

  // 선택적 — 서비스가 구현 여부 결정 (KPA 만 일부 활용 등)
  approveStore?(id: string, reason?: string): Promise<void>;
  rejectStore?(id: string, reason: string): Promise<void>;
  suspendStore?(id: string, reason?: string): Promise<void>;
}

// ─── Config (UI 표현 / Terminology) ─────────────────────────────────────────

/**
 * 서비스별 표현(text/colors) 설정.
 * 기존 @o4o/operator-ux-core 의 kpaConfig / glycopharmConfig / kcosmeticsConfig 와
 * 동일 컨셉. 표현 제어만 책임 — 데이터 로직은 Adapter 가 담당한다.
 */
export interface StoresConfig {
  serviceKey: 'kpa-society' | 'glycopharm' | 'k-cosmetics';
  terminology: {
    /** 단일 매장 라벨 (예: "약국" / "매장") */
    storeLabel: string;
    /** 매장 허브/관리 진입점 라벨 (예: "약국 운영 허브") */
    storeHubLabel?: string;
  };
  /** Color scheme — Glyco primary / K-Cos pink 등 서비스 톤 */
  colorScheme?: 'slate' | 'primary' | 'pink';
  /** stats 카드 라벨 override (서비스별 텍스트) */
  statsLabels?: Partial<Record<keyof StoresListStats, string>>;
  /** type → 표시 라벨 매핑 (예: { pharmacy: '약국', store: '매장' }) */
  typeLabels?: Record<string, string>;
}

// ─── Slot Action ────────────────────────────────────────────────────────────

export interface StoresRowAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'warning' | 'danger';
}

// ─── Component Props ────────────────────────────────────────────────────────

export interface OperatorStoresListProps<T extends OperatorStoreBase = OperatorStoreBase> {
  /** 서비스가 주입하는 API adapter (필수) */
  api: StoresApi<T>;

  /** 서비스 표현 config (필수) */
  config: StoresConfig;

  /**
   * 컬럼 정의 override (선택).
   * 기본 컬럼 set 이 제공되며, 서비스가 자체 컬럼을 전달하면 그것을 사용한다.
   * Operator 페이지 표준에 따라 ListColumnDef<T> 를 사용해야 한다 (DataTable 정책).
   */
  columns?: ListColumnDef<T>[];

  /** 페이지당 행 수 (default 20) */
  pageSize?: number;

  /** 초기 정렬 (default { field: 'createdAt', order: 'DESC' }) */
  defaultSort?: { field: string; order: 'ASC' | 'DESC' };

  /** 행 선택 가능 여부 (default true) */
  selectable?: boolean;

  /**
   * 서비스별 추가 행 액션 (예: K-Cos 채널 진입 / Cockpit 진입).
   * Extension 영역의 진입점은 본 slot 으로만 허용 — 본 컴포넌트가 도메인 로직을 흡수하지 않는다.
   */
  rowActionsExtra?: (store: T) => StoresRowAction[];

  /** 헤더 영역 추가 UI (서비스별 추가 버튼 등) */
  headerExtras?: ReactNode;

  /** 행 클릭 핸들러 (default: 호출자가 navigate 처리) */
  onRowClick?: (store: T) => void;

  /** stats 카드 표시 여부 (default true) */
  showStats?: boolean;

  /** 페이지 타이틀 (default config.terminology.storeLabel + " 관리") */
  title?: string;

  /** 페이지 부제 */
  subtitle?: string;

  /** 검색 placeholder */
  searchPlaceholder?: string;

  /** DataTable tableId (column visibility persist 용) */
  tableId?: string;
}

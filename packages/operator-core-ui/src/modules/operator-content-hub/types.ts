/**
 * Operator Content Hub Module — Types
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1
 *
 * KPA / GlycoPharm 운영자 "콘텐츠 허브" 목록·등록·수정·삭제 콘솔 공통 View.
 * 서비스 차이(status enum · 카테고리 옵션 · 본문 편집기 · 상세 이동)는
 * client adapter + config + slot 으로만 주입한다.
 *
 * View 는 정책을 결정하지 않는다 — 노출/추천/가시성 정책은 backend + wrapper adapter 책임.
 */

import type { ReactNode } from 'react';

export interface ContentHubItem {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  tags: string[];
  /** 서비스별 status enum (KPA: draft|ready · GlycoPharm: draft|published|private) */
  status: string;
  source_type: string;
  created_at: string;
  updated_at: string;
}

export interface ContentHubListParams {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  status?: string;
}

export interface ContentHubListResult {
  items: ContentHubItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContentHubPayload {
  title: string;
  summary: string | null;
  category: string | null;
  tags: string[];
  status: string;
  source_type: string;
  source_url: string | null;
  body: string | null;
}

/** 서비스별 contents API adapter — 공통 View 는 이 계약으로만 데이터에 접근한다. */
export interface ContentHubClient {
  list(params: ContentHubListParams): Promise<ContentHubListResult>;
  /** 상세(본문/원본 URL) prefill — 지원하는 서비스만 구현 */
  get?(id: string): Promise<{ body?: string | null; source_url?: string | null }>;
  create(payload: ContentHubPayload): Promise<void>;
  update(id: string, payload: ContentHubPayload): Promise<void>;
  remove(id: string): Promise<void>;
  /** RichTextEditor 이미지 업로드 (bodyEditor='rich' 일 때 필요) */
  uploadImage?(file: File): Promise<string>;
}

export interface ContentHubStatusOption {
  value: string;
  /** 목록 badge / 필터 공통 라벨 */
  label: string;
  /** badge Tailwind class */
  badgeClass: string;
  /** 등록/수정 폼 select 라벨 (없으면 label) */
  formLabel?: string;
  /** 폼에서 해당 상태 선택 시 노출할 안내문 */
  formHint?: string;
}

export interface ContentHubStatCard {
  label: string;
  /** 현재 페이지에서 이 status 를 가진 항목 수를 센다 */
  status: string;
  tone: 'green' | 'amber' | 'slate';
}

export interface OperatorContentHubConsoleProps {
  client: ContentHubClient;
  /** DataTable tableId (서비스별 고유) */
  tableId: string;
  title?: string;
  subtitle?: string;
  /** status enum 정의 — 목록 badge · 필터 · 폼 select 를 모두 이 목록이 만든다 */
  statusOptions: ContentHubStatusOption[];
  /** 신규 등록 기본 status */
  defaultStatus: string;
  /** status 필터 '전체' 값 (KPA='all' · GlycoPharm='') */
  allStatusValue?: string;
  allStatusLabel?: string;
  /** 현재 페이지 기준 통계 카드 (전체 카드는 항상 표시) */
  statCards?: ContentHubStatCard[];
  /** 카테고리 필터/제안 목록 — 미지정 시 카테고리 필터를 노출하지 않는다 */
  categoryOptions?: string[];
  /** 본문 편집기 — 'rich' 는 client.uploadImage 필요 */
  bodyEditor?: 'plain' | 'rich';
  editorPlaceholder?: string;
  /** manual(직접 입력) 원본 유형에서 본문을 필수로 검증할지 */
  requireBodyForManual?: boolean;
  /** 제목 클릭 시 상세로 이동 — 미지정 시 수정 모달을 연다 */
  onOpenItem?: (item: ContentHubItem) => void;
  createButtonLabel?: string;
  /** 헤더 우측 추가 액션 (예: KPA 콘텐츠 제작 가이드) */
  headerActions?: ReactNode;
}

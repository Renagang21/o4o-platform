/**
 * Store Blog 공통 타입·스타일 — 3서비스(KCos / GP / KPA) 공용
 * WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1
 *
 * 서비스 `api/blogStaff` 응답의 **구조적 부분집합**만 선언한다.
 * (store-ui-core 에 서비스 api 의존성을 만들지 않는다.)
 */

import type { CSSProperties } from 'react';

export type StoreBlogStatusFilter = 'all' | 'draft' | 'published' | 'archived';

/** 서비스 `StaffBlogPost` 중 이 화면군이 쓰는 필드만 */
export interface StoreBlogPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string | null;
  slug: string;
  status: string;
  updatedAt: string;
}

/** 서비스 `StaffBlogSettings` 중 이 화면군이 쓰는 필드만 */
export interface StoreBlogSettings {
  blogName?: string | null;
  description?: string | null;
  heroImage?: string | null;
  defaultTemplate?: string | null;
  updatedAt: string;
}

export interface StoreBlogSettingsForm {
  blogName: string;
  description: string;
  heroImage: string;
  defaultTemplate: string;
}

export interface StoreBlogSettingsInput {
  blogName: string | null;
  description: string | null;
  heroImage: string | null;
  defaultTemplate: string;
}

/**
 * 상태 뱃지 — K-Cosmetics / GlycoPharm 원문.
 *
 * ⚠️ 라벨은 서비스마다 다르다. **공통 기본값으로 치환하지 않는다.**
 *   - KCos / GP : 임시저장 / 발행됨 / 보관 (아래 값)
 *   - KPA       : 초안 / 발행 / 보관 — WO-O4O-KPA-OPERATOR-STORE-CONTENT-MENU-TERMINOLOGY-ALIGNMENT-V1
 *     로 별도 통일된 용어이므로 KPA 는 자기 map 을 유지한다.
 * 색상(color/bg)만 3서비스가 동일하다.
 */
export const STORE_BLOG_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '임시저장', color: '#64748b', bg: '#f1f5f9' },
  published: { label: '발행됨', color: '#16a34a', bg: '#f0fdf4' },
  archived: { label: '보관', color: '#d97706', bg: '#fefce8' },
};

export function formatStoreBlogDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/* ─── 공용 style (3서비스 동일 값) ───────────────────────────── */

export const storeBlogBtnStyle: CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

export const storeBlogSmallBtnStyle: CSSProperties = {
  padding: '4px 10px',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
};

export const storeBlogLabelStyle: CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '6px',
};

export const storeBlogInputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  color: '#1e293b',
  outline: 'none',
  boxSizing: 'border-box',
};

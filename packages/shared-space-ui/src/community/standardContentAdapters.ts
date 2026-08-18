/**
 * standardContentAdapters — O4O 표준 커뮤니티 콘텐츠 레코드 → 공통 표시 모델
 *
 * WO-O4O-COMMUNITY-CONTENT-RESOURCE-FRONTEND-VIEW-COMMONIZATION-V1
 *
 * KPA / K-Cosmetics / GlycoPharm 의 `api/content.ts` 는 동일한 표준 레코드 shape
 * (`id · title · summary · author_name · created_at · view_count · status · body · tags`)를 쓴다.
 * 서비스 wrapper 마다 복제되던 상태 라벨 · 날짜 포맷 · 배지 매핑을 한 곳에 고정한다.
 *
 * 서비스 API 를 import 하지 않는다 — 레코드는 wrapper 가 넘긴다(service-neutral).
 * 필드 의미가 다른 서비스는 이 어댑터를 억지로 쓰지 않고 자체 매핑을 쓴다.
 */

import type { CommunityContentListItem } from './CommunityContentListView';
import type { CommunityContentBadge, CommunityContentDetailData } from './CommunityContentDetailView';
import { formatCommunityContentDate } from './CommunityContentStates';

export const STANDARD_CONTENT_STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  published: '공개',
  private: '비공개',
};

/** 표준 콘텐츠 레코드 (서비스 `api/content.ts` 의 공통 부분집합) */
export interface StandardCommunityContentRecord {
  id: string;
  title: string;
  summary?: string | null;
  author_name?: string | null;
  created_at?: string | null;
  view_count?: number;
  status?: string;
  body?: string | null;
  tags?: string[];
}

/** published 가 아닐 때만 상태 배지를 만든다 (기존 3서비스 동작 그대로). */
export function standardContentBadges(record: StandardCommunityContentRecord): CommunityContentBadge[] {
  if (!record.status || record.status === 'published') return [];
  return [{ text: STANDARD_CONTENT_STATUS_LABEL[record.status] || record.status, tone: 'warning' }];
}

export function standardContentToListItem(record: StandardCommunityContentRecord): CommunityContentListItem {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    authorName: record.author_name,
    dateLabel: formatCommunityContentDate(record.created_at, 'short'),
    viewCount: record.view_count,
    badges: standardContentBadges(record),
  };
}

export function standardContentToDetailData(record: StandardCommunityContentRecord): CommunityContentDetailData {
  return {
    title: record.title,
    authorName: record.author_name,
    dateLabel: formatCommunityContentDate(record.created_at, 'full'),
    viewCount: record.view_count,
    summary: record.summary,
    tags: record.tags,
    bodyHtml: record.body,
    badges: standardContentBadges(record),
  };
}

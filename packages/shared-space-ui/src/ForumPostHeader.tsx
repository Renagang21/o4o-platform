/**
 * ForumPostHeader — forum 게시글 상세 헤더 공통 부품 (presentational)
 *
 * WO-O4O-FORUM-DETAIL-STATES-HEADER-EXTRACTION-V1
 *
 * title / author / createdAt 코어만 담당하고, 서비스별 badge·meta·action 은 slot 으로만 받는다.
 * - edit/delete 버튼, type/pinned badge, tags 는 직접 구현하지 않는다(slot).
 * - 서비스 전 단계이므로 경미한 시각 정규화를 허용하되, className/style 로 서비스별 차이를 일부 보존.
 * - API client / router / 서비스별 helper 미 import.
 */

import type { CSSProperties, ReactNode } from 'react';

export interface ForumPostHeaderProps {
  title: string;
  /** 이미 표시용으로 resolve 된 작성자명 */
  authorName?: string;
  /** 이미 포맷된 작성일 문자열 */
  createdAt?: string;
  /** 이미 포맷된 수정일 문자열 (선택) */
  updatedAt?: string;
  /** 제목 위 badge 영역 (category/pinned/postType 등 서비스 고유) */
  badgeSlot?: ReactNode;
  /** meta 행에 덧붙는 서비스 고유 meta (view/like/comment count 등) */
  metaSlot?: ReactNode;
  /** 우측 액션 영역 (edit/delete 등 서비스 고유) */
  actionSlot?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function ForumPostHeader({
  title,
  authorName,
  createdAt,
  updatedAt,
  badgeSlot,
  metaSlot,
  actionSlot,
  className,
  style,
}: ForumPostHeaderProps) {
  return (
    <header className={className} style={{ ...styles.header, ...style }}>
      <div style={styles.body}>
        {badgeSlot && <div style={styles.badgeRow}>{badgeSlot}</div>}
        <h1 style={styles.title}>{title}</h1>
        <div style={styles.metaRow}>
          {authorName && <span style={styles.author}>{authorName}</span>}
          {createdAt && (
            <>
              {authorName && <span style={styles.divider}>·</span>}
              <span>{createdAt}</span>
            </>
          )}
          {updatedAt && (
            <>
              <span style={styles.divider}>·</span>
              <span style={styles.updated}>수정됨 {updatedAt}</span>
            </>
          )}
          {metaSlot}
        </div>
      </div>
      {actionSlot && <div style={styles.actions}>{actionSlot}</div>}
    </header>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  body: {
    minWidth: 0,
    flex: 1,
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.4,
    margin: '0 0 12px 0',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 14,
    color: '#64748b',
  },
  author: {
    fontWeight: 500,
    color: '#334155',
  },
  divider: {
    color: '#cbd5e1',
  },
  updated: {
    color: '#94a3b8',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
};

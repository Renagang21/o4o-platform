/**
 * ForumCommentList — forum 댓글 목록 "표시" 공통 부품 (presentational, display-only)
 *
 * WO-O4O-FORUM-DETAIL-COMMENT-LIST-COMMONIZATION-V1
 *
 * 댓글 목록 표시만 공통화한다. 작성/수정/삭제 기능은 각 서비스 page 가 유지하며,
 * 부품은 액션을 직접 구현하지 않고 `renderCommentActions` slot 으로만 받는다.
 * - comment API / auth hook / router 미 import.
 * - content 는 기본 plain text(whitespace-pre-wrap). html 렌더가 필요한 서비스는 `renderContent` 로 주입.
 */

import type { CSSProperties, ReactNode } from 'react';

export interface ForumCommentListItem {
  id: string;
  authorName?: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  isAuthor?: boolean;
}

export interface ForumCommentListProps {
  comments: ForumCommentListItem[];
  emptyMessage?: string;
  className?: string;
  style?: CSSProperties;
  itemStyle?: CSSProperties;
  /** 본문 렌더 override (예: K-Cosmetics html ContentRenderer). 미지정 시 plain text. */
  renderContent?: (comment: ForumCommentListItem) => ReactNode;
  /** 우측 액션 slot (삭제 등) — display-only 이므로 부품은 액션을 직접 만들지 않는다. */
  renderCommentActions?: (comment: ForumCommentListItem) => ReactNode;
  /** meta 행 추가 slot */
  renderCommentMeta?: (comment: ForumCommentListItem) => ReactNode;
}

export function ForumCommentList({
  comments,
  emptyMessage = '아직 댓글이 없습니다.',
  className,
  style,
  itemStyle,
  renderContent,
  renderCommentActions,
  renderCommentMeta,
}: ForumCommentListProps) {
  if (!comments || comments.length === 0) {
    return <p style={styles.empty}>{emptyMessage}</p>;
  }
  return (
    <div className={className} style={{ ...styles.list, ...style }}>
      {comments.map((c) => (
        <div key={c.id} style={{ ...styles.item, ...itemStyle }}>
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              {c.authorName && <span style={styles.author}>{c.authorName}</span>}
              {c.createdAt && <span style={styles.date}>{c.createdAt}</span>}
              {renderCommentMeta?.(c)}
            </div>
            {renderCommentActions && <div style={styles.actions}>{renderCommentActions(c)}</div>}
          </div>
          {renderContent ? renderContent(c) : <p style={styles.content}>{c.content}</p>}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  item: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  author: {
    fontSize: 14,
    fontWeight: 500,
    color: '#334155',
  },
  date: {
    fontSize: 13,
    color: '#94a3b8',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  content: {
    fontSize: 15,
    lineHeight: 1.6,
    color: '#475569',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  empty: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    padding: '20px 0',
  },
};

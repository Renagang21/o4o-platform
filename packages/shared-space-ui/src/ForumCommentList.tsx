/**
 * ForumCommentList — forum 댓글 목록 공통 부품 (presentational)
 *
 * WO-O4O-FORUM-DETAIL-COMMENT-LIST-COMMONIZATION-V1 (표시 공통화)
 * WO-O4O-COMMUNITY-FORUM-KPA-NETURE-VIEW-CONVERGENCE-V1 (인라인 수정/삭제 표면 수렴)
 *
 * 부품은 comment API / auth hook / router 를 import 하지 않는다.
 * - 기본은 표시 전용. 액션은 `renderCommentActions` slot 으로 받는다(KPA 방식 유지).
 * - `onEditComment`/`onDeleteComment` 를 주면 Neture 가 자체 구현하던 인라인 수정 폼과
 *   수정/삭제 버튼을 부품이 제공한다. 실제 mutation 은 주입된 콜백이 수행하므로
 *   scope/권한 판단은 전적으로 호출측(service adapter) 소유다.
 * - content 는 기본 plain text(whitespace-pre-wrap). html 렌더가 필요하면 `renderContent` 로 주입.
 */

import { useState } from 'react';
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
  /** 비어 있을 때 부가 안내 (Neture "의견을 나누면 …") */
  emptyDescription?: string;
  className?: string;
  style?: CSSProperties;
  itemStyle?: CSSProperties;
  /** 본문 렌더 override (예: K-Cosmetics html ContentRenderer). 미지정 시 plain text. */
  renderContent?: (comment: ForumCommentListItem) => ReactNode;
  /** 우측 액션 slot. 지정 시 내장 수정/삭제 버튼보다 우선한다. */
  renderCommentActions?: (comment: ForumCommentListItem) => ReactNode;
  /** meta 행 추가 slot */
  renderCommentMeta?: (comment: ForumCommentListItem) => ReactNode;

  /** 인라인 수정 저장 콜백 (isAuthor 항목에만 버튼 노출) */
  onEditComment?: (id: string, content: string) => void | Promise<void>;
  /** 삭제 콜백 (isAuthor 항목에만 버튼 노출). 확인 절차는 호출측 소유. */
  onDeleteComment?: (id: string) => void | Promise<void>;
  /** 모바일 터치 타깃(44px) 확보 */
  compact?: boolean;
  accentColor?: string;
}

interface CommentRowProps {
  comment: ForumCommentListItem;
  itemStyle?: CSSProperties;
  renderContent?: (comment: ForumCommentListItem) => ReactNode;
  renderCommentActions?: (comment: ForumCommentListItem) => ReactNode;
  renderCommentMeta?: (comment: ForumCommentListItem) => ReactNode;
  onEditComment?: (id: string, content: string) => void | Promise<void>;
  onDeleteComment?: (id: string) => void | Promise<void>;
  compact?: boolean;
  accentColor: string;
}

function CommentRow({
  comment,
  itemStyle,
  renderContent,
  renderCommentActions,
  renderCommentMeta,
  onEditComment,
  onDeleteComment,
  compact,
  accentColor,
}: CommentRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  const builtInActions = !renderCommentActions && comment.isAuthor && (onEditComment || onDeleteComment);

  const handleSave = async () => {
    if (!draft.trim() || saving || !onEditComment) return;
    setSaving(true);
    try {
      await onEditComment(comment.id, draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const actionBtn: CSSProperties = compact
    ? { ...styles.actionBtn, minHeight: 44, padding: '0 10px' }
    : styles.actionBtn;

  return (
    <div style={{ ...styles.item, ...itemStyle }}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {comment.authorName && <span style={styles.author}>{comment.authorName}</span>}
          {comment.createdAt && <span style={styles.date}>{comment.createdAt}</span>}
          {renderCommentMeta?.(comment)}
        </div>
        {renderCommentActions ? (
          <div style={styles.actions}>{renderCommentActions(comment)}</div>
        ) : builtInActions && !editing ? (
          <div style={styles.actions}>
            {onEditComment && (
              <button
                type="button"
                style={actionBtn}
                onClick={() => {
                  setDraft(comment.content);
                  setEditing(true);
                }}
              >
                수정
              </button>
            )}
            {onDeleteComment && (
              <button
                type="button"
                style={{ ...actionBtn, color: '#dc2626' }}
                onClick={() => onDeleteComment(comment.id)}
              >
                삭제
              </button>
            )}
          </div>
        ) : null}
      </div>

      {editing ? (
        <div style={{ marginTop: 8 }}>
          <textarea
            style={styles.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
          />
          <div style={styles.editActions}>
            <button type="button" style={actionBtn} onClick={() => setEditing(false)}>
              취소
            </button>
            <button
              type="button"
              style={{
                ...styles.saveBtn,
                backgroundColor: accentColor,
                ...(compact ? { minHeight: 44, padding: '10px 18px' } : null),
                ...(saving ? { opacity: 0.5, cursor: 'not-allowed' } : null),
              }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : renderContent ? (
        renderContent(comment)
      ) : (
        <p style={styles.content}>{comment.content}</p>
      )}
    </div>
  );
}

export function ForumCommentList({
  comments,
  emptyMessage = '아직 댓글이 없습니다.',
  emptyDescription,
  className,
  style,
  itemStyle,
  renderContent,
  renderCommentActions,
  renderCommentMeta,
  onEditComment,
  onDeleteComment,
  compact,
  accentColor = '#2563EB',
}: ForumCommentListProps) {
  if (!comments || comments.length === 0) {
    return (
      <div style={styles.emptyWrap}>
        <p style={styles.empty}>{emptyMessage}</p>
        {emptyDescription && <p style={styles.emptyDescription}>{emptyDescription}</p>}
      </div>
    );
  }
  return (
    <div className={className} style={{ ...styles.list, ...style }}>
      {comments.map((c) => (
        <CommentRow
          key={c.id}
          comment={c}
          itemStyle={itemStyle}
          renderContent={renderContent}
          renderCommentActions={renderCommentActions}
          renderCommentMeta={renderCommentMeta}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          compact={compact}
          accentColor={accentColor}
        />
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
  actionBtn: {
    padding: '4px 10px',
    fontSize: 12,
    color: '#64748b',
    backgroundColor: 'transparent',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    cursor: 'pointer',
  },
  editActions: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  saveBtn: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    resize: 'vertical',
    boxSizing: 'border-box',
    outline: 'none',
  },
  content: {
    fontSize: 15,
    lineHeight: 1.6,
    color: '#475569',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  emptyWrap: {
    textAlign: 'center',
    padding: '20px 0',
  },
  empty: {
    fontSize: 14,
    color: '#94a3b8',
    margin: 0,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#94a3b8',
    margin: '4px 0 0',
  },
};

/**
 * 테스트 피드백 게시판 - 상세 페이지 (댓글 포함)
 * WO-KPA-TEST-FEEDBACK-BOARD-V1
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts';
import { colors } from '../../styles/theme';
import { ROLES, hasAnyRole } from '../../lib/role-constants';
import {
  FeedbackPost,
  FeedbackComment,
  FeedbackStatus,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPE_COLORS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_COLORS,
  canWriteFeedback,
  canManageFeedback,
} from '../../types/feedback';

// 샘플 데이터
const SAMPLE_POST: FeedbackPost = {
  id: '1',
  title: '회의 참석 확인 기능 개선 요청',
  content: `현재 회의 참석 확인이 수동으로만 가능한데, 일괄 처리 기능이 있으면 좋겠습니다.

**현재 상황:**
- 회의 참석자 30명 이상일 때 개별 확인이 너무 오래 걸림
- 전체 선택 후 일괄 확인 기능 없음

**요청 사항:**
1. 전체 선택 체크박스 추가
2. 선택한 회원 일괄 참석 확인 버튼
3. 참석/불참 필터링 기능

운영 시 정말 필요한 기능입니다.`,
  type: 'improvement',
  status: 'in_progress',
  authorId: 'test-branch-admin-001',
  authorName: '분회 운영자',
  authorRole: 'branch_admin',
  createdAt: '2025-01-04T10:00:00Z',
  updatedAt: '2025-01-04T10:00:00Z',
  commentCount: 2,
  isPinned: false,
};

const SAMPLE_COMMENTS: FeedbackComment[] = [
  {
    id: 'c1',
    postId: '1',
    content: '좋은 의견 감사합니다. 개발팀에서 검토 중입니다.',
    authorId: 'operator-001',
    authorName: '운영자',
    authorRole: 'platform_admin',
    isOperatorResponse: true,
    createdAt: '2025-01-04T11:00:00Z',
  },
  {
    id: 'c2',
    postId: '1',
    content: '저도 같은 불편을 느꼈습니다. 빠른 반영 부탁드려요!',
    authorId: 'test-district-admin-001',
    authorName: '지부 운영자',
    authorRole: 'district_admin',
    isOperatorResponse: false,
    createdAt: '2025-01-04T12:00:00Z',
  },
];

export function FeedbackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post] = useState<FeedbackPost>(SAMPLE_POST);
  const [comments, setComments] = useState<FeedbackComment[]>(SAMPLE_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canWrite = canWriteFeedback(user?.roles);
  const canManage = canManageFeedback(user?.roles);
  const userRoles = user?.roles ?? [];
  const isOperator = hasAnyRole(userRoles, [ROLES.KPA_ADMIN, ROLES.KPA_OPERATOR, ROLES.KPA_DISTRICT_ADMIN]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      // 실제로는 API 호출
      const comment: FeedbackComment = {
        id: `c${Date.now()}`,
        postId: id || '',
        content: newComment,
        authorId: user?.id || '',
        authorName: user?.name || '알 수 없음',
        authorRole: user?.role || '',
        isOperatorResponse: isOperator,
        createdAt: new Date().toISOString(),
      };

      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = (newStatus: FeedbackStatus) => {
    // 실제로는 API 호출
    toast.success(`상태가 "${FEEDBACK_STATUS_LABELS[newStatus]}"(으)로 변경되었습니다.`);
  };

  return (
    <div style={styles.container}>
      {/* 뒤로가기 */}
      <button style={styles.backLink} onClick={() => navigate('/intranet/feedback')}>
        ← 목록으로
      </button>

      {/* 게시글 */}
      <div style={styles.postCard}>
        <div style={styles.postHeader}>
          <div style={styles.badges}>
            {post.isPinned && <span style={styles.pinBadge}>📌 고정</span>}
            <span
              style={{
                ...styles.typeBadge,
                backgroundColor: FEEDBACK_TYPE_COLORS[post.type],
              }}
            >
              {FEEDBACK_TYPE_LABELS[post.type]}
            </span>
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor: FEEDBACK_STATUS_COLORS[post.status],
              }}
            >
              {FEEDBACK_STATUS_LABELS[post.status]}
            </span>
          </div>

          {canManage && (
            <div style={styles.statusControl}>
              <label style={styles.statusLabel}>상태 변경:</label>
              <select
                value={post.status}
                onChange={(e) => handleStatusChange(e.target.value as FeedbackStatus)}
                style={styles.statusSelect}
              >
                {Object.entries(FEEDBACK_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <h1 style={styles.postTitle}>{post.title}</h1>

        <div style={styles.postMeta}>
          <span style={styles.postAuthor}>{post.authorName}</span>
          <span style={styles.separator}>·</span>
          <span style={styles.postDate}>
            {new Date(post.createdAt).toLocaleString('ko-KR')}
          </span>
        </div>

        <div style={styles.postContent}>
          {post.content.split('\n').map((line, i) => (
            <p key={i} style={styles.contentLine}>
              {line || <br />}
            </p>
          ))}
        </div>
      </div>

      {/* 댓글 섹션 */}
      <div style={styles.commentsSection}>
        <h2 style={styles.commentsTitle}>
          댓글 {comments.length}개
        </h2>

        {/* 댓글 목록 */}
        <div style={styles.commentList}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                ...styles.commentItem,
                ...(comment.isOperatorResponse ? styles.operatorComment : {}),
              }}
            >
              <div style={styles.commentHeader}>
                <span style={styles.commentAuthor}>
                  {comment.authorName}
                  {comment.isOperatorResponse && (
                    <span style={styles.operatorBadge}>운영자</span>
                  )}
                </span>
                <span style={styles.commentDate}>
                  {new Date(comment.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>
              <p style={styles.commentContent}>{comment.content}</p>
            </div>
          ))}
        </div>

        {/* 댓글 작성 */}
        {canWrite && (
          <div style={styles.commentForm}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 작성하세요..."
              style={styles.commentInput}
              rows={3}
            />
            <div style={styles.commentFormActions}>
              {isOperator && (
                <span style={styles.operatorNote}>
                  운영자로 답변합니다
                </span>
              )}
              <button
                style={{
                  ...styles.commentSubmit,
                  ...(isSubmitting || !newComment.trim() ? styles.commentSubmitDisabled : {}),
                }}
                onClick={handleSubmitComment}
                disabled={isSubmitting || !newComment.trim()}
              >
                {isSubmitting ? '등록 중...' : '댓글 등록'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 32px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-block',
    marginBottom: '24px',
    padding: '8px 0',
    fontSize: '14px',
    color: colors.neutral500,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  postCard: {
    backgroundColor: colors.white,
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '24px',
  },
  postHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  badges: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pinBadge: {
    padding: '4px 10px',
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#92400e',
  },
  typeBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    color: colors.white,
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    color: colors.white,
  },
  statusControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusLabel: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  statusSelect: {
    padding: '6px 12px',
    fontSize: '13px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
  },
  postTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
    margin: '0 0 12px 0',
    lineHeight: 1.4,
  },
  postMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: colors.neutral500,
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  postAuthor: {
    fontWeight: 500,
    color: colors.neutral700,
  },
  separator: {},
  postDate: {},
  postContent: {
    fontSize: '15px',
    lineHeight: 1.8,
    color: colors.neutral800,
  },
  contentLine: {
    margin: '0 0 8px 0',
  },
  commentsSection: {
    backgroundColor: colors.white,
    padding: '24px 32px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  commentsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 20px 0',
  },
  commentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  commentItem: {
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  operatorComment: {
    backgroundColor: '#eff6ff',
    borderLeft: '4px solid #3b82f6',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  commentAuthor: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
  },
  operatorBadge: {
    padding: '2px 8px',
    backgroundColor: '#3b82f6',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    color: colors.white,
  },
  commentDate: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  commentContent: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: colors.neutral700,
    margin: 0,
  },
  commentForm: {
    borderTop: `1px solid ${colors.neutral100}`,
    paddingTop: '20px',
  },
  commentInput: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    resize: 'vertical',
    minHeight: '80px',
    boxSizing: 'border-box',
  },
  commentFormActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    marginTop: '12px',
  },
  operatorNote: {
    fontSize: '12px',
    color: '#3b82f6',
    fontWeight: 500,
  },
  commentSubmit: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  commentSubmitDisabled: {
    backgroundColor: colors.neutral400,
    cursor: 'not-allowed',
  },
};

export default FeedbackDetailPage;

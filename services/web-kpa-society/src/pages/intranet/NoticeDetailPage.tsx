/**
 * NoticeDetailPage - 공지 상세 (Forum Post 기반)
 * Work Order 3-2: 조회 전체 회원, 댓글 허용
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { IntranetHeader } from '../../components/intranet';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

interface Attachment {
  id: string;
  name: string;
  size: string;
}

export function NoticeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const userRole = user?.roles[0] || 'member';

  // 샘플 공지 데이터
  const notice = {
    id: id || '1',
    title: '2025년 신년 인사',
    content: `회원 여러분께,

새해 복 많이 받으시고, 2025년 새해에도 건강과 행복이 가득하시길 바랍니다.

지난 한 해 동안 약사회 발전을 위해 노력해 주신 모든 회원 여러분께 진심으로 감사드립니다.

올해도 회원 여러분의 권익 보호와 약사 전문성 향상을 위해 최선을 다하겠습니다.

감사합니다.

2025년 1월 1일
지부장 드림`,
    author: '지부장',
    authorRole: 'chair',
    createdAt: '2025-01-01 09:00',
    viewCount: 156,
    isPinned: true,
    attachments: [] as Attachment[],
    comments: [
      { id: '1', author: '홍길동', content: '새해 복 많이 받으세요!', createdAt: '2025-01-01 10:30' },
      { id: '2', author: '김약사', content: '감사합니다. 올해도 잘 부탁드립니다.', createdAt: '2025-01-01 11:15' },
    ] as Comment[],
  };

  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>(notice.comments);

  // 권한 확인
  const canEdit = userRole === 'chair' || notice.authorRole === userRole;
  const canDelete = userRole === 'chair';

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: String(Date.now()),
      author: user?.name || '익명',
      content: newComment,
      createdAt: new Date().toLocaleString('ko-KR'),
    };

    setComments([...comments, comment]);
    setNewComment('');
    toast.info('댓글이 등록되었습니다. (UI 데모)');
  };

  const handleEdit = () => {
    toast.info('공지 수정 (UI 데모)');
  };

  const handleDelete = () => {
    if (confirm('정말 삭제하시겠습니까?')) {
      toast.info('공지 삭제 (UI 데모)');
    }
  };

  return (
    <div>
      <IntranetHeader
        title="공지"
        subtitle="공지 상세"
        actions={
          <Link to="/intranet/notice" style={styles.backButton}>
            ← 목록으로
          </Link>
        }
      />

      <div style={styles.content}>
        {/* 공지 본문 */}
        <div style={styles.article}>
          <div style={styles.articleHeader}>
            <div style={styles.titleRow}>
              {notice.isPinned && <span style={styles.pinBadge}>📌 고정</span>}
              <h1 style={styles.title}>{notice.title}</h1>
            </div>
            <div style={styles.meta}>
              <span style={styles.author}>{notice.author}</span>
              <span style={styles.separator}>|</span>
              <span>{notice.createdAt}</span>
              <span style={styles.separator}>|</span>
              <span>조회 {notice.viewCount}</span>
            </div>
          </div>

          <div style={styles.articleBody}>
            <pre style={styles.contentText}>{notice.content}</pre>
          </div>

          {notice.attachments.length > 0 && (
            <div style={styles.attachments}>
              <div style={styles.attachmentsTitle}>📎 첨부파일</div>
              {notice.attachments.map((file) => (
                <a key={file.id} href="#" style={styles.attachmentItem}>
                  {file.name} ({file.size})
                </a>
              ))}
            </div>
          )}

          {/* 관리 버튼 */}
          {(canEdit || canDelete) && (
            <div style={styles.articleActions}>
              {canEdit && (
                <button style={styles.editButton} onClick={handleEdit}>
                  수정
                </button>
              )}
              {canDelete && (
                <button style={styles.deleteButton} onClick={handleDelete}>
                  삭제
                </button>
              )}
            </div>
          )}
        </div>

        {/* 댓글 섹션 */}
        <div style={styles.commentsSection}>
          <h3 style={styles.commentsTitle}>💬 댓글 ({comments.length})</h3>

          {/* 댓글 목록 */}
          <div style={styles.commentsList}>
            {comments.map((comment) => (
              <div key={comment.id} style={styles.commentItem}>
                <div style={styles.commentHeader}>
                  <span style={styles.commentAuthor}>{comment.author}</span>
                  <span style={styles.commentDate}>{comment.createdAt}</span>
                </div>
                <p style={styles.commentContent}>{comment.content}</p>
              </div>
            ))}
          </div>

          {/* 댓글 작성 */}
          <div style={styles.commentForm}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요..."
              style={styles.commentInput}
              rows={3}
            />
            <button style={styles.submitButton} onClick={handleSubmitComment}>
              댓글 등록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
    maxWidth: '900px',
  },
  backButton: {
    padding: '10px 16px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
  },
  article: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  articleHeader: {
    padding: '24px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  pinBadge: {
    padding: '4px 10px',
    backgroundColor: colors.accentYellow,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  meta: {
    fontSize: '13px',
    color: colors.neutral500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  author: {
    fontWeight: 500,
    color: colors.neutral700,
  },
  separator: {
    color: colors.neutral300,
  },
  articleBody: {
    padding: '24px',
    minHeight: '200px',
  },
  contentText: {
    fontFamily: 'inherit',
    fontSize: '15px',
    lineHeight: 1.8,
    color: colors.neutral800,
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
  attachments: {
    padding: '16px 24px',
    backgroundColor: colors.neutral50,
    borderTop: `1px solid ${colors.neutral100}`,
  },
  attachmentsTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral700,
    marginBottom: '12px',
  },
  attachmentItem: {
    display: 'block',
    padding: '8px 0',
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '14px',
  },
  articleActions: {
    display: 'flex',
    gap: '8px',
    padding: '16px 24px',
    borderTop: `1px solid ${colors.neutral100}`,
    justifyContent: 'flex-end',
  },
  editButton: {
    padding: '10px 20px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.accentRed,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  commentsSection: {
    marginTop: '24px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  commentsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 20px 0',
  },
  commentsList: {
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
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  commentAuthor: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
  },
  commentDate: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  commentContent: {
    fontSize: '14px',
    color: colors.neutral700,
    margin: 0,
    lineHeight: 1.5,
  },
  commentForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingTop: '16px',
    borderTop: `1px solid ${colors.neutral100}`,
  },
  commentInput: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '14px',
    resize: 'vertical',
  },
  submitButton: {
    alignSelf: 'flex-end',
    padding: '10px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

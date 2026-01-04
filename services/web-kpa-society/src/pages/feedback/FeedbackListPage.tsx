/**
 * 테스트 피드백 게시판 - 목록 페이지
 * WO-KPA-TEST-FEEDBACK-BOARD-V1
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { colors } from '../../styles/theme';
import {
  FeedbackPost,
  FeedbackType,
  FeedbackStatus,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPE_COLORS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_COLORS,
  canWriteFeedback,
} from '../../types/feedback';

// 샘플 데이터
const SAMPLE_POSTS: FeedbackPost[] = [
  {
    id: '1',
    title: '회의 참석 확인 기능 개선 요청',
    content: '현재 회의 참석 확인이 수동으로만 가능한데, 일괄 처리 기능이 있으면 좋겠습니다.',
    type: 'improvement',
    status: 'in_progress',
    authorId: 'test-branch-admin-001',
    authorName: '분회 운영자',
    authorRole: 'branch_admin',
    createdAt: '2025-01-04T10:00:00Z',
    updatedAt: '2025-01-04T10:00:00Z',
    commentCount: 2,
    isPinned: false,
  },
  {
    id: '2',
    title: '공지사항 첨부파일 업로드 오류',
    content: '공지사항 작성 시 첨부파일이 업로드되지 않는 문제가 있습니다.',
    type: 'bug',
    status: 'open',
    authorId: 'test-district-admin-001',
    authorName: '지부 운영자',
    authorRole: 'district_admin',
    createdAt: '2025-01-04T09:00:00Z',
    updatedAt: '2025-01-04T09:00:00Z',
    commentCount: 0,
    isPinned: true,
  },
  {
    id: '3',
    title: '메인화면 레이아웃 수정 요청',
    content: '협력업체 영역이 너무 크게 표시됩니다. 크기 조정이 가능했으면 합니다.',
    type: 'fix',
    status: 'resolved',
    authorId: 'test-branch-admin-001',
    authorName: '분회 운영자',
    authorRole: 'branch_admin',
    createdAt: '2025-01-03T15:00:00Z',
    updatedAt: '2025-01-04T08:00:00Z',
    commentCount: 3,
    isPinned: false,
  },
];

export function FeedbackListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts] = useState<FeedbackPost[]>(SAMPLE_POSTS);
  const [filterType, setFilterType] = useState<FeedbackType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all');

  const canWrite = canWriteFeedback(user?.role);

  // 필터링된 게시글
  const filteredPosts = posts.filter((post) => {
    if (filterType !== 'all' && post.type !== filterType) return false;
    if (filterStatus !== 'all' && post.status !== filterStatus) return false;
    return true;
  });

  // 고정 게시글 먼저, 그 다음 최신순
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleNewPost = () => {
    navigate('/intranet/feedback/new');
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>서비스 테스트 피드백</h1>
          <p style={styles.subtitle}>
            기능 개선, 수정 요청, 오류 신고 등 테스트 중 발견한 사항을 남겨주세요.
          </p>
        </div>
        {canWrite && (
          <button style={styles.newButton} onClick={handleNewPost}>
            + 피드백 작성
          </button>
        )}
      </div>

      {/* 안내 박스 */}
      <div style={styles.infoBox}>
        <strong>테스트 피드백 게시판 안내</strong>
        <ul style={styles.infoList}>
          <li>테스트 중 발견한 개선점, 오류, 의견을 자유롭게 작성해주세요.</li>
          <li>댓글로 논의하고, 처리 결과를 확인할 수 있습니다.</li>
          <li>지부/분회 운영자만 작성 가능합니다.</li>
        </ul>
      </div>

      {/* 필터 */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>유형</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FeedbackType | 'all')}
            style={styles.filterSelect}
          >
            <option value="all">전체</option>
            {Object.entries(FEEDBACK_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>상태</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FeedbackStatus | 'all')}
            style={styles.filterSelect}
          >
            <option value="all">전체</option>
            {Object.entries(FEEDBACK_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <span style={styles.resultCount}>
          {sortedPosts.length}건
        </span>
      </div>

      {/* 게시글 목록 */}
      <div style={styles.postList}>
        {sortedPosts.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📝</span>
            <p>등록된 피드백이 없습니다.</p>
            {canWrite && (
              <button style={styles.emptyButton} onClick={handleNewPost}>
                첫 번째 피드백 작성하기
              </button>
            )}
          </div>
        ) : (
          sortedPosts.map((post) => (
            <Link
              key={post.id}
              to={`/intranet/feedback/${post.id}`}
              style={styles.postItem}
            >
              <div style={styles.postHeader}>
                {post.isPinned && <span style={styles.pinBadge}>📌</span>}
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
              <h3 style={styles.postTitle}>{post.title}</h3>
              <p style={styles.postContent}>{post.content}</p>
              <div style={styles.postMeta}>
                <span style={styles.postAuthor}>
                  {post.authorName}
                </span>
                <span style={styles.postDate}>
                  {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                </span>
                {post.commentCount > 0 && (
                  <span style={styles.commentCount}>
                    💬 {post.commentCount}
                  </span>
                )}
              </div>
            </Link>
          ))
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: colors.neutral500,
    margin: '8px 0 0 0',
  },
  newButton: {
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  infoBox: {
    padding: '16px 20px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
    color: '#1e40af',
  },
  infoList: {
    margin: '8px 0 0 0',
    paddingLeft: '20px',
    lineHeight: 1.6,
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    marginBottom: '16px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral600,
  },
  filterSelect: {
    padding: '6px 12px',
    fontSize: '13px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    backgroundColor: colors.white,
  },
  resultCount: {
    marginLeft: 'auto',
    fontSize: '13px',
    color: colors.neutral500,
  },
  postList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  postItem: {
    display: 'block',
    padding: '20px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    textDecoration: 'none',
    transition: 'box-shadow 0.2s, border-color 0.2s',
  },
  postHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  pinBadge: {
    fontSize: '14px',
  },
  typeBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.white,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
    color: colors.white,
  },
  postTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 8px 0',
  },
  postContent: {
    fontSize: '14px',
    color: colors.neutral600,
    margin: '0 0 12px 0',
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  postMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    fontSize: '13px',
    color: colors.neutral400,
  },
  postAuthor: {
    fontWeight: 500,
    color: colors.neutral600,
  },
  postDate: {},
  commentCount: {
    color: colors.primary,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: colors.neutral50,
    borderRadius: '12px',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyButton: {
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default FeedbackListPage;

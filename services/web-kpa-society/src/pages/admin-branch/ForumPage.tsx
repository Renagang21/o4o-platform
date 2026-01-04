/**
 * ForumPage - 지부 게시판 관리
 */

import { useState } from 'react';
import { AdminHeader } from '../../components/admin';
import { colors } from '../../styles/theme';

interface ForumPost {
  id: string;
  boardName: string;
  boardId: string;
  title: string;
  author: string;
  authorDivision: string;
  createdAt: string;
  replyCount: number;
  viewCount: number;
  isReported: boolean;
  isHidden: boolean;
}

interface Board {
  id: string;
  name: string;
  postCount: number;
  isActive: boolean;
}

export function ForumPage() {
  const [activeTab, setActiveTab] = useState<'posts' | 'boards'>('posts');
  const [filterBoard, setFilterBoard] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [boards] = useState<Board[]>([
    { id: 'free', name: '자유게시판', postCount: 156, isActive: true },
    { id: 'qna', name: '질문답변', postCount: 89, isActive: true },
    { id: 'info', name: '정보공유', postCount: 234, isActive: true },
    { id: 'suggest', name: '건의사항', postCount: 23, isActive: true },
  ]);

  const [posts] = useState<ForumPost[]>([
    {
      id: '1',
      boardName: '자유게시판',
      boardId: 'free',
      title: '2025년 새해 인사드립니다',
      author: '홍길동',
      authorDivision: '샘플분회',
      createdAt: '2025-01-04 10:30',
      replyCount: 12,
      viewCount: 89,
      isReported: false,
      isHidden: false,
    },
    {
      id: '2',
      boardName: '질문답변',
      boardId: 'qna',
      title: '연회비 납부 관련 문의드립니다',
      author: '김테스트',
      authorDivision: '샘플분회',
      createdAt: '2025-01-03 15:20',
      replyCount: 5,
      viewCount: 45,
      isReported: false,
      isHidden: false,
    },
    {
      id: '3',
      boardName: '정보공유',
      boardId: 'info',
      title: '약사 면허 갱신 관련 정보 공유',
      author: '박신입',
      authorDivision: '테스트분회',
      createdAt: '2025-01-02 09:15',
      replyCount: 8,
      viewCount: 234,
      isReported: false,
      isHidden: false,
    },
    {
      id: '4',
      boardName: '자유게시판',
      boardId: 'free',
      title: '(신고됨) 부적절한 게시물',
      author: '익명',
      authorDivision: '-',
      createdAt: '2025-01-01 18:00',
      replyCount: 0,
      viewCount: 12,
      isReported: true,
      isHidden: true,
    },
  ]);

  const filteredPosts = posts.filter((post) => {
    const matchesBoard = filterBoard === 'all' || post.boardId === filterBoard;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'reported' && post.isReported) ||
      (filterStatus === 'hidden' && post.isHidden) ||
      (filterStatus === 'normal' && !post.isReported && !post.isHidden);
    return matchesBoard && matchesStatus;
  });

  const reportedCount = posts.filter((p) => p.isReported).length;

  const handleHidePost = (postId: string) => {
    alert(`게시물 #${postId} 숨김 처리 (UI 데모)`);
  };

  const handleDeletePost = (postId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      alert(`게시물 #${postId} 삭제 (UI 데모)`);
    }
  };

  const handleToggleBoardActive = (boardId: string, currentState: boolean) => {
    alert(`게시판 ${boardId} ${currentState ? '비활성화' : '활성화'} (UI 데모)`);
  };

  return (
    <div>
      <AdminHeader
        title="게시판 관리"
        subtitle={reportedCount > 0 ? `신고된 게시물 ${reportedCount}건` : '지부 게시판 관리'}
        actions={
          <div style={styles.headerActions}>
            {reportedCount > 0 && (
              <span style={styles.reportBadge}>⚠️ 신고 {reportedCount}건</span>
            )}
          </div>
        }
      />

      <div style={styles.content}>
        {/* 탭 네비게이션 */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'posts' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('posts')}
          >
            게시물 관리
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'boards' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('boards')}
          >
            게시판 설정
          </button>
        </div>

        {/* 게시물 관리 */}
        {activeTab === 'posts' && (
          <>
            <div style={styles.toolbar}>
              <div style={styles.filters}>
                <select
                  value={filterBoard}
                  onChange={(e) => setFilterBoard(e.target.value)}
                  style={styles.select}
                >
                  <option value="all">전체 게시판</option>
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={styles.select}
                >
                  <option value="all">전체 상태</option>
                  <option value="normal">정상</option>
                  <option value="reported">신고됨</option>
                  <option value="hidden">숨김</option>
                </select>
              </div>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: '100px' }}>게시판</th>
                    <th style={styles.th}>제목</th>
                    <th style={{ ...styles.th, width: '100px' }}>작성자</th>
                    <th style={{ ...styles.th, width: '100px' }}>분회</th>
                    <th style={{ ...styles.th, width: '130px' }}>작성일</th>
                    <th style={{ ...styles.th, width: '60px' }}>댓글</th>
                    <th style={{ ...styles.th, width: '60px' }}>조회</th>
                    <th style={{ ...styles.th, width: '80px' }}>상태</th>
                    <th style={{ ...styles.th, width: '100px' }}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map((post) => (
                    <tr
                      key={post.id}
                      style={{
                        ...styles.tr,
                        backgroundColor: post.isReported ? '#FEF2F2' : 'transparent',
                      }}
                    >
                      <td style={styles.td}>
                        <span style={styles.boardBadge}>{post.boardName}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ opacity: post.isHidden ? 0.5 : 1 }}>{post.title}</span>
                      </td>
                      <td style={styles.td}>{post.author}</td>
                      <td style={styles.td}>{post.authorDivision}</td>
                      <td style={styles.td}>{post.createdAt}</td>
                      <td style={styles.td}>{post.replyCount}</td>
                      <td style={styles.td}>{post.viewCount}</td>
                      <td style={styles.td}>
                        {post.isReported && (
                          <span style={{ ...styles.statusBadge, backgroundColor: colors.accentRed }}>
                            신고
                          </span>
                        )}
                        {post.isHidden && (
                          <span
                            style={{ ...styles.statusBadge, backgroundColor: colors.neutral500 }}
                          >
                            숨김
                          </span>
                        )}
                        {!post.isReported && !post.isHidden && (
                          <span
                            style={{ ...styles.statusBadge, backgroundColor: colors.accentGreen }}
                          >
                            정상
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          {!post.isHidden && (
                            <button
                              style={styles.hideButton}
                              onClick={() => handleHidePost(post.id)}
                            >
                              숨김
                            </button>
                          )}
                          <button
                            style={styles.deleteButton}
                            onClick={() => handleDeletePost(post.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 게시판 설정 */}
        {activeTab === 'boards' && (
          <div style={styles.boardsGrid}>
            {boards.map((board) => (
              <div key={board.id} style={styles.boardCard}>
                <div style={styles.boardHeader}>
                  <span style={styles.boardName}>{board.name}</span>
                  <span
                    style={{
                      ...styles.activeBadge,
                      backgroundColor: board.isActive ? colors.accentGreen : colors.neutral400,
                    }}
                  >
                    {board.isActive ? '활성' : '비활성'}
                  </span>
                </div>
                <div style={styles.boardStats}>
                  <span>📝 게시물 {board.postCount}개</span>
                </div>
                <div style={styles.boardActions}>
                  <button
                    style={{
                      ...styles.toggleActiveButton,
                      backgroundColor: board.isActive ? colors.neutral200 : colors.primary,
                      color: board.isActive ? colors.neutral700 : colors.white,
                    }}
                    onClick={() => handleToggleBoardActive(board.id, board.isActive)}
                  >
                    {board.isActive ? '비활성화' : '활성화'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  reportBadge: {
    padding: '8px 16px',
    backgroundColor: '#FEE2E2',
    color: colors.accentRed,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  toolbar: {
    marginBottom: '20px',
  },
  filters: {
    display: 'flex',
    gap: '12px',
  },
  select: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '14px',
    backgroundColor: colors.white,
  },
  tableWrapper: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral600,
    backgroundColor: colors.neutral50,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  tr: {
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: colors.neutral800,
  },
  boardBadge: {
    padding: '4px 8px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '12px',
  },
  statusBadge: {
    padding: '4px 8px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  actionButtons: {
    display: 'flex',
    gap: '6px',
  },
  hideButton: {
    padding: '5px 10px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '5px 10px',
    backgroundColor: colors.neutral100,
    color: colors.accentRed,
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  boardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  boardCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  boardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  boardName: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  activeBadge: {
    padding: '4px 10px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  boardStats: {
    fontSize: '14px',
    color: colors.neutral500,
    marginBottom: '16px',
  },
  boardActions: {
    paddingTop: '16px',
    borderTop: `1px solid ${colors.neutral100}`,
  },
  toggleActiveButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
  },
};

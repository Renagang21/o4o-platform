/**
 * ForumManagementPage - 게시판 관리 페이지
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';

interface Post {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  viewCount: number;
  commentCount: number;
  isReported: boolean;
  reportCount: number;
  isHidden: boolean;
}

export function ForumManagementPage() {
  const { branchId } = useParams();
  const [filterType, setFilterType] = useState<string>('all');

  const [posts] = useState<Post[]>([
    {
      id: '1',
      title: '약국 인테리어 견적 공유합니다',
      author: '김약사',
      createdAt: '2025-01-04',
      viewCount: 234,
      commentCount: 15,
      isReported: false,
      reportCount: 0,
      isHidden: false,
    },
    {
      id: '2',
      title: '재고관리 프로그램 추천해주세요',
      author: '이약사',
      createdAt: '2025-01-03',
      viewCount: 189,
      commentCount: 23,
      isReported: false,
      reportCount: 0,
      isHidden: false,
    },
    {
      id: '3',
      title: '[신고됨] 부적절한 게시물',
      author: '익명',
      createdAt: '2025-01-02',
      viewCount: 56,
      commentCount: 2,
      isReported: true,
      reportCount: 3,
      isHidden: false,
    },
    {
      id: '4',
      title: '신입 약사 교육 자료 공유',
      author: '박약사',
      createdAt: '2025-01-01',
      viewCount: 312,
      commentCount: 8,
      isReported: false,
      reportCount: 0,
      isHidden: false,
    },
    {
      id: '5',
      title: '숨김 처리된 게시물',
      author: '최약사',
      createdAt: '2024-12-30',
      viewCount: 45,
      commentCount: 1,
      isReported: true,
      reportCount: 5,
      isHidden: true,
    },
  ]);

  const reportedCount = posts.filter((p) => p.isReported && !p.isHidden).length;

  const handleHidePost = (id: string) => {
    alert(`게시물 #${id} 숨김 처리`);
  };

  const handleShowPost = (id: string) => {
    alert(`게시물 #${id} 숨김 해제`);
  };

  const handleDeletePost = (id: string) => {
    if (confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      alert(`게시물 #${id} 삭제`);
    }
  };

  const handleDismissReport = (id: string) => {
    alert(`게시물 #${id} 신고 기각`);
  };

  return (
    <div>
      <AdminHeader
        title="게시판 관리"
        subtitle={`신고된 게시물 ${reportedCount}건`}
      />

      <div style={pageStyles.content}>
        {/* 신고된 게시물 알림 */}
        {reportedCount > 0 && (
          <div style={pageStyles.reportAlert}>
            <span style={pageStyles.alertIcon}>🚨</span>
            <span>
              신고된 게시물 <strong>{reportedCount}건</strong>이 있습니다. 검토가 필요합니다.
            </span>
            <button
              style={pageStyles.alertButton}
              onClick={() => setFilterType('reported')}
            >
              신고 게시물 보기
            </button>
          </div>
        )}

        {/* 필터 */}
        <div style={pageStyles.toolbar}>
          <div style={pageStyles.tabs}>
            {[
              { value: 'all', label: '전체 게시물' },
              { value: 'reported', label: `신고됨 (${reportedCount})` },
              { value: 'hidden', label: '숨김 처리' },
            ].map((tab) => (
              <button
                key={tab.value}
                style={{
                  ...pageStyles.tab,
                  ...(filterType === tab.value ? pageStyles.tabActive : {}),
                  ...(tab.value === 'reported' && reportedCount > 0 ? { color: colors.accentRed } : {}),
                }}
                onClick={() => setFilterType(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={pageStyles.stats}>
            <span>오늘 게시물: <strong>12</strong></span>
            <span style={pageStyles.statDivider}>|</span>
            <span>이번 주: <strong>45</strong></span>
          </div>
        </div>

        {/* 게시물 목록 */}
        <div style={pageStyles.tableWrapper}>
          <table style={pageStyles.table}>
            <thead>
              <tr>
                <th style={pageStyles.th}>제목</th>
                <th style={{ ...pageStyles.th, width: '100px' }}>작성자</th>
                <th style={{ ...pageStyles.th, width: '100px' }}>작성일</th>
                <th style={{ ...pageStyles.th, width: '80px' }}>조회</th>
                <th style={{ ...pageStyles.th, width: '80px' }}>댓글</th>
                <th style={{ ...pageStyles.th, width: '80px' }}>상태</th>
                <th style={{ ...pageStyles.th, width: '180px' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {posts
                .filter((p) => {
                  if (filterType === 'reported') return p.isReported && !p.isHidden;
                  if (filterType === 'hidden') return p.isHidden;
                  return true;
                })
                .map((post) => (
                  <tr
                    key={post.id}
                    style={{
                      ...pageStyles.tr,
                      backgroundColor: post.isReported && !post.isHidden ? '#FEF2F2' : 'transparent',
                    }}
                  >
                    <td style={pageStyles.td}>
                      <div style={pageStyles.postTitle}>
                        {post.isReported && !post.isHidden && (
                          <span style={pageStyles.reportBadge}>🚨 {post.reportCount}건</span>
                        )}
                        {post.isHidden && (
                          <span style={pageStyles.hiddenBadge}>숨김</span>
                        )}
                        <Link
                          to={`/branch/${branchId}/admin/forum/${post.id}`}
                          style={{
                            ...pageStyles.titleLink,
                            ...(post.isHidden ? { textDecoration: 'line-through', color: colors.neutral400 } : {}),
                          }}
                        >
                          {post.title}
                        </Link>
                      </div>
                    </td>
                    <td style={pageStyles.td}>{post.author}</td>
                    <td style={pageStyles.td}>{post.createdAt}</td>
                    <td style={pageStyles.td}>{post.viewCount}</td>
                    <td style={pageStyles.td}>{post.commentCount}</td>
                    <td style={pageStyles.td}>
                      <span
                        style={{
                          ...pageStyles.statusBadge,
                          backgroundColor: post.isHidden
                            ? colors.neutral400
                            : post.isReported
                            ? colors.accentRed
                            : colors.accentGreen,
                        }}
                      >
                        {post.isHidden ? '숨김' : post.isReported ? '신고됨' : '정상'}
                      </span>
                    </td>
                    <td style={pageStyles.td}>
                      <div style={pageStyles.actions}>
                        {post.isReported && !post.isHidden && (
                          <button
                            style={{ ...pageStyles.actionButton, backgroundColor: colors.neutral200 }}
                            onClick={() => handleDismissReport(post.id)}
                          >
                            신고 기각
                          </button>
                        )}
                        {post.isHidden ? (
                          <button
                            style={{ ...pageStyles.actionButton, backgroundColor: colors.accentGreen, color: colors.white }}
                            onClick={() => handleShowPost(post.id)}
                          >
                            숨김 해제
                          </button>
                        ) : (
                          <button
                            style={pageStyles.actionButton}
                            onClick={() => handleHidePost(post.id)}
                          >
                            숨김
                          </button>
                        )}
                        <button
                          style={{ ...pageStyles.actionButton, color: colors.accentRed }}
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
      </div>
    </div>
  );
}

const pageStyles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  reportAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#FEE2E2',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    color: colors.neutral800,
  },
  alertIcon: {
    fontSize: '20px',
  },
  alertButton: {
    marginLeft: 'auto',
    padding: '8px 16px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
  },
  tab: {
    padding: '10px 20px',
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
  stats: {
    fontSize: '14px',
    color: colors.neutral600,
  },
  statDivider: {
    margin: '0 12px',
    color: colors.neutral300,
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
  postTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  reportBadge: {
    padding: '2px 6px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  hiddenBadge: {
    padding: '2px 6px',
    backgroundColor: colors.neutral400,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  titleLink: {
    color: colors.neutral800,
    textDecoration: 'none',
    fontWeight: 500,
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    color: colors.white,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '6px 10px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'none',
  },
};

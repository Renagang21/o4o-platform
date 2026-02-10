/**
 * NewsManagementPage - 공지사항 관리 페이지
 *
 * WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1: mock → API
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';
import { branchAdminApi } from '../../api/branchAdmin';
import type { BranchNews } from '../../api/branchAdmin';

export function NewsManagementPage() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [notices, setNotices] = useState<BranchNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = filterCategory !== 'all' ? { category: filterCategory } : undefined;
      const res = await branchAdminApi.getNews(params);
      setNotices(res.data?.items || []);
    } catch (err: any) {
      setError(err.message || '공지사항을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, React.CSSProperties> = {
      notice: { backgroundColor: colors.primary, color: colors.white },
      event: { backgroundColor: colors.accentGreen, color: colors.white },
      urgent: { backgroundColor: colors.accentRed, color: colors.white },
    };
    const labels: Record<string, string> = {
      notice: '공지',
      event: '행사',
      urgent: '긴급',
    };
    return <span style={{ ...badgeStyle, ...styles[category] }}>{labels[category]}</span>;
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      await branchAdminApi.updateNews(id, { is_pinned: !currentPinned });
      fetchNews();
    } catch (err: any) {
      alert('고정 상태 변경에 실패했습니다: ' + (err.message || ''));
    }
  };

  const handleTogglePublish = async (id: string, currentPublished: boolean) => {
    try {
      await branchAdminApi.updateNews(id, { is_published: !currentPublished });
      fetchNews();
    } catch (err: any) {
      alert('게시 상태 변경에 실패했습니다: ' + (err.message || ''));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await branchAdminApi.deleteNews(id);
      fetchNews();
    } catch (err: any) {
      alert('삭제에 실패했습니다: ' + (err.message || ''));
    }
  };

  return (
    <div>
      <AdminHeader
        title="공지사항 관리"
        subtitle="분회 공지사항을 관리합니다"
      />

      <div style={pageStyles.content}>
        {/* 상단 액션 */}
        <div style={pageStyles.toolbar}>
          <div style={pageStyles.tabs}>
            {[
              { value: 'all', label: '전체' },
              { value: 'notice', label: '공지' },
              { value: 'event', label: '행사' },
              { value: 'urgent', label: '긴급' },
            ].map((tab) => (
              <button
                key={tab.value}
                style={{
                  ...pageStyles.tab,
                  ...(filterCategory === tab.value ? pageStyles.tabActive : {}),
                }}
                onClick={() => setFilterCategory(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Link to="new" style={pageStyles.createButton}>
            + 새 공지 작성
          </Link>
        </div>

        {/* 공지 목록 */}
        <div style={pageStyles.tableWrapper}>
          <table style={pageStyles.table}>
            <thead>
              <tr>
                <th style={{ ...pageStyles.th, width: '50px' }}>고정</th>
                <th style={{ ...pageStyles.th, width: '80px' }}>분류</th>
                <th style={pageStyles.th}>제목</th>
                <th style={{ ...pageStyles.th, width: '100px' }}>작성자</th>
                <th style={{ ...pageStyles.th, width: '100px' }}>작성일</th>
                <th style={{ ...pageStyles.th, width: '80px' }}>조회수</th>
                <th style={{ ...pageStyles.th, width: '80px' }}>상태</th>
                <th style={{ ...pageStyles.th, width: '150px' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...pageStyles.td, textAlign: 'center' }}>불러오는 중...</td></tr>
              ) : error ? (
                <tr><td colSpan={8} style={{ ...pageStyles.td, textAlign: 'center', color: colors.accentRed }}>{error}</td></tr>
              ) : notices.length === 0 ? (
                <tr><td colSpan={8} style={{ ...pageStyles.td, textAlign: 'center' }}>공지사항이 없습니다</td></tr>
              ) : (
                notices.map((notice) => (
                  <tr key={notice.id} style={pageStyles.tr}>
                    <td style={pageStyles.td}>
                      <button
                        style={{
                          ...pageStyles.pinButton,
                          ...(notice.is_pinned ? pageStyles.pinButtonActive : {}),
                        }}
                        onClick={() => handleTogglePin(notice.id, notice.is_pinned)}
                      >
                        📌
                      </button>
                    </td>
                    <td style={pageStyles.td}>{getCategoryBadge(notice.category)}</td>
                    <td style={pageStyles.td}>
                      <Link
                        to={notice.id}
                        style={pageStyles.titleLink}
                      >
                        {notice.title}
                      </Link>
                    </td>
                    <td style={pageStyles.td}>{notice.author}</td>
                    <td style={pageStyles.td}>{notice.created_at?.slice(0, 10)}</td>
                    <td style={pageStyles.td}>{notice.view_count.toLocaleString()}</td>
                    <td style={pageStyles.td}>
                      <span
                        style={{
                          ...pageStyles.statusBadge,
                          backgroundColor: notice.is_published ? colors.accentGreen : colors.neutral400,
                        }}
                      >
                        {notice.is_published ? '게시중' : '임시저장'}
                      </span>
                    </td>
                    <td style={pageStyles.td}>
                      <div style={pageStyles.actions}>
                        <Link
                          to={`${notice.id}/edit`}
                          style={pageStyles.actionButton}
                        >
                          수정
                        </Link>
                        <button
                          style={pageStyles.actionButton}
                          onClick={() => handleTogglePublish(notice.id, notice.is_published)}
                        >
                          {notice.is_published ? '숨김' : '게시'}
                        </button>
                        <button
                          style={{ ...pageStyles.actionButton, color: colors.accentRed }}
                          onClick={() => handleDelete(notice.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 500,
};

const pageStyles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
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
  createButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
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
  pinButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    opacity: 0.3,
  },
  pinButtonActive: {
    opacity: 1,
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

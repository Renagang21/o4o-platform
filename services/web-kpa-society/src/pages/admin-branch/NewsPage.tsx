/**
 * NewsPage - 지부 공지사항 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@o4o/error-handling';
import { AdminHeader } from '../../components/admin';
import { authClient } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';

interface NewsItem {
  id: string;
  title: string;
  category: 'notice' | 'news' | 'event';
  author: string;
  createdAt: string;
  isPinned: boolean;
  isPublished: boolean;
  viewCount: number;
}

function mapContent(c: any): NewsItem {
  return {
    id: c.id,
    title: c.title,
    category: (c.type as NewsItem['category']) ?? 'notice',
    author: c.authorName ?? '-',
    createdAt: c.createdAt ? String(c.createdAt).slice(0, 10) : '',
    isPinned: c.isPinned ?? false,
    isPublished: c.status === 'published',
    viewCount: c.viewCount ?? 0,
  };
}

export function NewsPage() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNews = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await authClient.api.get('/api/v1/kpa/news/admin/list?limit=100');
      const items: NewsItem[] = (data?.data ?? []).map(mapContent);
      setNewsItems(items);
    } catch {
      toast.error('공지사항 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadNews(); }, [loadNews]);

  const filteredNews = newsItems.filter((item) => {
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: NewsItem['category']) => {
    const config: Record<string, { bg: string; label: string }> = {
      notice: { bg: colors.primary, label: '공지' },
      news: { bg: colors.accentGreen, label: '소식' },
      event: { bg: colors.accentYellow, label: '행사' },
    };
    const { bg, label } = config[category] ?? { bg: colors.neutral400, label: category };
    return <span style={{ ...styles.badge, backgroundColor: bg }}>{label}</span>;
  };

  const handleCreate = () => {
    toast.info('새 공지 작성 (준비 중)');
  };

  const handleEdit = (id: string) => {
    toast.info(`공지 #${id} 수정 (준비 중)`);
  };

  const handleTogglePublish = async (id: string, currentIsPublished: boolean) => {
    const newStatus = currentIsPublished ? 'draft' : 'published';
    try {
      await authClient.api.put(`/api/v1/kpa/news/${id}`, { status: newStatus });
      setNewsItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isPublished: !currentIsPublished } : item))
      );
      toast.success(currentIsPublished ? '비공개 처리되었습니다.' : '게시되었습니다.');
    } catch {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const handleTogglePin = async (id: string, currentIsPinned: boolean) => {
    try {
      await authClient.api.put(`/api/v1/kpa/news/${id}`, { isPinned: !currentIsPinned });
      setNewsItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isPinned: !currentIsPinned } : item))
      );
      toast.success(currentIsPinned ? '고정 해제되었습니다.' : '고정되었습니다.');
    } catch {
      toast.error('고정 처리에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`"${title}"\n\n이 공지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await authClient.api.delete(`/api/v1/kpa/news/${id}`);
      setNewsItems((prev) => prev.filter((item) => item.id !== id));
      toast.success('공지가 삭제되었습니다.');
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <div>
      <AdminHeader
        title="공지사항 관리"
        subtitle="지부 공지사항 및 소식 관리"
        actions={
          <button style={styles.createButton} onClick={handleCreate}>
            + 새 공지 작성
          </button>
        }
      />

      <div style={styles.content}>
        {/* 필터 및 검색 */}
        <div style={styles.toolbar}>
          <div style={styles.categoryTabs}>
            {[
              { key: 'all', label: '전체' },
              { key: 'notice', label: '공지' },
              { key: 'news', label: '소식' },
              { key: 'event', label: '행사' },
            ].map((cat) => (
              <button
                key={cat.key}
                style={{
                  ...styles.categoryTab,
                  ...(filterCategory === cat.key ? styles.categoryTabActive : {}),
                }}
                onClick={() => setFilterCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="제목 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* 공지 목록 */}
        <div style={styles.tableWrapper}>
          {isLoading ? (
            <div style={styles.loadingRow}>불러오는 중...</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '60px' }}>고정</th>
                  <th style={{ ...styles.th, width: '80px' }}>분류</th>
                  <th style={styles.th}>제목</th>
                  <th style={{ ...styles.th, width: '100px' }}>작성자</th>
                  <th style={{ ...styles.th, width: '100px' }}>작성일</th>
                  <th style={{ ...styles.th, width: '80px' }}>조회</th>
                  <th style={{ ...styles.th, width: '80px' }}>상태</th>
                  <th style={{ ...styles.th, width: '170px' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredNews.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: colors.neutral400, padding: '40px' }}>
                      공지사항이 없습니다.
                    </td>
                  </tr>
                ) : filteredNews.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      ...styles.tr,
                      backgroundColor: item.isPinned ? colors.neutral50 : 'transparent',
                    }}
                  >
                    <td style={styles.td}>
                      <button
                        style={{
                          ...styles.iconButton,
                          color: item.isPinned ? colors.primary : colors.neutral400,
                        }}
                        onClick={() => handleTogglePin(item.id, item.isPinned)}
                      >
                        📌
                      </button>
                    </td>
                    <td style={styles.td}>{getCategoryBadge(item.category)}</td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: item.isPinned ? 600 : 400 }}>{item.title}</span>
                    </td>
                    <td style={styles.td}>{item.author}</td>
                    <td style={styles.td}>{item.createdAt}</td>
                    <td style={styles.td}>{item.viewCount.toLocaleString()}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: item.isPublished ? colors.accentGreen : colors.neutral400,
                        }}
                      >
                        {item.isPublished ? '게시' : '비공개'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button style={styles.editButton} onClick={() => handleEdit(item.id)}>
                          수정
                        </button>
                        <button
                          style={styles.toggleButton}
                          onClick={() => handleTogglePublish(item.id, item.isPublished)}
                        >
                          {item.isPublished ? '비공개' : '게시'}
                        </button>
                        <button
                          style={styles.deleteButton}
                          onClick={() => handleDelete(item.id, item.title)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 통계 */}
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>전체</span>
            <span style={styles.statValue}>{newsItems.length}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>게시중</span>
            <span style={styles.statValue}>{newsItems.filter((n) => n.isPublished).length}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>비공개</span>
            <span style={styles.statValue}>{newsItems.filter((n) => !n.isPublished).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  createButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  categoryTabs: {
    display: 'flex',
    gap: '8px',
  },
  categoryTab: {
    padding: '10px 20px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  searchBox: {
    display: 'flex',
  },
  searchInput: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '14px',
    width: '250px',
  },
  tableWrapper: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  loadingRow: {
    padding: '40px',
    textAlign: 'center' as const,
    color: colors.neutral400,
    fontSize: '14px',
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
  badge: {
    padding: '4px 10px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusBadge: {
    padding: '4px 8px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  toggleButton: {
    padding: '6px 12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  statsRow: {
    display: 'flex',
    gap: '24px',
    marginTop: '20px',
    padding: '16px 20px',
    backgroundColor: colors.white,
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statLabel: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
  },
};
